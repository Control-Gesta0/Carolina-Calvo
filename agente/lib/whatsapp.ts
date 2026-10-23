import { CONFIG } from './config'
import { kommoGet } from './kommo'
import { k, redis } from './redis'
import { chaveTelefone } from './telefone'

/**
 * WhatsApp Cloud API (Meta), direto, só para o que o Kommo não faz: ABRIR a conversa.
 *
 * O Salesbot do Kommo roda "no chat do contato" (doc. do /api/v2/salesbot/run). Lead de formulário
 * nunca escreveu: não há chat, o robô "roda" e nada sai (19 a 22/10: 0 de 44 primeiros contatos).
 * Antes da Anna era igual: em 13 a 17/10 a 1ª mensagem de todo lead de formulário saiu À MÃO, pelo
 * usuário da Dra.; os robôs só mandavam depois da conversa aberta.
 *
 * Então, contato SEM conversa de WhatsApp no Kommo → o modelo aprovado sai por aqui, do mesmo número
 * oficial do escritório (WABA da conta Kommo). Quando o lead responde, o Kommo abre o chat e todo o
 * resto (respostas da Anna, follow-ups, lembretes) segue pelo Kommo, como hoje.
 *
 * Precisa de WHATSAPP_TOKEN (usuário do sistema da Meta com whatsapp_business_messaging na WABA).
 * O ID do número sai da própria WABA. Sem token, nada sai e o erro diz isso.
 */

const GRAPH = 'https://graph.facebook.com/v21.0'

export const whatsappDiretoConfigurado = () => !!CONFIG.whatsapp.token

