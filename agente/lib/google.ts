import crypto from 'crypto'
import { CONFIG } from './config'
import type { Intervalo } from './anna/agenda'

/**
 * Google Agenda da Dra. (OAuth com refresh token gerado pelo tutorial
 * tutoriais/01-google-agenda.mp4). O Meet é criado junto com o evento
 * (conferenceData), não precisa de outra API.
 * Bloqueio de horário = qualquer evento na agenda: o free/busy enxerga.
 */

let cache: { token: string; ate: number } | null = null

async function accessToken(): Promise<string> {
  if (cache && cache.ate > Date.now() + 60_000) return cache.token
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CONFIG.google.clientId,
      client_secret: CONFIG.google.clientSecret,
      refresh_token: CONFIG.google.refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const j = await res.json() as { access_token?: string; expires_in?: number; error?: string; error_description?: string }
  // invalid_grant = token revogado ou app ainda em "Testando" (expira em 7 dias): o alerta precisa dizer isso
  if (!res.ok || !j.access_token) throw new Error(`Google token -> ${res.status} ${j.error || ''} ${j.error_description || ''}`.trim())
  cache = { token: j.access_token, ate: Date.now() + (j.expires_in || 3600) * 1000 }
  return cache.token
}

async function google<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${await accessToken()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Google ${method} ${url.split('?')[0]} -> ${res.status}: ${text.slice(0, 300)}`)
  return (text ? JSON.parse(text) : {}) as T
}

const cal = () => `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CONFIG.google.calendarId)}`

export async function ocupados(de: Date, ate: Date): Promise<Intervalo[]> {
  const r = await google<{ calendars?: Record<string, { busy?: Array<{ start: string; end: string }>; errors?: unknown[] }> }>(
    'POST', 'https://www.googleapis.com/calendar/v3/freeBusy',
    { timeMin: de.toISOString(), timeMax: ate.toISOString(), timeZone: 'America/Sao_Paulo', items: [{ id: CONFIG.google.calendarId }] },
  )
  const c = Object.values(r.calendars || {})[0]
  if (!c || c.errors?.length) throw new Error(`free/busy sem acesso à agenda ${CONFIG.google.calendarId}: ${JSON.stringify(c?.errors || 'vazio')}`)
  return (c.busy || []).map(b => ({ inicio: Date.parse(b.start), fim: Date.parse(b.end) }))
}

export interface Evento { id: string; link: string; htmlLink: string }

export async function criarReuniao(o: { inicio: Date; fim: Date; titulo: string; descricao: string }): Promise<Evento> {
  const ev = await google<{ id: string; hangoutLink?: string; htmlLink: string; conferenceData?: { entryPoints?: Array<{ entryPointType: string; uri: string }> } }>(
    'POST', `${cal()}/events?conferenceDataVersion=1`,
    {
      summary: o.titulo,
      description: o.descricao,
      start: { dateTime: o.inicio.toISOString(), timeZone: 'America/Sao_Paulo' },
      end: { dateTime: o.fim.toISOString(), timeZone: 'America/Sao_Paulo' },
      conferenceData: { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } } },
      reminders: { useDefault: true },
    },
  )
  const link = ev.hangoutLink || ev.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri || ''
  if (!link) throw new Error(`evento ${ev.id} criado sem link do Meet`)
  return { id: ev.id, link, htmlLink: ev.htmlLink }
}

export async function apagarReuniao(eventId: string): Promise<void> {
  await google('DELETE', `${cal()}/events/${encodeURIComponent(eventId)}`)
}
