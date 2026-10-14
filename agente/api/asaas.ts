import type { VercelRequest, VercelResponse } from '@vercel/node'
import { waitUntil } from '@vercel/functions'
import crypto from 'crypto'
import type { Cobranca } from '../lib/asaas'
import { confirmarPagamento } from '../lib/cobranca/executar'
import { CONFIG } from '../lib/config'
import { marcarWebhook } from '../lib/execlog'

/**
 * Webhook do Asaas (header asaas-access-token = ASAAS_WEBHOOK_TOKEN).
 * PAYMENT_RECEIVED / PAYMENT_CONFIRMED → mensagem "Pagamento confirmado" na hora
 * (entre 8h e 20h) e a tag de inadimplente sai. Responde 200 sempre que o token
 * confere: o Asaas pausa a fila de webhooks depois de erros seguidos.
 */
const EVENTOS_PAGO = new Set(['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'])

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true, service: 'anna-asaas' })
  const dado = String(req.headers['asaas-access-token'] || '')
  const h = (x: string) => crypto.createHash('sha256').update(x).digest()
  if (!CONFIG.asaas.webhookToken || !dado || !crypto.timingSafeEqual(h(dado), h(CONFIG.asaas.webhookToken))) {
    await marcarWebhook('asaas', '401 token errado')
    return res.status(401).json({ error: 'unauthorized' })
  }
  const b = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}) as { event?: string; payment?: Cobranca }
  const evento = String(b.event || '')
  waitUntil(marcarWebhook('asaas', `ok · ${evento} · ${b.payment?.id || '-'}`))
  if (EVENTOS_PAGO.has(evento) && b.payment?.id) waitUntil(confirmarPagamento(b.payment).then(() => undefined).catch(e => console.error('[asaas] confirmação falhou:', e)))
  return res.status(200).json({ ok: true })
}
