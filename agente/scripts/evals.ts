/**
 * O EXAME DO INTÉRPRETE — roda o prompts/anna.md com o modelo REAL em cenários
 * de conversa. Cada cenário tem checagem em CÓDIGO (intenção, valores extraídos,
 * travas da resposta) e, quando há resposta livre, critérios para um juiz cego.
 * Qualquer reprovação → exit 1. Rode com 3 repetições antes de publicar.
 *
 *   npx tsx scripts/evals.ts                # todos, 1 rodada
 *   EVAL_REPS=3 npx tsx scripts/evals.ts    # o portão de deploy
 *   npx tsx scripts/evals.ts q2 oferta      # filtra por id
 */
import { loadEnv } from './env'

loadEnv()
for (const [key, val] of Object.entries({ KOMMO_DOMAIN: 'https://eval.kommo.com', KOMMO_TOKEN: 'x', KOMMO_ACCOUNT_ID: '1', UPSTASH_REDIS_REST_URL: 'https://x.upstash.io', UPSTASH_REDIS_REST_TOKEN: 'x', WEBHOOK_SECRET: 'x' })) process.env[key] ||= val

type Leitura = import('../lib/anna/interprete').Leitura
type Etapa = import('../lib/state').Etapa
type LeadState = import('../lib/state').LeadState

interface Cenario {
  id: string
  etapa: Etapa
  state?: LeadState
  /** conversa: [quem, texto]; a última precisa ser do lead */
  conversa: Array<['in' | 'out', string]>
  espera: Partial<Leitura> & { intencaoEm?: Leitura['intencao'][] }
  /** a resposta livre é obrigatória? */
  comResposta?: boolean
  criterios?: string[]
}

// Segunda, 13/10/2026, 10:00 em Brasília
const AGORA = new Date('2026-10-13T13:00:00Z')
const Q1 = 'Olá, Maria. Aqui é a Anna, da equipe da Dra. Carolina Calvo.\n\nVocê quer saber se, no seu caso, é possível:\n\n1) suspender os descontos bancários e pagamento das dívidas por até 6 meses?\n2) reestruturar o pagamento das dívidas em condições mais favoráveis e com juros revisados?\n3) as duas opções acima.'
const Q2 = 'Ótimo! Preciso apenas de três informações:\n\n1) Qual é a sua renda bruta mensal?\n2) Quanto você recebe líquido, após todos os descontos do contracheque?\n3) Atualmente, quanto o banco desconta diretamente da sua conta corrente todos os meses?\n\nCom essas informações, consigo fazer uma análise inicial e direcionar a melhor estratégia.'
const Q3 = 'Acredito que sem esses R$ 2.000 de descontos em conta corrente, tendo todo o seu salário líquido seria uma grande ajuda para respirar e ter um alívio financeiro, concorda?'
const OFERTA = 'Já passei o seu caso para a Dra. Carolina Calvo.\n\nPelo que você me contou, a sua situação é delicada. Por isso, o primeiro atendimento é ON LINE: nessa reunião ela vai explicar a possibilidade de obter judicialmente a SUSPENSÃO dos descontos bancários por até 6 MESES, além da *REVISÃO DE JUROS e reestruturação das suas dívidas*.\n\nEla pode atender você HOJE às 15:00, ON LINE. Posso agendar?'
const oferta = { chave: '2026-10-13T15:00', inicio: '2026-10-13T18:00:00.000Z', fim: '2026-10-13T18:30:00.000Z', em: AGORA.getTime() }
const comQ2: LeadState = { objetivo: 3 }

const RESPOSTA_BOA = [
  'Responde primeiro o que o lead perguntou, sem enrolação (um endereço completo ou um dado exato não conta como resposta longa), com educação e tom formal sem soar robótico',
  'Termina com a pergunta pendente do roteiro (informada acima) e tem no máximo um ponto de interrogação; uma pergunta que pede vários valores numa frase conta como uma pergunta só',
  'Não dá orientação jurídica sobre o caso, não promete resultado e não diz que é robô, IA ou assistente virtual',
]

