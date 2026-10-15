import type { VercelRequest, VercelResponse } from '@vercel/node'
import { waitUntil } from '@vercel/functions'
import {
  buildConversas, buildExecutionData, buildFunil, type KommoEtapa, type KommoLeadResumo, type LiveData,
} from '../lib/central-data'
import { centralAutorizada } from '../lib/central-auth'
import { CONFIG } from '../lib/config'
import { PIPELINES, STATUS } from '../lib/crm-map'
import { lerWebhooks, readExecs } from '../lib/execlog'
import { kommoGet } from '../lib/kommo'
import { k, redis } from '../lib/redis'
import { validar } from './validate'

/**
 * Leitura da Central (painel v5). Só leitura, zero tokens.
 * GET /api/central?recurso=execucoes|live  (header x-central-secret)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!centralAutorizada(req)) return res.status(401).json({ error: 'unauthorized' })
  res.setHeader('Cache-Control', 'no-store')
  const recurso = String(req.query.recurso || '')
  try {
    if (recurso === 'execucoes') return res.status(200).json(await execucoes())
    if (recurso === 'live') return res.status(200).json(await live())
    return res.status(400).json({ error: 'recurso inválido (execucoes | live)' })
  } catch (e) {
    return res.status(500).json({ error: (e instanceof Error ? e.message : String(e)).slice(0, 300) })
  }
}

async function execucoes() {
  return buildExecutionData(await readExecs(2000), CONFIG.usdBrl, CONFIG.llmModel, Date.now(), CONFIG.kommoDomain)
}

/** Etapas onde a Anna mexe: colunas de renda e "Não quer continuar" no SDR, Reunião agendada no Closer. */
const ETAPAS_DA_ANNA = new Set<number>([STATUS.ate5, STATUS.de5a10, STATUS.de10a15, STATUS.acima15, STATUS.naoQuerContinuar, STATUS.reuniaoAgendada])
const FUNIS = [{ id: PIPELINES.sdr, nome: 'SDR' }, { id: PIPELINES.closer, nome: 'Closer' }]

async function live(): Promise<LiveData> {
  const base = buildConversas((await execucoes()).execucoes)
  const problemas: string[] = []
  // Fail-closed: o mapa conferido contra o Kommo vivo; o que não responde vira atenção, nunca "saudável"
  try {
    problemas.push(...(await validar()).problemas)
  } catch (e) {
    problemas.push(`O Kommo não respondeu à conferência do mapa: ${(e instanceof Error ? e.message : String(e)).slice(0, 160)}`)
  }
  let funil: Pick<LiveData, 'funil' | 'leads'> = buildFunil([], [], CONFIG.gateTag)
  try {
    funil = await lerFunil()
  } catch (e) {
    problemas.push(`O Kommo não respondeu à leitura do funil: ${(e instanceof Error ? e.message : String(e)).slice(0, 160)}`)
  }
  return {
    geradoEm: new Date().toISOString(),
    ...base,
    pipeline: { nome: 'SDR e Closer' },
    ...funil,
    regras: {
      modoGate: CONFIG.gateTag ? 'tag' : 'todos',
      gateTag: CONFIG.gateTag,
      humanTag: CONFIG.humanTag,
      expediente: 'reuniões de segunda a sexta (tarde 15:00 a 17:30, depois manhã 11:30 a 10:00); follow-ups das 7h às 20h',
    },
    saude: { crmOk: problemas.length === 0, problemas },
    webhooks: await lerWebhooks().catch(() => undefined) as LiveData['webhooks'],
  }
}

