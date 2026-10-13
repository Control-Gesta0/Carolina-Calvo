import type { VercelRequest, VercelResponse } from '@vercel/node'
import { waitUntil } from '@vercel/functions'
import crypto from 'crypto'
import { bloqueio } from '../lib/agent'
import { primeiroNome } from '../lib/anna/producao'
import { CONFIG } from '../lib/config'
import { CRM_MAP, PIPELINES, STATUS } from '../lib/crm-map'
import { logExec, marcarWebhook } from '../lib/execlog'
import { getFu, iniciarRegua } from '../lib/followup'
import { addLeadTags, getLead, getMainContactName } from '../lib/kommo'
import { enviarModelo } from '../lib/modelos'
import { k, redis } from '../lib/redis'
import { clearState, getState, patchState } from '../lib/state'

/**
 * Webhooks de LEAD do Kommo (add_lead, update_lead, status_lead):
 *  - lead com a tag da Anna e sem conversa → primeiro contato com o modelo aprovado
 *    (lead de formulário nunca escreveu, então só modelo entrega);
 *  - AUTO_GATE_FORM_LEADS=true → lead novo de formulário de superendividamento ganha a tag;
 *  - entrou em Closer › Cliente decisão → régua pós-proposta (se POS_PROPOSTA_ATIVO).
 * Payload: form-urlencoded "leads[add|update|status][0][id|status_id|pipeline_id]".
 */

interface Evento { tipo: 'add' | 'update' | 'status'; id: number; statusId: number; pipelineId: number }

export function parseLeadWebhook(body: Record<string, unknown>): Evento[] {
  const out: Evento[] = []
  for (const tipo of ['add', 'update', 'status'] as const) {
    for (let i = 0; i < 50; i++) {
      const g = (f: string) => {
        const flat = body[`leads[${tipo}][${i}][${f}]`]
        if (flat !== undefined) return String(flat)
        const nested = (((body.leads as Record<string, unknown> | undefined)?.[tipo] as Record<string, unknown> | undefined)?.[i] as Record<string, unknown> | undefined)?.[f]
        return nested === undefined ? '' : String(nested)
      }
      const id = Number(g('id'))
      if (!id) break
      out.push({ tipo, id, statusId: Number(g('status_id')), pipelineId: Number(g('pipeline_id')) })
    }
  }
  return out
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true, service: 'anna-leads' })
  const provided = String(req.headers['x-webhook-secret'] || req.query.secret || '')
  if (!safeEq(provided, CONFIG.webhookSecret)) {
    await marcarWebhook('lead', '401 secret errado')
    return res.status(401).json({ error: 'unauthorized' })
  }
  const eventos = parseLeadWebhook((req.body || {}) as Record<string, unknown>)
  await marcarWebhook('lead', eventos.length ? `ok · ${eventos.length} evento(s) · ${eventos[0].tipo} ${eventos[0].id}` : `0 eventos · chaves: ${Object.keys((req.body || {}) as object).slice(0, 6).join(', ')}`)
  waitUntil(Promise.all(eventos.map(tratar)))
  return res.status(200).json({ ok: true, eventos: eventos.length })
}

function safeEq(a: string, b: string): boolean {
  return crypto.timingSafeEqual(crypto.createHash('sha256').update(a).digest(), crypto.createHash('sha256').update(b).digest())
}

const ehLeadDeFormularioSE = (lead: Awaited<ReturnType<typeof getLead>>) =>
  lead.pipeline_id === PIPELINES.sdr && (lead.custom_fields_values || []).some(f => f.field_id === CRM_MAP.campos.formSalario)

async function tratar(ev: Evento): Promise<void> {
  let iniciou = false
  try {
    if (ev.tipo === 'status') {
      if (CONFIG.posPropostaAtivo && ev.pipelineId === PIPELINES.closer && ev.statusId === STATUS.clienteDecisao) {
        const fu = await getFu(ev.id)
        if (fu?.regua !== 'pos_proposta') {
          await iniciarRegua(ev.id, 'pos_proposta')
          await logExec({ tipo: 'followup', leadId: ev.id, tools: ['régua pós-proposta iniciada'] })
        }
      }
      return
    }

    let lead = await getLead(ev.id)
    if (ev.tipo === 'add' && CONFIG.autoGateFormLeads && CONFIG.gateTag && ehLeadDeFormularioSE(lead)) {
      await addLeadTags(ev.id, [CONFIG.gateTag])
      lead = await getLead(ev.id)
    }
    if (bloqueio(lead) || lead.pipeline_id !== PIPELINES.sdr) return
    if ((await getState(ev.id)).etapa) return
    if (!CRM_MAP.modelos.primeiroContato.botId) {
      // modelo ainda não aprovado: a Anna começa quando o lead escrever (janela de 24h aberta)
      await logExec({ tipo: 'pulou', leadId: ev.id, nome: lead.name, detalhe: 'primeiro contato aguardando o modelo aprovado; a Anna responde quando o lead escrever' })
      return
    }
    // um primeiro contato por lead, mesmo com webhooks repetidos
    if ((await redis.set(k('iniciado', ev.id), '1', { nx: true, ex: 30 * 86400 })) !== 'OK') return

    const nome = primeiroNome(await getMainContactName(lead).catch(() => ''))
    const agora = Date.now()
    await patchState(ev.id, { etapa: 'q1', inicioEm: agora - 1000 })
    iniciou = true
    const detalhe = await enviarModelo(ev.id, 'primeiroContato', { primeiroNome: nome || 'tudo bem' })
    await iniciarRegua(ev.id, 'qualificacao', agora)
    await logExec({ tipo: 'inicio', leadId: ev.id, nome: lead.name, etapa: 'q1', tools: ['primeiro contato (modelo)'], detalhe })
  } catch (e) {
    if (iniciou) await clearState(ev.id)
    await redis.del(k('iniciado', ev.id))
    await logExec({ tipo: 'erro', leadId: ev.id, detalhe: `webhook de lead: ${(e instanceof Error ? e.message : String(e)).slice(0, 300)}` })
  }
}
