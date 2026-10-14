import { CONFIG } from './config'
import { k, redis } from './redis'

/**
 * Cliente da API do Asaas (v3), só o que a cobrança usa: listar cobranças e ler
 * o cliente. A chave é do escritório (tutoriais/02-asaas.mp4, começa com $aact_prod_).
 * O Asaas é a fonte da verdade do financeiro: este código só LÊ do Asaas.
 */

export type StatusAsaas =
  | 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'RECEIVED_IN_CASH'
  | 'REFUND_REQUESTED' | 'REFUND_IN_PROGRESS' | 'CHARGEBACK_REQUESTED' | 'CHARGEBACK_DISPUTE'
  | 'AWAITING_CHARGEBACK_REVERSAL' | 'DUNNING_REQUESTED' | 'DUNNING_RECEIVED' | 'AWAITING_RISK_ANALYSIS'

export interface Cobranca {
  id: string
  customer: string
  /** AAAA-MM-DD */
  dueDate: string
  value: number
  status: StatusAsaas
  /** página da fatura (boleto, Pix e cartão) */
  invoiceUrl?: string
  bankSlipUrl?: string
  paymentDate?: string | null
  description?: string | null
  deleted?: boolean
}

export interface ClienteAsaas {
  id: string
  name: string
  mobilePhone?: string | null
  phone?: string | null
  cpfCnpj?: string | null
  deleted?: boolean
}

export const asaasConfigurado = () => !!CONFIG.asaas.apiKey

async function asaas<T>(path: string): Promise<T> {
  if (!CONFIG.asaas.apiKey) throw new Error('ASAAS_API_KEY ausente')
  for (let tentativa = 0; ; tentativa++) {
    const r = await fetch(`${CONFIG.asaas.url}${path}`, {
      headers: { access_token: CONFIG.asaas.apiKey, 'User-Agent': 'control-gestao-anna', Accept: 'application/json' },
    })
    const texto = await r.text()
    if (r.ok) return JSON.parse(texto) as T
    if ((r.status === 429 || r.status >= 500) && tentativa < 3) { await new Promise(res => setTimeout(res, 1500 * (tentativa + 1))); continue }
    throw new Error(`Asaas GET ${path.split('?')[0]} -> ${r.status}: ${texto.slice(0, 200)}`)
  }
}

/** Lista cobranças com filtros do Asaas (status, dueDate[ge], dueDate[le], paymentDate[ge]…), paginando. */
export async function listarCobrancas(filtros: Record<string, string>, max = 2000): Promise<Cobranca[]> {
  const out: Cobranca[] = []
  for (let offset = 0; offset < max; offset += 100) {
    const q = new URLSearchParams({ ...filtros, offset: String(offset), limit: '100' })
    const d = await asaas<{ data?: Cobranca[]; hasMore?: boolean }>(`/payments?${q}`)
    out.push(...(d.data || []).filter(c => !c.deleted))
    if (!d.hasMore) break
  }
  return out
}

export async function lerCobranca(id: string): Promise<Cobranca> {
  return asaas<Cobranca>(`/payments/${encodeURIComponent(id)}`)
}

const resumo = (c: ClienteAsaas): ClienteAsaas => ({ id: c.id, name: c.name, mobilePhone: c.mobilePhone, phone: c.phone, cpfCnpj: c.cpfCnpj, deleted: c.deleted })
let clientesMemoria: { em: number; mapa: Map<string, ClienteAsaas> } | null = null

/** Todos os clientes de uma vez (349 em out/2026 = 4 páginas), com 6 h de memória no Redis. */
export async function carregarClientes(): Promise<Map<string, ClienteAsaas>> {
  if (clientesMemoria && Date.now() - clientesMemoria.em < 10 * 60_000) return clientesMemoria.mapa
  const chave = k('cob', 'clientes')
  let lista = await redis.get<ClienteAsaas[]>(chave).catch(() => null)
  if (!lista) {
    lista = []
    for (let offset = 0; offset < 20_000; offset += 100) {
      const d = await asaas<{ data?: ClienteAsaas[]; hasMore?: boolean }>(`/customers?limit=100&offset=${offset}`)
      lista.push(...(d.data || []).map(resumo))
      if (!d.hasMore) break
    }
    await redis.set(chave, lista, { ex: 6 * 3600 }).catch(() => undefined)
  }
  clientesMemoria = { em: Date.now(), mapa: new Map(lista.map(c => [c.id, c])) }
  return clientesMemoria.mapa
}

/** Cliente do Asaas: da lista carregada; se for novo (criado depois), busca só ele. */
export async function lerCliente(id: string): Promise<ClienteAsaas> {
  const daLista = (await carregarClientes().catch(() => null))?.get(id)
  if (daLista) return daLista
  return resumo(await asaas<ClienteAsaas>(`/customers/${encodeURIComponent(id)}`))
}

/** Cobranças vencidas e não pagas de um cliente (para saber se a tag de inadimplente pode sair). */
export async function emAtrasoDoCliente(customer: string): Promise<Cobranca[]> {
  return listarCobrancas({ customer, status: 'OVERDUE' }, 200)
}