const CENARIOS: Cenario[] = [
  { id: 'q1-as-duas', etapa: 'q1', conversa: [['out', Q1], ['in', 'quero as duas coisas']], espera: { intencao: 'responde_etapa', opcao: 3 } },
  { id: 'q1-numero', etapa: 'q1', conversa: [['out', Q1], ['in', '1']], espera: { opcao: 1 } },
  { id: 'q1-desiste', etapa: 'q1', conversa: [['out', Q1], ['in', 'não tenho mais interesse, obrigado']], espera: { intencao: 'desiste' } },
  {
    id: 'q1-preco', etapa: 'q1', conversa: [['out', Q1], ['in', 'antes, quanto custa a consulta com a doutora?']], espera: { intencao: 'pergunta' }, comResposta: true,
    criterios: [...RESPOSTA_BOA, 'Diz que a primeira reunião é on-line e não é cobrada, sem citar valor de honorários'],
  },
  {
    id: 'q1-endereco', etapa: 'q1', conversa: [['out', Q1], ['in', 'onde fica o escritório?']], espera: { intencao: 'pergunta' }, comResposta: true,
    criterios: [...RESPOSTA_BOA, 'Informa o endereço no Setor Comercial Norte, Asa Norte, Brasília'],
  },
  { id: 'q2-tudo', etapa: 'q2', state: comQ2, conversa: [['out', Q2], ['in', 'ganho uns 12 mil bruto, o líquido cai pra 3.800 e o banco tira 2 mil direto da conta']], espera: { renda_bruta: 12000, renda_liquida: 3800, desconto_conta: 2000 } },
  { id: 'q2-parcial', etapa: 'q2', state: comQ2, conversa: [['out', Q2], ['in', 'meu salário bruto é 9.500']], espera: { renda_bruta: 9500, renda_liquida: null, desconto_conta: null } },
  { id: 'q2-sem-desconto-conta', etapa: 'q2', state: comQ2, conversa: [['out', Q2], ['in', 'bruto 14k, líquido 5k. Na conta não desconta nada, é tudo no contracheque']], espera: { renda_bruta: 14000, renda_liquida: 5000, desconto_conta: 0 } },
  {
    id: 'q2-documento', etapa: 'q2', state: comQ2, conversa: [['out', Q2], ['in', 'preciso te mandar o contracheque?']], espera: { intencao: 'pergunta' }, comResposta: true,
    criterios: [...RESPOSTA_BOA, 'Não pede contracheque, extrato nem nenhum documento; pede só os três valores'],
  },
  {
    id: 'q2-valor-acao', etapa: 'q2', state: comQ2, conversa: [['out', Q2], ['in', 'quanto vocês cobram pra entrar com a ação?']], espera: { intencao: 'pergunta' }, comResposta: true,
    criterios: [...RESPOSTA_BOA, 'Diz que valores e estratégia são tratados somente na reunião com a Dra. Carolina, sem citar nenhum valor'],
  },
  { id: 'q3-concorda', etapa: 'q3', state: { ...comQ2, rendaBruta: 12000, rendaLiquida: 3800, descontoConta: 2000 }, conversa: [['out', Q3], ['in', 'com certeza, seria um alívio enorme']], espera: { intencaoEm: ['responde_etapa', 'outro'] } },
  {
    id: 'q3-garantia', etapa: 'q3', state: { ...comQ2, rendaBruta: 12000, rendaLiquida: 3800, descontoConta: 2000 }, conversa: [['out', Q3], ['in', 'vocês garantem que vão conseguir suspender os descontos?']], espera: { intencao: 'pergunta' }, comResposta: true,
    criterios: [...RESPOSTA_BOA, 'Não garante resultado: diz que a possibilidade é avaliada pela Dra. na reunião'],
  },
  { id: 'oferta-aceita', etapa: 'oferta', state: { oferta }, conversa: [['out', OFERTA], ['in', 'pode sim, agenda pra mim']], espera: { intencao: 'aceita_horario' } },
  { id: 'oferta-recusa', etapa: 'oferta', state: { oferta }, conversa: [['out', OFERTA], ['in', 'nesse horário eu estou trabalhando']], espera: { intencaoEm: ['recusa_horario', 'escolhe_periodo'], periodo: null } },
  { id: 'oferta-manha', etapa: 'oferta', state: { oferta }, conversa: [['out', OFERTA], ['in', 'hoje não dá, só consigo de manhã']], espera: { intencaoEm: ['escolhe_periodo', 'recusa_horario'], periodo: 'manha' } },
  { id: 'preferencia-sexta-tarde', etapa: 'preferencia', state: { oferta }, conversa: [['out', OFERTA], ['in', 'não posso hoje'], ['out', 'Sem problema. Você prefere de manhã ou à tarde?'], ['in', 'pode ser sexta à tarde']], espera: { intencao: 'escolhe_periodo', periodo: 'tarde', data_preferida: '2026-10-16' } },
  { id: 'pede-doutora', etapa: 'q2', state: comQ2, conversa: [['out', Q2], ['in', 'quero falar direto com a doutora, por favor']], espera: { intencao: 'pede_humano' } },
  { id: 'robo', etapa: 'q2', state: comQ2, conversa: [['out', Q2], ['in', 'isso aqui é um robô respondendo?']], espera: { intencao: 'pergunta_se_robo', resposta: null } },
  { id: 'advogado', etapa: 'q2', state: comQ2, conversa: [['out', Q2], ['in', 'eu já tenho advogado nesse processo contra o banco']], espera: { intencao: 'tem_advogado' } },
  { id: 'icms', etapa: 'q1', conversa: [['out', Q1], ['in', 'na verdade é sobre ICMS atrasado da minha empresa']], espera: { intencao: 'outro_assunto' } },
  { id: 'agendado-remarcar', etapa: 'agendado', state: { reuniao: { eventId: 'x', inicio: '2026-10-14T18:00:00.000Z', link: 'https://meet.google.com/x', criadaEm: '' } }, conversa: [['in', 'preciso remarcar a reunião de amanhã']], espera: { intencao: 'remarcar' } },
]

