import { CRM_MAP } from './crm-map'
import { logExec } from './execlog'
import { iniciarRegua } from './followup'
import { appendMessage } from './history'
import { agendarJob, type Job } from './jobs'
import { addLeadNote, getLead, getTemplateText, kommoGet } from './kommo'
import { getState, patchState } from './state'

/**
 * SAUDAÇÃO PELO KOMMO (PRIMEIRO_CONTATO=kommo), solução do Guilherme de 23/10:
 * o lead de formulário não abriu conversa com o escritório, então quem manda a 1ª mensagem é um
 * robô do próprio Kommo, com a saudação aprovada pela Meta, e isso abre a conversa. A Anna não
 * envia: marca o lead na 1ª pergunta e espera. Quando a saudação aparece no WhatsApp do contato,
 * ela começa a régua de follow-up; quando o lead responde, ela segue a qualificação.
 * Se em 5 e em 30 minutos o Kommo não registrar a saudação, a equipe é avisada no card.
 */

const ESPERAS_MIN = [5, 30]

/** Lead de formulário entrou: a Anna espera a saudação do robô do Kommo. */
export async function esperarSaudacao(leadId: number, agora = Date.now()): Promise<void> {
  await patchState(leadId, { etapa: 'q1', inicioEm: agora - 1000, saudacaoKommo: agora })
  await agendarJob({ tipo: 'saudacao', leadId, quando: agora + ESPERAS_MIN[0] * 60_000, token: String(agora), dados: { tentativa: 0 } })
}

/** A saudação saiu (vista pelo webhook de saída ou pelo histórico do Kommo): começa a régua. */
export async function confirmarSaudacao(leadId: number, texto: string, origem: string): Promise<void> {
  const st = await getState(leadId)
  if (!st.saudacaoKommo) return
  await patchState(leadId, { saudacaoKommo: undefined })
  await appendMessage(leadId, { id: `saudacao:${st.saudacaoKommo}`, dir: 'out', text: texto, ts: Date.now() })
  await iniciarRegua(leadId, 'qualificacao', Date.now())
  const lead = await getLead(leadId).catch(() => null)
  await logExec({ tipo: 'inicio', leadId, nome: lead?.name, etapa: 'q1', tools: ['primeiro contato: saudação do robô do Kommo enviada'], detalhe: `envio confirmado no WhatsApp (${origem})` })
}

/** Job do relógio: a saudação já apareceu no WhatsApp do contato? */
export async function verificarSaudacao(job: Job): Promise<string> {
  const st = await getState(job.leadId)
  if (!st.saudacaoKommo || String(st.saudacaoKommo) !== job.token) return 'saudação já confirmada'
  const lead = await getLead(job.leadId)
  const c = (lead._embedded?.contacts || []).find(x => x.is_main) || lead._embedded?.contacts?.[0]
  const desde = Math.floor(st.saudacaoKommo / 1000) - 60
  const d = c ? await kommoGet<{ _embedded?: { events?: unknown[] } }>(`/api/v4/events?filter[entity]=contact&filter[entity_id]=${c.id}&filter[type]=outgoing_chat_message&filter[created_at][from]=${desde}&limit=1`) : null
  if ((d?._embedded?.events || []).length) {
    const texto = await getTemplateText(CRM_MAP.modelos.primeiroContato.templateId).catch(() => '') || '[saudação do robô do Kommo]'
    await confirmarSaudacao(job.leadId, texto, 'histórico do Kommo')
    return 'saudação do Kommo confirmada'
  }
  const tentativa = Number(job.dados?.tentativa ?? 0) + 1
  if (tentativa < ESPERAS_MIN.length) {
    await agendarJob({ tipo: 'saudacao', leadId: job.leadId, quando: st.saudacaoKommo + ESPERAS_MIN[tentativa] * 60_000, token: job.token, dados: { tentativa } })
    return `saudação ainda não registrada: nova conferência em ${ESPERAS_MIN[tentativa]} min`
  }
  await patchState(job.leadId, { saudacaoKommo: undefined })
  await addLeadNote(job.leadId, `Anna: a saudação do robô do Kommo NÃO apareceu no WhatsApp deste contato em ${ESPERAS_MIN[ESPERAS_MIN.length - 1]} minutos. Nada chegou ao lead. A equipe precisa fazer o contato.`)
  await logExec({ tipo: 'erro', leadId: job.leadId, nome: lead.name, detalhe: 'a saudação do robô do Kommo não saiu: nenhuma mensagem de saída no WhatsApp do contato' })
  return 'saudação do Kommo não saiu: equipe avisada'
}
