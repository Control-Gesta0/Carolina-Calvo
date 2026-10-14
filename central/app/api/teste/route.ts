import { NextResponse, type NextRequest } from 'next/server'
import { chamarAgente } from '@/lib/agent'

export const dynamic = 'force-dynamic'
// a Anna pode levar uns 20 s numa resposta (intérprete, travas e, na 4ª mensagem, a 5ª logo em seguida)
export const maxDuration = 120

export async function GET(req: NextRequest) {
  const sessao = req.nextUrl.searchParams.get('sessao') || ''
  const { status, body } = await chamarAgente(`/api/teste?sessao=${encodeURIComponent(sessao)}`)
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const { status, body } = await chamarAgente('/api/teste', { method: 'POST', body: b, timeoutMs: 110_000 })
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}
