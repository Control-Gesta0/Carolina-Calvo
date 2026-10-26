import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { CONFIG } from '../lib/config'
import { guardarRefreshToken, testarAgenda } from '../lib/google'
import { k, redis } from '../lib/redis'

/**
 * Conexão da agenda Google POR LINK, sem copiar código nenhum (pedido de 23/10: a Dra. não quer
 * mexer em credenciais). A Control Gestão gera um convite (scripts/convite-google.ts) e manda o link;
 * a Dra. abre, entra na conta Google da agenda e clica em "Permitir". O Google devolve aqui um
 * código, que vira o refresh token guardado no Redis (lib/google.ts lê dele quando não há env).
 *
 *   GET /api/google?convite=<token>   → vai para a tela de autorização do Google
 *   GET /api/google?code=..&state=..  → volta do Google: guarda o acesso e testa a agenda
 *
 * O convite vale 7 dias e uma vez só. GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET são do app OAuth
 * (Google Cloud) que tem este endereço como URI de redirecionamento autorizado.
 */

const ESCOPOS = ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.freebusy']

const voltaPara = (req: VercelRequest) => `https://${req.headers['x-forwarded-host'] || req.headers.host}/api/google`

const pagina = (titulo: string, texto: string, ok: boolean) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title>
<style>body{font-family:system-ui,sans-serif;background:#f6f7f9;color:#1d2433;margin:0;display:grid;place-items:center;min-height:100vh}
main{background:#fff;max-width:440px;margin:16px;padding:32px;border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,.08)}
h1{font-size:22px;margin:0 0 12px;color:${ok ? '#1a7f4b' : '#b42318'}}p{line-height:1.5;margin:8px 0}</style></head>
<body><main><h1>${titulo}</h1>${texto}</main></body></html>`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  if (!CONFIG.google.clientId || !CONFIG.google.clientSecret) {
    return res.status(503).send(pagina('Conexão ainda não liberada', '<p>O aplicativo da agenda ainda não foi configurado pela Control Gestão. Avise o Eduardo.</p>', false))
  }
  const q = req.query as Record<string, string | undefined>

  if (q.convite) {
    const chave = k('google', 'convite', q.convite)
    if (!(await redis.get(chave))) return res.status(410).send(pagina('Link expirado', '<p>Este link já foi usado ou venceu. Peça um novo ao Eduardo.</p>', false))
    const state = crypto.randomBytes(16).toString('hex')
    await redis.set(k('google', 'state', state), q.convite, { ex: 1800 })
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.search = new URLSearchParams({
      client_id: CONFIG.google.clientId, redirect_uri: voltaPara(req), response_type: 'code',
      scope: ESCOPOS.join(' '), access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state,
    }).toString()
    res.setHeader('Location', url.toString())
    return res.status(302).end()
  }

  if (q.error) return res.status(400).send(pagina('Conexão não concluída', `<p>O Google respondeu: ${String(q.error).replace(/[<>&"]/g, '')}. Se clicou em "Cancelar", é só abrir o link de novo.</p>`, false))

  if (q.code && q.state) {
    const convite = await redis.get<string>(k('google', 'state', q.state))
    if (!convite) return res.status(400).send(pagina('Link expirado', '<p>A autorização demorou mais de 30 minutos. Abra o link do convite de novo.</p>', false))
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code: q.code, client_id: CONFIG.google.clientId, client_secret: CONFIG.google.clientSecret, redirect_uri: voltaPara(req), grant_type: 'authorization_code' }),
    })
    const j = await r.json() as { refresh_token?: string; scope?: string; error?: string; error_description?: string }
    if (!r.ok || !j.refresh_token) {
      return res.status(400).send(pagina('Conexão não concluída', `<p>O Google não liberou o acesso (${(j.error || r.status) + ''}). Abra o link de novo e marque as permissões da agenda.</p>`, false))
    }
    const faltando = ESCOPOS.filter(s => !(j.scope || '').includes(s))
    if (faltando.length) return res.status(400).send(pagina('Falta uma permissão', '<p>Na tela do Google, marque as duas caixas da agenda e clique em "Continuar". Abra o link de novo para refazer.</p>', false))
    await guardarRefreshToken(j.refresh_token)
    await redis.del(k('google', 'state', q.state), k('google', 'convite', convite))
    try {
      const agenda = await testarAgenda()
      return res.status(200).send(pagina('Agenda conectada ✅', `<p>A agenda <b>${agenda.replace(/[<>&"]/g, '')}</b> está ligada à Anna. Pode fechar esta página.</p><p>Os horários ocupados nesta agenda não serão oferecidos, e cada reunião marcada aparece nela com o link do Google Meet.</p>`, true))
    } catch (e) {
      return res.status(200).send(pagina('Acesso recebido, agenda com erro', `<p>O acesso foi guardado, mas a leitura da agenda falhou. A Control Gestão já consegue ver o erro e resolver sem nova autorização.</p><p style="color:#667">${(e instanceof Error ? e.message : String(e)).slice(0, 200).replace(/[<>&"]/g, '')}</p>`, false))
    }
  }

  return res.status(400).send(pagina('Link incompleto', '<p>Abra o link completo enviado pelo Eduardo.</p>', false))
}
