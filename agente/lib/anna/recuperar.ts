import OpenAI from 'openai'
import { addUsage, emptyUsage, type Usage } from '../execlog'
import type { ChatMsg } from '../history'
import type { Etapa, LeadState, Oferta } from '../state'
import { AGENDA, deBrt } from './agenda'

/**
 * RECUPERAR O HISTÓRICO DA QUALIFICAÇÃO (Dra., 10/11/2026, caso Gilse). Antes de perguntar qualquer coisa, a Anna
 * confere o que o lead já respondeu na conversa (com ela ou com a equipe) e nos campos do card. Nunca pergunta de
 * novo o que já foi dito com clareza: nem depois de follow-ups, de intervalos, de mudança de coluna ou de a equipe
 * assumir e devolver o atendimento. E reconhece o horário de reunião que a equipe ofereceu ao lead.
 */

/** Quem escreveu cada mensagem: o lead, a Anna (ou um modelo dela) ou a equipe (escrita pelo Kommo). */
export function autor(m: ChatMsg): 'LEAD' | 'ANNA' | 'EQUIPE' {
  if (m.dir === 'in') return 'LEAD'
  return String(m.id).startsWith('kommo:') ? 'EQUIPE' : 'ANNA'
}

const RX_PERGUNTA_OPCAO = /1, 2 ou 3|1️⃣[\s\S]*2️⃣[\s\S]*3️⃣|op[cç][aã]o:?\s*1,\s*2 ou 3/i
const RX_SO_OPCAO = /^\s*(?:(?:a\s+)?op[cç][aã]o\s*|n[uú]mero\s*)?\*?([123])\s*(?:️⃣|⃣)?\*?\s*[.!)]*\s*$/iu
const RX_AS_DUAS = /^\s*(?:(?:a\s+)?op[cç][aã]o\s*3\s*[,.:-]?\s*)?(?:as\s+)?(?:duas|2 op[cç][oõ]es|ambas)(?:\s+op[cç][oõ]es)?\s*[.!]*\s*$/i

/** Puro: a opção (1, 2 ou 3) que o lead já respondeu depois da pergunta das possibilidades, ou null. */
export function opcaoNoHistorico(conversa: ChatMsg[]): 1 | 2 | 3 | null {
  let perguntou = false
  let achou: 1 | 2 | 3 | null = null
  for (const m of conversa) {
    if (m.dir === 'out' && RX_PERGUNTA_OPCAO.test(m.text)) { perguntou = true; continue }
    if (!perguntou || m.dir !== 'in') continue
    for (const linha of m.text.split('\n')) {
      const n = RX_SO_OPCAO.exec(linha)
      if (n) achou = Number(n[1]) as 1 | 2 | 3
      else if (RX_AS_DUAS.test(linha)) achou = 3
    }
  }
  return achou
}

export interface Recuperado {
  opcao: 1 | 2 | 3 | null
  renda_bruta: number | null
  renda_liquida: number | null
  desconto_conta: number | null
  /** o que o lead respondeu sobre cheque especial e cartão de crédito com limite */
  limite: string | null
  /** último horário de reunião que a EQUIPE ofereceu e que segue em aberto */
  oferta_equipe: { data: string; hora: string; mensagem: number } | null
  /** o lead aceitou com clareza esse horário */
  oferta_aceita: boolean
}

const num = { type: ['number', 'null'] }
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['opcao', 'renda_bruta', 'renda_liquida', 'desconto_conta', 'limite', 'oferta_equipe', 'oferta_aceita'],
  properties: {
    opcao: { type: ['integer', 'null'], enum: [1, 2, 3, null] },
    renda_bruta: num,
    renda_liquida: num,
    desconto_conta: num,
    limite: { type: ['string', 'null'] },
    oferta_equipe: {
      type: ['object', 'null'],
      additionalProperties: false,
      required: ['data', 'hora', 'mensagem'],
      properties: { data: { type: 'string', description: 'AAAA-MM-DD' }, hora: { type: 'string', description: 'HH:MM' }, mensagem: { type: 'integer', description: 'número (#) da mensagem da EQUIPE com a oferta' } },
    },
    oferta_aceita: { type: 'boolean' },
  },
} as const

