import { PIPELINES } from './crm-map'
import { contatosDoTelefone, telefonesDoContatoId } from './cards-do-telefone'
import { logExec } from './execlog'
import { cancelarRegua } from './followup'
import { addLeadNote, kommoGet, kommoPost, type KommoLead } from './kommo'
import { patchState } from './state'

/**
 * CONVERSA PRESA NO CARD ANTIGO (teste de 03/11/2026).
 * Quando o lead volta e ganha um card novo, a conversa do WhatsApp continua ligada ao card antigo:
 * a saudação sai nela e a resposta do lead cai no card antigo, não no novo. Fechar a conversa
 * antiga faz o Kommo abrir uma conversa nova, ligada ao card novo, na próxima mensagem do lead.
 * Só mexe em conversa de card antigo do SDR (quem já fez reunião ou é cliente nem chega aqui:
 * a memória passa para a equipe antes). No card antigo, a Anna para e deixa nota.
 */

export interface Conversa { id: number; entity_type?: string; entity_id?: number; status?: string }

/** Puro: as conversas abertas presas em outro card do SDR. */
export function conversasParaFechar(conversas: Conversa[], novoId: number, cardsSdr: Set<number>): Conversa[] {
  return conversas.filter(t => t.entity_type === 'lead' && t.entity_id != null && t.entity_id !== novoId && t.status !== 'closed' && cardsSdr.has(t.entity_id))
}

export async function soltarConversaAntiga(lead: KommoLead): Promise<string[]> {
  const principal = (lead._embedded?.contacts || []).find(x => x.is_main) || lead._embedded?.contacts?.[0]
  if (!principal) return []
  const contatos = await contatosDoTelefone(await telefonesDoContatoId(principal.id))
  const ids = new Set<number>()
  for (const c of contatos) {
    const d = await kommoGet<{ _embedded?: { events?: Array<{ value_after?: Array<{ message?: { talk_id?: number } }> }> } }>(
      `/api/v4/events?filter[entity]=contact&filter[entity_id]=${c.id}&filter[type]=incoming_chat_message,outgoing_chat_message&limit=20`)
    for (const e of d?._embedded?.events || []) { const t = e.value_after?.[0]?.message?.talk_id; if (t) ids.add(t) }
  }
  if (!ids.size) return []
  const conversas: Conversa[] = []
  for (const id of ids) { const t = await kommoGet<Conversa>(`/api/v4/talks/${id}`).catch(() => null); if (t) conversas.push(t) }
  const outros = [...new Set(conversas.map(t => t.entity_id).filter((x): x is number => !!x && x !== lead.id))]
  const cardsSdr = new Set<number>()
  for (const id of outros) { const l = await kommoGet<KommoLead>(`/api/v4/leads/${id}`).catch(() => null); if (l?.pipeline_id === PIPELINES.sdr) cardsSdr.add(id) }
  const feitos: string[] = []
  for (const t of conversasParaFechar(conversas, lead.id, cardsSdr)) {
    await kommoPost(`/api/v4/talks/${t.id}/close`, { force_close: true })
    const antigo = t.entity_id as number
    await cancelarRegua(antigo)
    await patchState(antigo, { etapa: 'humano', finalizado: { motivo: `o lead voltou pelo card ${lead.id}`, em: new Date().toISOString() } })
    await addLeadNote(antigo, `Anna: este lead voltou por um card novo (${lead.id}). A conversa do WhatsApp foi fechada aqui para a próxima mensagem dele cair no card novo. A Anna não fala mais por este card.`)
    feitos.push(`conversa ${t.id} do card ${antigo} fechada`)
  }
  if (feitos.length) await logExec({ tipo: 'pulou', leadId: lead.id, nome: lead.name, tools: feitos, detalhe: 'lead voltou: conversa antiga fechada para a resposta cair no card novo' })
  return feitos
}
