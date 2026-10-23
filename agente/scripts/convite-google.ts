/**
 * Gera o link de conexão da agenda Google para a Dra. (api/google.ts). Vale 7 dias e uma vez só.
 *   npx tsx scripts/convite-google.ts            → imprime o link
 * Precisa de UPSTASH_REDIS_REST_URL / _TOKEN e REDIS_PREFIX iguais aos da produção.
 */
import crypto from 'crypto'
import { k, redis } from '../lib/redis'

async function main() {
  const token = crypto.randomBytes(18).toString('base64url')
  await redis.set(k('google', 'convite', token), new Date().toISOString(), { ex: 7 * 86400 })
  const base = process.env.ANNA_URL || 'https://anna-carolina-calvo.vercel.app'
  console.log(`${base}/api/google?convite=${token}`)
}
main()
