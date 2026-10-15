import OpenAI from 'openai'
import { addUsage, emptyUsage, type Usage } from '../execlog'
import { checkReply, norm, semTravessao } from '../guards'
import type { ChatMsg } from '../history'

/**
 * REDAÇÃO da Anna (pedido de 15/10: conversa humanizada, sem cara de robô).
 * O roteiro continua em CÓDIGO: o fluxo decide o que precisa ser dito e entrega
 * a mensagem de referência (o texto da Dra., editável na Central). Aqui o modelo
 * reescreve essa mensagem como uma pessoa da equipe escreveria naquele ponto da
 * conversa, reagindo ao que o lead disse. A saída passa pelas travas e pelos
 * trechos obrigatórios; se falhar duas vezes, sai a referência (fail-closed).
 */

export interface Redacao {
  /** id do texto (TextoId ou um id do fluxo, como q2_falta e livre) */
  id: string
  /** a mensagem que o roteiro mandaria, já com as variáveis preenchidas */
  referencia: string
  /** o que esta mensagem precisa fazer, em uma frase (vai para o modelo) */
  objetivo: string
  /** trechos que precisam aparecer como estão (data, horário, valor, link) */
  obrigatorio: string[]
  conversa: ChatMsg[]
  primeiroNome: string
}

export const PROMPT_REDATOR = `Você é a Anna, da equipe da Dra. Carolina Calvo, advogada que atende pessoas superendividadas. Você conversa pelo WhatsApp com quem procurou o escritório.

# Sua tarefa
O sistema já decidiu o que precisa ser dito agora e manda a MENSAGEM DE REFERÊNCIA, escrita pela Dra. Ela diz O QUE falar, não COMO. Escreva com as suas palavras a mensagem que vai para o lead, como uma pessoa da equipe escreveria neste ponto da conversa. Não copie a referência.

# Conteúdo (não negociável)
- Passe todas as informações da referência. Não acrescente fato, número, prazo, valor, promessa ou serviço que não esteja nela. Retomar o que o próprio lead contou (inclusive os valores que ele informou) pode e ajuda a mostrar que você ouviu.
- Se a referência faz uma pergunta, termine com essa pergunta, uma só. Se ela não pergunta nada, não pergunte nada.
- Os TRECHOS OBRIGATÓRIOS entram exatamente como estão escritos.
- Nunca diga que é IA, robô ou assistente virtual. Nunca fale de honorários, valor da ação, parcela ou porcentagem. Nunca prometa resultado. Nunca peça documento, foto ou print.

# Como escrever
- Quando o lead acabou de escrever, a primeira frase é sua e reage ao que ele disse, de forma específica ao caso dele: mostre que entendeu o que ele contou, sente ou quer. "Obrigada pelas informações" ou "Entendo" sozinhos são genéricos demais. Se ele só cumprimentou ou disse que viu o anúncio, agradeça o contato de forma simples. Não comece sempre igual.
- Você é mulher: escreva "obrigada". Português do Brasil, cordial e respeitoso, tratando por "você". Tom de uma pessoa atenciosa da equipe de um escritório no WhatsApp: natural, sem formalidade de documento, sem gíria e sem intimidade.
- Frases corridas, em um ou dois parágrafos curtos. Sem listas, sem itens numerados como 1) 2) 3), sem tópicos, sem asteriscos e sem palavras em CAIXA ALTA (fora dos trechos obrigatórios).
- Curta e direta. Sem "Ótimo!", "Perfeito!", "Entendi perfeitamente", "Fico feliz", elogios ou frases de efeito.
- Use o primeiro nome do lead só de vez em quando, nunca em toda mensagem. Não cumprimente de novo no meio da conversa.
- Sem emoji e sem travessão. Não repita o que já foi dito antes.

# Exemplos do tom (não copie as frases; cada conversa pede a sua)
Lead: "quero reestruturar e renegociar minhas dívidas"
Referência: pede a renda bruta, o líquido do contracheque e o desconto direto na conta corrente.
Bom: "Entendi, você quer reorganizar essas dívidas e pagar juros mais justos. Para eu fazer uma análise inicial, preciso de três valores: quanto você ganha bruto por mês, quanto recebe líquido depois dos descontos do contracheque e quanto o banco desconta direto da sua conta corrente todo mês. Pode me passar?"

Lead: "sim, concordo, está muito difícil"
Referência: a situação é delicada, vai encaminhar para a Dra. Carolina analisar e volta em alguns minutos.
Bom: "Imagino o peso que isso tem no seu mês. Como a sua situação é delicada, vou passar esta conversa para a Dra. Carolina analisar e em alguns minutos volto a falar com você."

# Saída
Só o texto da mensagem, sem aspas e sem comentário.`

const LISTA = /^\s*(\d+[).]|[-•*])\s/m
const perguntas = (t: string) => (t.match(/\?/g) || []).length

const CAIXA_ALTA = /\b[A-ZÀ-Ú]{4,}\b/g
/** O lead escreveu por último? Então a mensagem precisa abrir reagindo a ele, não copiando a referência. */
const leadFalouPorUltimo = (r: Pick<Redacao, 'conversa'>) => r.conversa.length > 0 && r.conversa[r.conversa.length - 1].dir === 'in'
const abertura = (t: string) => norm(t).split(' ').slice(0, 6).join(' ')

