import { CONFIG } from './config'
import { logExec } from './execlog'
import { addLeadNote, addLeadTags, concluirTarefa, fieldValue, kommoGet, leadTags, removeLeadTags, updateLeadStatus, type KommoLead } from './kommo'
import { colunaPorRenda, CRM_MAP, PIPELINES, STATUS } from './crm-map'
import { k, redis } from './redis'
import { getState, patchState, type LeadState } from './state'

/**
 * PAUSA E RETOMADA DA ANNA (Dra., 09/11/2026, caso Adriana).
 *  - Quando a equipe escreve para o lead pelo Kommo, a Anna pausa: etiqueta "atendimento-humano" no card
 *    e uma marca no Redis. A marca vale mesmo se a etiqueta sumir (o Kommo regrava o conjunto de etiquetas
 *    quando alguém salva o card), e a Anna recoloca a etiqueta se ela tiver sumido.
 *  - Durante a pausa, as mensagens do lead e da equipe continuam no histórico da Anna.
 *  - Para devolver: a equipe coloca a etiqueta "anna-retomar" no card. A Anna tira as duas etiquetas,
 *    volta para a etapa em que estava e, se a última mensagem for do lead, responde considerando tudo.
 */

export const TAG_RETOMAR = 'anna-retomar'
export const INSTRUCAO_RETOMAR = `Para devolver o atendimento à Anna, coloque a etiqueta "${TAG_RETOMAR}" neste card: ela retoma a conversa de onde parou.`

const K = (leadId: number) => k('pausa', leadId)

export async function pausar(leadId: number, motivo: string): Promise<void> {
  await redis.set(K(leadId), { motivo, em: new Date().toISOString() }, { ex: 90 * 86400 })
  await addLeadTags(leadId, [CONFIG.humanTag])
}

export async function pausado(leadId: number): Promise<boolean> {
  return !!(await redis.get(K(leadId)).catch(() => null))
}

/** Só a marca da pausa (sem mexer em etiqueta): a equipe escreveu num card que já está com a etiqueta. */
export async function marcarPausa(leadId: number, motivo: string): Promise<void> {
  await redis.set(K(leadId), { motivo, em: new Date().toISOString() }, { ex: 90 * 86400 })
}

/** Quando a equipe escreveu ao lead pela última vez (ms). A retomada só vale com a etiqueta colocada depois disso. */
export async function marcarEquipeFalou(leadId: number, quando = Date.now()): Promise<void> {
  await redis.set(k('equipe-falou', leadId), quando, { ex: 90 * 86400 })
}
export async function equipeFalouEm(leadId: number): Promise<number | null> {
  const v = await redis.get<number>(k('equipe-falou', leadId)).catch(() => null)
  return v ? Number(v) : null
}

/**
 * Quando a etiqueta anna-retomar entrou no card pela última vez (ms), pelo histórico do Kommo, e se entrou junto com
 * atendimento-humano (o card salvo com as etiquetas antigas da tela, não uma devolução). null = não deu para saber.
 */
export async function etiquetaRetomarEm(leadId: number): Promise<{ em: number; comPausa: boolean } | null> {
  const d = await kommoGet<{ _embedded?: { events?: Array<{ created_at: number; value_after?: Array<{ tag?: { name?: string } }> }> } }>(
    `/api/v4/events?filter[entity]=lead&filter[entity_id]=${leadId}&filter[type]=entity_tag_added&limit=100`).catch(() => null)
  const nomes = (e: { value_after?: Array<{ tag?: { name?: string } }> }) => (e.value_after || []).map(v => (v.tag?.name || '').toLowerCase())
  const ev = (d?._embedded?.events || []).filter(e => nomes(e).includes(TAG_RETOMAR)).sort((a, b) => b.created_at - a.created_at)[0]
  return ev ? { em: ev.created_at * 1000, comPausa: nomes(ev).includes(CONFIG.humanTag) } : null
}

/**
 * Puro (Dra., 12/11, caso Antonio): a etiqueta anna-retomar só devolve o atendimento se foi colocada DEPOIS da última
 * mensagem da equipe, e sozinha. Etiqueta antiga, ou regravada junto com atendimento-humano quando alguém salva o card
 * (o Kommo regrava as etiquetas que estavam na tela), não vale. Sem saber quando entrou, vale (não trava a devolução).
 */
