import crypto from 'crypto'
import { CONFIG } from './config'
import { processLead } from './agent'
import { continuarDeOndeParou, reguaDaEtapa } from './anna/fluxo'
import { depsProducao, montarCtx } from './anna/producao'
import { comTextos } from './anna/textos'
import { baseVigente } from './base'
import { textosDoRoteiro } from './base-core'
import { iniciarRegua } from './followup'
import { k, redis } from './redis'
import { equipeFalouEm, etiquetaRetomarEm, marcarPausa, pausado, retomadaExpressa, retomar, TAG_RETOMAR } from './pausa'
import { colunaPorRenda, CRM_MAP, PIPELINES, STATUS } from './crm-map'
import { emptyUsage, logExec } from './execlog'
import { getHistory } from './history'
import { agendarJob } from './jobs'
import { addLeadNote, addLeadTags, addLeadTask, getLead, kommoGet, leadTags, removeLeadTags, updateLeadFields, updateLeadStatus, type KommoLead } from './kommo'
import { reuniaoDoCard } from './pos-reuniao'
import { getState, patchState } from './state'
import { aplicarRecuperacao, createRecuperador, type Recuperado } from './anna/recuperar'

/**
 * Na retomada (etiqueta anna-retomar), antes de a Anna dizer qualquer coisa: o que o lead já respondeu na conversa
 * (com ela ou com a equipe) e o horário que a equipe ofereceu (Dra., 10/11/2026, caso Gilse).
 * Devolve o que a retomada deve fazer em seguida.
 */
export async function recuperarNaRetomada(lead: KommoLead): Promise<{ avancou: boolean; oferta: boolean; ofertaAceita: boolean; resumo: string[] }> {
  const leadId = lead.id
  const st = await getState(leadId)
  const desde = st.inicioEm ?? 0
  const conversa = (await getHistory(leadId).catch(() => [])).filter(m => m.ts >= desde)
  let x: Recuperado | null = null
  const usage = emptyUsage()
  if (conversa.length) {
    try {
      x = await createRecuperador({ apiKey: CONFIG.openaiApiKey, model: CONFIG.llmModel }).extrair(conversa, new Date(), usage)
    } catch (e) {
      await logExec({ tipo: 'erro', leadId, nome: lead.name, detalhe: `retomada: não deu para ler o histórico (${(e instanceof Error ? e.message : String(e)).slice(0, 160)}); segue com o que está no card` })
    }
  }
  const reuniaoCard = reuniaoDoCard(lead)
  const ap = aplicarRecuperacao(st, x, conversa, new Date(), !!reuniaoCard && reuniaoCard * 1000 > Date.now())
  if (!Object.keys(ap.patch).length) return { avancou: false, oferta: false, ofertaAceita: false, resumo: [] }

  const p = ap.patch
  if (ap.ofertaEquipe) p.ofertaEquipe = { chave: ap.ofertaEquipe.oferta.chave, enviadaEm: ap.ofertaEquipe.enviadaEm }
  await patchState(leadId, p)
  // o que foi recuperado vai para os campos do card (só os vazios) e a renda acerta a coluna da faixa
  const campos: Array<{ field_id: number; values: Array<{ value: string | number }> }> = []
  if (p.objetivo) campos.push({ field_id: CRM_MAP.campos.objetivo, values: [{ value: String(p.objetivo) }] })
  if (p.rendaBruta != null) campos.push({ field_id: CRM_MAP.campos.rendaBruta, values: [{ value: p.rendaBruta }] })
  if (p.rendaLiquida != null) campos.push({ field_id: CRM_MAP.campos.rendaLiquida, values: [{ value: p.rendaLiquida }] })
  if (p.descontoConta != null) campos.push({ field_id: CRM_MAP.campos.descontoConta, values: [{ value: p.descontoConta }] })
  if (campos.length) await updateLeadFields(leadId, campos).catch(() => undefined)
  const agora = await getLead(leadId).catch(() => lead)
  const colunasDaQualificacao: number[] = [STATUS.contatoInicial, STATUS.aguardandoQualificacao, STATUS.de10a15, STATUS.acima15, STATUS.desqualificado]
  if (p.rendaBruta != null && agora.pipeline_id === PIPELINES.sdr && colunasDaQualificacao.includes(agora.status_id) && agora.status_id !== colunaPorRenda(p.rendaBruta)) {
    await updateLeadStatus(leadId, colunaPorRenda(p.rendaBruta), PIPELINES.sdr).catch(() => undefined)
  }
  // follow-up do horário da equipe: 1 h depois da oferta (ou já, se a oferta tem mais de 1 h), uma vez
  if (ap.ofertaEquipe && !ap.ofertaEquipe.aceita) {
    const quando = Math.max(ap.ofertaEquipe.enviadaEm + 3600_000, Date.now() + 60_000)
    await agendarJob({ tipo: 'oferta-equipe', leadId, quando, token: ap.ofertaEquipe.oferta.chave })
  }
  await addLeadNote(leadId, `Anna: na retomada, conferiu a conversa e o card antes de falar com o lead. Já informado: ${ap.resumo.join(' · ')}. ${ap.ofertaEquipe
    ? `Ela acompanha o horário oferecido pela equipe (não oferece outro${ap.ofertaEquipe.aceita ? '' : ', e manda o follow-up 1 h depois da oferta se o lead não confirmar'}). A reunião só é marcada quando o lead confirmar.`
    : 'Nada disso será perguntado de novo.'}`).catch(() => undefined)
  await logExec({ tipo: 'pulou', leadId, nome: lead.name, etapa: p.etapa || st.etapa, detalhe: `retomada: recuperado do histórico (${ap.resumo.join(' · ')})`, usage: usage.calls ? usage : undefined })
  return { avancou: ap.avancou, oferta: !!ap.ofertaEquipe, ofertaAceita: !!ap.ofertaEquipe?.aceita, resumo: ap.resumo }
}