const INSTRUCAO = `Você lê a conversa de WhatsApp de um escritório de advocacia (superendividamento) e extrai, SEM inventar, o que o LEAD já informou na qualificação. As mensagens vêm numeradas e marcadas como LEAD, ANNA (a assistente) ou EQUIPE (uma pessoa do escritório).
Regras:
- opcao: a possibilidade que o LEAD escolheu quando perguntaram "1, 2 ou 3" (1 = suspensão dos descontos, 2 = reestruturação das dívidas, 3 = as duas). "as duas" = 3. null se ele nunca escolheu com clareza.
- renda_bruta, renda_liquida, desconto_conta: valores mensais em reais que o LEAD informou (ou confirmou para a equipe). renda_bruta = salário antes dos descontos; renda_liquida = o que recebe depois dos descontos do contracheque; desconto_conta = quanto o banco desconta da conta corrente quando o salário cai. "17.250" ou "17,2 mil" = 17250. Um valor que o lead corrigiu depois vale o corrigido. null quando não foi dito com clareza. Valores lidos de documento só valem se o lead confirmou.
- limite: a resposta do LEAD sobre cheque especial e cartão de crédito com limite, em poucas palavras. null se a pergunta não foi respondida.
- oferta_equipe: o ÚLTIMO dia e horário de reunião que a EQUIPE propôs ao lead (ex.: "consigo para amanhã às 15h30, pode ser?"), com a data em AAAA-MM-DD (use a data da mensagem para entender "hoje", "amanhã", "quinta") e a hora em HH:MM, e o número da mensagem. null se a equipe não propôs um horário específico, se o lead recusou esse horário ou se a reunião já foi marcada/confirmada pela equipe depois.
- oferta_aceita: true só se o LEAD aceitou com clareza o horário de oferta_equipe ("pode sim", "fechado", "confirmo").
Responda só o JSON.`

/** Puro: a conversa numerada, com quem escreveu e quando (horário de Brasília). */
export function transcricao(conversa: ChatMsg[]): string {
  const quando = (ts: number) => new Date(ts).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  return conversa.map((m, i) => `#${i} [${quando(m.ts)}] ${autor(m)}: ${m.text.replace(/\s+/g, ' ').slice(0, 700)}`).join('\n')
}

export function createRecuperador(opts: { apiKey: string; model: string }) {
  const openai = new OpenAI({ apiKey: opts.apiKey })
  return {
    async extrair(conversa: ChatMsg[], agora: Date, usage: Usage = emptyUsage()): Promise<Recuperado> {
      const hoje = agora.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' })
      const r = await openai.chat.completions.create({
        model: opts.model,
        max_completion_tokens: 400,
        messages: [
          { role: 'system', content: INSTRUCAO },
          { role: 'user', content: `Hoje: ${hoje}.\n\n${transcricao(conversa.slice(-60))}` },
        ],
        response_format: { type: 'json_schema', json_schema: { name: 'recuperado', strict: true, schema: SCHEMA as unknown as Record<string, unknown> } },
      } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming)
      addUsage(usage, r.usage)
      const x = JSON.parse(r.choices[0]?.message?.content || '{}') as Recuperado
      // a mensagem da oferta é de verdade da equipe (o modelo não pode apontar uma fala da Anna ou do lead)
      const offset = Math.max(0, conversa.length - 60)
      if (x.oferta_equipe) {
        const m = conversa[offset + x.oferta_equipe.mensagem]
        x.oferta_equipe = m && autor(m) === 'EQUIPE' ? { ...x.oferta_equipe, mensagem: offset + x.oferta_equipe.mensagem } : null
      }
      return x
    },
  }
}

const ORDEM: Etapa[] = ['q1', 'q2', 'limite', 'q3']

/** Puro: a etapa da qualificação pelo que já foi respondido. */
export function etapaPeloQueFoiDito(s: Pick<LeadState, 'objetivo' | 'rendaBruta' | 'rendaLiquida' | 'descontoConta' | 'limite'>): Etapa {
  if (!s.objetivo) return 'q1'
  if (s.rendaBruta == null || s.rendaLiquida == null || s.descontoConta == null) return 'q2'
  return s.limite ? 'q3' : 'limite'
}

export interface Aplicacao {
  patch: Partial<LeadState>
  /** a etapa andou por causa do que já tinha sido respondido (a pergunta dela ainda não foi feita) */
  avancou: boolean
  /** a equipe ofereceu um horário que segue em aberto */
  ofertaEquipe?: { oferta: Oferta; enviadaEm: number; aceita: boolean }
  /** o que foi recuperado, para a nota da equipe */
  resumo: string[]
}

