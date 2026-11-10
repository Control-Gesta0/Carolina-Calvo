import { CONFIG } from './config'
import { colunaPorRenda, CRM_MAP, PIPELINES, STATUS } from './crm-map'
import { emptyUsage, logExec } from './execlog'
import { getHistory } from './history'
import { agendarJob } from './jobs'
import { addLeadNote, getLead, updateLeadFields, updateLeadStatus, type KommoLead } from './kommo'
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
