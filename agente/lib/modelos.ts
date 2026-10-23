import crypto from 'crypto'
import { telefonesDoContatoId } from './cards-do-telefone'
import { CRM_MAP, type ChaveModelo } from './crm-map'
import { appendMessage, rememberSent } from './history'
import { addLeadNote, fieldValue, getLead, getTemplateText, kommoGet, runSalesbot, sleep, updateLeadFields, type KommoLead } from './kommo'
import { k, redis } from './redis'
import { enviarModeloDireto, guardarAbertura, numeroMeta, temConversaNoKommo, whatsappDiretoConfigurado } from './whatsapp'

/**
 * Envio de MODELO APROVADO (WABA). Fora da janela de 24h da Meta só modelo
 * entrega (kommo/PEGADINHAS §9). A API não envia modelo: cada modelo tem um
 * Salesbot de 1 bloco ("enviar modelo") criado na tela, e o bot_id fica em
 * CRM_MAP.modelos. As variáveis {{lead.cf.ID}} são campos do card que este
 * código preenche ANTES de disparar o bot.
 *
 * O Salesbot só entrega no chat que já existe. Contato sem conversa de WhatsApp
 * no Kommo (lead de formulário que nunca escreveu) → o mesmo modelo sai direto
 * pela API oficial da Meta (lib/whatsapp.ts).
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

const contatoPrincipal = (lead: KommoLead) => {
  const cs = lead._embedded?.contacts || []
  return cs.find(c => c.is_main) || cs[0]
}

export async function enviarModelo(leadId: number, chave: ChaveModelo, vars: VarsModelo = {}): Promise<string> {
  const m = CRM_MAP.modelos[chave]
  if (!m.botId) throw new Error(`Salesbot do modelo "${m.nome}" não configurado (CRM_MAP.modelos.${chave}.botId = 0)`)
  const valores: Record<number, string> = {}
  for (const [campo, valor] of Object.entries(vars)) if (valor) valores[CRM_MAP.campos[campo as keyof VarsModelo]] = valor
  if (Object.keys(valores).length) {
    await updateLeadFields(leadId, Object.entries(valores).map(([id, value]) => ({ field_id: Number(id), values: [{ value }] })))
  }
  const conteudo = await getTemplateText(m.templateId).catch(() => '')
  const texto = renderizar(conteudo, valores) || `[modelo ${m.nome}]`

  const lead = await getLead(leadId)
  const contato = contatoPrincipal(lead)
  if (contato && !(await temConversaNoKommo(contato.id))) return abrirConversa(leadId, lead, contato.id, m.nome, conteudo, valores, texto)

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

/** Contato que nunca conversou pelo WhatsApp: o robô do Kommo não abre conversa, então o modelo sai pela Meta. */
async function abrirConversa(leadId: number, lead: KommoLead, contatoId: number, nome: string, conteudo: string, valores: Record<number, string>, texto: string): Promise<string> {
  const falha = async (porque: string) => {
    await addLeadNote(leadId, `Anna: não enviou o modelo "${nome}". ${porque} Nada chegou ao lead. A equipe precisa fazer o contato.`).catch(() => undefined)
    return new Error(`modelo "${nome}" não saiu: ${porque}`)
  }
  if (!whatsappDiretoConfigurado()) throw await falha('O contato ainda não tem conversa de WhatsApp no Kommo, e o robô do Kommo não abre conversa nova (falta ligar o envio pela API oficial do WhatsApp).')
  const para = (await telefonesDoContatoId(contatoId)).map(numeroMeta).find((t): t is string => !!t)
  if (!para) throw await falha('O contato não tem telefone válido no card.')
  const doKommo: Record<string, string> = {}
  for (const v of conteudo.match(/\{\{lead\.cf\.\d+\}\}/g) || []) {
    const id = Number(v.replace(/\D/g, ''))
    const valor = valores[id] ?? fieldValue(lead, id)
    if (valor != null && valor !== '') doKommo[v] = String(valor)
  }
  let r: { id: string; modelo: string }
  try {
    r = await enviarModeloDireto(para, conteudo, doKommo)
  } catch (e) {
    throw await falha(`A API oficial do WhatsApp recusou: ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}`)
  }
  await guardarAbertura(para, leadId)
  await appendMessage(leadId, { id: crypto.randomUUID(), dir: 'out', text: texto, ts: Date.now() })
  await addLeadNote(leadId, `Anna: enviou o modelo "${nome}" pela API oficial do WhatsApp, porque o contato ainda não tinha conversa no Kommo. A mensagem não aparece no chat do Kommo; quando o lead responder, a conversa abre normalmente.\n\nTexto enviado:\n${texto}`)
  return `modelo "${nome}" pela API oficial do WhatsApp (${r.modelo}, ${r.id}) · aceito pela Meta`
}

/** Espera até ~30 s o Kommo registrar uma mensagem de saída no chat do contato depois de `desde` (segundos). */
export async function confirmarSaida(leadId: number, desde: number, tentativas = 6): Promise<boolean> {
  const lead = await getLead(leadId)
  const contato = contatoPrincipal(lead)
  if (!contato) return false
  for (let i = 0; i < tentativas; i++) {
    await sleep(5000)
    const d = await kommoGet<{ _embedded?: { events?: Array<{ created_at: number }> } }>(
      `/api/v4/events?filter[entity]=contact&filter[entity_id]=${contato.id}&filter[type]=outgoing_chat_message&filter[created_at][from]=${desde}&limit=5`)
    if ((d?._embedded?.events || []).length) return true
  }
  return false
}
