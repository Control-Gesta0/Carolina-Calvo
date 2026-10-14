/**
 * O EXAME DO INTÉRPRETE — roda o prompts/anna.md com o modelo REAL em cenários
 * de conversa. Cada cenário tem checagem em CÓDIGO (intenção, valores extraídos,
 * travas da resposta) e, quando há resposta livre, critérios para um juiz cego.
 * Qualquer reprovação → exit 1. Rode com 3 repetições antes de publicar.
 * Os cenários moram em evals/cenarios.ts e o executor em lib/evals-runner.ts:
 * o exame da Central (aba Ensinar) usa os mesmos, com a versão candidata.
 *
 *   npx tsx scripts/evals.ts                # todos, 1 rodada
 *   EVAL_REPS=3 npx tsx scripts/evals.ts    # o portão de deploy
 *   npx tsx scripts/evals.ts q2 oferta      # filtra por id
 */
import { loadEnv } from './env'

loadEnv()
for (const [key, val] of Object.entries({ KOMMO_DOMAIN: 'https://eval.kommo.com', KOMMO_TOKEN: 'x', KOMMO_ACCOUNT_ID: '1', UPSTASH_REDIS_REST_URL: 'https://x.upstash.io', UPSTASH_REDIS_REST_TOKEN: 'x', WEBHOOK_SECRET: 'x' })) process.env[key] ||= val

async function main() {
  if (!process.env.OPENAI_API_KEY) { console.error('OPENAI_API_KEY ausente'); process.exit(1) }
  const { cenarios } = await import('../evals/cenarios')
  const { runEvals } = await import('../lib/evals-runner')
  const MODEL = process.env.LLM_MODEL || 'gpt-5.4-mini-2026-03-17'
  const REPS = Number(process.env.EVAL_REPS || 1)
  const filtros = process.argv.slice(2)
  const lista = cenarios().filter(c => !filtros.length || filtros.some(f => c.id.includes(f)))
  const { resultados, custoUsd } = await runEvals({
    apiKey: process.env.OPENAI_API_KEY, model: MODEL, judgeModel: process.env.EVAL_JUDGE_MODEL || 'gpt-5.4-2026-03-05',
    cenarios: lista, reps: REPS, concorrencia: Number(process.env.EVAL_CONCORRENCIA || 4),
  })
  for (const r of resultados) {
    const final = r.conversa[0]?.resposta || ''
    const comResposta = !final.startsWith('(sem resposta livre')
    console.log(`${r.passou ? '✅' : '❌'} ${r.id} [${r.rep}/${REPS}] intenção=${r.intencao}${comResposta ? ` · "${r.passou ? final.slice(0, 140) : final}"` : ''}`)
    for (const f of r.falhasCodigo) console.log(`   ⛔ ${f}`)
    for (const f of r.falhasJuiz) console.log(`   ⛔ juiz: ${f.criterio} → ${f.porque}`)
  }
  const reprovados = resultados.filter(r => !r.passou).length
  console.log(`\n${reprovados ? `❌ ${reprovados} reprovado(s)` : '✅ Todos aprovados'} · ${lista.length} cenário(s) × ${REPS} · custo do intérprete US$ ${custoUsd.toFixed(4)} (juiz não incluso)`)
  process.exit(reprovados ? 1 : 0)
}
main().catch(e => { console.error(e); process.exit(1) })