/** Confere a redação contra a referência. Lista vazia = pode enviar. */
export function validarRedacao(r: Pick<Redacao, 'referencia' | 'obrigatorio'> & Partial<Pick<Redacao, 'id' | 'conversa'>>, texto: string): string[] {
  const erros = checkReply(texto).map(v => `${v.regra}${v.trecho ? ` ("${v.trecho}")` : ''}`)
  const t = norm(texto)
  for (const o of r.obrigatorio) if (o && !t.includes(norm(o))) erros.push(`faltou o trecho obrigatório "${o}"`)
  const pRef = perguntas(r.referencia) > 0 ? 1 : 0
  if (perguntas(texto) !== pRef) erros.push(pRef ? 'precisa terminar com a pergunta da referência (uma só)' : 'a referência não pergunta nada; tire a pergunta')
  if (LISTA.test(texto)) erros.push('usou lista ou itens numerados')
  if (texto.includes('*')) erros.push('usou asterisco')
  if (texto.length > Math.max(r.referencia.length * 1.3 + 120, 280)) erros.push(`ficou longa (${texto.length} caracteres; a referência tem ${r.referencia.length})`)
  const obrigatorioNorm = norm(r.obrigatorio.join(' '))
  const gritos = (texto.match(CAIXA_ALTA) || []).filter(w => !obrigatorioNorm.includes(norm(w)))
  if (gritos.length) erros.push(`palavras em caixa alta (${gritos.slice(0, 3).join(', ')}): escreva em letra normal`)
  if (r.conversa && r.id !== 'livre' && leadFalouPorUltimo({ conversa: r.conversa }) && abertura(texto) === abertura(r.referencia)) {
    erros.push('copiou a abertura da referência: comece com uma frase sua reagindo ao que o lead acabou de escrever')
  }
  return erros
}

type Msg = OpenAI.Chat.ChatCompletionMessageParam

/** A Anna é mulher: "obrigado" vira "obrigada" (o modelo às vezes escorrega). */
export const falaDeMulher = (t: string) => t.replace(/\b([Oo])brigado\b/g, '$1brigada')

/** O nome apareceu numa das 3 últimas mensagens da Anna? Então esta não usa. */
const nomeRecente = (r: Redacao) => r.conversa.filter(m => m.dir === 'out').slice(-3).some(m => norm(m.text).split(' ').includes(norm(r.primeiroNome)))

function mensagens(r: Redacao): Msg[] {
  const out: Msg[] = [{ role: 'system', content: PROMPT_REDATOR }]
  for (const m of r.conversa.slice(-12)) {
    const role: 'user' | 'assistant' = m.dir === 'in' ? 'user' : 'assistant'
    const prev = out[out.length - 1]
    if (prev && prev.role === role && typeof prev.content === 'string') prev.content += `\n${m.text}`
    else out.push({ role, content: m.text })
  }
  out.push({
    role: 'system',
    content: [
      '# Agora',
      leadFalouPorUltimo(r)
        ? `O lead acabou de escrever: "${r.conversa[r.conversa.length - 1].text.slice(0, 300)}". Abra com uma frase curta sua, específica a isso (se ele fez uma pergunta, a referência já traz a resposta).`
        : 'A última mensagem foi sua (você está voltando depois de uma pausa): retome a conversa com naturalidade, sem cumprimentar de novo.',
      `O que esta mensagem precisa fazer: ${r.objetivo}`,
      `Primeiro nome do lead: ${!r.primeiroNome ? '(desconhecido: não use nome)' : nomeRecente(r) ? `${r.primeiroNome} (já usado nas últimas mensagens: NÃO use o nome agora)` : r.primeiroNome}`,
      r.obrigatorio.length ? `TRECHOS OBRIGATÓRIOS (exatamente assim): ${r.obrigatorio.map(o => `"${o}"`).join(' · ')}` : 'TRECHOS OBRIGATÓRIOS: nenhum',
      'MENSAGEM DE REFERÊNCIA:',
      '"""',
      r.referencia,
      '"""',
    ].join('\n'),
  })
  return out
}

export function createRedator(opts: { apiKey: string; model: string; timeoutMs?: number }) {
  const openai = new OpenAI({ apiKey: opts.apiKey, timeout: opts.timeoutMs ?? 15_000, maxRetries: 0 })

  async function chamar(messages: Msg[], usage: Usage): Promise<string> {
    const r = await openai.chat.completions.create({ model: opts.model, max_completion_tokens: 500, messages })
    addUsage(usage, r.usage)
    return falaDeMulher(semTravessao((r.choices[0]?.message?.content || '').trim().replace(/^"+|"+$/g, '').trim()))
  }

  /** Devolve o texto final: a redação aprovada pelas travas, ou a referência. */
  async function redigir(r: Redacao): Promise<{ texto: string; usage: Usage; guard: string[]; redigido: boolean }> {
    const usage = emptyUsage()
    const guard: string[] = []
    try {
      const msgs = mensagens(r)
      let texto = await chamar(msgs, usage)
      let erros = validarRedacao(r, texto)
      if (erros.length) {
        guard.push(`redação ${r.id}: ${erros.join('; ')}`)
        texto = await chamar([...msgs, { role: 'assistant', content: texto }, { role: 'system', content: `[TRAVA] Reescreva corrigindo: ${erros.join('; ')}.` }], usage)
        erros = validarRedacao(r, texto)
      }
      if (!erros.length) return { texto, usage, guard, redigido: true }
      guard.push(`redação ${r.id} descartada: ${erros.join('; ')}`)
    } catch (e) {
      guard.push(`redação ${r.id} falhou: ${(e instanceof Error ? e.message : String(e)).slice(0, 120)}`)
    }
    return { texto: r.referencia, usage, guard, redigido: false }
  }

  return { redigir }
}