/**
 * Etiqueta anna-retomar no card (webhook ou varredura do relógio). Só devolve o atendimento se a etiqueta foi colocada
 * depois da última mensagem da equipe e sozinha (Dra., 12/11, caso Antonio); senão, tira a etiqueta antiga e a Anna
 * continua pausada. Devolve o que fez.
 */
export async function tratarRetomada(lead: KommoLead): Promise<string> {
  const [etiqueta, equipeEm] = await Promise.all([etiquetaRetomarEm(lead.id), equipeFalouEm(lead.id)])
  if (!retomadaExpressa({ etiqueta, equipeEm })) {
    if ((await redis.set(k('retomar-antiga', lead.id, etiqueta?.em ?? 0), '1', { nx: true, ex: 86400 })) !== 'OK') return 'etiqueta antiga já tratada'
    await removeLeadTags(lead.id, [TAG_RETOMAR])
    if (!leadTags(lead).some(t => t.toLowerCase() === CONFIG.humanTag)) await addLeadTags(lead.id, [CONFIG.humanTag])
    if (!(await pausado(lead.id))) await marcarPausa(lead.id, 'etiqueta anna-retomar antiga: a equipe segue no atendimento')
    const quando = (ms: number | null | undefined) => (ms ? new Date(ms).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '?')
    const porque = etiqueta?.comPausa
      ? `a etiqueta voltou junto com "${CONFIG.humanTag}" quando o card foi salvo (${quando(etiqueta.em)}), o que não é uma devolução`
      : `a etiqueta foi colocada (${quando(etiqueta?.em)}) antes da última mensagem da equipe ao lead (${quando(equipeEm)})`
    await addLeadNote(lead.id, `Anna: a etiqueta "${TAG_RETOMAR}" foi retirada e a Anna CONTINUA PAUSADA: ${porque}. Para devolver o atendimento, coloque a etiqueta "${TAG_RETOMAR}" de novo.`)
    await logExec({ tipo: 'pulou', leadId: lead.id, nome: lead.name, detalhe: `retomada ignorada: ${porque}` })
    return 'retomada ignorada (etiqueta antiga)'
  }
  const r = await retomar(lead)
  if (r.startsWith('retomado')) await continuarDepoisDaRetomada(lead.id)
  return r
}

/**
 * Relógio: etiqueta anna-retomar colocada nos últimos 20 min. O Kommo nem sempre avisa quando só uma etiqueta muda
 * (Antonio, 11/11: colocada às 16:05, a Anna só soube às 16:25, na alteração seguinte do card).
 */