export function retomadaExpressa(o: { etiqueta: { em: number; comPausa: boolean } | null; equipeEm: number | null }): boolean {
  if (!o.etiqueta) return true
  if (o.etiqueta.comPausa) return false
  return !o.equipeEm || o.etiqueta.em > o.equipeEm
}

/** Pausado, mas a etiqueta sumiu do card: recoloca (uma vez a cada 10 min), para a equipe ver o que está valendo. */
export async function conferirEtiquetaDaPausa(lead: KommoLead): Promise<void> {
  if (leadTags(lead).some(t => t.toLowerCase() === CONFIG.humanTag)) return
  if ((await redis.set(k('pausa', 'etiqueta', lead.id), '1', { nx: true, ex: 600 })) !== 'OK') return
  await addLeadTags(lead.id, [CONFIG.humanTag])
}

/** Puro: para qual etapa a Anna volta. A de antes da passagem para a equipe, ou a atual. */
export function etapaDeVolta(s: LeadState): LeadState['etapa'] {
  if (s.etapa && s.etapa !== 'humano') return s.etapa
  return s.etapaAntes && s.etapaAntes !== 'humano' ? s.etapaAntes : undefined
}

/** Etiqueta anna-retomar: devolve o atendimento à Anna. Devolve o que fez. */
export async function retomar(lead: KommoLead): Promise<string> {
  // uma retomada por vez (o webhook de update chega repetido)
  if ((await redis.set(k('retomar', lead.id), '1', { nx: true, ex: 60 })) !== 'OK') return 'retomada já em andamento'
  await removeLeadTags(lead.id, [CONFIG.humanTag, TAG_RETOMAR])
  if (CONFIG.gateTag && !leadTags(lead).some(t => t.toLowerCase() === CONFIG.gateTag)) await addLeadTags(lead.id, [CONFIG.gateTag])
  await redis.del(K(lead.id), k('humano', lead.id))
  const s = await getState(lead.id)
  const etapa = etapaDeVolta(s)
  if (s.etapa === 'humano') await patchState(lead.id, { etapa, finalizado: undefined })
  // valores que a equipe registrou no card (renda, líquido, desconto) valem: a Anna não pergunta de novo
  const num = (id: number) => { const v = Number(fieldValue(lead, id)); return Number.isFinite(v) && fieldValue(lead, id) !== null && fieldValue(lead, id) !== '' ? v : undefined }
  const doCard = { rendaBruta: num(CRM_MAP.campos.rendaBruta), rendaLiquida: num(CRM_MAP.campos.rendaLiquida), descontoConta: num(CRM_MAP.campos.descontoConta) }
  const novos = Object.fromEntries(Object.entries(doCard).filter(([k2, v]) => v !== undefined && s[k2 as keyof typeof doCard] == null))
  if (Object.keys(novos).length) await patchState(lead.id, novos)
  // saiu da AÇÃO SDR (Dra., 09/11): o card volta para a coluna da faixa e a tarefa da providência é concluída
  if (s.acaoSdr) {
    const renda = s.rendaBruta ?? doCard.rendaBruta
    const faixa = renda != null ? colunaPorRenda(renda) : s.acaoSdr.faixa
    if (lead.pipeline_id === PIPELINES.sdr && lead.status_id === STATUS.acaoSdr) await updateLeadStatus(lead.id, faixa, PIPELINES.sdr)
    if (s.acaoSdr.tarefaId) await concluirTarefa(s.acaoSdr.tarefaId, 'Providência concluída: atendimento devolvido à Anna (etiqueta anna-retomar).').catch(() => undefined)
    await removeLeadTags(lead.id, [CRM_MAP.tags.faixa10a15, CRM_MAP.tags.faixaAcima15]).catch(() => undefined)
    await patchState(lead.id, { acaoSdr: undefined })
  }
  await addLeadNote(lead.id, `Anna: atendimento devolvido pela equipe (etiqueta "${TAG_RETOMAR}"). Ela retoma de onde parou${etapa ? ` (etapa ${etapa})` : ''}, considerando também o que a equipe e o lead conversaram. Se a equipe voltar a escrever ao lead, ela pausa de novo.`)
  await logExec({ tipo: 'pulou', leadId: lead.id, nome: lead.name, detalhe: `atendimento devolvido à Anna pela equipe (etapa ${etapa || 'nova'})` })
  return `retomado (etapa ${etapa || 'nova'})`
}
