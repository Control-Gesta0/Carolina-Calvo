import { CONFIG } from './config'
import { logExec } from './execlog'
import { addLeadNote, addLeadTags, leadTags, removeLeadTags, type KommoLead } from './kommo'
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
  await addLeadNote(lead.id, `Anna: atendimento devolvido pela equipe (etiqueta "${TAG_RETOMAR}"). Ela retoma de onde parou${etapa ? ` (etapa ${etapa})` : ''}, considerando também o que a equipe e o lead conversaram. Se a equipe voltar a escrever ao lead, ela pausa de novo.`)
  await logExec({ tipo: 'pulou', leadId: lead.id, nome: lead.name, detalhe: `atendimento devolvido à Anna pela equipe (etapa ${etapa || 'nova'})` })
  return `retomado (etapa ${etapa || 'nova'})`
}
