import { CONFIG } from './config'
import { CRM_MAP, PIPELINES, STATUS } from './crm-map'
import { logExec } from './execlog'
import { addLeadNote, addLeadTask, getLead, kommoGet, updateLeadStatus } from './kommo'
import { querContratar } from './contratar'
import { k, redis } from './redis'

/**
 * PROTEÇÃO DO CLOSER (pedido da Dra. de 22/10/2026, caso Erika Nachi).
 * Robôs antigos do Kommo ("SDR RETORNO IMEDIATO", "Acompanha resposta e move para RI") movem para
 * SDR › 5 A 10 MIL todo card do Closer em que o lead escreve: 138 vezes de 01 a 22/10. Regra da Dra.:
 * nenhum card do Closer volta sozinho para o SDR. Então, quando um robô (created_by 0) tira um card do
 * Closer e põe no SDR:
 *  - veio de Cliente decisão → vai para Closer › Retorno imediato, com tarefa prioritária;
 *  - veio de outra etapa do Closer → volta para ela; tarefa prioritária só se o lead quer contratar.
 * A Anna nunca conversa com card do Closer nem com quem já fez reunião. Nenhuma mensagem sai daqui.
 */

const ROBO = 0
export { querContratar }

export interface Destino { statusId: number; tarefa: string | null }

/** Puro: para onde volta o card que um robô tirou do Closer, e qual tarefa a equipe recebe. */
export function destinoDaResposta(origem: number, texto?: string | null): Destino {
  const contratar = querContratar(texto)
  if (origem === STATUS.clienteDecisao) {
    return { statusId: STATUS.retornoImediato, tarefa: contratar ? 'Lead deseja contratar — retorno imediato' : 'Lead respondeu em Cliente decisão — retorno imediato' }
  }
  return { statusId: origem, tarefa: contratar ? 'Lead deseja contratar — retorno imediato' : null }
}

export interface MudancaEtapa { id: string; created_at: number; created_by: number; entity_id: number; value_before?: Array<{ lead_status?: { id: number; pipeline_id: number } }>; value_after?: Array<{ lead_status?: { id: number; pipeline_id: number } }> }

/** Puro: a mudança é um robô tirando o card do Closer e pondo no SDR? Devolve a etapa de origem no Closer. */
export function origemCloser(ev: MudancaEtapa): number | null {
  const antes = ev.value_before?.[0]?.lead_status
  const depois = ev.value_after?.[0]?.lead_status
  if (ev.created_by !== ROBO || !antes || !depois) return null
  return antes.pipeline_id === PIPELINES.closer && depois.pipeline_id === PIPELINES.sdr ? antes.id : null
}

const K_FEITO = (evId: string) => k('closer', 'ev', evId)
const K_ULTIMA_MSG = (leadId: number) => k('ultima-in', leadId)

/** O inbound guarda a última mensagem de cada lead (qualquer card), para a tarefa dizer o que ele quer. */
export async function guardarUltimaMensagem(leadId: number, texto: string): Promise<void> {
  await redis.set(K_ULTIMA_MSG(leadId), texto.slice(0, 500), { ex: 2 * 86400 }).catch(() => undefined)
}

