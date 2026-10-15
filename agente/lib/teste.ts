import { createInterprete } from './anna/interprete'
import { createRedator } from './anna/redator'
import { quintaMensagem, turno, type Ctx, type Deps } from './anna/fluxo'
import { proximoSlot, type Slot } from './anna/agenda'
import { comTextos } from './anna/textos'
import { baseVigente, candidata } from './base'
import { renderPrompt, textosDoRoteiro, type Textos } from './base-core'
import { CONFIG } from './config'
import { CRM_MAP, STATUS } from './crm-map'
import { costUsd, emptyUsage } from './execlog'
import type { ChatMsg } from './history'
import { getTemplateText } from './kommo'
import { renderizar } from './modelos'
import { promptTemplate } from './anna/interprete'
import { k, redis } from './redis'
import type { LeadState } from './state'

/**
 * LABORATÓRIO (aba Teste da Central): conversa com a Anna de verdade (o mesmo
 * roteiro, o mesmo intérprete e as mesmas travas), com o Kommo, o WhatsApp e a
 * agenda em memória. Nada vai para o Kommo, para o WhatsApp nem para a agenda
 * da Dra. A pausa de 30 minutos da 4ª mensagem é pulada: a 5ª sai na hora.
 * A sessão vive 6 h no Redis. Pode usar a versão no ar ou o rascunho da base.
 */

export interface Opcoes {
  /** lead_escreve: o lead manda a primeira mensagem · formulario: a Anna começa com o modelo "Primeiro contato" */
  inicio: 'lead_escreve' | 'formulario'
  /** cheia: simula a agenda da Dra. sem horário livre */
  agenda: 'livre' | 'cheia'
  versao: 'vigente' | 'rascunho'
}

export interface Detalhe { tools: string[]; log: string[]; guard: string[]; ms: number; custoUsd: number; handoff: boolean }

export interface Mundo {
  state: LeadState
  /** o que aconteceria no card do Kommo */
  coluna: string
  tags: string[]
  notas: string[]
  tarefas: string[]
  campos: Record<string, string>
  reguas: string[]
  reuniao?: { quando: string; link: string }
}

export interface Sessao {
  id: string
  criadoEm: string
  opcoes: Opcoes
  history: ChatMsg[]
  mundo: Mundo
  detalhes: Record<string, Detalhe>
  turnos: number
  custoUsd: number
}

const TTL = 6 * 3600
const MAX_TURNOS = 40
const MAX_DIA = 300
const K = (id: string) => k('teste', id)
const NOME = 'Maria Teste'

const COLUNA: Record<number, string> = {
  [STATUS.ate5]: 'SDR › ATÉ 5 MIL', [STATUS.de5a10]: 'SDR › 5 A 10 MIL', [STATUS.de10a15]: 'SDR › 10 A 15 MIL',
  [STATUS.acima15]: 'SDR › ACIMA DE 15 MIL', [STATUS.naoQuerContinuar]: 'SDR › NÃO QUER CONTINUAR', [STATUS.reuniaoAgendada]: 'Closer › REUNIÃO AGENDADA',
}
const CAMPO: Record<number, string> = Object.fromEntries(Object.entries(CRM_MAP.campos).map(([nome, id]) => [id, nome]))

export const opcoesPadrao = (): Opcoes => ({ inicio: 'lead_escreve', agenda: 'livre', versao: 'vigente' })

function nova(id: string, opcoes: Opcoes): Sessao {
  return {
    id, criadoEm: new Date().toISOString(), opcoes, history: [],
    mundo: { state: {}, coluna: 'SDR › CONTATO INICIAL', tags: [CONFIG.gateTag], notas: [], tarefas: [], campos: {}, reguas: [] },
    detalhes: {}, turnos: 0, custoUsd: 0,
  }
}

export async function lerSessao(id: string): Promise<Sessao | null> {
  return redis.get<Sessao>(K(id))
}

/** Começa do zero. Com início "formulario", a Anna abre com o modelo aprovado (ou o rascunho do modelo, enquanto a Meta não aprova). */
export async function recomecar(id: string, opcoes?: Partial<Opcoes>): Promise<Sessao> {
  const atual = await lerSessao(id)
  const s = nova(id, { ...opcoesPadrao(), ...(atual?.opcoes || {}), ...(opcoes || {}) })
  if (s.opcoes.inicio === 'formulario') {
    const m = CRM_MAP.modelos.primeiroContato
    const modelo = await getTemplateText(m.templateId).catch(() => '')
    const texto = modelo ? renderizar(modelo, { [CRM_MAP.campos.primeiroNome]: 'Maria' }) : `(modelo "${m.nome}" não carregou do Kommo)`
    s.history.push({ id: 'r0', dir: 'out', text: texto, ts: Date.now() })
    s.detalhes.r0 = { tools: [`primeiro contato: modelo "${m.nome}"`, 'régua de qualificação iniciada'], log: [], guard: [], ms: 0, custoUsd: 0, handoff: false }
    s.mundo.state = { etapa: 'q1', inicioEm: Date.now() - 1000 }
    s.mundo.reguas.push('qualificacao')
  }
  await redis.set(K(id), s, { ex: TTL })
  return s
}

