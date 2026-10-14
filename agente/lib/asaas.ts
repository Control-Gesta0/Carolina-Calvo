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

/** Cliente do Asaas, com 1 dia de memória no Redis (nome e telefone mudam pouco). */
export async function lerCliente(id: string): Promise<ClienteAsaas> {
  const chave = k('cob', 'cliente', id)
  const guardado = await redis.get<ClienteAsaas>(chave).catch(() => null)
  if (guardado) return guardado
  const c = await asaas<ClienteAsaas>(`/customers/${encodeURIComponent(id)}`)
  await redis.set(chave, { id: c.id, name: c.name, mobilePhone: c.mobilePhone, phone: c.phone, cpfCnpj: c.cpfCnpj, deleted: c.deleted }, { ex: 86400 }).catch(() => undefined)
  return c
}

/** Cobranças vencidas e não pagas de um cliente (para saber se a tag de inadimplente pode sair). */
export async function emAtrasoDoCliente(customer: string): Promise<Cobranca[]> {
  return listarCobrancas({ customer, status: 'OVERDUE' }, 200)
}
