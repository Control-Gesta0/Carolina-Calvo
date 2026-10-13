/**
 * Roda o /api/validate localmente contra o Kommo VIVO (só leitura).
 *   npx tsx scripts/validate.ts     (KOMMO_* e OPENAI_API_KEY no .env.local)
 */
import { loadEnv } from './env'

loadEnv()
for (const [key, val] of Object.entries({ UPSTASH_REDIS_REST_URL: 'https://x.upstash.io', UPSTASH_REDIS_REST_TOKEN: 'x', WEBHOOK_SECRET: 'x', OPENAI_API_KEY: 'x' })) process.env[key] ||= val

import('../api/validate').then(async ({ validar }) => {
  const r = await validar()
  console.log(JSON.stringify(r, null, 2))
  process.exit(r.ok ? 0 : 1)
}).catch(e => { console.error(e); process.exit(1) })
