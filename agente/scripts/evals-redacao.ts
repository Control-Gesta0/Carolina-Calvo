/**
 * Exame da REDAÇÃO (conversa humanizada): para cada ponto do roteiro, o redator
 * reescreve o texto da Dra. numa conversa realista. Passa se: as travas e os
 * trechos obrigatórios conferem (não caiu no texto pronto) E um juiz cego aprova
 * os critérios. Imprime cada mensagem para leitura humana.
 *   OPENAI_API_KEY=... EVAL_REPS=3 npx tsx scripts/evals-redacao.ts [filtro...]
 */
export {}
for (const [key, val] of Object.entries({ KOMMO_DOMAIN: 'https://eval.kommo.com', KOMMO_TOKEN: 'x', KOMMO_ACCOUNT_ID: '1', UPSTASH_REDIS_REST_URL: 'https://x.upstash.io', UPSTASH_REDIS_REST_TOKEN: 'x', WEBHOOK_SECRET: 'x' })) process.env[key] ||= val

const CRITERIOS = [
  'Se a última mensagem da conversa é do lead, a mensagem abre reagindo ou respondendo a ela de forma específica (não genérica). Se a última mensagem é da Anna, este critério passa',
  'Traz as informações da referência sem acrescentar fato novo (valor, prazo, serviço, condição ou promessa). Usar o primeiro nome do lead, reescrever com outras palavras, mudar a ordem ou retomar o que o próprio lead disse NÃO conta como acréscimo',
  'Soa como uma pessoa atenciosa da equipe escrevendo no WhatsApp: frases corridas, sem lista numerada, sem palavras inteiras em caixa alta (datas e horários como AMANHÃ ou HOJE podem) e sem frase de efeito',
  'Se a referência pergunta algo, termina com uma pergunta de mesmo sentido (uma só, pode ser reescrita); se a referência não pergunta, não faz pergunta',
]

