/**
 * TREINO COM AS CONVERSAS REAIS de setembro e outubro (pedido da Dra.).
 *
 * O texto das conversas antigas não sai pela API do Kommo (os eventos de chat trazem só o id da
 * mensagem): a exportação é feita pela tela (onboarding/prompt-cowork-conversas-set-out.md) e
 * gravada num arquivo .md/.txt com um bloco por card:
 *
 *   === CARD 28913480 | etapa final: Closer › Cliente decisão | entrada: 14/10/2026
 *   [LEAD 14/10 10:02] quanto custa a consulta?
 *   [EQUIPE 14/10 10:05] A primeira reunião ...
 *
 *   npx tsx scripts/treino-conversas.ts <arquivo> [saida.md]
 *
 * Mascara CPF, CNPJ, telefone e e-mail ANTES de mandar ao modelo e devolve um relatório para a
 * Dra. aprovar: objeções mais comuns, como a equipe respondeu nas conversas que viraram reunião,
 * perguntas frequentes com a resposta sugerida para a Anna e casos novos para o exame. Nada entra
 * na Anna sozinho: o que for aprovado passa pela aba Ensinar da Central (com exame) antes de valer.
 */
import fs from 'fs'
import OpenAI from 'openai'
import { mascararPII } from '../lib/execlog'

export interface Conversa { card: string; etapa: string; entrada: string; linhas: string[] }

/** Lê os blocos "=== CARD ..." do arquivo exportado. Puro. */
export function lerConversas(texto: string): Conversa[] {
  const out: Conversa[] = []
  let atual: Conversa | null = null
  for (const bruta of texto.split(/\r?\n/)) {
    const linha = bruta.trim()
    const cab = linha.match(/^=+\s*CARD\s+(\d+)\s*(?:\|\s*etapa final:\s*([^|]*))?(?:\|\s*entrada:\s*(.*))?$/i)
    if (cab) {
      atual = { card: cab[1], etapa: (cab[2] || '').trim(), entrada: (cab[3] || '').trim(), linhas: [] }
      out.push(atual)
      continue
    }
    if (atual && /^\[(LEAD|EQUIPE|ROBÔ|ROBO|ANNA)\b/i.test(linha)) atual.linhas.push(mascararPII(linha))
    else if (atual && linha && atual.linhas.length) atual.linhas[atual.linhas.length - 1] += ` ${mascararPII(linha)}`
  }
  return out.filter(c => c.linhas.length)
}

interface Achados {
  objecoes: Array<{ objecao: string; frase_do_lead: string; resposta_da_equipe: string; virou_reuniao: boolean }>
  perguntas: Array<{ pergunta: string; resposta_da_equipe: string }>
  motivos_parou: string[]
}

const PEDIDO = `Você analisa conversas reais de WhatsApp entre leads e a equipe de um escritório de advocacia
(superendividamento: suspensão de descontos bancários e revisão de dívidas). Para o lote abaixo, devolva JSON:
{"objecoes":[{"objecao":"nome curto da objeção (preço, medo de processo, vai pensar, desconfiança, já tem advogado, sem tempo...)","frase_do_lead":"a frase do lead, curta","resposta_da_equipe":"o que a equipe respondeu, curto","virou_reuniao":true|false}],
 "perguntas":[{"pergunta":"pergunta factual do lead (custo, presencial, documentos, prazo...)","resposta_da_equipe":"o que a equipe respondeu"}],
 "motivos_parou":["por que a conversa parou, quando parou sem reunião"]}
Use só o que está escrito. Não invente. Etapa final "Closer" ou "Gestão" significa que virou reunião.`

async function analisarLote(openai: OpenAI, model: string, lote: Conversa[]): Promise<Achados> {
  const texto = lote.map(c => `=== CARD ${c.card} | etapa final: ${c.etapa}\n${c.linhas.join('\n')}`).join('\n\n').slice(0, 60000)
  const r = await openai.chat.completions.create({
    model, response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: PEDIDO }, { role: 'user', content: texto }],
  })
  const j = JSON.parse(r.choices[0]?.message?.content || '{}') as Partial<Achados>
  return { objecoes: j.objecoes || [], perguntas: j.perguntas || [], motivos_parou: j.motivos_parou || [] }
}

async function main() {
  const [arquivo, saida = '../onboarding/treino-conversas/relatorio.md'] = process.argv.slice(2)
  if (!arquivo) throw new Error('uso: npx tsx scripts/treino-conversas.ts <arquivo exportado> [saida.md]')
  const conversas = lerConversas(fs.readFileSync(arquivo, 'utf8'))
  if (!conversas.length) throw new Error('nenhum bloco "=== CARD ..." no arquivo')
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const model = process.env.LLM_MODEL || 'gpt-5.4-mini-2026-03-17'
  const todos: Achados = { objecoes: [], perguntas: [], motivos_parou: [] }
  for (let i = 0; i < conversas.length; i += 12) {
    const a = await analisarLote(openai, model, conversas.slice(i, i + 12))
    todos.objecoes.push(...a.objecoes); todos.perguntas.push(...a.perguntas); todos.motivos_parou.push(...a.motivos_parou)
    console.log(`lote ${i / 12 + 1}: ${a.objecoes.length} objeções, ${a.perguntas.length} perguntas`)
  }
  const sintese = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: `Escreva em português do Brasil, para a Dra. Carolina Calvo aprovar, um relatório em Markdown com:
## 1. Objeções mais comuns: tabela (objeção | quantas vezes | frase típica do lead | resposta da equipe que levou à reunião, quando houve).
## 2. Por que as conversas paravam: lista com contagem.
## 3. Perguntas frequentes e resposta sugerida para a Anna: tabela (pergunta | resposta que a equipe deu | resposta sugerida, em no máximo 2 frases, sem orientação jurídica, sem prometer resultado, sem falar de valores de honorários).
## 4. Casos novos para o exame da Anna: lista de frases reais (curtas) com o que a Anna deve fazer.
Use só os dados recebidos. Total de conversas analisadas: ${conversas.length}.` },
      { role: 'user', content: JSON.stringify(todos).slice(0, 120000) },
    ],
  })
  fs.mkdirSync(saida.replace(/\/[^/]+$/, ''), { recursive: true })
  fs.writeFileSync(saida, `# Treino com as conversas de setembro e outubro\n\n${conversas.length} conversas analisadas, dados pessoais mascarados. Nada entra na Anna sem a aprovação da Dra. e o exame da Central.\n\n${sintese.choices[0]?.message?.content || ''}\n`)
  fs.writeFileSync(saida.replace(/\.md$/, '.json'), JSON.stringify(todos, null, 2))
  console.log(`relatório: ${saida}`)
}

if (process.argv[1]?.endsWith('treino-conversas.ts')) main().catch(e => { console.error(e); process.exit(1) })
