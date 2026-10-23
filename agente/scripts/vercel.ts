/**
 * Publica a Anna (ou a Central dela) na Vercel pela API, sem tela.
 *   npx tsx scripts/vercel.ts               → mostra times, o projeto e o último deploy (só lê)
 *   npx tsx scripts/vercel.ts --publicar    → cria o projeto ligado ao GitHub (se não existir), grava as
 *                                            variáveis do ambiente/.env.local e faz o deploy de produção
 *   --central                               → o mesmo para o painel (projeto central-carolina-calvo, pasta central/)
 * Precisa de VERCEL_TOKEN (e VERCEL_TEAM = slug do time, se a conta tiver mais de um).
 * Só os NOMES das variáveis aparecem na saída.
 */
import { loadEnv } from './env'

loadEnv()
const API = 'https://api.vercel.com'
const CENTRAL = process.argv.includes('--central')
const NOME = CENTRAL ? 'central-carolina-calvo' : 'anna-carolina-calvo'
const RAIZ = CENTRAL ? 'central' : 'agente'
const REPO = { org: 'Control-Gesta0', repo: 'Carolina-Calvo', ref: 'claude/gallant-johnson-bytcbo' }
const CHAVES = CENTRAL ? ['AGENT_URL', 'AGENT_SECRET', 'APP_PASSWORD', 'AUTH_SECRET'] : [
  'KOMMO_DOMAIN', 'KOMMO_TOKEN', 'KOMMO_ACCOUNT_ID', 'KOMMO_BOT_ID', 'OPENAI_API_KEY',
  'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'REDIS_PREFIX', 'WEBHOOK_SECRET', 'CRON_SECRET', 'CENTRAL_SECRET', 'COST_USD_BRL',
  'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'GOOGLE_CALENDAR_ID',
  'GATE_TAG', 'HUMAN_TAG', 'TEST_LEAD_IDS', 'AUTO_GATE_FORM_LEADS', 'POS_REUNIAO',
  'ASAAS_API_KEY', 'ASAAS_URL', 'ASAAS_WEBHOOK_TOKEN', 'COBRANCA_ATIVA', 'COBRANCA_TESTE_LEADS',
]

let teamId = ''
async function v<T = any>(metodo: string, caminho: string, corpo?: unknown): Promise<{ status: number; json: T }> {
  const sep = caminho.includes('?') ? '&' : '?'
  const r = await fetch(`${API}${caminho}${teamId ? `${sep}teamId=${teamId}` : ''}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  })
  const txt = await r.text()
  return { status: r.status, json: (txt ? JSON.parse(txt) : {}) as T }
}
const espera = (ms: number) => new Promise(r => setTimeout(r, ms))

async function main() {
  if (!process.env.VERCEL_TOKEN) throw new Error('VERCEL_TOKEN no ambiente')
  const times = (await v('GET', '/v2/teams')).json.teams || []
  for (const t of times) console.log(`time: ${t.slug} (${t.name})`)
  const time = process.env.VERCEL_TEAM ? times.find((t: any) => t.slug === process.env.VERCEL_TEAM) : times.length === 1 ? times[0] : undefined
  if (!time) throw new Error('defina VERCEL_TEAM com o slug do time da Control Gestão')
  teamId = time.id
  console.log(`usando: ${time.slug}`)

  let proj = await v('GET', `/v9/projects/${NOME}`)
  console.log(`projeto ${NOME}: ${proj.status === 200 ? `existe (root ${proj.json.rootDirectory}, git ${proj.json.link?.repo || '-'})` : 'não existe'}`)
  if (proj.status === 200) {
    const d = (await v('GET', `/v6/deployments?projectId=${proj.json.id}&limit=1`)).json.deployments?.[0]
    if (d) console.log(`último deploy: ${d.url} · ${d.state} · ${d.meta?.githubCommitSha?.slice(0, 7) || ''}`)
  }
  if (!process.argv.includes('--publicar')) return

  if (proj.status !== 200) {
    proj = await v('POST', '/v11/projects', {
      name: NOME, framework: CENTRAL ? 'nextjs' : null, rootDirectory: RAIZ,
      gitRepository: { type: 'github', repo: `${REPO.org}/${REPO.repo}` },
    })
    if (proj.status >= 300) throw new Error(`criar projeto: ${proj.status} ${JSON.stringify(proj.json).slice(0, 400)}`)
    console.log('projeto criado e ligado ao GitHub')
  }
  const projectId = proj.json.id as string

  const envs = CHAVES.filter(c => (process.env[c] || '').trim()).map(c => ({
    key: c, value: String(process.env[c]).trim(), type: 'encrypted', target: ['production', 'preview'],
  }))
  const e = await v('POST', `/v10/projects/${projectId}/env?upsert=true`, envs)
  if (e.status >= 300) throw new Error(`variáveis: ${e.status} ${JSON.stringify(e.json).slice(0, 400)}`)
  console.log(`variáveis gravadas: ${envs.map(x => x.key).join(', ')}`)
  const faltam = CHAVES.filter(c => !(process.env[c] || '').trim())
  if (faltam.length) console.log(`sem valor (não gravadas): ${faltam.join(', ')}`)

  const dep = await v('POST', '/v13/deployments?forceNew=1', {
    name: NOME, project: projectId, target: 'production',
    gitSource: { type: 'github', org: REPO.org, repo: REPO.repo, ref: REPO.ref },
  })
  if (dep.status >= 300) throw new Error(`deploy: ${dep.status} ${JSON.stringify(dep.json).slice(0, 400)}`)
  const id = dep.json.id as string
  console.log(`deploy ${id} iniciado`)
  for (let i = 0; i < 90; i++) {
    await espera(10_000)
    const s = (await v('GET', `/v13/deployments/${id}`)).json
    if (s.readyState === 'READY') {
      console.log(`PRONTO · https://${s.url}`)
      for (const a of s.alias || []) console.log(`alias: https://${a}`)
      return
    }
    if (s.readyState === 'ERROR' || s.readyState === 'CANCELED') {
      const ev = (await v('GET', `/v3/deployments/${id}/events?limit=-1`)).json
      const linhas = (Array.isArray(ev) ? ev : []).map((x: any) => x.payload?.text || x.text).filter(Boolean)
      console.log(linhas.slice(-40).join('\n'))
      throw new Error(`deploy ${s.readyState}`)
    }
  }
  throw new Error('deploy não terminou em 15 min')
}
main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
