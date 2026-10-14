import { PIPELINES, STATUS } from '../crm-map'
import { kommoGet } from '../kommo'
import { k, redis } from '../redis'
import type { ClienteAsaas } from '../asaas'
import { chaveTelefone } from './regua'

/**
 * Cliente do Asaas → card do Kommo. O Kommo não tem campo de CPF: a ligação é
 * pelo TELEFONE (DDD + 8 últimos dígitos, que ignora +55 e o 9 a mais). Entre os
 * cards do contato, vale o de Gestão operacional, depois o do Financeiro, depois
 * o mais recente. Sem card: a mensagem não sai e o diário da cobrança mostra.
 */

export interface LeadResumo { id: number; name?: string; pipeline_id: number; status_id: number; updated_at?: number }

/** Puro: o card certo entre os do contato. */
export function escolherLead(leads: LeadResumo[]): LeadResumo | null {
  if (!leads.length) return null
  const peso = (l: LeadResumo) =>
    (l.pipeline_id === PIPELINES.gestao ? 3 : l.pipeline_id === PIPELINES.financeiro ? 2 : 0) * 10 + (l.status_id === STATUS.perdido ? 0 : 1)
  return [...leads].sort((a, b) => peso(b) - peso(a) || (b.updated_at || 0) - (a.updated_at || 0))[0]
}

interface Contato { id: number; custom_fields_values?: Array<{ field_code?: string; values: Array<{ value?: unknown }> }> | null; _embedded?: { leads?: Array<{ id: number }> } }

export async function leadDoCliente(cli: ClienteAsaas): Promise<{ leadId: number; nomeCard: string; cliente: boolean } | null> {
  const memoria = k('cob', 'vinculo', cli.id)
  const guardado = await redis.get<{ leadId: number; nomeCard: string; cliente: boolean }>(memoria).catch(() => null)
  if (guardado) return guardado
  const chaves = [...new Set([cli.mobilePhone, cli.phone].map(chaveTelefone).filter((c): c is string => !!c))]
  const ids = new Set<number>()
  for (const chave of chaves) {
    const d = await kommoGet<{ _embedded?: { contacts?: Contato[] } }>(`/api/v4/contacts?query=${chave.slice(-8)}&with=leads&limit=50`)
    for (const c of d?._embedded?.contacts || []) {
      const tels = (c.custom_fields_values || []).filter(f => f.field_code === 'PHONE').flatMap(f => f.values.map(v => String(v.value || '')))
      if (tels.some(t => chaveTelefone(t) === chave)) for (const l of c._embedded?.leads || []) ids.add(l.id)
    }
  }
  if (!ids.size) return null
  const d = await kommoGet<{ _embedded?: { leads?: LeadResumo[] } }>(`/api/v4/leads?${[...ids].slice(0, 50).map(id => `filter[id][]=${id}`).join('&')}&limit=50`)
  const l = escolherLead(d?._embedded?.leads || [])
  if (!l) return null
  const r = { leadId: l.id, nomeCard: l.name || '', cliente: l.pipeline_id === PIPELINES.gestao || l.pipeline_id === PIPELINES.financeiro }
  await redis.set(memoria, r, { ex: 7 * 86400 }).catch(() => undefined)
  return r
}
