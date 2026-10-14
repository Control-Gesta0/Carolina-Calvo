import type { VercelRequest, VercelResponse } from '@vercel/node'
import { CONFIG, googleConfigurado } from '../lib/config'
import { CRM_MAP, PIPELINES, STATUS } from '../lib/crm-map'
import { CONFIG_REGUAS, modeloDaEtapa, type Regua } from '../lib/followup'
import { prompt } from '../lib/anna/interprete'
import { lerWebhooks } from '../lib/execlog'
import { kommoGet } from '../lib/kommo'

/**
 * CRM_MAP × Kommo VIVO + o que falta para a Anna ir ao ar. Rodar depois de
 * QUALQUER mexida no funil/campos e antes de cada deploy. { ok, problemas[], pendencias[] }
 * problema = algo quebrado; pendência = peça que ainda não foi entregue (bot, token, aprovação).
 */

interface LiveField { id: number; name: string; type: string }
interface LivePipeline { id: number; name: string; _embedded?: { statuses?: Array<{ id: number; name: string }> } }
interface LiveTemplate { id: number; name: string; _embedded?: { reviews?: Array<{ status: string }> } }

export async function validar() {
  const problemas: string[] = []
  const pendencias: string[] = []
  const cobranca: string[] = []

  try { prompt() } catch { problemas.push('prompts/anna.md não está no bundle (includeFiles)') }
  if (!CONFIG.kommoBotId) pendencias.push('KOMMO_BOT_ID: Salesbot de texto livre ainda não criado')
  if (!googleConfigurado()) pendencias.push('Google Agenda: faltam GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN (sem isso a Anna não agenda, passa para a equipe)')
  if (!CONFIG.cronSecret) pendencias.push('CRON_SECRET ausente: o relógio (/api/tick) não roda, sem pausa de 30 min, follow-up e lembretes')
  if (!CONFIG.gateTag) pendencias.push('GATE_TAG vazio = a Anna atende TODOS os leads. Só no fim da rampagem.')
  for (const regua of Object.keys(CONFIG_REGUAS.reguas) as Regua[]) {
    CONFIG_REGUAS.reguas[regua].etapas.forEach((_e, i) => { try { modeloDaEtapa(regua, i) } catch (e) { problemas.push((e as Error).message) } })
  }

  try {
    const fd = await kommoGet<{ _embedded?: { custom_fields?: LiveField[] } }>('/api/v4/leads/custom_fields?limit=250')
    const live = new Map((fd._embedded?.custom_fields || []).map(f => [f.id, f]))
    const resp = live.get(CRM_MAP.respostaFieldId)
    if (!resp) problemas.push(`campo de resposta ${CRM_MAP.respostaFieldId} NÃO existe`)
    else if (!/text/.test(resp.type)) problemas.push(`campo de resposta ${resp.id} é ${resp.type}, precisa ser text/textarea`)
    for (const [chave, id] of Object.entries(CRM_MAP.campos)) if (!live.has(id)) problemas.push(`campo "${chave}" (${id}) NÃO existe mais`)

    const pd = await kommoGet<{ _embedded?: { pipelines?: LivePipeline[] } }>('/api/v4/leads/pipelines')
    const pipes = pd._embedded?.pipelines || []
    for (const [nome, id] of Object.entries(PIPELINES)) if (!pipes.some(p => p.id === id)) problemas.push(`funil "${nome}" (${id}) NÃO existe`)
    const statuses = new Set(pipes.flatMap(p => (p._embedded?.statuses || []).map(s => s.id)))
    for (const [nome, id] of Object.entries(STATUS)) if (!statuses.has(id)) problemas.push(`etapa "${nome}" (${id}) NÃO existe`)

    for (const [chave, m] of Object.entries(CRM_MAP.modelos)) {
      // os modelos de cobrança têm pendências próprias: não seguram a Anna
      const lista = chave.startsWith('cobranca') ? cobranca : pendencias
      const t = await kommoGet<LiveTemplate>(`/api/v4/chats/templates/${m.templateId}?with=reviews`).catch(() => null)
      if (!t) { problemas.push(`modelo "${m.nome}" (${m.templateId}) NÃO existe`); continue }
      const status = (t._embedded?.reviews || []).map(r => r.status)
      if (!status.includes('approved')) lista.push(`modelo "${m.nome}" ainda não aprovado pela Meta (${status.join(', ') || 'rascunho'})`)
      if (!m.botId) lista.push(`modelo "${m.nome}": falta o Salesbot de envio (CRM_MAP.modelos.${chave}.botId)`)
    }
  } catch (e) {
    problemas.push(`falha ao consultar o Kommo: ${e instanceof Error ? e.message : String(e)}`)
  }
  if (!CONFIG.asaas.apiKey) cobranca.unshift('ASAAS_API_KEY: chave do Asaas ainda não recebida (tutoriais/02-asaas.mp4)')
  if (!CONFIG.asaas.webhookToken) cobranca.push('ASAAS_WEBHOOK_TOKEN: sem ele a confirmação de pagamento só sai na rodada das 9h')
  if (!CONFIG.cobrancaAtiva) cobranca.push('COBRANCA_ATIVA desligada: a régua só simula (ligar depois de conferir /api/cobranca?simular=1)')
  return {
    ok: problemas.length === 0, prontoParaLeadReal: problemas.length === 0 && pendencias.length === 0, cliente: CONFIG.clientName, problemas, pendencias,
    cobranca: { pronta: problemas.length === 0 && cobranca.length === 0, pendencias: cobranca },
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (String(req.query.secret || '') !== CONFIG.webhookSecret) return res.status(401).json({ error: 'unauthorized' })
  const r = await validar()
  return res.status(r.ok ? 200 : 500).json({ ...r, webhooks: await lerWebhooks().catch(() => null) })
}
