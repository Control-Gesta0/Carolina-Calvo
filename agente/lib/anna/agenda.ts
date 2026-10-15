/**
 * Agenda da Dra. Carolina — motor PURO (sem rede), testado em scripts/test.ts.
 *
 * Regra de 08/10/2026: oferecer UM horário por vez, preenchendo a agenda em
 * sequência para a Dra. fazer as reuniões seguidas. Em cada dia, primeiro a
 * tarde (15:00 → 17:30), depois a manhã do mais tarde para o mais cedo
 * (11:30 → 10:00). Reuniões de 30 min, on-line.
 *
 * Horário de Brasília = UTC-3 fixo (o Brasil não tem horário de verão desde 2019).
 */

export const AGENDA = {
  tarde: ['15:00', '15:30', '16:00', '16:30', '17:00', '17:30'],
  manha: ['11:30', '11:00', '10:30', '10:00'],
  duracaoMin: 30,
  /** 0 = domingo … 6 = sábado */
  diasSemana: [1, 2, 3, 4, 5],
  /** não oferece horário que começa antes de agora + isso */
  antecedenciaMin: 60,
  horizonteDias: 14,
  /**
   * Reunião no mesmo dia a partir desta renda. Desde 15/10/2026 a Anna só oferece
   * reunião acima de R$ 15 mil (fluxo.ts), então na prática todo lead com oferta
   * pode ter reunião no mesmo dia. Fica aqui caso a Dra. volte a ofertar abaixo disso.
   */
  rendaMesmoDia: 13500,
}

const OFFSET_MS = 3 * 3600_000

export interface Intervalo { inicio: number; fim: number }
export interface Slot { inicio: Date; fim: Date; chave: string }
export type Periodo = 'manha' | 'tarde'

/** Componentes de data/hora em Brasília. */
export function brt(d: Date) {
  const x = new Date(d.getTime() - OFFSET_MS)
  return { ano: x.getUTCFullYear(), mes: x.getUTCMonth(), dia: x.getUTCDate(), hora: x.getUTCHours(), min: x.getUTCMinutes(), semana: x.getUTCDay() }
}

/** Data/hora de Brasília → instante. */
export function deBrt(ano: number, mes: number, dia: number, hora = 0, min = 0): Date {
  return new Date(Date.UTC(ano, mes, dia, hora, min) + OFFSET_MS)
}

/** "YYYY-MM-DD" do dia em Brasília. */
export function diaIso(d: Date): string {
  const b = brt(d)
  return `${b.ano}-${String(b.mes + 1).padStart(2, '0')}-${String(b.dia).padStart(2, '0')}`
}

const inicioDoDia = (iso: string) => { const [a, m, d] = iso.split('-').map(Number); return deBrt(a, m - 1, d) }
const somaDias = (iso: string, n: number) => diaIso(new Date(inicioDoDia(iso).getTime() + n * 86400_000 + 12 * 3600_000))

export function proximoDiaUtil(iso: string): string {
  let d = somaDias(iso, 1)
  for (let i = 0; i < 10 && !AGENDA.diasSemana.includes(brt(inicioDoDia(d)).semana); i++) d = somaDias(d, 1)
  return d
}

export function slotsDoDia(iso: string, periodo?: Periodo): Slot[] {
  const [a, m, d] = iso.split('-').map(Number)
  const horas = periodo ? AGENDA[periodo] : [...AGENDA.tarde, ...AGENDA.manha]
  return horas.map(h => {
    const [hh, mm] = h.split(':').map(Number)
    const inicio = deBrt(a, m - 1, d, hh, mm)
    return { inicio, fim: new Date(inicio.getTime() + AGENDA.duracaoMin * 60_000), chave: `${iso}T${h}` }
  })
}

export interface Busca {
  agora: Date
  /** intervalos ocupados na agenda do Google (free/busy) */
  ocupados: Intervalo[]
  /** horários oferecidos a outros leads e ainda reservados */
  reservados: Set<string>
  periodo?: Periodo
  /** primeiro dia permitido (YYYY-MM-DD) */
  aPartirDoDia?: string
  /** pode oferecer horário hoje (prioridade) */
  mesmoDia: boolean
}

export function proximoSlot(b: Busca): Slot | null {
  const hoje = diaIso(b.agora)
  let dia = b.aPartirDoDia && b.aPartirDoDia > hoje ? b.aPartirDoDia : b.mesmoDia ? hoje : proximoDiaUtil(hoje)
  const limite = b.agora.getTime() + AGENDA.antecedenciaMin * 60_000
  for (let i = 0; i < AGENDA.horizonteDias; i++, dia = somaDias(dia, 1)) {
    if (!AGENDA.diasSemana.includes(brt(inicioDoDia(dia)).semana)) continue
    for (const s of slotsDoDia(dia, b.periodo)) {
      if (s.inicio.getTime() < limite) continue
      if (b.reservados.has(s.chave)) continue
      if (b.ocupados.some(o => o.inicio < s.fim.getTime() && o.fim > s.inicio.getTime())) continue
      return s
    }
  }
  return null
}

const SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

const hhmm = (d: Date) => { const b = brt(d); return `${String(b.hora).padStart(2, '0')}:${String(b.min).padStart(2, '0')}` }
const ddmm = (d: Date) => { const b = brt(d); return `${String(b.dia).padStart(2, '0')}/${String(b.mes + 1).padStart(2, '0')}` }

/** Para a oferta: "HOJE às 17:00", "AMANHÃ às 15:00", "na quinta-feira (16/10) às 15:00". */
export function quandoOferta(s: Date, agora: Date): string {
  const d = diaIso(s)
  if (d === diaIso(agora)) return `HOJE às ${hhmm(s)}`
  if (d === somaDias(diaIso(agora), 1)) return `AMANHÃ às ${hhmm(s)}`
  const sem = SEMANA[brt(s).semana]
  return `${sem === 'sábado' || sem === 'domingo' ? 'no' : 'na'} ${sem} (${ddmm(s)}) às ${hhmm(s)}`
}

/** Para confirmação e campo do card: "quinta-feira, 16/10, às 15:00". */
export function quandoExtenso(s: Date): string {
  return `${SEMANA[brt(s).semana]}, ${ddmm(s)}, às ${hhmm(s)}`
}

export const primeiraMaiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
