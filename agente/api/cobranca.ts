import type { VercelRequest, VercelResponse } from '@vercel/node'
import { waitUntil } from '@vercel/functions'
import crypto from 'crypto'
import { centralAutorizada } from '../lib/central-auth'
import { lerRodadas, rodarCobranca } from '../lib/cobranca/executar'
import type { Turno } from '../lib/cobranca/regua'
import { CONFIG } from '../lib/config'

/**
 * Cobrança pelo Asaas.
 *   QStash (Authorization: Bearer CRON_SECRET)  ?turno=manha (9h) | tarde (17h) → roda a régua de hoje
 *   Central ou equipe técnica (x-central-secret, ou ?secret=WEBHOOK_SECRET):
 *     ?simular=1&turno=manha|tarde   → o que sairia hoje, sem enviar nada
 *     ?log=1                          → as últimas rodadas
 * Sem COBRANCA_ATIVA=true a rodada do relógio também só simula (e registra).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  const turno: Turno = String(req.query.turno || '') === 'tarde' ? 'tarde' : 'manha'
  const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  const relogio = !!CONFIG.cronSecret && !!bearer && safeEq(bearer, CONFIG.cronSecret)
  const leitura = centralAutorizada(req) || (!!req.query.secret && safeEq(String(req.query.secret), CONFIG.webhookSecret))
  try {
    if (relogio && !req.query.simular && !req.query.log) {
      // responde já e roda por trás: o QStash não espera (nem repete) uma rodada longa
      waitUntil(rodarCobranca(turno).catch(e => console.error('[cobranca] rodada falhou:', e)))
      return res.status(202).json({ ok: true, turno, ativa: CONFIG.cobrancaAtiva })
    }
    if (!leitura && !relogio) return res.status(401).json({ error: 'unauthorized' })
    if (req.query.log) return res.status(200).json({ rodadas: await lerRodadas(Number(req.query.n || 30)) })
    const r = await rodarCobranca(turno, { simular: true })
    return res.status(200).json({ ...r, porResultado: contar(r.itens.map(i => i.resultado)), porEtapa: contar(r.itens.map(i => i.etapa)) })
  } catch (e) {
    return res.status(500).json({ error: (e instanceof Error ? e.message : String(e)).slice(0, 300) })
  }
}

const contar = (xs: string[]) => xs.reduce<Record<string, number>>((o, x) => ({ ...o, [x]: (o[x] || 0) + 1 }), {})

function safeEq(a: string, b: string): boolean {
  return crypto.timingSafeEqual(crypto.createHash('sha256').update(a).digest(), crypto.createHash('sha256').update(b).digest())
}
