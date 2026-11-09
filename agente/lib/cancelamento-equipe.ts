import { CRM_MAP, PIPELINES, STATUS } from './crm-map'
import { logExec } from './execlog'
import { agendaConectada, apagarReuniao } from './google'
import { addLeadNote, addLeadTask, concluirTarefas, limparCampos, type KommoLead } from './kommo'
import { reuniaoDoCard } from './pos-reuniao'
import { k, redis } from './redis'
import { getState, patchState } from './state'
import { quandoExtenso } from './anna/agenda'
import { ETAPAS_REUNIAO } from './anna/fluxo'
import { bloqueio } from './agent'
import { pausado } from './pausa'

/**
 * CANCELAMENTO DE REUNIÃO COM O ATENDIMENTO NA EQUIPE (Dra., 09/11/2026). A parte da agenda separada da conversa:
 *  - pedido CLARO ("quero cancelar minha reunião", "pode desmarcar", "não vou participar") → cancela no Google,
 *    limpa a data do card (para os lembretes), conclui a tarefa da reunião, registra e cria tarefa para a equipe
 *    ver a remarcação;
 *  - pedido AMBÍGUO ("acho que não vou conseguir", "talvez precise desmarcar", "e se eu não puder?") → só uma
 *    tarefa para a equipe confirmar; a reunião continua marcada.
 * Nenhuma mensagem vai para o cliente. Só vale para reunião identificada com segurança: evento conhecido (marcado
 * pela Anna ou criado pelo card) e no mesmo horário do campo "Reunião". Quando a Anna conduz a conversa (reunião
 * dela, sem pausa), quem trata é o fluxo dela, com as mensagens da Dra.
 */

/** assunto que não é a reunião: "cancelar o empréstimo", "desmarcar o débito" */
const RX_OUTRO_OBJETO = /empr[eé]stimo|consignad|cart[aã]o|desconto|contrato|\bconta\b|d[ií]vida|banco|d[eé]bito|parcela|seguro|plano/i
const RX_CLARO = /\b(cancel(ar|a|e|o|em)|desmarc(ar|a|e|o|em))\b|n[aã]o vou (mais )?(participar|comparecer|poder (participar|comparecer|ir|entrar)|conseguir (participar|comparecer|ir|entrar))|n[aã]o (poderei|conseguirei|irei) (participar|comparecer|ir)|n[aã]o quero mais (a |essa )?reuni[aã]o/i
const RX_DUVIDA = /\?|\bacho\b|talvez|pode ser que|n[aã]o sei se|ser[aá] que|\be se\b|\bse eu\b|\bse n[aã]o\b|\bprovavelmente\b|\bacredito\b/i
const RX_AMBIGUO = /acho que n[aã]o (vou|consigo|vai dar)|talvez (eu )?(precise|tenha que|n[aã]o)|e se eu n[aã]o (puder|conseguir)|n[aã]o sei se (vou|consigo|d[aá])|pode ser que (eu )?n[aã]o|ser[aá] que (d[aá]|consigo)|(cancelar|desmarcar)/i

/** Puro: a mensagem do cliente pede o cancelamento? 'claro' | 'ambiguo' | null (não é sobre cancelar a reunião). */
export function classificarCancelamento(texto: string): 'claro' | 'ambiguo' | null {
  const t = (texto || '').trim()
  if (!t || RX_OUTRO_OBJETO.test(t)) return null
  if (RX_CLARO.test(t) && !RX_DUVIDA.test(t)) return 'claro'
  if (RX_AMBIGUO.test(t) || RX_CLARO.test(t)) return 'ambiguo'
  return null
}

