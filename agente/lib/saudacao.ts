import { colunaPelaFaixa, CRM_MAP, PIPELINES, STATUS } from './crm-map'
import { logExec } from './execlog'
import { iniciarRegua } from './followup'
import { appendMessage, getHistory, rememberSent } from './history'
import { agendarJob, type Job } from './jobs'
import { addLeadNote, fieldValue, getLead, getTemplateText, kommoGet, updateLeadStatus, type KommoLead } from './kommo'
import { getState, patchState } from './state'
import { k, redis } from './redis'
import { lerSaudacao } from './plantao'

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
export async function esperarSaudacao(leadId: number, agora = Date.now(), modelo?: number): Promise<void> {
  await patchState(leadId, { etapa: 'q1', inicioEm: agora - 1000, saudacaoKommo: agora, saudacaoModelo: modelo })
  await agendarJob({ tipo: 'saudacao', leadId, quando: agora + ESPERAS_MIN[0] * 60_000, token: String(agora), dados: { tentativa: 0 } })
}

/** A saudação saiu (vista pelo webhook de saída ou pelo histórico do Kommo): começa a régua. */
export async function confirmarSaudacao(leadId: number, texto: string, origem: string): Promise<void> {
  const st = await getState(leadId)
  if (!st.saudacaoKommo) return
  await patchState(leadId, { saudacaoKommo: undefined })
  // o Kommo às vezes entrega o webhook de saída da saudação minutos depois (caso Gilse, 09/11): o texto fica
  // marcado como da Anna, para essa entrega atrasada nunca ser lida como a equipe escrevendo
  await rememberSent(leadId, texto).catch(() => undefined)
  await appendMessage(leadId, { id: `saudacao:${st.saudacaoKommo}`, dir: 'out', text: texto, ts: Date.now() })
  await iniciarRegua(leadId, 'qualificacao', Date.now())
  const lead = await getLead(leadId).catch(() => null)
  // PRIMEIRO_CONTATO=kommo: a saudação é do robô da etapa; o card só sai de Contato inicial depois que ela saiu
  if (lead) await moverPelaFaixaNaEntrada(lead).catch(e => logExec({ tipo: 'erro', leadId, detalhe: `faixa na entrada: ${(e instanceof Error ? e.message : String(e)).slice(0, 160)}` }))
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
    const nome = String(fieldValue(lead, CRM_MAP.campos.primeiroNome) || '')
    const modelo = await getTemplateText(st.saudacaoModelo || CRM_MAP.modelos.primeiroContato.templateId).catch(() => '')
    const texto = modelo.replace(/\{\{lead\.cf\.\d+\}\}/g, nome).trim() || '[saudação do robô do Kommo]'
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

// ---------- Mensagem de saída que é modelo da Anna (não é a equipe) ----------

const norm = (t: string) => (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '')

/**
 * Puro: o texto é este modelo do Kommo, com as variáveis ({{lead.cf.…}}) preenchidas? Compara só letras e
 * números (o WhatsApp mexe em negrito, emoji e espaços) e exige os trechos fixos do modelo, na ordem.
 */
export function bateComModelo(texto: string, modelo: string): boolean {
  const trechos = (modelo || '').split(/\{\{[^}]*\}\}/).map(norm).filter(Boolean)
  if (trechos.reduce((n, t) => n + t.length, 0) < 40) return false
  const t = norm(texto)
  let pos = 0
  for (const tr of trechos) {
    const i = t.indexOf(tr, pos)
    if (i < 0) return false
    pos = i + tr.length
  }
  return true
}

/** Puro: assinatura da saudação, para quando o modelo não pôde ser lido do Kommo. */
const RX_ASSINATURA_SAUDACAO = /me responda apenas 1, 2 ou 3|imagine poder respirar financeiramente/i

/** Os modelos que a Anna (ou os robôs dela) enviam: saudação do expediente e do plantão, follow-ups, lembretes, cobrança. */
function idsDosModelos(): number[] {
  const ids = new Set<number>(Object.values(CRM_MAP.modelos).map(m => m.templateId))
  ids.add(51744) // saudação antiga (v1)
  for (const v of [process.env.SAUDACAO_EXPEDIENTE, process.env.SAUDACAO_PLANTAO]) { const s = lerSaudacao(v); if (s) ids.add(s.templateId) }
  return [...ids].filter(id => id > 0)
}

/** A mensagem de saída é um modelo da Anna (saudação, follow-up, lembrete), e não a equipe escrevendo? */
export async function ehModeloDaAnna(texto: string): Promise<boolean> {
  if (RX_ASSINATURA_SAUDACAO.test(texto)) return true
  return (await textosDosModelos()).some(m => bateComModelo(texto, m))
}

/** Os textos dos modelos, guardados por 1 dia (lidos um a um do Kommo, sem estourar o limite de chamadas). */
async function textosDosModelos(): Promise<string[]> {
  const chave = k('modelos-texto')
  const guardado = await redis.get<Record<string, string>>(chave).catch(() => null)
  const ids = idsDosModelos()
  if (guardado && ids.every(id => String(id) in guardado)) return ids.map(id => guardado[String(id)])
  const lidos: Record<string, string> = {}
  for (const id of ids) lidos[String(id)] = await getTemplateText(id).catch(() => '')
  if (Object.values(lidos).some(Boolean)) await redis.set(chave, lidos, { ex: 86400 }).catch(() => undefined)
  return ids.map(id => lidos[String(id)])
}

/** Já está no histórico (a saudação confirmada pelo relógio, por exemplo)? Evita a mesma mensagem duas vezes. */
export async function jaNoHistorico(leadId: number, texto: string): Promise<boolean> {
  const n = norm(texto)
  return (await getHistory(leadId).catch(() => [])).slice(-30).some(h => h.dir === 'out' && norm(h.text) === n)
}

/**
 * Faixa do formulário na ENTRADA (Dra., 10/11, caso Luciano): "de 10 a 15" → 10 A 15 MIL e "acima de 15" →
 * ACIMA DE 15 MIL logo que o card entra, sem esperar resposta nem o 1º follow-up. Só sai de Contato inicial; os
 * follow-ups seguem; a renda confirmada na conversa continua decidindo a coluna final. As faixas baixas (e a vazia)
 * ficam em Contato inicial e vão para AGUARDANDO QUALIFICAÇÃO no 1º follow-up, como antes.
 */
export async function moverPelaFaixaNaEntrada(lead: KommoLead): Promise<number | null> {
  if (lead.pipeline_id !== PIPELINES.sdr || lead.status_id !== STATUS.contatoInicial) return null
  const faixa = String(fieldValue(lead, CRM_MAP.campos.formSalario) || '')
  const destino = colunaPelaFaixa(faixa)
  if (destino !== STATUS.de10a15 && destino !== STATUS.acima15) return null
  await updateLeadStatus(lead.id, destino, PIPELINES.sdr)
  await addLeadNote(lead.id, `Anna: pela faixa do formulário ("${faixa}"), card movido para ${destino === STATUS.acima15 ? 'ACIMA DE 15 MIL' : '10 A 15 MIL'} na entrada. Os follow-ups seguem normalmente; a renda confirmada na conversa continua valendo para a coluna final.`).catch(() => undefined)
  await logExec({ tipo: 'pulou', leadId: lead.id, nome: lead.name, detalhe: `entrada: card movido pela faixa do formulário para ${destino === STATUS.acima15 ? 'ACIMA DE 15 MIL' : '10 A 15 MIL'}` })
  return destino
}