/**
 * Puro: junta o que foi recuperado ao estado. O que já está no estado (ou no card) vale; o recuperado só preenche
 * o que falta. A etapa só anda para a frente, e só dentro da qualificação; uma oferta da equipe em aberto leva à
 * etapa da oferta (sem qualificar de novo).
 */
export function aplicarRecuperacao(s: LeadState, r: Recuperado | null, conversa: ChatMsg[], agora: Date, reuniaoNoCard = false): Aplicacao {
  const patch: Partial<LeadState> = {}
  const resumo: string[] = []
  const opcao = s.objetivo ? null : (r?.opcao ?? opcaoNoHistorico(conversa))
  if (opcao) { patch.objetivo = opcao; resumo.push(`opção ${opcao}`) }
  const valor = (v: number | null | undefined) => (v != null && Number.isFinite(v) && v >= 0 ? v : undefined)
  if (s.rendaBruta == null && valor(r?.renda_bruta) != null) { patch.rendaBruta = r!.renda_bruta!; resumo.push(`renda bruta ${r!.renda_bruta}`) }
  if (s.rendaLiquida == null && valor(r?.renda_liquida) != null) { patch.rendaLiquida = r!.renda_liquida!; resumo.push(`líquido ${r!.renda_liquida}`) }
  if (s.descontoConta == null && valor(r?.desconto_conta) != null) { patch.descontoConta = r!.desconto_conta!; resumo.push(`desconto em conta ${r!.desconto_conta}`) }
  if (!s.limite && r?.limite) { patch.limite = r.limite.slice(0, 300); resumo.push(`cheque especial/cartão: "${r.limite.slice(0, 80)}"`) }
  const novo = { ...s, ...patch }

  // oferta da equipe em aberto, sem reunião marcada: a Anna acompanha esse horário (não oferece outro)
  const of = r?.oferta_equipe
  const reuniaoFutura = !!s.reuniao && Date.parse(s.reuniao.inicio) > agora.getTime()
  // reunião já marcada (pela Anna ou pela equipe, no campo "Reunião" do card): não há oferta em aberto
  if (of && /^\d{4}-\d{2}-\d{2}$/.test(of.data) && /^\d{2}:\d{2}$/.test(of.hora) && !reuniaoFutura && !reuniaoNoCard) {
    const [a, m, d] = of.data.split('-').map(Number)
    const [hh, mm] = of.hora.split(':').map(Number)
    const inicio = deBrt(a, m - 1, d, hh, mm)
    const msg = conversa[of.mensagem]
    // só vale a oferta escrita pela equipe, com o horário depois da mensagem
    if (msg && autor(msg) === 'EQUIPE' && inicio.getTime() > (msg.ts || 0)) {
      const oferta: Oferta = { chave: `${of.data}T${of.hora}`, inicio: inicio.toISOString(), fim: new Date(inicio.getTime() + AGENDA.duracaoMin * 60_000).toISOString(), em: msg.ts }
      patch.etapa = 'oferta'
      patch.oferta = oferta
      resumo.push(`horário oferecido pela equipe: ${of.data} ${of.hora}${r?.oferta_aceita ? ' (o lead aceitou)' : ''}`)
      return { patch, avancou: true, ofertaEquipe: { oferta, enviadaEm: msg.ts, aceita: !!r?.oferta_aceita }, resumo }
    }
  }
  if (reuniaoFutura && s.etapa !== 'agendado' && (!s.etapa || ORDEM.includes(s.etapa) || s.etapa === 'oferta' || s.etapa === 'preferencia')) {
    patch.etapa = 'agendado'
    return { patch, avancou: false, resumo }
  }

  const atual = s.etapa
  if (atual && !ORDEM.includes(atual)) return { patch, avancou: false, resumo }
  const pelo = etapaPeloQueFoiDito(novo)
  // q3 = a mensagem do alívio já saiu. Com o cheque especial já respondido e a mensagem ainda não enviada, a etapa
  // fica em "limite" (com a resposta guardada) e a retomada manda a mensagem do alívio (fluxo.continuarDeOndeParou)
  const alvo: Etapa = pelo === 'q3' && atual !== 'q3' ? 'limite' : pelo
  const avancou = !!atual && (ORDEM.indexOf(pelo) > ORDEM.indexOf(atual)) && atual !== 'q3'
  if (avancou) patch.etapa = alvo
  return { patch, avancou, resumo }
}
