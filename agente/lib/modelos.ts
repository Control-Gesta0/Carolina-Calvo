import crypto from 'crypto'
import { CRM_MAP, type ChaveModelo } from './crm-map'
import { appendMessage, rememberSent } from './history'
import { addLeadNote, getLead, getTemplateText, kommoGet, runSalesbot, sleep, updateLeadFields } from './kommo'
import { k, redis } from './redis'

/**
 * Envio de MODELO APROVADO (WABA). Fora da janela de 24h da Meta só modelo
 * entrega (kommo/PEGADINHAS §9). A API não envia modelo: cada modelo tem um
 * Salesbot de 1 bloco ("enviar modelo") criado na tela, e o bot_id fica em
 * CRM_MAP.modelos. As variáveis {{lead.cf.ID}} são campos do card que este
 * código preenche ANTES de disparar o bot.
 */

export type VarsModelo = Partial<Record<'primeiroNome' | 'horarioReuniao' | 'linkMeet' | 'linkPagamento' | 'vencimento' | 'diasAtraso' | 'prazoLimite', string>>

export function renderizar(conteudo: string, valores: Record<number, string>): string {
  return conteudo.replace(/\{\{lead\.cf\.(\d+)\}\}/g, (m, id) => valores[Number(id)] ?? m)
}

/** Janela em que uma mensagem de saída é atribuída ao nosso bot (anti-eco extra, kommo §4). */
export async function marcarBotRodando(leadId: number): Promise<void> {
  await redis.set(k('botrun', leadId), '1', { ex: 180 })
}
export async function botRodandoRecente(leadId: number): Promise<boolean> {
  return !!(await redis.get(k('botrun', leadId)))
}

export async function enviarModelo(leadId: number, chave: ChaveModelo, vars: VarsModelo = {}): Promise<string> {
  const m = CRM_MAP.modelos[chave]
  if (!m.botId) throw new Error(`Salesbot do modelo "${m.nome}" não configurado (CRM_MAP.modelos.${chave}.botId = 0)`)
  const valores: Record<number, string> = {}
  for (const [campo, valor] of Object.entries(vars)) if (valor) valores[CRM_MAP.campos[campo as keyof VarsModelo]] = valor
  if (Object.keys(valores).length) {
    await updateLeadFields(leadId, Object.entries(valores).map(([id, value]) => ({ field_id: Number(id), values: [{ value }] })))
  }
  const texto = renderizar(await getTemplateText(m.templateId).catch(() => ''), valores) || `[modelo ${m.nome}]`
  await rememberSent(leadId, texto)
  await marcarBotRodando(leadId)
  const inicio = Math.floor(Date.now() / 1000) - 5
  await runSalesbot(m.botId, leadId)
  // O robô "rodar" não prova que a mensagem saiu (22/10: 45 primeiros contatos sem envio). Só conta como
  // enviado se o Kommo registrar a mensagem de saída no WhatsApp do contato logo depois.
  const saiu = await confirmarSaida(leadId, inicio)
  if (!saiu) {
    await addLeadNote(leadId, `Anna: tentou enviar o modelo "${m.nome}", mas o WhatsApp NÃO registrou o envio. Nada chegou ao lead. A equipe precisa fazer o contato.`).catch(() => undefined)
    throw new Error(`modelo "${m.nome}" não saiu: o robô rodou, mas o Kommo não registrou mensagem de saída no WhatsApp`)
  }
  await appendMessage(leadId, { id: crypto.randomUUID(), dir: 'out', text: texto, ts: Date.now() })
  return `modelo "${m.nome}" via bot ${m.botId} · envio confirmado no WhatsApp`
}

/** Espera até ~30 s o Kommo registrar uma mensagem de saída no chat do contato depois de `desde` (segundos). */
export async function confirmarSaida(leadId: number, desde: number, tentativas = 6): Promise<boolean> {
  const lead = await getLead(leadId)
  const contatos = lead._embedded?.contacts || []
  const contato = contatos.find(c => c.is_main) || contatos[0]
  if (!contato) return false
  for (let i = 0; i < tentativas; i++) {
    await sleep(5000)
    const d = await kommoGet<{ _embedded?: { events?: Array<{ created_at: number }> } }>(
      `/api/v4/events?filter[entity]=contact&filter[entity_id]=${contato.id}&filter[type]=outgoing_chat_message&filter[created_at][from]=${desde}&limit=5`)
    if ((d?._embedded?.events || []).length) return true
  }
  return false
}
