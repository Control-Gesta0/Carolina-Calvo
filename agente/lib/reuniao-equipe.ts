import { CONFIG } from './config'
import { CRM_MAP, PIPELINES } from './crm-map'
import { logExec } from './execlog'
import { agendaConectada, apagarReuniao, criarReuniao } from './google'
import { addLeadNote, getMainContactName, kommoGet, updateLeadFields, type KommoLead } from './kommo'
import { reuniaoDoCard } from './pos-reuniao'
import { k, redis } from './redis'
import { getState, patchState } from './state'
import { quandoExtenso } from './anna/agenda'

/**
 * REUNIÃO MARCADA PELA EQUIPE NO KOMMO → AGENDA GOOGLE (Dra., 09/11/2026).
 * Quando a equipe preenche (ou muda) o campo "Reunião" do card, a Anna cria o evento na agenda Google da
 * Dra., com link do Meet (gravado no card). Se a equipe remarcar, o evento é movido; se apagar a data, o
 * evento sai. Se a equipe remarcar uma reunião que a Anna marcou, o evento antigo da Anna sai da agenda.
 */

export interface Sincronizado { eventId: string; inicio: number }
export type Acao = 'nada' | 'criar' | 'mover' | 'apagar' | 'remarcou-da-anna'

const DURACAO_S = 30 * 60
/** a sincronização vale para reuniões marcadas/remarcadas a partir daqui (09/11/2026 14:55 em Brasília) */
const INICIO_SINCRONIA = Date.parse('2026-11-09T17:55:00Z')

/** Puro: o que fazer com a agenda Google, dado o campo "Reunião" (segundos), o que já foi sincronizado e a reunião da Anna. */
export function decidir(o: { reuniao: number | null; agoraMs: number; sincronizado: Sincronizado | null; reuniaoDaAnna: number | null }): Acao {
  if (o.reuniaoDaAnna && o.reuniao === o.reuniaoDaAnna) return 'nada' // a própria Anna marcou: o evento já existe
  if (!o.reuniao) return o.sincronizado ? 'apagar' : 'nada'
  if (o.reuniao * 1000 < o.agoraMs) return 'nada' // data no passado: não cria evento
  if (o.sincronizado?.inicio === o.reuniao) return 'nada' // já está na agenda
  if (o.reuniaoDaAnna) return 'remarcou-da-anna'
  return o.sincronizado ? 'mover' : 'criar'
}

const K = (leadId: number) => k('reuniao-equipe', leadId)

/** Webhook de lead: confere o campo "Reunião" e acerta a agenda Google. Devolve o que fez, ou null. */
export async function sincronizarReuniaoEquipe(lead: KommoLead): Promise<string | null> {
  if (lead.pipeline_id !== PIPELINES.closer && lead.pipeline_id !== PIPELINES.sdr) return null
  const reuniao = reuniaoDoCard(lead)
  const sincronizado = await redis.get<Sincronizado>(K(lead.id)).catch(() => null)
  if (!reuniao && !sincronizado) return null
  const st = await getState(lead.id)
  const reuniaoDaAnna = st.reuniao ? Math.floor(Date.parse(st.reuniao.inicio) / 1000) : null
  const acao = decidir({ reuniao, agoraMs: Date.now(), sincronizado, reuniaoDaAnna })
  if (acao === 'nada') return null
  // só reuniões marcadas ou remarcadas depois que isto entrou no ar: as de antes podem já estar na agenda (à mão)
  if (!sincronizado && acao !== 'apagar') {
    const ultima = await kommoGet<{ _embedded?: { events?: Array<{ created_at: number }> } }>(
      `/api/v4/events?filter[entity]=lead&filter[entity_id]=${lead.id}&filter[type]=custom_field_${CRM_MAP.campos.reuniao}_value_changed&limit=1`).catch(() => null)
    const quando = ultima?._embedded?.events?.[0]?.created_at
    if (!quando || quando * 1000 < INICIO_SINCRONIA) {
      await redis.set(K(lead.id), { eventId: '', inicio: reuniao! } satisfies Sincronizado, { ex: 90 * 86400 })
      return null
    }
  }
  if (!(await agendaConectada())) return null
  // webhook repetido: uma vez por card e por data
  if ((await redis.set(k('reuniao-equipe', 'lock', lead.id, reuniao ?? 0), '1', { nx: true, ex: 600 })) !== 'OK') return null

  if (acao === 'apagar') {
    if (!sincronizado!.eventId) { await redis.del(K(lead.id)); return null }
    await apagarReuniao(sincronizado!.eventId).catch(() => undefined)
    await redis.del(K(lead.id))
    await addLeadNote(lead.id, 'Anna: a data da reunião foi apagada no card. O evento saiu da agenda Google da Dra.')
    await logExec({ tipo: 'pulou', leadId: lead.id, nome: lead.name, detalhe: 'reunião da equipe apagada: evento removido do Google' })
    return 'evento apagado'
  }
  // a anterior sai da agenda: a da Anna (remarcada pela equipe) ou a que já tinha sido sincronizada
  if (acao === 'remarcou-da-anna') await apagarReuniao(st.reuniao!.eventId).catch(() => undefined)
  if (acao === 'mover' && sincronizado!.eventId) await apagarReuniao(sincronizado!.eventId).catch(() => undefined)

  const inicio = new Date(reuniao! * 1000)
  const nome = (await getMainContactName(lead).catch(() => '')) || lead.name || 'lead'
  const ev = await criarReuniao({
    inicio, fim: new Date(inicio.getTime() + DURACAO_S * 1000),
    titulo: `Reunião on-line · ${nome} · superendividamento`,
    descricao: `Marcada pela equipe no Kommo.\n${CONFIG.kommoDomain}/leads/detail/${lead.id}`,
  })
  await redis.set(K(lead.id), { eventId: ev.id, inicio: reuniao! } satisfies Sincronizado, { ex: 90 * 86400 })
  // a reunião da Anna passa a ser esta (cancelamento e remarcação pelo lead continuam funcionando)
  if (st.reuniao) await patchState(lead.id, { reuniao: { eventId: ev.id, inicio: inicio.toISOString(), link: ev.link, criadaEm: new Date().toISOString() } })
  await updateLeadFields(lead.id, [
    { field_id: CRM_MAP.campos.linkMeet, values: [{ value: ev.link }] },
    { field_id: CRM_MAP.campos.horarioReuniao, values: [{ value: quandoExtenso(inicio) }] },
  ])
  const quando = quandoExtenso(inicio)
  const texto = acao === 'criar' ? `Anna: reunião de ${quando} (marcada pela equipe) criada na agenda Google da Dra. Link do Meet: ${ev.link}`
    : acao === 'mover' ? `Anna: reunião remarcada pela equipe para ${quando}. O evento foi movido na agenda Google. Link do Meet: ${ev.link}`
    : `Anna: a equipe remarcou a reunião que a Anna tinha marcado para ${quando}. O evento antigo saiu da agenda Google e o novo foi criado. Link do Meet: ${ev.link}`
  await addLeadNote(lead.id, texto)
  await logExec({ tipo: 'pulou', leadId: lead.id, nome: lead.name, detalhe: `reunião da equipe → Google (${acao}): ${quando}` })
  return `${acao}: ${quando}`
}
