/**
 * Webhook do Asaas para a confirmação de pagamento (ação na conta do escritório: confirme antes de --criar).
 *   npx tsx scripts/criar-webhook-asaas.ts            → só LISTA os webhooks da conta Asaas
 *   npx tsx scripts/criar-webhook-asaas.ts --criar    → cria o da Anna: PAYMENT_RECEIVED e PAYMENT_CONFIRMED
 *                                                       → DEPLOY_URL/api/asaas, com ASAAS_WEBHOOK_TOKEN
 */
import { loadEnv } from './env'

loadEnv()
const url = (process.env.ASAAS_URL || 'https://api.asaas.com/v3').replace(/\/+$/, '')
const headers = { access_token: process.env.ASAAS_API_KEY || '', 'User-Agent': 'control-gestao-anna', 'Content-Type': 'application/json' }
const base = (process.env.DEPLOY_URL || '').replace(/\/+$/, '')

async function main() {
  if (!process.env.ASAAS_API_KEY) throw new Error('ASAAS_API_KEY no .env.local')
  const r = await fetch(`${url}/webhooks`, { headers })
  const d = (await r.json()) as { data?: Array<{ id: string; name: string; url: string; enabled: boolean; interrupted: boolean; events: string[] }> }
  for (const w of d.data || []) console.log(`${w.id} · ${w.name} · ${w.url} · ${w.enabled ? 'ligado' : 'desligado'}${w.interrupted ? ' · FILA PAUSADA' : ''} · ${w.events.join(',')}`)
  if (!process.argv.includes('--criar')) return
  if (!base || !process.env.ASAAS_WEBHOOK_TOKEN) throw new Error('DEPLOY_URL e ASAAS_WEBHOOK_TOKEN no .env.local')
  const c = await fetch(`${url}/webhooks`, {
    method: 'POST', headers,
    body: JSON.stringify({
      name: 'Anna · confirmação de pagamento', url: `${base}/api/asaas`, email: process.env.ASAAS_WEBHOOK_EMAIL || 'tecnico@controlgestao.com.br',
      enabled: true, interrupted: false, apiVersion: 3, authToken: process.env.ASAAS_WEBHOOK_TOKEN, sendType: 'SEQUENTIALLY',
      events: ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'],
    }),
  })
  console.log('criado:', c.status, (await c.text()).slice(0, 300))
}
main().catch(e => { console.error(e); process.exit(1) })
