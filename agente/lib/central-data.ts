import type { ExecEntry } from './execlog'

/**
 * Contrato de dados da Central (painel v5). Tudo calculado em CÓDIGO a partir
 * do diário de execuções e do Kommo: zero tokens, nenhum número inventado.
 * Arquivo puro (sem env) para rodar em `npm test`. O espelho na Central é
 * central/lib/types.ts: mudou aqui, mude lá.
 */

/** O que a execução produziu: reunião marcada ou passagem para a equipe. */
export type Marco = 'agendou' | 'passou'
/** Faixa da renda bruta que o lead informou (a regra da Dra.: só acima de 15 mil a Anna oferece reunião). */
export type Perfil = 'acima_15k' | 'ate_15k'

export const MOTIVOS: Record<string, { rotulo: string; urgente?: boolean }> = {
  perguntou_robo: { rotulo: 'Perguntou se é robô' },
  pediu_humano: { rotulo: 'Pediu uma pessoa' },
  tem_advogado: { rotulo: 'Já tem advogado no caso' },
  ja_e_cliente: { rotulo: 'Já é cliente' },
  quer_contratar: { rotulo: 'Quer contratar', urgente: true },
  outro_assunto: { rotulo: 'Assunto de outra área' },
  // reunião marcada que pode estar perto: a equipe precisa ver logo
  remarcar: { rotulo: 'Pediu para remarcar', urgente: true },
  // a Anna não achou horário (Google fora ou agenda cheia): o lead está esperando um horário
  sem_agenda: { rotulo: 'Sem horário na agenda', urgente: true },
  abaixo_pediu_reuniao: { rotulo: 'Renda até 15 mil pediu reunião' },
  outro: { rotulo: 'Outro motivo' },
}
export const rotuloMotivo = (m?: string) => MOTIVOS[m || 'outro']?.rotulo || m || 'Outro motivo'

/** Frase do fluxo (lib/anna/fluxo.ts → humano()) → chave do motivo. */
const MOTIVO_POR_FRASE: Record<string, string> = {
  'perguntou se é robô': 'perguntou_robo',
  'pediu atendimento humano': 'pediu_humano',
  'já tem advogado no caso': 'tem_advogado',
  'já é cliente': 'ja_e_cliente',
  'quer contratar': 'quer_contratar',
  'assunto de outra área': 'outro_assunto',
  'pediu para remarcar': 'remarcar',
  'agenda indisponível': 'sem_agenda',
  'sem horário livre nos próximos dias': 'sem_agenda',
  'renda abaixo de 10 mil pediu reunião': 'abaixo_pediu_reuniao',
  'renda até 15 mil pediu reunião': 'abaixo_pediu_reuniao',
}
export const motivoDaFrase = (frase: string) => MOTIVO_POR_FRASE[frase.trim()] || 'outro'

export const perfilDaRenda = (rendaBruta?: number | null): Perfil | undefined =>
  typeof rendaBruta === 'number' && rendaBruta > 0 ? (rendaBruta > 15_000 ? 'acima_15k' : 'ate_15k') : undefined

export interface Execution {
  ts: string
  contactId: string
  nome: string
  tipo: ExecEntry['tipo']
  resultado: 'respondeu' | 'erro' | 'pulou'
  detalhe: string
  duracaoMs: number
  tools: string[]
  travas: string[]
  midia?: ExecEntry['midia']
  /** etapa do roteiro depois da execução (q1, q2, q3, analise, oferta, preferencia, agendado, sem_reuniao, humano) */
  etapa?: string
  turnoLead?: string
  respostaIA?: string
  marco?: Marco
  /** na passagem: o motivo (perguntou_robo, pediu_humano, remarcar…) */
  motivo?: string
  perfil?: Perfil
  custo?: {
    totalBrl: number
    modeloUsd: number
    usdBrl: number
    tokens: { input: number; cached: number; output: number; chamadas: number }
  }
}

export interface Marcos {
  /** contatos que receberam mensagem da Anna */
  atendidos: number
  /** contatos que informaram a renda bruta */
  rendaInformada: number
  /** renda bruta acima de R$ 15 mil: seguem para a oferta de reunião */
  acima15k: number
  /** renda bruta até R$ 15 mil: sem oferta de reunião, ficam para a equipe avaliar */
  ate15k: number
  /** reuniões marcadas pela Anna */
  agendados: number
  /** passados para a equipe */
  passagens: number
  /** contatos que receberam follow-up ou lembrete */
  followups: number
}

export interface MotivoN { motivo: string; rotulo: string; n: number }

