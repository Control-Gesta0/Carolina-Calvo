/**
 * Webhooks da Anna VIA API (no UI é onde se erra o filtro e nasce o eco).
 *   npx tsx scripts/create-webhook.ts            → só LISTA os webhooks atuais
 *   npx tsx scripts/create-webhook.ts --criar    → cria os dois:
 *       add_message, add_outgoing_message   → DEPLOY_URL/api/inbound (recebidas e enviadas pela equipe/bot)
 *       add_lead, update_lead, status_lead  → DEPLOY_URL/api/lead
 * Ação externa na conta do cliente: confirme com o responsável antes de --criar.
 */
import { loadEnv } from './env'

loadEnv()
const domain = (process.env.KOMMO_DOMAIN || '').replace(/\/+$/, '').replace(/^(?!https?:\/\/)/, 'https://')
const headers = { Authorization: `Bearer ${process.env.KOMMO_TOKEN}`, 'Content-Type': 'application/json' }
const base = (process.env.DEPLOY_URL || '').replace(/\/+$/, '')
const secret = encodeURIComponent(process.env.WEBHOOK_SECRET || '')

async function main() {
  const atual = await fetch(`${domain}/api/v4/webhooks`, { headers }).then(r => (r.status === 204 ? {} : r.json())) as { _embedded?: { webhooks?: Array<{ id: number; destination: string; settings: string[] }> } }
  for (const h of atual._embedded?.webhooks || []) console.log(`${h.id} · ${h.destination.replace(/secret=[^&]+/, 'secret=***')} · ${JSON.stringify(h.settings)}`)
  if (!process.argv.includes('--criar')) return
  if (!base || !secret) throw new Error('DEPLOY_URL e WEBHOOK_SECRET no .env.local')
  for (const [destination, settings] of [[`${base}/api/inbound?secret=${secret}`, ['add_message', 'add_outgoing_message']], [`${base}/api/lead?secret=${secret}`, ['add_lead', 'update_lead', 'status_lead']]] as const) {
    const r = await fetch(`${domain}/api/v4/webhooks`, { method: 'POST', headers, body: JSON.stringify({ destination, settings }) })
    console.log('criado:', settings.join(','), r.status, (await r.text()).slice(0, 200))
  }
}
main().catch(e => { console.error(e); process.exit(1) })
