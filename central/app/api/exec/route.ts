import { NextResponse } from 'next/server'
import { lerAgente } from '@/lib/agent'

export const dynamic = 'force-dynamic'
// a primeira leitura do funil no Kommo (sem nada guardado) leva uns 15 s
export const maxDuration = 60

export async function GET() {
  const { status, body } = await lerAgente('execucoes')
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}
