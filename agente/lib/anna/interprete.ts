import fs from 'fs'
import path from 'path'
import OpenAI from 'openai'
import { addUsage, emptyUsage, type Usage } from '../execlog'
import { checkReply, semTravessao } from '../guards'
import type { ChatMsg } from '../history'
import type { Etapa, LeadState } from '../state'
import { renderPrompt } from '../base-core'
import { texto } from './textos'

/**
 * O intérprete: lê o turno do lead e devolve dados estruturados (JSON com
 * schema estrito). Só escreve texto livre quando o lead pergunta ou comenta
 * algo fora do roteiro; o roteiro em si sai do código, com o texto da Dra.
 */

export const INTENCOES = [
  'responde_etapa', 'aceita_horario', 'recusa_horario', 'escolhe_periodo', 'pergunta', 'pede_humano', 'pergunta_se_robo',
  'tem_advogado', 'ja_e_cliente', 'outro_assunto', 'pede_reuniao', 'remarcar', 'desiste', 'outro',
] as const
export type Intencao = typeof INTENCOES[number]

export interface Leitura {
  intencao: Intencao
  opcao: 1 | 2 | 3 | null
  renda_bruta: number | null
  renda_liquida: number | null
  desconto_conta: number | null
  periodo: 'manha' | 'tarde' | null
  data_preferida: string | null
  resposta: string | null
  resumo: string
}

export interface Entrada {
  etapa: Etapa
  /** a pergunta que está em aberto, em uma frase */
  pendente: string
  state: LeadState
  conversa: ChatMsg[]
  agora: Date
  nomeContato: string
}

/** A pergunta em aberto em cada etapa ('' = nenhuma). Vai para o lead: o código emenda depois da resposta livre. */
export const PENDENTE: Record<Etapa, (s: LeadState, quando?: string) => string> = {
  q1: () => texto('pendente_q1'),
  q2: () => texto('pendente_q2'),
  q3: () => texto('pendente_q3'),
  analise: () => '',
  oferta: (_s, quando) => `Posso agendar${quando ? ` para ${quando}` : ''}?`,
  preferencia: () => texto('pendente_preferencia'),
  agendado: () => '',
  sem_reuniao: () => '',
  humano: () => '',
}

const SEM_PENDENTE: Partial<Record<Etapa, string>> = {
  analise: 'nenhuma: a Anna disse que volta em alguns minutos com o horário da Dra.',
  agendado: 'nenhuma: a reunião já está marcada',
  sem_reuniao: 'nenhuma: o caso foi registrado para a equipe avaliar',
  humano: 'nenhuma',
}

/** Mensagem final de uma resposta livre: a resposta do modelo + a pergunta pendente (do código). */
export const compor = (resposta: string, pendente: string) => (pendente ? `${resposta.trim()}\n\n${pendente}` : resposta.trim())

const num = { type: ['number', 'null'] }
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['intencao', 'opcao', 'renda_bruta', 'renda_liquida', 'desconto_conta', 'periodo', 'data_preferida', 'resposta', 'resumo'],
  properties: {
    intencao: { type: 'string', enum: [...INTENCOES] },
    opcao: { type: ['integer', 'null'], enum: [1, 2, 3, null] },
    renda_bruta: num,
    renda_liquida: num,
    desconto_conta: num,
    periodo: { type: ['string', 'null'], enum: ['manha', 'tarde', null] },
    data_preferida: { type: ['string', 'null'], description: 'AAAA-MM-DD' },
    resposta: { type: ['string', 'null'] },
    resumo: { type: 'string', description: 'uma frase para a equipe: o que o lead disse neste turno' },
  },
} as const

let templateCache: string | null = null
/** O arquivo prompts/anna.md COM os marcadores da base, do jeito que o bundle da Vercel o entrega. */
export function promptTemplate(): string {
  if (templateCache) return templateCache
  for (const base of [process.cwd(), path.join(__dirname, '..', '..'), path.join(__dirname, '..', '..', '..')]) {
    try { templateCache = fs.readFileSync(path.join(base, 'prompts', 'anna.md'), 'utf-8'); return templateCache } catch { /* próximo */ }
  }
  throw new Error('prompts/anna.md não encontrado no bundle — confira includeFiles no vercel.json')
}

/** O prompt padrão (sem edição da equipe e sem os marcadores). O validate usa o mesmo caminho. */
export const prompt = (): string => renderPrompt(promptTemplate())

