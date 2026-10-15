import OpenAI, { toFile } from 'openai'
import { CONFIG } from './config'
import { CRM_MAP } from './crm-map'
import { k, redis } from './redis'

/**
 * Ouvido e olho, NA ENTRADA e uma vez só: áudio, imagem e PDF viram texto
 * gravado no histórico. O cérebro nunca paga mídia em cada turno.
 * O link do attachment do Kommo costuma ser público. Se o servidor do Kommo
 * recusar (401/403), tenta de novo com o token, só em host do Kommo.
 * Falhou? Nunca fingir leitura: o marcador diz que não abriu (kommo §15), e o
 * motivo fica em diag:midia (host, status e tipo, sem o link) para investigar.
 */

const openai = new OpenAI({ apiKey: CONFIG.openaiApiKey })
const MAX_BYTES = 20 * 1024 * 1024

const hostKommo = (url: string) => { try { return /(^|\.)(kommo\.com|amocrm\.(ru|com))$/i.test(new URL(url).hostname) } catch { return false } }

async function download(url: string): Promise<{ data: ArrayBuffer; type: string }> {
  let motivo = ''
  for (const comToken of [false, true]) {
    if (comToken && !hostKommo(url)) break
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 20_000)
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers: comToken ? { Authorization: `Bearer ${CONFIG.kommoToken}` } : undefined })
      if (res.ok) {
        const data = await res.arrayBuffer()
        if (!data.byteLength) throw new Error('download vazio')
        if (data.byteLength > MAX_BYTES) throw new Error(`arquivo grande (${Math.round(data.byteLength / 1e6)} MB)`)
        return { data, type: (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase() }
      }
      motivo = `download HTTP ${res.status}${comToken ? ' com token' : ''}`
      if (res.status !== 401 && res.status !== 403) break
    } finally {
      clearTimeout(t)
    }
  }
  throw new Error(motivo || 'download falhou')
}

/** Formatos que a transcrição aceita; o nome do arquivo precisa ter um deles. */
const EXT_AUDIO = ['ogg', 'oga', 'mp3', 'mp4', 'm4a', 'mpeg', 'mpga', 'wav', 'webm', 'flac']
const EXT_DO_TIPO: Record<string, string> = {
  'audio/ogg': 'ogg', 'audio/opus': 'ogg', 'application/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3',
  'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/m4a': 'm4a', 'video/mp4': 'mp4', 'audio/wav': 'wav',
  'audio/x-wav': 'wav', 'audio/webm': 'webm', 'audio/flac': 'flac',
}
export function extensaoAudio(url: string, tipo: string): string {
  if (EXT_DO_TIPO[tipo]) return EXT_DO_TIPO[tipo]
  const ultimo = (url.split(/[?#]/)[0].split('/').pop() || '').toLowerCase()
  const ext = ultimo.includes('.') ? ultimo.split('.').pop()! : ''
  return EXT_AUDIO.includes(ext) ? ext : 'ogg'
}

async function transcribe(url: string): Promise<string | null> {
  const file = await download(url)
  const r = await openai.audio.transcriptions.create({
    file: await toFile(Buffer.from(file.data), `audio.${extensaoAudio(url, file.type)}`),
    model: CONFIG.sttModel,
    language: 'pt',
  })
  return (r.text || '').trim() || null
}

async function describe(url: string, kind: 'image' | 'document'): Promise<string | null> {
  const file = await download(url)
  const isPdf = kind === 'document' || /pdf/i.test(file.type) || /\.pdf($|\?)/i.test(url)
  const b64 = Buffer.from(file.data).toString('base64')
  const content: OpenAI.Chat.ChatCompletionContentPart[] = isPdf
    ? [{ type: 'file', file: { filename: 'documento.pdf', file_data: `data:application/pdf;base64,${b64}` } }]
    : [{ type: 'image_url', image_url: { url: `data:${file.type || 'image/jpeg'};base64,${b64}` } }]
  const r = await openai.chat.completions.create({
    model: CONFIG.visionModel,
    max_completion_tokens: 400,
    messages: [{ role: 'system', content: CRM_MAP.midia.instrucaoVisao }, { role: 'user', content }],
  })
  return (r.choices[0]?.message?.content || '').trim() || null
}

export type MediaKind = 'audio' | 'image' | 'document'

export function mediaKind(attachType: string): MediaKind | null {
  if (/voice|audio/i.test(attachType)) return 'audio'
  if (/picture|image|photo/i.test(attachType)) return 'image'
  if (/file|document/i.test(attachType)) return 'document'
  return null
}

/** Por que a mídia não abriu (sem o link, que pode ter token): os 20 últimos, por 7 dias. */
async function registrarFalha(kind: MediaKind, url: string, motivo: string) {
  let host = '-'
  try { host = new URL(url).hostname } catch { /* sem link */ }
  const k1 = k('diag', 'midia')
  await redis.lpush(k1, { em: new Date().toISOString(), kind, host, motivo: motivo.slice(0, 200) }).catch(() => undefined)
  await redis.ltrim(k1, 0, 19).catch(() => undefined)
  await redis.expire(k1, 7 * 86400).catch(() => undefined)
}

/** Texto que entra no histórico no lugar da mídia. */
export async function mediaToText(kind: MediaKind, url: string, caption: string): Promise<string> {
  const label = kind === 'audio' ? 'áudio' : kind === 'image' ? 'imagem' : 'documento'
  try {
    if (!url) throw new Error('webhook sem link do anexo')
    const text = kind === 'audio' ? await transcribe(url) : await describe(url, kind)
    if (!text) throw new Error('leitura voltou vazia')
    const base = `[${label} do lead]: ${text}`
    return caption ? `${caption}\n${base}` : base
  } catch (e) {
    const motivo = e instanceof Error ? e.message : String(e)
    console.error(`[media] falha (${kind}): ${motivo}`)
    await registrarFalha(kind, url, motivo)
    const base = `[${label} recebido, mas não consegui abrir]`
    return caption ? `${caption}\n${base}` : base
  }
}