/** Inbound: mensagem do lead quando quem conduz é a equipe. Devolve o que fez, ou null. */
export async function cancelamentoComEquipe(lead: KommoLead, texto: string, mensagemId: string): Promise<string | null> {
  const tipo = classificarCancelamento(texto)
  if (!tipo) return null
  const reuniao = reuniaoDoCard(lead)
  if (!reuniao || reuniao * 1000 < Date.now()) return null // sem reunião futura no card
  if (lead.pipeline_id !== PIPELINES.closer && lead.pipeline_id !== PIPELINES.sdr) return null
  const st = await getState(lead.id)
  // a Anna conduz (reunião dela, sem pausa): o fluxo dela trata, com as mensagens da Dra.
  const annaConduz = !bloqueio(lead) && !(await pausado(lead.id)) && !!st.etapa && ETAPAS_REUNIAO.has(st.etapa)
    && (lead.pipeline_id === PIPELINES.sdr || lead.status_id === STATUS.reuniaoAgendada)
  if (annaConduz) return null
  if ((await redis.set(k('cancel-equipe', mensagemId), '1', { nx: true, ex: 86400 })) !== 'OK') return null

  const quando = quandoExtenso(new Date(reuniao * 1000))
  const msg = `"${texto.slice(0, 200)}"`
  if (tipo === 'ambiguo') {
    await addLeadTask(lead.id, `Confirmar com o cliente se ele quer cancelar a reunião de ${quando}. Mensagem dele: ${msg}. A reunião continua marcada.`, CRM_MAP.tarefaPrioritaria)
    await addLeadNote(lead.id, `Anna: o cliente escreveu sobre a reunião de ${quando} sem pedir o cancelamento com clareza (${msg}). Nada foi cancelado; a equipe recebeu uma tarefa para confirmar.`)
    await logExec({ tipo: 'pulou', leadId: lead.id, nome: lead.name, detalhe: `cancelamento ambíguo com a equipe: tarefa para confirmar (${quando})` })
    return 'ambíguo: tarefa para confirmar'
  }

  // identificar a reunião com segurança: evento conhecido e no mesmo horário do card
  const sync = await redis.get<{ eventId: string; inicio: number }>(k('reuniao-equipe', lead.id)).catch(() => null)
  const daAnna = st.reuniao && Math.floor(Date.parse(st.reuniao.inicio) / 1000) === reuniao ? st.reuniao.eventId : ''
  const doCard = sync?.eventId && sync.inicio === reuniao ? sync.eventId : ''
  const eventId = daAnna || doCard
  if (!eventId || !(await agendaConectada())) {
    await addLeadTask(lead.id, `O cliente pediu para cancelar a reunião de ${quando} (${msg}). A Anna não conseguiu identificar o evento na agenda com segurança: cancelar manualmente na agenda Google e no Kommo e verificar a possibilidade de remarcação.`, CRM_MAP.tarefaPrioritaria)
    await addLeadNote(lead.id, `Anna: o cliente pediu o cancelamento da reunião de ${quando}, mas o evento não pôde ser identificado com segurança. Nada foi alterado; tarefa criada para a equipe.`)
    await logExec({ tipo: 'pulou', leadId: lead.id, nome: lead.name, detalhe: `cancelamento com a equipe: reunião não identificada (${quando}), tarefa criada` })
    return 'claro, mas reunião não identificada: tarefa'
  }
  // a reunião sai do estado e do registro ANTES de limpar o card (o webhook do campo vazio não repete nada)
  if (st.reuniao) await patchState(lead.id, { reuniao: undefined })
  await redis.del(k('reuniao-equipe', lead.id))
  const falhas: string[] = []
  await apagarReuniao(eventId).catch(e => { falhas.push(`agenda Google: ${e instanceof Error ? e.message : e}`) })
  await limparCampos(lead.id, [CRM_MAP.campos.reuniao, CRM_MAP.campos.agendamento, CRM_MAP.campos.horarioReuniao, CRM_MAP.campos.linkMeet]).catch(e => { falhas.push(`campos: ${e instanceof Error ? e.message : e}`) })
  let tarefas = 0
  for (const t of CRM_MAP.tiposTarefaReuniao) tarefas += await concluirTarefas(lead.id, t, `Reunião cancelada pelo cliente: ${msg}`).catch(() => 0)
  await addLeadNote(lead.id, `Anna: o cliente cancelou a reunião de ${quando} (${msg}). Evento apagado da agenda Google, data retirada do card (lembretes interrompidos)${tarefas ? ' e tarefa da reunião concluída' : ''}. Nenhuma mensagem foi enviada ao cliente.${falhas.length ? ` ATENÇÃO, conferir à mão: ${falhas.join('; ')}.` : ''}`)
  await addLeadTask(lead.id, `O cliente cancelou a reunião de ${quando} (${msg}). A reunião já foi cancelada nas agendas. Verificar a possibilidade de remarcação.`, CRM_MAP.tarefaPrioritaria)
  await logExec({ tipo: 'pulou', leadId: lead.id, nome: lead.name, detalhe: `cancelamento com a equipe: reunião de ${quando} cancelada, tarefa de remarcação` })
  return `cancelada: ${quando}`
}