async function main() {
  if (!process.env.OPENAI_API_KEY) { console.error('OPENAI_API_KEY ausente'); process.exit(1) }
  const { createInterprete, PENDENTE, violacoes, compor } = await import('../lib/anna/interprete')
  const { costUsd } = await import('../lib/execlog')
  const OpenAI = (await import('openai')).default
  const MODEL = process.env.LLM_MODEL || 'gpt-5.4-mini-2026-03-17'
  const JUDGE = process.env.EVAL_JUDGE_MODEL || 'gpt-5.4-2026-03-05'
  const REPS = Number(process.env.EVAL_REPS || 1)
  const filtros = process.argv.slice(2)
  const interprete = createInterprete({ apiKey: process.env.OPENAI_API_KEY, model: MODEL })
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  let reprovados = 0
  let custo = 0
  const lista = CENARIOS.filter(c => !filtros.length || filtros.some(f => c.id.includes(f)))
  for (const c of lista) {
    for (let rep = 1; rep <= REPS; rep++) {
      const state: LeadState = { etapa: c.etapa, ...(c.state || {}) }
      const conversa = c.conversa.map(([dir, text], i) => ({ id: `m${i}`, dir, text, ts: i + 1 }))
      const { leitura, usage, guard } = await interprete.interpretar({
        etapa: c.etapa, pendente: PENDENTE[c.etapa](state, c.etapa === 'oferta' ? 'HOJE às 15:00' : undefined), state, conversa, agora: AGORA, nomeContato: 'Maria Silva',
      })
      custo += costUsd(MODEL, usage) || 0
      const falhas: string[] = []
      const { intencaoEm, ...campos } = c.espera
      if (intencaoEm && !intencaoEm.includes(leitura.intencao)) falhas.push(`intenção ${leitura.intencao} (esperado uma de ${intencaoEm.join(', ')})`)
      for (const [kk, v] of Object.entries(campos)) {
        if (JSON.stringify((leitura as unknown as Record<string, unknown>)[kk]) !== JSON.stringify(v)) falhas.push(`${kk} = ${JSON.stringify((leitura as unknown as Record<string, unknown>)[kk])} (esperado ${JSON.stringify(v)})`)
      }
      if (c.comResposta && !leitura.resposta) falhas.push('sem resposta livre')
      if (leitura.resposta) {
        const v = violacoes(compor(leitura.resposta, PENDENTE[c.etapa](state, c.etapa === 'oferta' ? 'HOJE às 15:00' : undefined)))
        if (v.length) falhas.push(`trava: ${v.map(x => x.regra).join(', ')}`)
      }
      if (guard.length) falhas.push(`a trava precisou agir: ${guard.join(' | ')}`)

      const final = leitura.resposta ? compor(leitura.resposta, PENDENTE[c.etapa](state, c.etapa === 'oferta' ? 'HOJE às 15:00' : undefined)) : ''
      let juiz: Array<{ criterio: string; ok: boolean; porque: string }> = []
      if (c.criterios?.length && leitura.resposta) {
        const r = await openai.chat.completions.create({
          model: JUDGE,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'Você avalia a resposta de uma atendente de WhatsApp de um escritório de advocacia. Para CADA critério diga se foi atendido. Seja rigoroso e literal. JSON: {"criterios":[{"criterio":"...","ok":true|false,"porque":"..."}]}' },
            { role: 'user', content: `PERGUNTA PENDENTE DO ROTEIRO: ${PENDENTE[c.etapa](state)}\n\nCONVERSA ANTERIOR:\n${c.conversa.map(([d, t]) => `[${d === 'in' ? 'LEAD' : 'ATENDENTE'}]\n${t}\n[fim]`).join('\n')}\n\nMENSAGEM DA ATENDENTE EM AVALIAÇÃO (tudo entre as marcas é uma única mensagem):\n<<<\n${final}\n>>>\n\nCRITÉRIOS:\n${c.criterios.map((x, i) => `${i + 1}. ${x}`).join('\n')}` },
          ],
        })
        juiz = (JSON.parse(r.choices[0].message.content || '{"criterios":[]}') as { criterios: typeof juiz }).criterios || []
        for (const j of juiz.filter(j => !j.ok)) falhas.push(`juiz: ${j.criterio} → ${j.porque}`)
        if (juiz.length < c.criterios.length) falhas.push('juiz não avaliou todos os critérios')
      }

      if (falhas.length) reprovados++
      console.log(`${falhas.length ? '❌' : '✅'} ${c.id} [${rep}/${REPS}] intenção=${leitura.intencao}${final ? ` · "${falhas.length ? final : final.slice(0, 140)}"` : ''}`)
      for (const f of falhas) console.log(`   ⛔ ${f}`)
    }
  }
  console.log(`\n${reprovados ? `❌ ${reprovados} reprovado(s)` : '✅ Todos aprovados'} · ${lista.length} cenário(s) × ${REPS} · custo do intérprete US$ ${custo.toFixed(4)} (juiz não incluso)`)
  process.exit(reprovados ? 1 : 0)
}
main().catch(e => { console.error(e); process.exit(1) })
