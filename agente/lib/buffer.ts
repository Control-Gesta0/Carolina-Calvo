import crypto from 'crypto'
import { CONFIG } from './config'
import { sleep } from './kommo'
import { k, redis } from './redis'

/**
 * Buffer de 10s + eleição: rajada de mensagens vira UMA resposta.
 *  - "último webhook vence" (token)
 *  - lock com dono (compare-and-delete): retry nunca duplica
 *  - rate limit 10/min por lead: proteção de custo E de loop de eco
 */

const LOCK_TTL = 180

export interface Claim { proceed: boolean; reason: string; lockOwner?: string }

/** Etapas em que a resposta pode sair logo (oferta e confirmação de horário: a agenda não pode esperar). */
const RAPIDAS = new Set(['oferta', 'preferencia', 'agendado'])

/**
 * Quanto a Anna espera antes de responder (Dra., 06/11): na qualificação, de 60 a 90 s, contados da ÚLTIMA
 * mensagem do lead (cada mensagem nova reinicia a espera e o turno lê todas juntas); na oferta e na
 * confirmação do horário, o buffer curto. Puro (sorteio injetável para o teste).
 */
export function esperaDaResposta(etapa: string | undefined, sorteio = Math.random()): number {
  if (etapa && RAPIDAS.has(etapa)) return CONFIG.debounceSeconds * 1000
  const min = CONFIG.esperaQualificacaoS[0] * 1000
  const max = CONFIG.esperaQualificacaoS[1] * 1000
  return Math.round(min + (max - min) * sorteio)
}

export async function debounceAndClaim(leadId: number, webhookId: string, esperaMs = CONFIG.debounceSeconds * 1000): Promise<Claim> {
  const rl = await redis.incr(k('rl', leadId))
  if (rl === 1) await redis.expire(k('rl', leadId), 60)
  if (rl > 10) return { proceed: false, reason: 'rate limit (10/min) — possível loop de eco' }

  await redis.set(k('token', leadId), webhookId, { ex: 600 })
  await sleep(esperaMs)
  if ((await redis.get<string>(k('token', leadId))) !== webhookId) return { proceed: false, reason: 'webhook mais novo assumiu' }

  const lockOwner = crypto.randomUUID()
  const locked = await redis.set(k('lock', leadId), lockOwner, { nx: true, ex: LOCK_TTL })
  if (locked !== 'OK') return { proceed: false, reason: 'lock ocupado (o dono re-checa ao final)' }
  return { proceed: true, reason: 'ok', lockOwner }
}

export async function releaseLock(leadId: number, lockOwner?: string): Promise<void> {
  if (!lockOwner) return
  await redis.eval(`if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`, [k('lock', leadId)], [lockOwner])
}

export async function renewLock(leadId: number, lockOwner: string): Promise<void> {
  await redis.eval(`if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("expire", KEYS[1], ${LOCK_TTL}) else return 0 end`, [k('lock', leadId)], [lockOwner])
}

export const currentToken = (leadId: number) => redis.get<string>(k('token', leadId))

export async function adoptToken(leadId: number, webhookId: string): Promise<void> {
  await redis.set(k('token', leadId), webhookId, { ex: 600 })
}