export async function falar(id: string, textoLead: string): Promise<{ sessao?: Sessao; erro?: string }> {
  const msg = String(textoLead || '').trim().slice(0, 2000)
  if (!msg) return { erro: 'Mensagem vazia.' }
  if (/^\s*#?reset\s*$/i.test(msg)) return { sessao: await recomecar(id) }

  if (!(await redis.set(k('teste', 'lock', id), '1', { nx: true, ex: 120 }))) return { erro: 'A Anna ainda está respondendo a mensagem anterior.' }
  try {
    const s = (await lerSessao(id)) || nova(id, opcoesPadrao())
    if (s.mundo.state.etapa === 'humano') return { erro: 'A Anna já passou este atendimento para a equipe (no WhatsApp ela para de responder aqui). Clique em Recomeçar para testar de novo.' }
    if (s.turnos >= MAX_TURNOS) return { erro: `Esta conversa chegou a ${MAX_TURNOS} mensagens. Clique em Recomeçar.` }
    const dia = k('teste', 'dia', new Date().toISOString().slice(0, 10))
    const usados = await redis.incr(dia)
    if (usados === 1) await redis.expire(dia, 2 * 86400)
    if (usados > MAX_DIA) return { erro: `O laboratório chegou ao limite de ${MAX_DIA} mensagens hoje (protege o custo). Volta amanhã.` }

    const { prompt, textos } = s.opcoes.versao === 'rascunho'
      ? await candidata().then(c => ({ textos: c.textos, prompt: renderPrompt(promptTemplate(), c.textos, c.extras) }))
      : await baseVigente()

    const t0 = Date.now()
    s.history.push({ id: `l${s.history.length}`, dir: 'in', text: msg, ts: Date.now() })
    const r = await rodarTurno(s, textos, prompt)
    const custo = costUsd(CONFIG.llmModel, r.usage) || 0
    const rid = `r${s.history.length}`
    if (!r.enviados.length) s.history.push({ id: rid, dir: 'out', text: '(a Anna não respondeu nesta mensagem)', ts: Date.now() })
    for (const [i, t] of r.enviados.entries()) s.history.push({ id: i === 0 ? rid : `${rid}_${i}`, dir: 'out', text: t, ts: Date.now() })
    s.detalhes[rid] = { tools: r.tools, log: r.log, guard: r.guard, ms: Date.now() - t0, custoUsd: custo, handoff: r.handoff }
    s.turnos++
    s.custoUsd = Math.round((s.custoUsd + custo) * 1e6) / 1e6
    await redis.set(K(id), s, { ex: TTL })
    const kc = k('teste', 'custo', new Date().toISOString().slice(0, 10))
    await redis.incrbyfloat(kc, custo)
    await redis.expire(kc, 40 * 86400)
    return { sessao: s }
  } finally {
    await redis.del(k('teste', 'lock', id))
  }
}

/** Um turno do roteiro com o mundo em memória; a 5ª mensagem (pausa de 30 min) sai logo em seguida. */
async function rodarTurno(s: Sessao, textos: Textos, prompt: string) {
  const usage = emptyUsage()
  const enviados: string[] = []
  const tools: string[] = []
  const log: string[] = []
  const guard: string[] = []
  let handoff = false
  let msg5: string | null = null
  const w = s.mundo
  const reservados = new Set<string>()
  const interprete = createInterprete({ apiKey: CONFIG.openaiApiKey, model: CONFIG.llmModel, prompt: () => prompt })
  const redator = process.env.REDACAO === 'off' ? null : createRedator({ apiKey: CONFIG.openaiApiKey, model: CONFIG.llmModel })

  const deps: Deps = {
    async interpretar(e) {
      const r = await interprete.interpretar(e)
      usage.calls += r.usage.calls; usage.input += r.usage.input; usage.cached += r.usage.cached; usage.output += r.usage.output
      guard.push(...r.guard)
      tools.push(`intenção: ${r.leitura.intencao}`)
      return r.leitura
    },
    ...(redator ? {
      async redigir(r) {
        const out = await redator.redigir(r)
        usage.calls += out.usage.calls; usage.input += out.usage.input; usage.cached += out.usage.cached; usage.output += out.usage.output
        guard.push(...out.guard)
        if (!out.redigido) tools.push(`redação: saiu o texto pronto (${r.id})`)
        return out.texto
      },
    } : {}),
    async enviar(t) { enviados.push(t) },
    async patch(p) { w.state = { ...w.state, ...p }; return w.state },
    async salvarCampos(v) {
      for (const [id, valor] of Object.entries(v)) {
        const nome = CAMPO[Number(id)] || id
        w.campos[nome] = Number(id) === CRM_MAP.campos.reuniao || Number(id) === CRM_MAP.campos.agendamento
          ? new Date(Number(valor) * 1000).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
          : String(valor)
        log.push(`campo ${nome} = ${w.campos[nome]}`)
      }
    },
    async mover(statusId) { w.coluna = COLUNA[statusId] || String(statusId); log.push(`card movido para ${w.coluna}`) },
    async addTags(t) { w.tags.push(...t.filter(x => !w.tags.includes(x))); log.push(`tag ${t.join(', ')}`) },
    async nota(t) { w.notas.push(t); log.push(`nota no card: ${t.slice(0, 160)}`) },
    async passarParaHumano(motivo, resumo) {
      handoff = true
      w.tags = [...w.tags.filter(x => x !== CONFIG.gateTag), CONFIG.humanTag, CRM_MAP.tags.passouHumano].filter((x, i, a) => a.indexOf(x) === i)
      w.tarefas.push(`Assumir o atendimento: ${motivo}`)
      w.reguas.push('cancelada')
      log.push(`passou para a equipe (${motivo}): tag ${CONFIG.humanTag}, tarefa para a Dra. Resumo: ${resumo.slice(0, 160)}`)
    },
    async tarefa(t) { w.tarefas.push(t); log.push(`tarefa: ${t.slice(0, 160)}`) },
    async agendarMsg5(token) { msg5 = token; log.push('5ª mensagem agendada para daqui a 30 min (no teste sai agora)') },
    novoToken: () => `lab${Date.now().toString(36)}`,
    async iniciarRegua(r) { w.reguas.push(r); log.push(`régua de follow-up "${r}" iniciada`) },
    async cancelarRegua() { log.push('régua de follow-up cancelada') },
    agenda: {
      disponivel: () => s.opcoes.agenda === 'livre',
      async buscar(o) { return proximoSlot({ agora: agoraDe(), ocupados: [], reservados, ...o, mesmoDia: o.mesmoDia }) },
      async reservar(slot) { reservados.add(slot.chave) },
      async confirmar(slot: Slot) {
        const link = `https://meet.google.com/lab-${slot.chave.replace(/\D/g, '').slice(-6)}`
        log.push(`evento criado na agenda (simulado): ${slot.chave}, Meet ${link}`)
        return { eventId: `lab-${slot.chave}`, link }
      },
    },
    async agendarLembretes() { log.push('lembretes de 24h, 1h e 15 min agendados') },
  }

  let agora = new Date()
  const agoraDe = () => agora
  const ctx = (): Ctx => {
    const iOut = s.history.map(m => m.dir).lastIndexOf('out')
    return {
      agora, nomeContato: NOME, primeiroNome: 'Maria', state: w.state,
      textoTurno: s.history.slice(iOut + 1).filter(m => m.dir === 'in').map(m => m.text).join('\n'),
      conversa: s.history,
    }
  }
  const roteiro = textosDoRoteiro(textos)
  const r = await comTextos(roteiro, () => turno(ctx(), deps))
  tools.unshift(r.acao)
  if (msg5) {
    // a pausa de 30 minutos: no teste a 5ª mensagem sai logo depois, na mesma resposta
    agora = new Date(agora.getTime() + 30 * 60_000)
    const r5 = await comTextos(roteiro, () => quintaMensagem(ctx(), deps, msg5!))
    tools.push(`30 min depois: ${r5.acao}`)
  }
  if (w.reuniao === undefined && w.state.reuniao) w.reuniao = { quando: w.campos.horarioReuniao || w.state.reuniao.inicio, link: w.state.reuniao.link }
  return { enviados, tools, log, guard, handoff, usage }
}

export async function custoHoje(): Promise<{ mensagens: number; custoUsd: number; limite: number; usdBrl: number }> {
  const d = new Date().toISOString().slice(0, 10)
  const [m, c] = await Promise.all([redis.get<number>(k('teste', 'dia', d)), redis.get<number>(k('teste', 'custo', d))])
  return { mensagens: Number(m || 0), custoUsd: Math.round(Number(c || 0) * 10000) / 10000, limite: MAX_DIA, usdBrl: CONFIG.usdBrl }
}