export interface Passagem {
  ts: string
  contactId: string
  nome: string
  motivo: string
  rotulo: string
  perfil?: Perfil
  resumo: string
  urgente: boolean
  link: string
}

export interface Agendamento {
  ts: string
  contactId: string
  nome: string
  /** a confirmação que a Anna mandou (tem o dia, a hora e o link) */
  resumo: string
  link: string
}

export interface Financial {
  hoje: number
  seteDias: number
  trintaDias: number
  totalRegistrado: number
  execucoesComCusto: number
  execucoesSemCusto: number
  medioPorExecucao: number
  porDia: Array<{ data: string; custo: number; execucoes: number }>
  usdBrl: number
  observacao: string
}

export interface ExecutionData {
  execucoes: Execution[]
  saude24h: { total: number; respondeu: number; erros: number; pulou: number }
  marcos: { hoje: Marcos; seteDias: Marcos; trintaDias: Marcos }
  motivos: { hoje: MotivoN[]; seteDias: MotivoN[]; trintaDias: MotivoN[] }
  passagens: Passagem[]
  agendamentos: Agendamento[]
  financeiro: Financial
  cobertura: { desde: string | null; registros: number }
  modelo: string
}

const DIA = 86400_000
/** execuções em que a Anna mandou mensagem para o lead */
const FALOU: Array<ExecEntry['tipo']> = ['resposta', 'inicio', 'agendou', 'humano', 'job']

/** Data (AAAA-MM-DD) no fuso de São Paulo. */
export function diaSP(iso: string | number | Date): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

export function marcoDe(e: Pick<ExecEntry, 'tipo'>): Marco | undefined {
  if (e.tipo === 'agendou') return 'agendou'
  if (e.tipo === 'humano') return 'passou'
  return undefined
}

export function linkLead(dominio: string, leadId: string | number): string {
  return dominio ? `${dominio.replace(/\/+$/, '')}/leads/detail/${leadId}` : ''
}

export function toExecution(e: ExecEntry, usdBrl: number): Execution {
  const resultado: Execution['resultado'] = e.tipo === 'erro' ? 'erro' : e.tipo === 'pulou' ? 'pulou' : 'respondeu'
  const custoUsd = typeof e.custoUsd === 'number' ? e.custoUsd : null
  return {
    ts: e.at,
    contactId: String(e.leadId),
    nome: e.nome || 'Lead',
    tipo: e.tipo,
    resultado,
    detalhe: e.detalhe || '',
    duracaoMs: e.ms || 0,
    tools: e.tools || [],
    travas: e.guard || [],
    midia: e.midia,
    etapa: e.etapa,
    turnoLead: e.turnoLead,
    respostaIA: e.respostaIA,
    marco: marcoDe(e),
    motivo: e.tipo === 'humano' ? e.porta || 'outro' : undefined,
    perfil: e.perfil,
    custo: custoUsd !== null && e.usage
      ? {
          totalBrl: round(custoUsd * usdBrl, 5),
          modeloUsd: custoUsd,
          usdBrl,
          tokens: { input: e.usage.input, cached: e.usage.cached, output: e.usage.output, chamadas: e.usage.calls },
        }
      : undefined,
  }
}

/** Contatos únicos por marco (quem repete a ação conta uma vez). Reset de teste não conta. */
export function contarMarcos(execs: Execution[]): Marcos {
  const contatos = (f: (e: Execution) => boolean) => new Set(execs.filter(f).map(e => e.contactId)).size
  // faixa de renda mais recente de cada contato (execs vêm do mais novo para o mais velho)
  const perfil = new Map<string, Perfil>()
  for (const e of execs) if (e.perfil && !perfil.has(e.contactId)) perfil.set(e.contactId, e.perfil)
  const perfis = [...perfil.values()]
  return {
    atendidos: contatos(e => FALOU.includes(e.tipo)),
    rendaInformada: perfis.length,
    acima15k: perfis.filter(p => p === 'acima_15k').length,
    ate15k: perfis.filter(p => p === 'ate_15k').length,
    agendados: contatos(e => e.marco === 'agendou'),
    passagens: contatos(e => e.marco === 'passou'),
    followups: contatos(e => e.tipo === 'followup'),
  }
}

/** Passagens por motivo: cada par contato + motivo conta uma vez. */
export function contarMotivos(execs: Execution[]): MotivoN[] {
  const pares = new Set<string>()
  const n = new Map<string, number>()
  for (const e of execs) {
    if (e.marco !== 'passou') continue
    const m = e.motivo || 'outro'
    if (pares.has(`${e.contactId}|${m}`)) continue
    pares.add(`${e.contactId}|${m}`)
    n.set(m, (n.get(m) || 0) + 1)
  }
  return [...n.entries()].map(([motivo, total]) => ({ motivo, rotulo: rotuloMotivo(motivo), n: total })).sort((a, b) => b.n - a.n)
}

