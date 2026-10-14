import { CONFIG } from './config'
import { k, redis } from './redis'

/**
 * Diário de execuções: quem, quando, o que fez, quanto custou.
 * Preços USD / 1M tokens (conferidos na skill em 24/07/2026 — confira antes de
 * prometer valor). Modelo fora da tabela = custo "não medido" (null).
 */

const PRICES: Record<string, { in: number; cached: number; out: number }> = {
  'gpt-5.4-mini': { in: 0.75, cached: 0.075, out: 4.5 },
  'gpt-5.6-terra': { in: 2.5, cached: 0.25, out: 15 },
}

export interface Usage { input: number; cached: number; output: number; calls: number }

export const emptyUsage = (): Usage => ({ input: 0, cached: 0, output: 0, calls: 0 })

export function addUsage(u: Usage, raw?: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } | null } | null): void {
  if (!raw) return
  u.calls++
  u.input += raw.prompt_tokens || 0
  u.cached += raw.prompt_tokens_details?.cached_tokens || 0
  u.output += raw.completion_tokens || 0
}

export function costUsd(model: string, u: Usage): number | null {
  const p = Object.entries(PRICES).find(([name]) => model.startsWith(name))?.[1]
  if (!p) return null
  const fresh = Math.max(0, u.input - u.cached)
  return Math.round(((fresh * p.in + u.cached * p.cached + u.output * p.out) / 1e6) * 1e6) / 1e6
}

export interface ExecEntry {
  at: string
  tipo: 'resposta' | 'inicio' | 'agendou' | 'humano' | 'followup' | 'job' | 'pulou' | 'erro' | 'reset'
  leadId: number
  nome?: string
  etapa?: string
  ms?: number
  tools?: string[]
  guard?: string[]
  midia?: { audios: number; imagens: number; documentos: number }
  usage?: Usage
  custoUsd?: number | null
  urgente?: boolean
  detalhe?: string
  /** na passagem para a equipe: o motivo (perguntou_robo, pediu_humano, remarcar…, ver central-data.ts) */
  porta?: string
  /** faixa da renda bruta informada, quando já se sabe */
  perfil?: 'acima_10k' | 'abaixo_10k'
  /** o que o lead escreveu neste turno (PII mascarada): replay na Central */
  turnoLead?: string
  /** o que a Anna enviou (PII mascarada) */
  respostaIA?: string
}

/** CPF, CNPJ, telefone e e-mail não ficam no diário (a Central mostra conversas reais). */
export function mascararPII(t: string): string {
  return t
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[e-mail]')
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '[cnpj]')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[cpf]')
    .replace(/(?:\+?55\s?)?\(?\b\d{2}\)?\s?9?\d{4}[-\s]?\d{4}\b/g, '[telefone]')
}

export async function logExec(e: Omit<ExecEntry, 'at'>): Promise<void> {
  const entry: ExecEntry = { at: new Date().toISOString(), ...e }
  if (e.usage && e.custoUsd === undefined) entry.custoUsd = costUsd(CONFIG.llmModel, e.usage)
  if (entry.turnoLead) entry.turnoLead = mascararPII(entry.turnoLead).slice(0, 2000)
  if (entry.respostaIA) entry.respostaIA = mascararPII(entry.respostaIA).slice(0, 3000)
  try {
    await redis.lpush(k('execlog'), entry)
    await redis.ltrim(k('execlog'), 0, 1999)
  } catch (err) {
    console.error('[execlog] falha ao gravar:', err)
  }
}

export async function readExecs(limit = 100): Promise<ExecEntry[]> {
  return (await redis.lrange<ExecEntry>(k('execlog'), 0, limit - 1)) || []
}

/** Último aviso recebido em cada webhook (e quantos em 7 dias): diz se o Kommo está entregando e por que recusamos. */
export async function marcarWebhook(rota: 'inbound' | 'lead' | 'asaas', resultado: string): Promise<void> {
  try {
    await redis.set(k('webhook', rota), JSON.stringify({ em: new Date().toISOString(), resultado: resultado.slice(0, 200) }), { ex: 7 * 86400 })
    const n = k('webhook-n', rota)
    if ((await redis.incr(n)) === 1) await redis.expire(n, 7 * 86400)
  } catch { /* diagnóstico nunca derruba o webhook */ }
}

export async function lerWebhooks(): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {}
  for (const rota of ['inbound', 'lead', 'asaas']) {
    out[rota] = { ultimo: (await redis.get(k('webhook', rota))) || null, recebidos7d: Number((await redis.get(k('webhook-n', rota))) || 0) }
  }
  return out
}
