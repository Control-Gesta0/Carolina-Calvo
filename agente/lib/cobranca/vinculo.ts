import { PIPELINES, STATUS } from '../crm-map'
import { cardsDoTelefone } from '../cards-do-telefone'
import { k, redis } from '../redis'
import type { ClienteAsaas } from '../asaas'

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

export async function leadDoCliente(cli: ClienteAsaas): Promise<{ leadId: number; nomeCard: string; cliente: boolean } | null> {
  const memoria = k('cob', 'vinculo', cli.id)
  const guardado = await redis.get<{ leadId: number; nomeCard: string; cliente: boolean }>(memoria).catch(() => null)
  if (guardado) return guardado
  const l = escolherLead(await cardsDoTelefone([cli.mobilePhone, cli.phone]))
  if (!l) return null
  const r = { leadId: l.id, nomeCard: l.name || '', cliente: l.pipeline_id === PIPELINES.gestao || l.pipeline_id === PIPELINES.financeiro }
  // card fora do Financeiro/Gestão guarda só 1 h: a equipe pode mover o card ou criar o de cliente
  await redis.set(memoria, r, { ex: r.cliente ? 7 * 86400 : 3600 }).catch(() => undefined)
  return r
}