async function main() {
  if (!process.env.OPENAI_API_KEY) { console.error('OPENAI_API_KEY ausente'); process.exit(1) }
  const { default: OpenAI } = await import('openai')
  const { OBJETIVO } = await import('../lib/anna/fluxo')
  const { createRedator, validarRedacao } = await import('../lib/anna/redator')
  const { TEXTOS } = await import('../lib/anna/textos')
  const { PENDENTE } = await import('../lib/anna/interprete')
  const MODEL = process.env.LLM_MODEL || 'gpt-5.4-mini-2026-03-17'
  const JUIZ = process.env.EVAL_JUDGE_MODEL || 'gpt-5.4-2026-03-05'
  const REPS = Number(process.env.EVAL_REPS || 1)
  const filtros = process.argv.slice(2)
  const red = createRedator({ apiKey: process.env.OPENAI_API_KEY, model: MODEL })
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  let n = 0
  const m = (dir: 'in' | 'out', text: string) => ({ id: String(n++), dir, text, ts: Date.now() + n })
  const P1 = TEXTOS.pergunta1('Eduardo')
  const P2 = TEXTOS.pergunta2
  const M3 = TEXTOS.mensagem3(5000)
  const casos = [
    { id: 'pergunta1', ref: P1, obrig: ['Anna', 'Dra. Carolina Calvo', '6 meses'], conversa: [m('in', 'Boa tarde, vi o anúncio de vocês sobre os descontos no salário')] },
    { id: 'pergunta2', ref: P2, obrig: ['bruta', 'líquido', 'conta corrente'], conversa: [m('in', 'Boa tarde, vi o anúncio'), m('out', P1), m('in', 'quero reestruturar e renegociar minhas dividas')] },
    { id: 'q2_falta', ref: 'Obrigada. Falta só quanto o banco desconta da sua conta corrente por mês. Pode me informar?', obrig: ['conta corrente'], conversa: [m('out', P1), m('in', 'as duas'), m('out', P2), m('in', 'ganho 12 mil bruto e recebo uns 7 mil liquido')] },
    { id: 'mensagem3', ref: M3, obrig: [], conversa: [m('out', P2), m('in', 'Renda de 10000 bruto e uns 9000 liquido e o banco desconta 5000 da conta')] },
    { id: 'mensagem4', ref: TEXTOS.mensagem4, obrig: ['Dra. Carolina'], conversa: [m('out', M3), m('in', 'sim concordo, ta muito difícil pagar as contas')] },
    { id: 'mensagem5', ref: TEXTOS.mensagem5('AMANHÃ às 15:00'), obrig: ['AMANHÃ às 15:00', '6 meses'], conversa: [m('out', M3), m('in', 'sim concordo'), m('out', TEXTOS.mensagem4)] },
    { id: 'manha_ou_tarde', ref: TEXTOS.manhaOuTarde, obrig: ['manhã', 'tarde'], conversa: [m('out', TEXTOS.mensagem5('AMANHÃ às 15:00')), m('in', 'amanhã nesse horário eu trabalho')] },
    { id: 'sem_reuniao', ref: TEXTOS.semReuniao, obrig: [], conversa: [m('out', TEXTOS.mensagem3(800)), m('in', 'sim, seria ótimo')] },
    { id: 'passa_humano', ref: TEXTOS.passaHumano, obrig: [], conversa: [m('out', P2), m('in', 'prefiro falar direto com a doutora')] },
    { id: 'livre', ref: `A primeira reunião é on-line, pelo Google Meet, e não é cobrada.\n\n${PENDENTE.q2({} as never)}`, obrig: [], conversa: [m('out', P2), m('in', 'antes disso, quanto custa a consulta?')] },
  ].filter(c => !filtros.length || filtros.some(f => c.id.includes(f)))

  let falhas = 0
  let total = 0
  let usd = 0
  for (const c of casos) {
    for (let rep = 1; rep <= REPS; rep++) {
      total++
      const r = await red.redigir({ id: c.id, referencia: c.ref, objetivo: OBJETIVO[c.id] || OBJETIVO.livre, obrigatorio: c.obrig, conversa: c.conversa, primeiroNome: 'Eduardo' })
      usd += (r.usage.input * 0.75 + r.usage.output * 4.5) / 1e6
      const erros = r.redigido ? validarRedacao({ id: c.id, referencia: c.ref, obrigatorio: c.obrig, conversa: c.conversa }, r.texto) : ['caiu no texto pronto: ' + r.guard.join(' | ')]
      const j = await openai.chat.completions.create({
        model: JUIZ,
        messages: [
          { role: 'system', content: 'Você é um juiz cego e rigoroso de mensagens de WhatsApp de um escritório de advocacia. Avalie a MENSAGEM contra cada critério. Responda em JSON.' },
          { role: 'user', content: `CONVERSA ATÉ AQUI:\n${c.conversa.map(x => `${x.dir === 'in' ? 'LEAD' : 'ANNA'}: ${x.text}`).join('\n')}\n\nREFERÊNCIA (o que precisa ser dito):\n${c.ref}\n\nMENSAGEM:\n${r.texto}\n\nCRITÉRIOS:\n${CRITERIOS.map((x, i) => `${i + 1}. ${x}`).join('\n')}` },
        ],
        response_format: { type: 'json_schema', json_schema: { name: 'juiz', strict: true, schema: { type: 'object', additionalProperties: false, required: ['criterios'], properties: { criterios: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['criterio', 'ok', 'porque'], properties: { criterio: { type: 'string' }, ok: { type: 'boolean' }, porque: { type: 'string' } } } } } } } },
      })
      const juiz = (JSON.parse(j.choices[0].message.content || '{"criterios":[]}').criterios || []) as Array<{ criterio: string; ok: boolean; porque: string }>
      const reprov = [...erros, ...juiz.filter(x => !x.ok).map(x => `juiz: ${x.criterio} → ${x.porque}`)]
      if (juiz.length < CRITERIOS.length) reprov.push('juiz não avaliou todos os critérios')
      if (reprov.length) falhas++
      console.log(`${reprov.length ? '❌' : '✅'} ${c.id} [${rep}/${REPS}]\n   ${r.texto.replace(/\n+/g, '\n   ')}`)
      for (const x of reprov) console.log(`   ⛔ ${x}`)
    }
  }
  console.log(`\n${falhas ? `❌ ${falhas} reprovada(s)` : '✅ Todas aprovadas'} · ${casos.length} ponto(s) × ${REPS} · custo do redator ~US$ ${usd.toFixed(4)} (juiz não incluso)`)
  process.exit(falhas ? 1 : 0)
}
main().catch(e => { console.error(e); process.exit(1) })
