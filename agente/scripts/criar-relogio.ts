/**
 * Relógio da Anna no QStash (chama /api/tick de 5 em 5 minutos).
 *   npx tsx scripts/criar-relogio.ts            → só LISTA os schedules da conta (há outros clientes nela: não mexa)
 *   npx tsx scripts/criar-relogio.ts --criar    → cria ou atualiza SÓ o schedule da Anna (id fixo, upsert)
 *   npx tsx scripts/criar-relogio.ts --apagar   → apaga SÓ o schedule da Anna
 * O CRON_SECRET vai em Upstash-Forward-Authorization: o QStash repassa como Authorization: Bearer.
 */
import { loadEnv } from './env'

loadEnv()
const qstash = (process.env.QSTASH_URL || 'https://qstash.upstash.io').replace(/\/+$/, '')
const headers = { Authorization: `Bearer ${process.env.QSTASH_TOKEN}` }
const base = (process.env.DEPLOY_URL || '').replace(/\/+$/, '')
const ID = 'anna-carolina-calvo-tick'
const CRON = '*/5 * * * *'

type Schedule = { scheduleId: string; cron: string; destination: string; isPaused?: boolean; header?: Record<string, string[]> }

async function main() {
  if (!process.env.QSTASH_TOKEN) throw new Error('QSTASH_URL e QSTASH_TOKEN no .env.local')
  const r = await fetch(`${qstash}/v2/schedules`, { headers })
  if (!r.ok) throw new Error(`listar: ${r.status} ${(await r.text()).slice(0, 200)}`)
  for (const s of (await r.json()) as Schedule[]) {
    const nosso = s.scheduleId === ID ? '  ← Anna' : ''
    console.log(`${s.scheduleId} · ${s.cron} · ${s.destination}${s.isPaused ? ' · PAUSADO' : ''}${nosso}`)
  }

  if (process.argv.includes('--apagar')) {
    const d = await fetch(`${qstash}/v2/schedules/${ID}`, { method: 'DELETE', headers })
    console.log('apagado:', ID, d.status)
    return
  }
  if (!process.argv.includes('--criar')) return
  if (!base || !process.env.CRON_SECRET) throw new Error('DEPLOY_URL e CRON_SECRET no .env.local')
  const c = await fetch(`${qstash}/v2/schedules/${base}/api/tick`, {
    method: 'POST',
    headers: {
      ...headers,
      'Upstash-Schedule-Id': ID,
      'Upstash-Cron': CRON,
      'Upstash-Retries': '0', // o próximo tique vem em 5 min; os jobs ficam na fila até serem pegos
      'Upstash-Forward-Authorization': `Bearer ${process.env.CRON_SECRET}`,
    },
  })
  console.log('criado/atualizado:', ID, CRON, `${base}/api/tick`, c.status, (await c.text()).slice(0, 200))
}
main().catch(e => { console.error(e); process.exit(1) })
