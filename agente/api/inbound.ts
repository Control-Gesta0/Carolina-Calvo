import type { VercelRequest, VercelResponse } from '@vercel/node'
import { waitUntil } from '@vercel/functions'
import crypto from 'crypto'
import { bloqueio, processLead } from '../lib/agent'
import { CONFIG } from '../lib/config'
import { logExec, marcarWebhook } from '../lib/execlog'
import { cancelarRegua } from '../lib/followup'
import { botRodandoRecente } from '../lib/modelos'
import { appendMessage, isEchoOfSent, markHumanSpoke, seenMessage } from '../lib/history'
import { getLead } from '../lib/kommo'
import { mediaKind, mediaToText } from '../lib/media'
import { isResetCommand, resetLead } from '../lib/reset'
import { sendReply } from '../lib/transport'

/**
 * Webhook nativo "add_message" do Kommo (form-urlencoded, chaves em colchetes):
 *   account[id] · message[add][0][id|entity_id|contact_id|text|created_at|type]
 *   message[add][0][attachment][type|link]   (voice | picture | file)
 * 200 IMEDIATO + waitUntil (senão o Kommo reenvia).
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') return res.status(200).json({ ok: true, service: 'anna', cliente: CONFIG.clientName, model: CONFIG.llmModel, gate: CONFIG.gateTag || '(todos)' })
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })
  const provided = String(req.headers['x-webhook-secret'] || req.query.secret || '')
  if (!safeEq(provided, CONFIG.webhookSecret)) {
    await marcarWebhook('inbound', '401 secret errado')
    return res.status(401).json({ error: 'unauthorized' })
  }

  const parsed = parseKommoWebhook(req.body)
  if (!parsed) {
    await marcarWebhook('inbound', `sem message[add] · ${typeof req.body} · chaves: ${Object.keys((req.body || {}) as object).slice(0, 6).join(', ')}`)
    return res.status(200).json({ ok: false, reason: 'sem message[add]' })
  }
  if (parsed.accountId && parsed.accountId !== CONFIG.kommoAccountId) {
    await marcarWebhook('inbound', `outra conta ${parsed.accountId}`)
    return res.status(200).json({ ok: false, reason: 'outra conta' })
  }
  await marcarWebhook('inbound', `ok · ${parsed.msgs.length} msg · lead ${parsed.msgs[0].leadId} · ${parsed.msgs[0].direction}`)

  waitUntil(ingest(parsed.msgs, crypto.randomUUID()))
  return res.status(200).json({ ok: true })
}

function safeEq(a: string, b: string): boolean {
  return crypto.timingSafeEqual(crypto.createHash('sha256').update(a).digest(), crypto.createHash('sha256').update(b).digest())
}

export interface InboundMsg { id: string; leadId: number; text: string; attachType: string; attachLink: string; direction: string }

function pick(body: Record<string, unknown>, flat: string, nested: Array<string | number>): string {
  const v = body[flat]
  if (v !== undefined && v !== null) return String(v)
  let cur: unknown = body
  for (const key of nested) {
    if (cur === null || typeof cur !== 'object') return ''
    cur = (cur as Record<string, unknown>)[String(key)]
  }
  return cur === undefined || cur === null ? '' : String(cur)
}

export function parseKommoWebhook(raw: unknown): { accountId: string; msgs: InboundMsg[] } | null {
  if (!raw || typeof raw !== 'object') return null
  const body = raw as Record<string, unknown>
  const msgs: InboundMsg[] = []
  for (let i = 0; i < 20; i++) {
    const p = (f: string, n: Array<string | number>) => pick(body, `message[add][${i}]${f}`, ['message', 'add', i, ...n])
    const id = p('[id]', ['id'])
    const entityId = p('[entity_id]', ['entity_id'])
    const text = p('[text]', ['text'])
    if (!id && !entityId && !text) break
    const leadId = Number(entityId)
    if (!leadId) continue
    msgs.push({
      id: id || `${leadId}:${p('[created_at]', ['created_at'])}:${i}`,
      leadId, text,
      attachType: p('[attachment][type]', ['attachment', 'type']),
      attachLink: p('[attachment][link]', ['attachment', 'link']),
      direction: p('[type]', ['type']).toLowerCase(),
    })
  }
  return msgs.length ? { accountId: pick(body, 'account[id]', ['account', 'id']), msgs } : null
}

async function ingest(msgs: InboundMsg[], webhookId: string): Promise<void> {
  const leads = new Set<number>()
  // O webhook traz as mensagens de TODOS os leads da conta. Quem a Anna não atende (sem a tag de
  // liberação, com a equipe, cliente, financeiro) sai aqui, antes de gastar OpenAI com áudio/imagem.
  const liberado = new Map<number, boolean>()
  const podeAtender = async (leadId: number) => {
    if (!liberado.has(leadId)) liberado.set(leadId, await getLead(leadId).then(l => !bloqueio(l)).catch(() => true))
    return liberado.get(leadId)!
  }
  for (const m of msgs) {
    try {
      if (await seenMessage(`kommo:${m.id}`)) continue
      let text = (m.text || '').trim()
      const outgoing = m.direction === 'outgoing'
      // reset de teste vem antes do filtro: o lead de teste pode ter saído da Anna (passou para a equipe)
      if (!outgoing && text && isResetCommand(m.leadId, text)) {
        await resetLead(m.leadId)
        await sendReply(m.leadId, '🔄 Teste reiniciado. Mande a primeira mensagem como se fosse um lead novo.')
        await logExec({ tipo: 'reset', leadId: m.leadId, detalhe: 'reset de teste' })
        continue
      }
      if (!(await podeAtender(m.leadId))) continue
      const kind = mediaKind(m.attachType)
      if (kind && !outgoing) text = await mediaToText(kind, m.attachLink, text)
      if (!text) continue

      // Eco do que o NOSSO bot enviou (texto igual, ou saída logo depois de um run nosso): já está no histórico
      if (await isEchoOfSent(m.leadId, text)) continue
      if (outgoing) {
        if (await botRodandoRecente(m.leadId)) continue
        // Saída que não é nossa = equipe (ou outra automação) falando: registra, recua e para a régua
        await appendMessage(m.leadId, { id: `kommo:${m.id}`, dir: 'out', text, ts: Date.now() })
        await markHumanSpoke(m.leadId)
        await cancelarRegua(m.leadId)
        continue
      }
      // O lead respondeu: qualquer régua de follow-up dele para na hora
      await cancelarRegua(m.leadId)

      await appendMessage(m.leadId, { id: `kommo:${m.id}`, dir: 'in', text, ts: Date.now() })
      leads.add(m.leadId)
    } catch (e) {
      console.error(`[inbound] erro ingerindo msg ${m.id}:`, e)
    }
  }
  await Promise.all([...leads].map(leadId => processLead(leadId, webhookId)))
}