export function buildExecutionData(entries: ExecEntry[], usdBrl: number, modelo: string, now = Date.now(), dominio = ''): ExecutionData {
  const execs = entries.map(e => toExecution(e, usdBrl)).sort((a, b) => b.ts.localeCompare(a.ts))
  const reais = execs.filter(e => e.tipo !== 'reset')
  const desde = (ms: number) => reais.filter(e => now - Date.parse(e.ts) <= ms)
  const hojeSP = diaSP(now)
  const deHoje = reais.filter(e => diaSP(e.ts) === hojeSP)
  const h24 = execs.filter(e => now - Date.parse(e.ts) <= DIA)
  const soma = (xs: Execution[]) => round(xs.reduce((s, e) => s + (e.custo?.totalBrl || 0), 0), 4)
  const comCusto = execs.filter(e => e.custo)
  const semCusto = execs.filter(e => !e.custo && FALOU.includes(e.tipo) && e.tipo !== 'job')

  const porDia = Array.from({ length: 14 }, (_, i) => {
    const data = diaSP(now - (13 - i) * DIA)
    const doDia = execs.filter(e => diaSP(e.ts) === data && e.resultado !== 'pulou')
    return { data, custo: soma(doDia), execucoes: doDia.length }
  })

  return {
    execucoes: execs.slice(0, 200),
    saude24h: {
      total: h24.filter(e => e.resultado !== 'pulou').length,
      respondeu: h24.filter(e => e.resultado === 'respondeu').length,
      erros: h24.filter(e => e.resultado === 'erro').length,
      pulou: h24.filter(e => e.resultado === 'pulou').length,
    },
    marcos: { hoje: contarMarcos(deHoje), seteDias: contarMarcos(desde(7 * DIA)), trintaDias: contarMarcos(desde(30 * DIA)) },
    motivos: { hoje: contarMotivos(deHoje), seteDias: contarMotivos(desde(7 * DIA)), trintaDias: contarMotivos(desde(30 * DIA)) },
    passagens: reais.filter(e => e.marco === 'passou').slice(0, 60).map(e => {
      const motivo = e.motivo || 'outro'
      return {
        ts: e.ts, contactId: e.contactId, nome: e.nome, motivo, rotulo: rotuloMotivo(motivo), perfil: e.perfil,
        // detalhe da passagem = o resumo que foi para a tarefa da Dra. (objetivo, renda, desconto); sem ele, a mensagem ao lead
        resumo: (e.detalhe || e.respostaIA || '').slice(0, 600), urgente: !!MOTIVOS[motivo]?.urgente, link: linkLead(dominio, e.contactId),
      }
    }),
    agendamentos: reais.filter(e => e.marco === 'agendou').slice(0, 60).map(e => ({
      ts: e.ts, contactId: e.contactId, nome: e.nome, resumo: (e.respostaIA || e.detalhe).slice(0, 600), link: linkLead(dominio, e.contactId),
    })),
    financeiro: {
      hoje: soma(execs.filter(e => diaSP(e.ts) === hojeSP)),
      seteDias: soma(execs.filter(e => now - Date.parse(e.ts) <= 7 * DIA)),
      trintaDias: soma(execs.filter(e => now - Date.parse(e.ts) <= 30 * DIA)),
      totalRegistrado: soma(execs),
      execucoesComCusto: comCusto.length,
      execucoesSemCusto: semCusto.length,
      medioPorExecucao: comCusto.length ? round(soma(comCusto) / comCusto.length, 5) : 0,
      porDia,
      usdBrl,
      observacao: `Custo do modelo de linguagem convertido a US$ 1 = R$ ${usdBrl.toFixed(2).replace('.', ',')}. Transcrição de áudio, leitura de imagem e infraestrutura não entram nesta conta.`,
    },
    cobertura: { desde: execs.length ? execs[execs.length - 1].ts : null, registros: execs.length },
    modelo,
  }
}

// ---------- Funil (Kommo, só leitura) ----------

export interface KommoEtapa { id: number; nome: string; funil: string; ordem: number; ia: boolean }

export interface KommoLeadResumo {
  id: number
  name?: string
  price?: number
  status_id: number
  pipeline_id: number
  updated_at?: number
  created_at?: number
  tags?: string[]
}

export interface FunilEtapa {
  id: string
  label: string
  /** leads abertos na etapa */
  n: number
  /** a Anna move cards para esta etapa? */
  ia: boolean
  valor: number
  parados: number
  amostras: Array<{ id: string; nome: string; valor: number; diasParado: number }>
}