export async function varrerRetomadas(): Promise<string[]> {
  const desde = Math.floor(Date.now() / 1000) - 20 * 60
  const d = await kommoGet<{ _embedded?: { events?: Array<{ entity_id: number; value_after?: Array<{ tag?: { name?: string } }> }> } }>(
    `/api/v4/events?filter[entity]=lead&filter[type]=entity_tag_added&filter[created_at][from]=${desde}&limit=100`).catch(() => null)
  const ids = [...new Set((d?._embedded?.events || []).filter(e => (e.value_after || []).some(v => (v.tag?.name || '').toLowerCase() === TAG_RETOMAR)).map(e => e.entity_id))]
  const feitos: string[] = []
  for (const id of ids) {
    const lead = await getLead(id).catch(() => null)
    if (!lead || !leadTags(lead).some(t => t.toLowerCase() === TAG_RETOMAR)) continue
    feitos.push(`${id}: ${await tratarRetomada(lead)}`)
  }
  return feitos
}

/** Depois da retomada: se a última mensagem é do lead, a Anna responde considerando todo o histórico; senão, a régua da etapa recomeça. */
export async function continuarDepoisDaRetomada(leadId: number): Promise<void> {
  // antes de falar: o que o lead já respondeu (com a Anna ou com a equipe) e o horário que a equipe ofereceu (Dra., 10/11)
  const lead = await getLead(leadId)
  const rec = await recuperarNaRetomada(lead).catch(async e => {
    await logExec({ tipo: 'erro', leadId, nome: lead.name, detalhe: `retomada: recuperação do histórico falhou (${(e instanceof Error ? e.message : String(e)).slice(0, 160)})` })
    return null
  })
  const ultima = (await getHistory(leadId).catch(() => [])).slice(-1)[0]
  const etapa = (await getState(leadId)).etapa
  // reunião já marcada (campo "Reunião" no futuro) ou card no Closer: os dados ficam guardados, mas a Anna não
  // pergunta nada da qualificação; se o lead escreveu, o atendimento normal decide (no Closer ela só cuida da reunião dela)
  if ((reuniaoDoCard(lead) ?? 0) * 1000 > Date.now() || lead.pipeline_id === PIPELINES.closer) {
    if (ultima?.dir === 'in') await processLead(leadId, `retomar-${Date.now()}`)
    return
  }
  // o lead aceitou o horário da equipe, mas a conversa seguiu sem a reunião marcada: a equipe confere
  if (rec?.ofertaAceita && ultima?.dir !== 'in') {
    await addLeadTask(leadId, 'Anna: na conversa, o lead aceitou o horário que a equipe ofereceu, mas a reunião não está marcada no card. Confirmar com o lead e marcar.', CRM_MAP.tarefa).catch(() => undefined)
    return
  }
  // a etapa andou além da 2ª pergunta pelo que já estava respondido: a próxima pergunta sai agora (a última
  // mensagem do lead já foi considerada na leitura do histórico)
  if (rec?.avancou && etapa !== 'q2' && etapa !== 'oferta') return seguirDeOndeParou(leadId)
  if (ultima?.dir === 'in') {
    await processLead(leadId, `retomar-${Date.now()}`)
    return
  }
  // horário oferecido pela equipe: o follow-up de 1 h já está agendado (não oferece outro horário)
  if (rec?.oferta) return
  if (rec?.avancou) return seguirDeOndeParou(leadId)
  // a última palavra foi da equipe (pergunta, remarcação, combinado): a Anna espera o lead e não manda follow-up de
  // qualificação por cima da conversa da equipe (Dra., 12/11, caso Antonio)
  if (ultima?.dir === 'out' && String(ultima.id).startsWith('kommo:')) return
  const regua = etapa ? reguaDaEtapa(etapa) : null
  if (regua) await iniciarRegua(leadId, regua, Date.now())
}

/** A próxima pergunta da qualificação, depois de a retomada recuperar o que já tinha sido respondido. */
async function seguirDeOndeParou(leadId: number): Promise<void> {
  const dono = crypto.randomUUID()
  if ((await redis.set(k('lock', leadId), dono, { nx: true, ex: 180 })) !== 'OK') return
  try {
    const lead = await getLead(leadId)
    const { ctx } = await montarCtx(leadId, lead)
    const base = await baseVigente()
    const r = await comTextos(textosDoRoteiro(base.textos), () => continuarDeOndeParou(ctx, depsProducao(leadId, lead)))
    await logExec({ tipo: 'resposta', leadId, nome: lead.name, etapa: (await getState(leadId)).etapa, tools: [r.acao], detalhe: r.enviado?.slice(0, 160), respostaIA: r.enviado })
  } finally {
    await redis.eval(`if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`, [k('lock', leadId)], [dono])
  }
}

