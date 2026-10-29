import { CONFIG } from './config'
import { CRM_MAP, PIPELINES, STATUS } from './crm-map'
import { querContratar } from './contratar'
import { logExec } from './execlog'
import { ajustarJanela } from './followup'
import { agendarJob, type Job } from './jobs'
import { addLeadNote, addLeadTask, fieldValue, getLead, getMainContactName, kommoGet, leadTags, updateLeadStatus, type KommoLead } from './kommo'
import { enviarModelo } from './modelos'
import { primeiroNome } from './anna/producao'
import { agendaConectada, ocupados } from './google'
import { k, redis } from './redis'

/**
 * PÓS-REUNIÃO (Dra., 15 e 22/10/2026), para QUALQUER reunião, marcada pela Anna ou pela equipe:
 *  - 23 horas depois do horário da reunião (campo "Reunião" do card) sai o modelo "Pergunta reunião":
 *    "Olá, tudo bem? Ontem você esteve em reunião com a Dra. Carolina Calvo. Ficou com alguma dúvida...";
 *  - quando o cliente responde depois da reunião, o card vai para Closer › Retorno imediato com tarefa
 *    prioritária e NENHUMA mensagem sai para ele;
 *  - em Cliente indeciso não há automação.
 * Liga com POS_REUNIAO=true (todas as reuniões) ou POS_REUNIAO=teste (só os cards de TEST_LEAD_IDS).
 * Substitui a régua "pós-proposta" (24h depois de entrar em Cliente decisão, que ficou desligada).
 */

export const HORAS_DEPOIS = 23
const H = 3600_000

/** Etapas em que o follow-up ainda faz sentido: a reunião está marcada ou o cliente está decidindo. */
const ETAPAS = [STATUS.reuniaoAgendada, STATUS.clienteDecisao] as number[]

export const posReuniaoVale = (leadId: number) =>
  CONFIG.posReuniao === 'on' || (CONFIG.posReuniao === 'teste' && CONFIG.testLeadIds.includes(leadId))

/** Data da reunião no card (campo "Reunião", epoch em segundos), ou null. */
export const reuniaoDoCard = (lead: KommoLead): number | null => {
  const v = Number(fieldValue(lead, CRM_MAP.campos.reuniao))
  return Number.isFinite(v) && v > 0 ? v : null
}

/** Puro: quando sai o follow-up de uma reunião (23h depois, dentro da janela de envio 7h–20h). */
export const horaDoFollowup = (reuniaoSeg: number) => ajustarJanela(reuniaoSeg * 1000 + HORAS_DEPOIS * H)

export interface DestinoResposta { statusId: number; tarefa: string }

/**
 * Puro: o cliente escreveu num card do Closer. Vai para Retorno imediato? (null = não mexe)
 * Cliente decisão → sempre. Reunião agendada → só depois do horário da reunião.
 */
export function destinoPosReuniao(lead: Pick<KommoLead, 'pipeline_id' | 'status_id'>, reuniaoSeg: number | null, texto: string | null | undefined, agoraMs: number): DestinoResposta | null {
  if (lead.pipeline_id !== PIPELINES.closer) return null
  const contratar = querContratar(texto)
  if (lead.status_id === STATUS.clienteDecisao) {
    return { statusId: STATUS.retornoImediato, tarefa: contratar ? 'Lead deseja contratar — retorno imediato' : 'Lead respondeu em Cliente decisão — retorno imediato' }
  }
  if (lead.status_id === STATUS.reuniaoAgendada && reuniaoSeg && reuniaoSeg * 1000 < agoraMs) {
    return { statusId: STATUS.retornoImediato, tarefa: contratar ? 'Lead deseja contratar — retorno imediato' : 'Lead respondeu depois da reunião — retorno imediato' }
  }
  return null
}

/** Puro: a reunião continua na agenda? (algum horário ocupado cobre o início dela) */
export function reuniaoNaAgenda(ocupadosNaHora: Array<{ inicio: number; fim: number }>, reuniaoSeg: number): boolean {
  const t = reuniaoSeg * 1000
  return ocupadosNaHora.some(b => b.inicio <= t && b.fim > t)
}

/** Agenda o follow-up da reunião do card (uma vez por data de reunião). Devolve o que fez, ou null. */
export async function agendarPosReuniao(lead: KommoLead): Promise<string | null> {
  if (!posReuniaoVale(lead.id) || lead.pipeline_id !== PIPELINES.closer || !ETAPAS.includes(lead.status_id)) return null
  const reuniao = reuniaoDoCard(lead)
  if (!reuniao) return null
  const quando = horaDoFollowup(reuniao)
  if (quando < Date.now() - H) return null
  if ((await redis.set(k('posreuniao', lead.id, reuniao), '1', { nx: true, ex: 30 * 86400 })) !== 'OK') return null
  await agendarJob({ tipo: 'posreuniao', leadId: lead.id, quando, token: String(reuniao) })
  return `follow-up pós-reunião agendado para ${new Date(quando).toISOString()}`
}

