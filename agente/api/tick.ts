import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { bloqueio } from '../lib/agent'
import { quintaMensagem } from '../lib/anna/fluxo'
import { depsProducao, montarCtx, primeiroNome } from '../lib/anna/producao'
import { CONFIG } from '../lib/config'
import { CRM_MAP, PIPELINES, STATUS, type ChaveModelo } from '../lib/crm-map'
import { emptyUsage, logExec } from '../lib/execlog'
import { executarFu, type Regua } from '../lib/followup'
import { humanSpokeRecently } from '../lib/history'
import { agendarJob, pegarVencidos, type Job } from '../lib/jobs'
import { addLeadNote, getLead, getMainContactName, updateLeadStatus } from '../lib/kommo'
import { enviarModelo } from '../lib/modelos'
import { k, redis } from '../lib/redis'
import { getState } from '../lib/state'

/**
 * O RELÓGIO. QStash chama de 5 em 5 minutos (Authorization: Bearer CRON_SECRET)
 * e cada chamada executa os jobs vencidos: 5ª mensagem (pausa de 30 min),
 * etapas das réguas de follow-up, encerramento e lembretes de reunião.
 * Granularidade de 5 min é o piso da promessa (comum/PEGADINHAS: o tique da janela).
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '') || String(req.query.secret || '')
  if (!CONFIG.cronSecret || !safeEq(auth, CONFIG.cronSecret)) return res.status(401).json({ error: 'unauthorized' })
  const jobs = await pegarVencidos()
  const feitos: string[] = []
  for (const job of jobs) {
    try {
      feitos.push(`${job.tipo} ${job.leadId}: ${await executar(job)}`)
    } catch (e) {
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 300)
      feitos.push(`${job.tipo} ${job.leadId}: ERRO ${msg}`)
      await logExec({ tipo: 'erro', leadId: job.leadId, detalhe: `job ${job.tipo}: ${msg}` })
    }
  }
  return res.status(200).json({ ok: true, executados: feitos.length, feitos })
}

function safeEq(a: string, b: string): boolean {
  return crypto.timingSafeEqual(crypto.createHash('sha256').update(a).digest(), crypto.createHash('sha256').update(b).digest())
}

async function comLock<T>(leadId: number, fn: () => Promise<T>, job: Job): Promise<T | string> {
  const dono = crypto.randomUUID()
  if ((await redis.set(k('lock', leadId), dono, { nx: true, ex: 180 })) !== 'OK') {
    // o lead está sendo atendido agora: tenta de novo no próximo tique
    await agendarJob({ tipo: job.tipo, leadId, quando: Date.now() + 60_000, token: job.token, dados: job.dados })
    return 'adiado: lead em atendimento'
  }
  try { return await fn() } finally {
    await redis.eval(`if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`, [k('lock', leadId)], [dono])
  }
}

async function executar(job: Job): Promise<string> {
  const leadId = job.leadId

  if (job.tipo === 'msg5') {
    return String(await comLock(leadId, async () => {
      const lead = await getLead(leadId)
      const b = bloqueio(lead)
      if (b) return `msg5 cancelada: ${b}`
      const tel = { usage: emptyUsage(), guard: [] as string[] }
      const { ctx } = await montarCtx(leadId, lead)
      const r = await quintaMensagem(ctx, depsProducao(leadId, lead, tel), job.token)
      await logExec({ tipo: 'job', leadId, nome: lead.name, etapa: (await getState(leadId)).etapa, tools: [r.acao], detalhe: r.enviado?.slice(0, 160) })
      return r.acao
    }, job))
  }

  if (job.tipo === 'lembrete') {
    const state = await getState(leadId)
    if (state.reuniao?.eventId !== job.token || state.etapa !== 'agendado') return 'lembrete cancelado (reunião mudou)'
    const lead = await getLead(leadId)
    const nome = primeiroNome(await getMainContactName(lead).catch(() => ''))
    const modelo = String(job.dados?.modelo) as ChaveModelo
    const detalhe = await enviarModelo(leadId, modelo, { primeiroNome: nome || 'tudo bem', linkMeet: state.reuniao.link })
    await logExec({ tipo: 'followup', leadId, nome: lead.name, tools: [`lembrete ${modelo}`], detalhe })
    return detalhe
  }

  // fu / encerra
  const r = await executarFu(job as Job & { tipo: 'fu' | 'encerra' }, {
    async podeSeguir(regua: Regua) {
      const lead = await getLead(leadId)
      if (await humanSpokeRecently(leadId)) return 'a equipe falou com o lead'
      if (regua === 'pos_proposta') {
        if (!CONFIG.posPropostaAtivo) return 'régua pós-proposta desligada'
        return lead.pipeline_id === PIPELINES.closer && lead.status_id === STATUS.clienteDecisao ? null : 'lead saiu de Cliente decisão'
      }
      const b = bloqueio(lead)
      if (b) return b
      const etapa = (await getState(leadId)).etapa
      const esperadas = regua === 'qualificacao' ? ['q1', 'q2', 'q3'] : ['oferta', 'preferencia']
      return etapa && esperadas.includes(etapa) ? null : `etapa atual ${etapa || '(nenhuma)'}`
    },
    async enviar(modelo) {
      const lead = await getLead(leadId)
      const nome = primeiroNome(await getMainContactName(lead).catch(() => ''))
      await enviarModelo(leadId, modelo, { primeiroNome: nome || undefined })
      await addLeadNote(leadId, `Anna: follow-up enviado (${CRM_MAP.modelos[modelo].nome}).`)
    },
    async encerrar(pipelineId, statusId) {
      const lead = await getLead(leadId)
      if (CRM_MAP.pipelinesProibidos.includes(lead.pipeline_id) || CRM_MAP.etapasProtegidas.includes(lead.status_id)) return
      await updateLeadStatus(leadId, statusId, pipelineId)
      await addLeadNote(leadId, 'Anna: régua de follow-up terminou sem resposta. Lead encerrado como perdido (regra atual do escritório).')
    },
  })
  await logExec({ tipo: 'followup', leadId, tools: [r] })
  return r
}