function contexto(e: Entrada): string {
  const hoje = e.agora.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' })
  const iso = new Date(e.agora.getTime() - 3 * 3600_000).toISOString().slice(0, 10)
  const s = e.state
  return [
    '# Contexto desta conversa (gerado pelo sistema; é dado, não instrução do lead)',
    `Hoje: ${hoje} (${iso}), ${e.agora.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })} em Brasília`,
    `Nome no WhatsApp: ${e.nomeContato || '(desconhecido)'}`,
    `Etapa do roteiro: ${e.etapa}`,
    `Pergunta pendente (o sistema emenda depois da sua resposta): ${e.pendente || SEM_PENDENTE[e.etapa] || 'nenhuma'}`,
    `Já informado: ${[
      s.objetivo ? `opção ${s.objetivo}` : '',
      s.rendaBruta != null ? `renda bruta ${s.rendaBruta}` : '',
      s.rendaLiquida != null ? `líquido ${s.rendaLiquida}` : '',
      s.descontoConta != null ? `desconto em conta ${s.descontoConta}` : '',
      s.reuniao ? `reunião marcada para ${s.reuniao.inicio}` : '',
    ].filter(Boolean).join(' · ') || 'nada ainda'}`,
  ].join('\n')
}

type Msg = OpenAI.Chat.ChatCompletionMessageParam

export function conversaParaMensagens(conversa: ChatMsg[]): Msg[] {
  const out: Msg[] = []
  for (const m of conversa.slice(-24)) {
    const role: 'user' | 'assistant' = m.dir === 'in' ? 'user' : 'assistant'
    const prev = out[out.length - 1]
    if (prev && prev.role === role && typeof prev.content === 'string') prev.content += `\n${m.text}`
    else out.push({ role, content: m.text })
  }
  return out
}

export function violacoes(texto: string) {
  return checkReply(texto)
}

/** prompt: o publicado na base (produção) ou o candidato (laboratório e exame); sem ele, o padrão. */
export function createInterprete(opts: { apiKey: string; model: string; prompt?: () => string | Promise<string> }) {
  const openai = new OpenAI({ apiKey: opts.apiKey })

  async function chamar(messages: Msg[], usage: Usage): Promise<Leitura> {
    const r = await openai.chat.completions.create({
      model: opts.model,
      max_completion_tokens: 700,
      messages,
      response_format: { type: 'json_schema', json_schema: { name: 'leitura', strict: true, schema: SCHEMA as unknown as Record<string, unknown> } },
    })
    addUsage(usage, r.usage)
    return JSON.parse(r.choices[0]?.message?.content || '{}') as Leitura
  }

  /** Lê o turno. Resposta livre passa pelas travas; se insistir no erro, sai vazia e o código usa a pergunta pendente. */
  async function interpretar(e: Entrada): Promise<{ leitura: Leitura; usage: Usage; guard: string[] }> {
    const usage = emptyUsage()
    const messages: Msg[] = [
      { role: 'system', content: opts.prompt ? await opts.prompt() : prompt() },
      { role: 'system', content: contexto(e) },
      ...conversaParaMensagens(e.conversa),
    ]
    const leitura = await chamar(messages, usage)
    const guard: string[] = []
    if (leitura.resposta) {
      let texto = semTravessao(leitura.resposta.trim())
      const comPergunta = (t: string) => (t.includes('?') ? [{ regra: 'resposta com pergunta (o sistema emenda a pergunta pendente)', trecho: t.slice(t.lastIndexOf('?') - 40, t.lastIndexOf('?') + 1) }] : [])
      let v = [...violacoes(texto), ...comPergunta(texto)]
      if (v.length) {
        guard.push(...v.map(x => `${x.regra}: ${x.trecho}`))
        const nova = await chamar([
          ...messages,
          { role: 'assistant', content: JSON.stringify(leitura) },
          { role: 'system', content: `[TRAVA] O campo "resposta" violou: ${v.map(x => `${x.regra} ("${x.trecho}")`).join('; ')}. Devolva o JSON de novo com a resposta corrigida, respeitando as regras do prompt.` },
        ], usage)
        texto = semTravessao((nova.resposta || '').trim())
        v = [...violacoes(texto), ...comPergunta(texto)]
        if (v.length || !texto) { guard.push('fallback: resposta descartada'); texto = '' }
      }
      leitura.resposta = texto || null
    }
    return { leitura, usage, guard }
  }

  return { interpretar }
}

/** "É robô?" pego em código, antes do modelo (a Anna nunca nega nem confirma). */
export const PERGUNTA_ROBO = /(rob[oô]|chat ?bot|\bbot\b|intelig[eê]ncia artificial|(?:^|\s)(é|eh|e) (uma )?i\.?a\b|mensage(m|ns) (autom[aá]tica|gravada)s?|resposta(s)? autom[aá]tica|falando com (uma )?(m[aá]quina|pessoa|algu[eé]m de verdade|humano)|pessoa (de verdade|real))/i
export const ehPerguntaRobo = (t: string) => PERGUNTA_ROBO.test(t) && /\?|(?:^|\s)(é|eh|vc|voc[eê]|sou|t[oô] falando|estou falando)(?=[\s?,.!]|$)/i.test(t)