/** Desfaz a mudança do robô (uma vez por evento). Devolve o que fez, ou null se já tinha sido tratado. */
export async function devolverAoCloser(ev: MudancaEtapa, origem: number, texto?: string | null): Promise<string | null> {
  if ((await redis.set(K_FEITO(ev.id), '1', { nx: true, ex: 3 * 86400 })) !== 'OK') return null
  const leadId = ev.entity_id
  const lead = await getLead(leadId)
  const agora = ev.value_after?.[0]?.lead_status
  // a equipe já mexeu no card depois do robô: a decisão manual vale
  if (!agora || lead.pipeline_id !== agora.pipeline_id || lead.status_id !== agora.id) return `${leadId}: card já mudou de etapa depois do robô, mantido`
  const msg = texto ?? (await redis.get<string>(K_ULTIMA_MSG(leadId)).catch(() => null))
  const d = destinoDaResposta(origem, msg)
  await updateLeadStatus(leadId, d.statusId, PIPELINES.closer)
  if (d.tarefa) await addLeadTask(leadId, `${d.tarefa}.${msg ? ` Mensagem do lead: "${msg.slice(0, 200)}"` : ''}`, CRM_MAP.tarefaPrioritaria)
  await addLeadNote(leadId, `Proteção do Closer: um robô antigo do Kommo moveu este card para o SDR quando o lead respondeu. A Anna devolveu o card ao Closer${d.statusId === STATUS.retornoImediato ? ', em Retorno imediato' : ''}. Nenhuma mensagem foi enviada ao lead.`)
  await logExec({ tipo: 'closer', leadId, nome: lead.name, tools: [`robô moveu Closer → SDR; devolvido ao Closer (${d.statusId === STATUS.retornoImediato ? 'Retorno imediato' : 'mesma etapa'})`, ...(d.tarefa ? [`tarefa: ${d.tarefa}`] : [])], detalhe: msg?.slice(0, 160) })
  return `${leadId}: devolvido ao Closer${d.tarefa ? ` + tarefa "${d.tarefa}"` : ''}`
}

/** O card já esteve no Closer alguma vez? Quem já passou por lá não volta para a qualificação da Anna. */
export async function jaPassouPeloCloser(leadId: number): Promise<boolean> {
  const chave = k('passou-closer', leadId)
  const guardado = await redis.get<string>(chave).catch(() => null)
  if (guardado) return guardado === '1'
  const evs: MudancaEtapa[] = []
  for (let pagina = 1; pagina <= 5; pagina++) {
    const d = await kommoGet<{ _embedded?: { events?: MudancaEtapa[] }; _links?: { next?: unknown } }>(`/api/v4/events?filter[entity]=lead&filter[entity_id]=${leadId}&filter[type]=lead_status_changed&limit=100&page=${pagina}`)
    evs.push(...(d?._embedded?.events || []))
    if (!d?._links?.next) break
  }
  const passou = evs.some(e => e.value_after?.[0]?.lead_status?.pipeline_id === PIPELINES.closer)
  await redis.set(chave, passou ? '1' : '0', { ex: passou ? 365 * 86400 : 600 }).catch(() => undefined)
  return passou
}

/** A última mudança de etapa do card foi um robô tirando-o do Closer (nos últimos 30 min)? */
export async function veioDoCloser(leadId: number): Promise<{ ev: MudancaEtapa; origem: number } | null> {
  const d = await kommoGet<{ _embedded?: { events?: MudancaEtapa[] } }>(`/api/v4/events?filter[entity]=lead&filter[entity_id]=${leadId}&filter[type]=lead_status_changed&limit=5`)
  const ev = [...(d?._embedded?.events || [])].sort((a, b) => b.created_at - a.created_at)[0]
  if (!ev || Date.now() / 1000 - ev.created_at > 30 * 60) return null
  const origem = origemCloser(ev)
  return origem ? { ev, origem } : null
}

/** Uma volta do relógio: robôs que tiraram cards do Closer nos últimos 30 minutos, em toda a conta. */
export async function varrerCloser(): Promise<string[]> {
  if (!CONFIG.protegeCloser) return []
  const de = Math.floor(Date.now() / 1000) - 30 * 60
  const d = await kommoGet<{ _embedded?: { events?: MudancaEtapa[] } }>(`/api/v4/events?filter[type]=lead_status_changed&filter[created_at][from]=${de}&limit=100`)
  const feitos: string[] = []
  for (const ev of (d?._embedded?.events || []).sort((a, b) => a.created_at - b.created_at)) {
    const origem = origemCloser(ev)
    if (!origem) continue
    if (CONFIG.protegeCloserSoTeste && !CONFIG.testLeadIds.includes(ev.entity_id)) continue
    try {
      const r = await devolverAoCloser(ev, origem)
      if (r) feitos.push(r)
    } catch (e) {
      await redis.del(K_FEITO(ev.id))
      feitos.push(`${ev.entity_id}: ERRO ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}`)
    }
  }
  return feitos
}
