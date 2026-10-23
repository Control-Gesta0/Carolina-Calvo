import type { VercelRequest, VercelResponse } from '@vercel/node'
import { waitUntil } from '@vercel/functions'
import crypto from 'crypto'
import { bloqueio } from '../lib/agent'
import { quintaMensagem } from '../lib/anna/fluxo'
import { cobrancaPorContinuar, rodarCobranca } from '../lib/cobranca/executar'
import { comTextos } from '../lib/anna/textos'
import { baseVigente } from '../lib/base'
import { textosDoRoteiro } from '../lib/base-core'
import { depsProducao, montarCtx, primeiroNome } from '../lib/anna/producao'
import { CONFIG } from '../lib/config'
import { CRM_MAP, PIPELINES, STATUS, type ChaveModelo } from '../lib/crm-map'
import { emptyUsage, logExec } from '../lib/execlog'
import { motivoDaFrase, perfilDaRenda } from '../lib/central-data'
import { varrerCloser } from '../lib/closer'
import { varrerEntradas } from '../lib/etiqueta-mes'
import { executarFu, type Regua } from '../lib/followup'
import { executarPosReuniao } from '../lib/pos-reuniao'
import { appendMessage, getHistory, humanSpokeRecently } from '../lib/history'
import { agendarJob, pegarVencidos, type Job } from '../lib/jobs'
import { addLeadNote, addLeadTask, getLead, getMainContactName, updateLeadStatus } from '../lib/kommo'
import { conferirLembrete, lerReuniao } from '../lib/google'
import { quandoExtenso } from '../lib/anna/agenda'
import { enviarModelo } from '../lib/modelos'
import { k, redis } from '../lib/redis'
import { sendReply } from '../lib/transport'
import { getState } from '../lib/state'

