/**
 * Relógios da Anna no QStash (a conta é compartilhada com outros clientes: só mexe nos da Anna).
 *   npx tsx scripts/criar-relogio.ts                    → só LISTA os schedules da conta
 *   npx tsx scripts/criar-relogio.ts --criar            → cria ou atualiza o tique de 5 min (upsert por id fixo)
 *   npx tsx scripts/criar-relogio.ts --criar --cobranca → também a cobrança das 9h e das 17h (Brasília)
 *   npx tsx scripts/criar-relogio.ts --apagar           → apaga os da Anna
 * O CRON_SECRET vai em Upstash-Forward-Authorization: o QStash repassa como Authorization: Bearer.
 */
import { loadEnv } from './env'

loadEnv()
const qstash = (process.env.QSTASH_URL || 'https://qstash.upstash.io').replace(/\/+$/, '')
const headers = { Authorization: `Bearer ${process.env.QSTASH_TOKEN}` }
const base = (process.env.DEPLOY_URL || '').replace(/\/+$/, '')

// Brasília é UTC-3 o ano todo: 9h = 12:00 UTC, 17h = 20:00 UTC
const RELOGIOS = [
  { id: 'anna-carolina-calvo-tick', cron: '*/5 * * * *', rota: '/api/tick', cobranca: false },
  { id: 'anna-carolina-calvo-cobranca-manha', cron: '0 12 * * *', rota: '/api/cobranca?turno=manha', cobranca: true },
  { id: 'anna-carolina-calvo-cobranca-tarde', cron: '0 20 * * *', rota: '/api/cobranca?turno=tarde', cobranca: true },
]

type Schedule = { scheduleId: string; cron: string; destination: string; isPaused?: boolean }

async function main() {
  if (!process.env.QSTASH_TOKEN) throw new Error('QSTASH_URL e QSTASH_TOKEN no .env.local')
  const r = await fetch(`${qstash}/v2/schedules`, { headers })
  if (!r.ok) throw new Error(`listar: ${r.status} ${(await r.text()).slice(0, 200)}`)
  for (const s of (await r.json()) as Schedule[]) {
    const nosso = RELOGIOS.some(x => x.id === s.scheduleId) ? '  ← Anna' : ''
    console.log(`${s.scheduleId} · ${s.cron} · ${s.destination}${s.isPaused ? ' · PAUSADO' : ''}${nosso}`)
  }

  if (process.argv.includes('--apagar')) {
    for (const x of RELOGIOS) console.log('apagado:', x.id, (await fetch(`${qstash}/v2/schedules/${x.id}`, { method: 'DELETE', headers })).status)
    return
  }
  if (!process.argv.includes('--criar')) return
  if (!base || !process.env.CRON_SECRET) throw new Error('DEPLOY_URL e CRON_SECRET no .env.local')
  for (const x of RELOGIOS.filter(x => !x.cobranca || process.argv.includes('--cobranca'))) {
    const c = await fetch(`${qstash}/v2/schedules/${base}${x.rota}`, {
      method: 'POST',
      headers: {
        ...headers,
        'Upstash-Schedule-Id': x.id,
        'Upstash-Cron': x.cron,
        'Upstash-Retries': x.cobranca ? '2' : '0', // a cobrança é idempotente: repetir não manda duas vezes
        'Upstash-Forward-Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
    })
    console.log('criado/atualizado:', x.id, x.cron, `${base}${x.rota}`, c.status, (await c.text()).slice(0, 120))
  }
}
main().catch(e => { console.error(e); process.exit(1) })