export interface LiveData {
  geradoEm: string
  conversas: Array<{ id: string; nome: string; ultimaMsg: string; minutosAtras: number; estado: 'ia' | 'humano' | 'fora' }>
  grupos: { iaAtendendo: number; comHumano: number; foraDaIA: number }
  conversas24h: number
  respostaMedianaSegundos: number | null
  pipeline: { nome: string }
  funil: FunilEtapa[]
  leads: { total: number; abertas: number; ganhas: number; perdidas: number; comIA: number; tagsDisponiveis: boolean }
  regras: { modoGate: string; gateTag: string; humanTag: string; expediente: string }
  saude: { crmOk: boolean; problemas: string[] }
  /** o Kommo está entregando? último aviso de cada webhook */
  webhooks?: Record<string, { ultimo: { em: string; resultado: string } | null; recebidos7d: number }>
}

export function buildFunil(etapas: KommoEtapa[], leads: KommoLeadResumo[], gateTag: string, now = Date.now()): Pick<LiveData, 'funil' | 'leads'> {
  const ordenadas = [...etapas].sort((a, b) => a.ordem - b.ordem)
  const funil: FunilEtapa[] = ordenadas.map(s => ({ id: String(s.id), label: `${s.funil} › ${s.nome}`, n: 0, ia: s.ia, valor: 0, parados: 0, amostras: [] }))
  const dias = (l: KommoLeadResumo) => Math.floor((now - (l.updated_at || l.created_at || now / 1000) * 1000) / DIA)
  const total = { total: leads.length, abertas: 0, ganhas: 0, perdidas: 0, comIA: 0, tagsDisponiveis: false }
  for (const l of leads) {
    if (l.tags) total.tagsDisponiveis = true
    if ((l.tags || []).map(t => t.toLowerCase()).includes(gateTag)) total.comIA++
    if (l.status_id === 142) { total.ganhas++; continue }
    if (l.status_id === 143) { total.perdidas++; continue }
    const etapa = funil.find(f => f.id === String(l.status_id))
    if (!etapa) continue
    total.abertas++
    const valor = Number(l.price || 0)
    etapa.n++
    etapa.valor += valor
    const d = dias(l)
    if (d >= 7) {
      etapa.parados++
      if (etapa.amostras.length < 4) etapa.amostras.push({ id: String(l.id), nome: l.name || 'Lead', valor, diasParado: d })
    }
  }
  return { funil, leads: total }
}

/** Conversas das últimas 24h e o estado atual de cada lead, a partir do diário. */
export function buildConversas(execs: Execution[], now = Date.now()): Pick<LiveData, 'conversas' | 'grupos' | 'conversas24h' | 'respostaMedianaSegundos'> {
  const h24 = execs.filter(e => now - Date.parse(e.ts) <= DIA)
  const ultimas = new Map<string, Execution>()
  for (const e of h24) if (!ultimas.has(e.contactId)) ultimas.set(e.contactId, e) // do mais novo pro mais velho
  const conversas = [...ultimas.values()].map(e => {
    const estado: 'ia' | 'humano' | 'fora' =
      e.marco === 'passou' || e.etapa === 'humano' || (e.resultado === 'pulou' && /equipe/i.test(e.detalhe)) ? 'humano'
      : e.resultado === 'pulou' ? 'fora' : 'ia'
    return {
      id: e.contactId,
      nome: e.nome,
      ultimaMsg: e.tipo === 'reset' ? `Reset de teste: ${e.detalhe}` : e.respostaIA || e.turnoLead || e.detalhe,
      minutosAtras: Math.max(0, Math.round((now - Date.parse(e.ts)) / 60000)),
      estado,
    }
  })
  const tempos = h24.filter(e => ['resposta', 'agendou', 'humano'].includes(e.tipo) && e.duracaoMs > 0).map(e => e.duracaoMs).sort((a, b) => a - b)
  const mediana = tempos.length ? tempos[Math.floor(tempos.length / 2)] / 1000 : null
  return {
    conversas: conversas.slice(0, 40),
    grupos: {
      iaAtendendo: conversas.filter(c => c.estado === 'ia').length,
      comHumano: conversas.filter(c => c.estado === 'humano').length,
      foraDaIA: conversas.filter(c => c.estado === 'fora').length,
    },
    conversas24h: new Set(h24.filter(e => FALOU.includes(e.tipo)).map(e => e.contactId)).size,
    respostaMedianaSegundos: mediana === null ? null : round(mediana, 1),
  }
}

function round(n: number, casas: number): number {
  const f = 10 ** casas
  return Math.round(n * f) / f
}