async function lerEtapas(): Promise<KommoEtapa[]> {
  const out: KommoEtapa[] = []
  for (const [i, f] of FUNIS.entries()) {
    const p = await kommoGet<{ _embedded?: { statuses?: Array<{ id: number; name: string; sort: number; type?: number }> } }>(`/api/v4/leads/pipelines/${f.id}`)
    for (const s of p._embedded?.statuses || []) {
      if (s.id === STATUS.ganho || s.id === STATUS.perdido || s.type === 1) continue // fechadas e "Leads de entrada" ficam fora das etapas
      out.push({ id: s.id, nome: s.name, funil: f.nome, ordem: i * 100_000 + s.sort, ia: ETAPAS_DA_ANNA.has(s.id) })
    }
  }
  return out
}

/**
 * O funil contado (pequeno) fica no Redis: a leitura do Kommo pagina milhares de leads (≈15 s).
 * Até 5 min devolve o guardado; depois disso devolve o guardado NA HORA e recalcula por trás
 * (o painel nunca espera os 15 s, só na primeira leitura de todas). Guardado some em 7 dias.
 */
async function lerFunil(): Promise<Pick<LiveData, 'funil' | 'leads'>> {
  const chave = k('central', 'funil')
  const guardado = await redis.get<{ em: number; dado: Pick<LiveData, 'funil' | 'leads'> }>(chave).catch(() => null)
  const recalcular = async () => {
    const etapas = await lerEtapas()
    const dado = buildFunil(etapas, await lerLeads(etapas), CONFIG.gateTag)
    await redis.set(chave, { em: Date.now(), dado }, { ex: 7 * 86400 }).catch(() => undefined)
    return dado
  }
  if (guardado?.dado) {
    if (Date.now() - guardado.em > 5 * 60_000 && (await redis.set(k('central', 'funil', 'lock'), '1', { nx: true, ex: 60 }).catch(() => null)) === 'OK') {
      waitUntil(recalcular().catch(e => console.error('[central] funil não recalculou:', e)))
    }
    return guardado.dado
  }
  return recalcular()
}

/** Leads abertos das etapas (até 10 mil leads) + fechados nos últimos 30 dias nos dois funis. */
async function lerLeads(etapas: KommoEtapa[]): Promise<KommoLeadResumo[]> {
  const filtroAbertos = etapas.map((e, i) => `filter[statuses][${i}][pipeline_id]=${FUNIS.find(f => f.nome === e.funil)!.id}&filter[statuses][${i}][status_id]=${e.id}`).join('&')
  const desde = Math.floor(Date.now() / 1000) - 30 * 86400
  // fechados: SDR, Closer e Gestão operacional (onde a equipe encerra as vendas perdidas)
  const fechados = [...FUNIS.map(f => f.id), PIPELINES.gestao]
  const filtroFechados = fechados.flatMap((id, i) => [STATUS.ganho, STATUS.perdido].map((s, j) => `filter[statuses][${i * 2 + j}][pipeline_id]=${id}&filter[statuses][${i * 2 + j}][status_id]=${s}`)).join('&')
  const out: KommoLeadResumo[] = []
  type Bruto = KommoLeadResumo & { _embedded?: { tags?: Array<{ name: string }> } }
  const pagina = (filtro: string, page: number) => kommoGet<{ _embedded?: { leads?: Bruto[] } }>(`/api/v4/leads?${filtro}&limit=250&page=${page}`).then(d => d?._embedded?.leads || [])
  for (const filtro of [filtroAbertos, `${filtroFechados}&filter[closed_at][from]=${desde}`]) {
    // lotes de 5 páginas em paralelo (o Kommo aceita 7 pedidos por segundo); para na primeira página incompleta
    for (let inicio = 1; inicio <= 40; inicio += 5) {
      const lotes = await Promise.all([0, 1, 2, 3, 4].map(i => pagina(filtro, inicio + i)))
      for (const lote of lotes) out.push(...lote.map(l => ({ id: l.id, name: l.name, price: l.price, status_id: l.status_id, pipeline_id: l.pipeline_id, updated_at: l.updated_at, created_at: l.created_at, tags: (l._embedded?.tags || []).map(t => t.name) })))
      if (lotes.some(l => l.length < 250)) break
    }
  }
  return out
}