async function graph<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${GRAPH}${path}`, {
    method,
    headers: { Authorization: `Bearer ${CONFIG.whatsapp.token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Meta ${method} ${path.split('?')[0]} -> ${res.status}: ${text.slice(0, 300)}`)
  return (text ? JSON.parse(text) : {}) as T
}

/** Telefone do card → número no formato da Meta (55 + DDD + número). Puro. */
export function numeroMeta(tel?: string | null): string | null {
  let d = String(tel || '').replace(/\D/g, '')
  if (d.startsWith('0')) d = d.replace(/^0+/, '')
  if (d.length === 10 || d.length === 11) d = `55${d}`
  return /^55\d{10,11}$/.test(d) ? d : null
}

// ---------- modelo do Kommo → modelo da Meta ----------

export interface ModeloMeta { name: string; language: string; status: string; components?: Array<{ type: string; text?: string }> }

const RX_KOMMO = /\{\{[^}]+\}\}/g
const RX_META = /\{\{(\d+)\}\}/g
const norm = (s: string) => s.replace(/\s+/g, ' ').trim()

/**
 * Casa o texto do modelo no Kommo ({{lead.cf.805158}}) com o corpo do modelo na Meta ({{1}}) e devolve,
 * para cada número da Meta, a variável do Kommo na mesma posição. null = os textos não são o mesmo modelo. Puro.
 */
export function casarModelo(kommo: string, meta: string): Record<number, string> | null {
  const litK = kommo.split(RX_KOMMO).map(norm)
  const litM = meta.split(/\{\{\d+\}\}/).map(norm)
  const varsK = kommo.match(RX_KOMMO) || []
  const nums = [...meta.matchAll(RX_META)].map(m => Number(m[1]))
  if (litK.length !== litM.length || litK.some((s, i) => s !== litM[i])) return null
  const mapa: Record<number, string> = {}
  nums.forEach((n, i) => { mapa[n] = varsK[i] })
  return mapa
}

let cacheModelos: { em: number; lista: ModeloMeta[] } | null = null

async function modelosDaWaba(): Promise<ModeloMeta[]> {
  if (cacheModelos && Date.now() - cacheModelos.em < 10 * 60_000) return cacheModelos.lista
  const lista: ModeloMeta[] = []
  let url = `/${CONFIG.whatsapp.wabaId}/message_templates?fields=name,language,status,components&limit=100`
  for (let i = 0; i < 10 && url; i++) {
    const d = await graph<{ data?: ModeloMeta[]; paging?: { next?: string } }>('GET', url)
    lista.push(...(d.data || []))
    url = d.paging?.next ? d.paging.next.replace(GRAPH, '') : ''
  }
  cacheModelos = { em: Date.now(), lista }
  return lista
}

const corpo = (m: ModeloMeta) => m.components?.find(c => c.type === 'BODY')?.text || ''

/** O modelo APROVADO na Meta com o mesmo texto do modelo do Kommo, e o mapa das variáveis. */
export async function acharModeloMeta(conteudoKommo: string): Promise<{ modelo: ModeloMeta; mapa: Record<number, string> }> {
  for (const m of await modelosDaWaba()) {
    if (m.status !== 'APPROVED') continue
    const mapa = casarModelo(conteudoKommo, corpo(m))
    if (mapa) return { modelo: m, mapa }
  }
  throw new Error(`nenhum modelo APROVADO na Meta com o texto "${norm(conteudoKommo).slice(0, 60)}..."`)
}

let cacheNumero: string | null = null

async function idDoNumero(): Promise<string> {
  if (CONFIG.whatsapp.phoneId) return CONFIG.whatsapp.phoneId
  if (cacheNumero) return cacheNumero
  const d = await graph<{ data?: Array<{ id: string; display_phone_number?: string }> }>('GET', `/${CONFIG.whatsapp.wabaId}/phone_numbers`)
  if ((d.data || []).length !== 1) throw new Error(`a WABA ${CONFIG.whatsapp.wabaId} tem ${(d.data || []).length} números: defina WHATSAPP_PHONE_ID`)
  cacheNumero = d.data![0].id
  return cacheNumero
}

/** Envia o modelo aprovado direto pela Meta. `valores` = texto de cada variável do Kommo ("{{lead.cf.805158}}" → "Maria"). */
export async function enviarModeloDireto(para: string, conteudoKommo: string, valores: Record<string, string>): Promise<{ id: string; modelo: string }> {
  const { modelo, mapa } = await acharModeloMeta(conteudoKommo)
  const params = Object.keys(mapa).map(Number).sort((a, b) => a - b).map(n => {
    const v = valores[mapa[n]]
    if (!v) throw new Error(`modelo ${modelo.name}: sem valor para ${mapa[n]}`)
    return { type: 'text', text: v }
  })
  const r = await graph<{ messages?: Array<{ id: string }> }>('POST', `/${await idDoNumero()}/messages`, {
    messaging_product: 'whatsapp',
    to: para,
    type: 'template',
    template: { name: modelo.name, language: { code: modelo.language }, ...(params.length ? { components: [{ type: 'body', parameters: params }] } : {}) },
  })
  const id = r.messages?.[0]?.id
  if (!id) throw new Error(`a Meta não devolveu o id da mensagem (modelo ${modelo.name})`)
  return { id, modelo: modelo.name }
}

// ---------- conversa no Kommo ----------

/** O contato já tem conversa de WhatsApp no Kommo? (alguma mensagem de chat, de entrada ou de saída) */
export async function temConversaNoKommo(contatoId: number): Promise<boolean> {
  const d = await kommoGet<{ _embedded?: { events?: unknown[] } }>(
    `/api/v4/events?filter[entity]=contact&filter[entity_id]=${contatoId}&filter[type][]=incoming_chat_message&filter[type][]=outgoing_chat_message&limit=1`)
  return (d?._embedded?.events || []).length > 0
}

/** Primeiro contato aberto pela Meta: guarda telefone → card, para reconhecer a resposta se o Kommo abrir o chat em outro card. */
export async function guardarAbertura(telefone: string, leadId: number): Promise<void> {
  const chave = chaveTelefone(telefone)
  if (chave) await redis.set(k('abriu-meta', chave), leadId, { ex: 30 * 86400 })
}

export async function cardQueAbriu(telefone: string): Promise<number | null> {
  const chave = chaveTelefone(telefone)
  return chave ? (await redis.get<number>(k('abriu-meta', chave))) ?? null : null
}

/**
 * O lead respondeu ao primeiro contato aberto pela Meta, mas o Kommo pôs a conversa em OUTRO card
 * (o Kommo junta o chat pelo número, não pelo card do formulário). A Anna não atende nesse card;
 * avisa a equipe nos dois cards, uma vez. Devolve o card de origem, ou null.
 */
export async function respostaEmOutroCard(leadId: number, contatoId: number | undefined, texto: string): Promise<number | null> {
  if (!contatoId) return null
  const { telefonesDoContatoId } = await import('./cards-do-telefone')
  const { addLeadNote, addLeadTask } = await import('./kommo')
  const { CRM_MAP } = await import('./crm-map')
  for (const tel of await telefonesDoContatoId(contatoId)) {
    const origem = await cardQueAbriu(tel)
    if (!origem || origem === leadId) continue
    if ((await redis.set(k('abriu-meta', 'aviso', origem, leadId), '1', { nx: true, ex: 30 * 86400 })) !== 'OK') return origem
    const msg = texto ? ` Mensagem: "${texto.slice(0, 200)}"` : ''
    await addLeadNote(leadId, `O lead respondeu ao primeiro contato que a Anna enviou no card ${origem}, mas o Kommo abriu a conversa neste card. A Anna não atende por aqui.${msg}`)
    await addLeadNote(origem, `O lead respondeu ao primeiro contato da Anna, mas o Kommo abriu a conversa no card ${leadId}. Continue o atendimento por lá.${msg}`)
    await addLeadTask(origem, `Lead respondeu ao primeiro contato da Anna no card ${leadId} (conversa aberta em outro card).${msg}`, CRM_MAP.tarefa)
    return origem
  }
  return null
}