/**
 * O RELÓGIO. QStash chama de 5 em 5 minutos (Authorization: Bearer CRON_SECRET)
 * e cada chamada executa os jobs vencidos: 5ª mensagem (pausa de 30 min),
 * etapas das réguas de follow-up, encerramento, lembretes e o follow-up 23h depois da reunião. Com
 * ETIQUETA_MES_ATIVA, também põe a etiqueta de mês nos cards novos de formulário.
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
  try {
    feitos.push(...(await varrerCloser()).map(l => `closer ${l}`))
  } catch (e) {
    feitos.push(`closer: ERRO ${(e instanceof Error ? e.message : String(e)).slice(0, 300)}`)
  }
  if (CONFIG.etiquetaMesAtiva) {
    try {
      feitos.push(...(await varrerEntradas()).map(l => `etiqueta de mês ${l}`))
    } catch (e) {
      feitos.push(`etiqueta de mês: ERRO ${(e instanceof Error ? e.message : String(e)).slice(0, 300)}`)
    }
  }
  // cobrança grande (dia 06 e 07): a rodada que não terminou continua por aqui, de 5 em 5 min
  const turnoCobranca = await cobrancaPorContinuar().catch(() => null)
  if (turnoCobranca) waitUntil(rodarCobranca(turnoCobranca).then(() => undefined).catch(e => console.error('[tick] continuação da cobrança falhou:', e)))
  return res.status(200).json({ ok: true, executados: feitos.length, feitos, ...(turnoCobranca ? { cobranca: `continuando ${turnoCobranca}` } : {}) })
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
      const base = await baseVigente()
      const r = await comTextos(textosDoRoteiro(base.textos), () => quintaMensagem(ctx, depsProducao(leadId, lead, tel), job.token))
      const depois = await getState(leadId)
      const passou = r.acao.startsWith('passou para humano')
      await logExec({
        tipo: passou ? 'humano' : 'job', leadId, nome: lead.name, etapa: depois.etapa, tools: [r.acao], detalhe: r.enviado?.slice(0, 160),
        ...(passou ? { porta: motivoDaFrase(r.acao.replace(/^passou para humano:\s*/, '')), detalhe: r.resumo?.slice(0, 600) } : {}),
        perfil: perfilDaRenda(depois.rendaBruta), respostaIA: r.enviado,
      })
      return r.acao
    }, job))
  }

  if (job.tipo === 'posreuniao') return executarPosReuniao(job)

  if (job.tipo === 'lembrete') {
    const state = await getState(leadId)
    if (state.reuniao?.eventId !== job.token || state.etapa !== 'agendado') return 'lembrete cancelado (reunião mudou)'
    const lead = await getLead(leadId)
    const modelo = String(job.dados?.modelo) as ChaveModelo
    // a Dra. pode ter movido ou apagado a reunião direto no Google: lembrete com horário velho não sai
    let conferencia: 'ok' | 'apagada' | 'mudou' = 'ok'
    let novoInicio = ''
    try {
      const ev = await lerReuniao(state.reuniao.eventId)
      conferencia = conferirLembrete(state.reuniao.inicio, ev)
      novoInicio = ev?.inicio || ''
    } catch (e) {
      console.error(`[tick] não deu para conferir a reunião ${state.reuniao.eventId} na agenda:`, e)
    }
    if (conferencia !== 'ok') {
      const motivo = conferencia === 'apagada'
        ? 'a reunião foi apagada da agenda da Dra.'
        : `a reunião mudou de horário na agenda da Dra. (agora: ${quandoExtenso(new Date(novoInicio))})`
      if ((await redis.set(k('lembrete-aviso', leadId, state.reuniao.eventId, conferencia), '1', { nx: true, ex: 7 * 86400 })) === 'OK') {
        await addLeadNote(leadId, `Anna: lembrete não enviado porque ${motivo}. O lead ainda tem o horário antigo.`)
        await addLeadTask(leadId, `Reunião ${conferencia === 'apagada' ? 'apagada' : 'remarcada'} direto na agenda: avisar o lead e atualizar o card (${motivo}).`, CRM_MAP.tarefa)
      }
      await logExec({ tipo: 'pulou', leadId, nome: lead.name, tools: [`lembrete ${modelo}`], detalhe: `lembrete não enviado: ${motivo}` })
      return `lembrete não enviado: ${motivo}`
    }
    // 1h e 15 min: com o card em Closer › Reunião agendada, a automação do escritório já manda (2h, 1h e
    // 15 min antes do campo "Reunião"). A Anna só cobre quando o card saiu de lá (ex.: o robô
    // "SDR RETORNO IMEDIATO" devolveu para o SDR porque o lead respondeu).
    const pulo = modelo !== 'lembrete24h' && lead.pipeline_id === PIPELINES.closer && lead.status_id === STATUS.reuniaoAgendada
      ? 'automação do escritório cobre (Reunião agendada)'
      : !CRM_MAP.modelos[modelo].botId ? `bot do modelo "${CRM_MAP.modelos[modelo].nome}" ainda sem modelo` : ''
    if (pulo) {
      await logExec({ tipo: 'pulou', leadId, nome: lead.name, tools: [`lembrete ${modelo}`], detalhe: pulo })
      return `lembrete pulado: ${pulo}`
    }
    const nome = primeiroNome(await getMainContactName(lead).catch(() => ''))
    const detalhe = await enviarModelo(leadId, modelo, { primeiroNome: nome || 'tudo bem', linkMeet: state.reuniao.link })
    await logExec({ tipo: 'followup', leadId, nome: lead.name, tools: [`lembrete ${modelo}`], detalhe })
    return detalhe
  }

  // fu / encerra
  const r = await executarFu(job as Job & { tipo: 'fu' | 'encerra' }, {
    async podeSeguir(regua: Regua) {
      const lead = await getLead(leadId)
      if (await humanSpokeRecently(leadId)) return 'a equipe falou com o lead'
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
    async enviarTexto(texto, modeloForaDaJanela) {
      // texto livre só dentro da janela de 24h da Meta (contada da última mensagem do lead); fora dela, o modelo aprovado
      const ultimaDoLead = (await getHistory(leadId)).filter(m => m.dir === 'in').pop()?.ts ?? 0
      if (Date.now() - ultimaDoLead > 23 * 3600_000) {
        const lead = await getLead(leadId)
        const nome = primeiroNome(await getMainContactName(lead).catch(() => ''))
        await enviarModelo(leadId, modeloForaDaJanela, { primeiroNome: nome || undefined })
        await addLeadNote(leadId, `Anna: follow-up enviado (${CRM_MAP.modelos[modeloForaDaJanela].nome}, fora da janela de 24h).`)
        return 'modelo'
      }
      await sendReply(leadId, texto)
      await appendMessage(leadId, { id: crypto.randomUUID(), dir: 'out', text: texto, ts: Date.now() })
      await addLeadNote(leadId, 'Anna: follow-up enviado (texto da equipe sobre a confirmação do horário).')
      return 'texto'
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