/** O cliente escreveu no WhatsApp depois de `desdeSeg`? */
async function escreveuDesde(lead: KommoLead, desdeSeg: number): Promise<boolean> {
  const c = (lead._embedded?.contacts || []).find(x => x.is_main) || lead._embedded?.contacts?.[0]
  if (!c) return false
  const d = await kommoGet<{ _embedded?: { events?: unknown[] } }>(`/api/v4/events?filter[entity]=contact&filter[entity_id]=${c.id}&filter[type]=incoming_chat_message&filter[created_at][from]=${desdeSeg}&limit=1`)
  return (d?._embedded?.events || []).length > 0
}

/** Job do relógio: manda o "Pergunta reunião" se a reunião é a mesma e o cliente ainda não escreveu. */
export async function executarPosReuniao(job: Job): Promise<string> {
  const lead = await getLead(job.leadId)
  if (!posReuniaoVale(lead.id)) return 'pós-reunião desligado'
  if (String(reuniaoDoCard(lead)) !== job.token) return 'cancelado: a reunião mudou'
  if (lead.pipeline_id === PIPELINES.closer && lead.status_id === STATUS.naoCompareceu) {
    await addLeadNote(lead.id, 'Anna: o follow-up pós-reunião NÃO foi enviado, porque o card está em Não compareceu.')
    await logExec({ tipo: 'pulou', leadId: lead.id, nome: lead.name, tools: ['pós-reunião'], detalhe: 'não enviado: o cliente não compareceu' })
    return 'cancelado: o cliente não compareceu'
  }
  if (lead.pipeline_id !== PIPELINES.closer || !ETAPAS.includes(lead.status_id)) return 'cancelado: o card saiu de Reunião agendada / Cliente decisão'
  if (leadTags(lead).some(t => t.toLowerCase() === CRM_MAP.tags.cliente)) return 'cancelado: já é cliente'
  if (await escreveuDesde(lead, Number(job.token))) return 'cancelado: o cliente já escreveu depois da reunião'
  // a reunião aconteceu? Se ela foi apagada ou desmarcada na agenda da Dra., o "Ontem você esteve em reunião" não sai (Dra., 29/10)
  if (await agendaConectada()) {
    const t = Number(job.token) * 1000
    let naAgenda: boolean
    try {
      naAgenda = reuniaoNaAgenda(await ocupados(new Date(t), new Date(t + 30 * 60_000)), Number(job.token))
    } catch (e) {
      await logExec({ tipo: 'erro', leadId: lead.id, nome: lead.name, detalhe: `pós-reunião não enviado: não deu para conferir a agenda (${(e instanceof Error ? e.message : String(e)).slice(0, 160)})` })
      return 'não enviado: agenda indisponível para conferir a reunião'
    }
    if (!naAgenda) {
      await addLeadNote(lead.id, 'Anna: o follow-up pós-reunião NÃO foi enviado, porque a reunião não está mais na agenda da Dra. (foi apagada ou desmarcada).')
      await logExec({ tipo: 'pulou', leadId: lead.id, nome: lead.name, tools: ['pós-reunião'], detalhe: 'não enviado: a reunião não está mais na agenda' })
      return 'cancelado: a reunião não está mais na agenda'
    }
  }
  const nome = primeiroNome(await getMainContactName(lead).catch(() => ''))
  const detalhe = await enviarModelo(lead.id, 'perguntaReuniao', { primeiroNome: nome || undefined })
  await redis.set(k('posreuniao', 'enviado', lead.id), job.token, { ex: 30 * 86400 })
  await addLeadNote(lead.id, 'Anna: follow-up pós-reunião enviado (modelo "Pergunta reunião", 23 horas depois da reunião). Se o cliente responder, o card vai para Retorno imediato com tarefa.')
  await logExec({ tipo: 'followup', leadId: lead.id, nome: lead.name, tools: ['pós-reunião: Pergunta reunião'], detalhe })
  return detalhe
}

/** Inbound: o cliente escreveu num card do Closer depois da reunião → Retorno imediato + tarefa, sem mensagem. */
export async function respostaPosReuniao(lead: KommoLead, texto: string): Promise<string | null> {
  if (!posReuniaoVale(lead.id)) return null
  const d = destinoPosReuniao(lead, reuniaoDoCard(lead), texto, Date.now())
  if (!d) return null
  // um movimento por mensagem, mesmo com webhook repetido
  if ((await redis.set(k('posreuniao', 'resp', lead.id, lead.status_id), '1', { nx: true, ex: 600 })) !== 'OK') return null
  await updateLeadStatus(lead.id, d.statusId, PIPELINES.closer)
  await addLeadTask(lead.id, `${d.tarefa}. Mensagem do cliente: "${texto.slice(0, 200)}"`, CRM_MAP.tarefaPrioritaria)
  await addLeadNote(lead.id, 'O cliente respondeu depois da reunião: card movido para Retorno imediato, com tarefa prioritária. Nenhuma mensagem foi enviada a ele.')
  await logExec({ tipo: 'closer', leadId: lead.id, nome: lead.name, tools: ['pós-reunião: resposta → Retorno imediato', `tarefa: ${d.tarefa}`], detalhe: texto.slice(0, 160) })
  return d.tarefa
}
