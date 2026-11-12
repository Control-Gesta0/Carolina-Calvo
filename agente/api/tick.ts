import type { VercelRequest, VercelResponse } from '@vercel/node'
import { waitUntil } from '@vercel/functions'
import crypto from 'crypto'
import { bloqueio } from '../lib/agent'
import { followOfertaEquipe, quintaMensagem } from '../lib/anna/fluxo'
import { cobrancaPorContinuar, rodarCobranca } from '../lib/cobranca/executar'
import { comTextos } from '../lib/anna/textos'
import { baseVigente } from '../lib/base'
import { textosDoRoteiro } from '../lib/base-core'
import { depsProducao, montarCtx, primeiroNome } from '../lib/anna/producao'
import { CONFIG } from '../lib/config'
import { colunaDoPrimeiroFollow, CRM_MAP, desqualificaNoSegundoFollow, MOTIVO_DESQUALIFICADO, PIPELINES, qualificacaoEncerrada, STATUS, type ChaveModelo } from '../lib/crm-map'
import { emptyUsage, logExec } from '../lib/execlog'
import { motivoDaFrase, perfilDaRenda } from '../lib/central-data'
import { varrerCloser } from '../lib/closer'
import { varrerEntradas } from '../lib/etiqueta-mes'
import { executarFu, type Regua } from '../lib/followup'
import { executarPosReuniao, reuniaoDoCard, varrerPosReuniao } from '../lib/pos-reuniao'
import { varrerRetomadas } from '../lib/retomada'
import { verificarSaudacao } from '../lib/saudacao'
import { appendMessage, getHistory, humanSpokeRecently } from '../lib/history'
import { agendarJob, pegarVencidos, type Job } from '../lib/jobs'
import { addLeadNote, addLeadTask, fieldValue, getLead, getMainContactName, updateLeadStatus } from '../lib/kommo'
import { conferirLembrete, lerReuniao } from '../lib/google'
import { quandoExtenso } from '../lib/anna/agenda'
import { enviarModelo } from '../lib/modelos'
import { k, redis } from '../lib/redis'
import { sendReply } from '../lib/transport'
import { getState, patchState } from '../lib/state'
import { ehRecorrente, memoriaDoLead, memoriaVale } from '../lib/memoria'
import { TEXTOS } from '../lib/anna/textos'
import { pausado } from '../lib/pausa'

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
  try {
    feitos.push(...(await varrerRetomadas()).map(l => `retomada ${l}`))
  } catch (e) {
    feitos.push(`retomada: ERRO ${(e instanceof Error ? e.message : String(e)).slice(0, 300)}`)
  }
  try {
    feitos.push(...(await varrerPosReuniao()).map(l => `pós-reunião ${l}`))
  } catch (e) {
    feitos.push(`pós-reunião: ERRO ${(e instanceof Error ? e.message : String(e)).slice(0, 300)}`)
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

  // horário oferecido pela equipe e devolvido à Anna (anna-retomar): o follow-up de 1 h, uma vez (Dra., 10/11)
  if (job.tipo === 'oferta-equipe') {
    return String(await comLock(leadId, async () => {
      const lead = await getLead(leadId)
      const b = bloqueio(lead)
      if (b) return `follow da oferta da equipe cancelado: ${b}`
      if (await pausado(leadId)) return 'follow da oferta da equipe cancelado: pausada (a equipe está atendendo)'
      if (await humanSpokeRecently(leadId)) return 'follow da oferta da equipe cancelado: a equipe falou com o lead'
      // texto livre só dentro da janela de 24 h do WhatsApp (contada da última mensagem do lead)
      const ultimaDoLead = (await getHistory(leadId)).filter(m => m.dir === 'in').pop()?.ts ?? 0
      if (Date.now() - ultimaDoLead > 23 * 3600_000) {
        const st = await getState(leadId)
        if (st.ofertaEquipe?.chave === job.token && !st.ofertaEquipe.followEnviado) {
          await patchState(leadId, { ofertaEquipe: { ...st.ofertaEquipe, followEnviado: true } })
          await addLeadTask(leadId, `Anna: o lead não confirmou o horário que a equipe ofereceu (${job.token.replace('T', ' às ')}) e a janela de 24 h do WhatsApp fechou, então o follow-up não pôde sair por texto. Retomar o contato com o lead.`, CRM_MAP.tarefa)
        }
        return 'follow da oferta da equipe: fora da janela de 24 h, tarefa para a equipe'
      }
      const tel = { usage: emptyUsage(), guard: [] as string[] }
      const { ctx } = await montarCtx(leadId, lead)
      const base = await baseVigente()
      const r = await comTextos(textosDoRoteiro(base.textos), () => followOfertaEquipe(ctx, depsProducao(leadId, lead, tel), job.token))
      if (r.reagendarPara) await agendarJob({ tipo: 'oferta-equipe', leadId, quando: r.reagendarPara, token: job.token })
      const depois = await getState(leadId)
      if (r.enviado) await addLeadNote(leadId, `Anna: follow-up do horário oferecido pela equipe. ${r.acao}.`)
      await logExec({ tipo: r.enviado ? 'followup' : 'job', leadId, nome: lead.name, etapa: depois.etapa, tools: [r.acao], detalhe: r.enviado?.slice(0, 160), respostaIA: r.enviado })
      return r.acao
    }, job))
  }

  if (job.tipo === 'posreuniao') return executarPosReuniao(job)
  if (job.tipo === 'saudacao') return verificarSaudacao(job)

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
      if (await pausado(leadId)) return 'pausada: a equipe está atendendo'
      const b = bloqueio(lead)
      if (b) return b
      // qualificação encerrada (Closer, AGENDAR REUNIÃO, DESQUALIFICADO ou reunião marcada): sem follow-up de
      // qualificação (Dra., 11/11 e 12/11; caso Antonio: o 1º follow-up saiu com o card em Reunião agendada)
      const encerrada = regua === 'qualificacao' ? qualificacaoEncerrada({ pipelineId: lead.pipeline_id, statusId: lead.status_id, reuniaoMs: (reuniaoDoCard(lead) ?? 0) * 1000 || null, agoraMs: Date.now() }) : null
      if (encerrada) return encerrada
      const etapa = (await getState(leadId)).etapa
      const esperadas = regua === 'qualificacao' ? ['q1', 'q2', 'limite', 'q3'] : ['oferta', 'preferencia']
      return etapa && esperadas.includes(etapa) ? null : `etapa atual ${etapa || '(nenhuma)'}`
    },
    async enviar(modelo) {
      const lead = await getLead(leadId)
      const nome = primeiroNome(await getMainContactName(lead).catch(() => ''))
      await enviarModelo(leadId, modelo, { primeiroNome: nome || undefined })
      await addLeadNote(leadId, `Anna: follow-up enviado (${CRM_MAP.modelos[modelo].nome}).`)
    },
    // Dra., 12/11: a mensagem do lead recorrente não sai mais como follow-up (agora é no início do atendimento)
    async enviarTexto(texto, modeloForaDaJanela, nota) {
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
      await addLeadNote(leadId, nota || 'Anna: follow-up enviado (texto da equipe sobre a confirmação do horário).')
      return 'texto'
    },
    async aposPrimeiroFollow() {
      // Dra., 05/11: recebeu o 1º follow-up sem responder → AGUARDANDO QUALIFICAÇÃO (só sai de Contato inicial;
      // quem já está numa coluna de renda fica onde está). A renda informada depois leva para a coluna certa.
      const lead = await getLead(leadId)
      if (lead.pipeline_id !== PIPELINES.sdr || lead.status_id !== STATUS.contatoInicial) return
      // Dra., 09/11: quem marcou no formulário "de 10 a 15" ou "acima de 15" vai direto para a coluna da faixa;
      // só "até 5 mil" e "de 5 a 10 mil" (e faixa ambígua ou vazia) ficam em AGUARDANDO QUALIFICAÇÃO
      const destino = colunaDoPrimeiroFollow(String(fieldValue(lead, CRM_MAP.campos.formSalario) || ''))
      await updateLeadStatus(leadId, destino, PIPELINES.sdr)
      await addLeadNote(leadId, destino === STATUS.aguardandoQualificacao
        ? 'Anna: o lead recebeu o 1º follow-up sem responder. Card movido para AGUARDANDO QUALIFICAÇÃO.'
        : `Anna: o lead recebeu o 1º follow-up sem responder. Pela faixa do formulário, card movido para ${destino === STATUS.acima15 ? 'ACIMA DE 15 MIL' : '10 A 15 MIL'}. A renda confirmada na conversa continua valendo para a coluna final.`)
    },
    async aposSegundoFollow() {
      // Dra., 11/11: formulário até R$ 10 mil, sem nenhuma resposta até o 2º follow-up → DESQUALIFICADO na hora
      const lead = await getLead(leadId)
      const st = await getState(leadId)
      const respondeu = (await getHistory(leadId)).some(m => m.dir === 'in' && m.ts >= (st.inicioEm ?? 0))
      const faixa = String(fieldValue(lead, CRM_MAP.campos.formSalario) || '')
      if (!desqualificaNoSegundoFollow({ faixa, pipelineId: lead.pipeline_id, statusId: lead.status_id, rendaConfirmada: st.rendaBruta != null, respondeu })) return false
      await updateLeadStatus(leadId, STATUS.desqualificado, PIPELINES.sdr)
      await addLeadNote(leadId, `Anna: ${MOTIVO_DESQUALIFICADO.semResposta} Faixa do formulário: "${faixa}" (não é renda confirmada). Follow-ups restantes cancelados. Se o lead responder, a Anna retoma a qualificação e a renda confirmada decide a coluna.`)
      return true
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
