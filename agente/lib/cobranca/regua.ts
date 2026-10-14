/**
 * RÉGUA DE COBRANÇA (puro, testado em scripts/test.ts). Decide, para uma
 * cobrança do Asaas, qual mensagem sai HOJE em cada turno. Tudo em datas de
 * Brasília (AAAA-MM-DD). Combinado na reunião de 08/10/2026 (escopo §2):
 *
 *   antes  · vencimento dia 07: 4º dia útil do mês; outro dia: 4 dias antes  (manhã)
 *   dia    · no dia do vencimento                                            (manhã)
 *   dia17  · no dia do vencimento, se ainda não pagou                        (17:00)
 *   d1 · d5 · d10 · d18 · dias corridos de atraso                            (manhã)
 *   pago   · quando o Asaas confirma o pagamento                             (webhook ou manhã)
 *
 * Os textos de D+1 ("vencimento ontem") e D+5 ("5 dias de atraso") são fixos:
 * a mensagem só sai no dia exato, nunca atrasada.
 * Dia útil = segunda a sexta, fora feriados nacionais, Carnaval, Sexta-feira
 * Santa, Corpus Christi e 30/11 (DF). A confirmar com a Dra.
 */

export type Etapa = 'antes' | 'dia' | 'dia17' | 'd1' | 'd5' | 'd10' | 'd18'
export type Turno = 'manha' | 'tarde'

export const ATRASOS: Record<number, Etapa> = { 1: 'd1', 5: 'd5', 10: 'd10', 18: 'd18' }
export const PAGO = new Set(['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH', 'DUNNING_RECEIVED'])
const EM_ABERTO = new Set(['PENDING', 'OVERDUE'])

const DIA = 86400_000
const utc = (iso: string) => Date.parse(`${iso}T12:00:00Z`)
export const somarDias = (iso: string, n: number) => new Date(utc(iso) + n * DIA).toISOString().slice(0, 10)
export const diasEntre = (de: string, ate: string) => Math.round((utc(ate) - utc(de)) / DIA)
export const brData = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
export function pascoa(ano: number): string {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

/** Feriados em que banco e escritório não funcionam em Brasília. */
export function feriados(ano: number): Set<string> {
  const fixos = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '11-30', '12-25'].map(md => `${ano}-${md}`)
  const p = pascoa(ano)
  return new Set([...fixos, somarDias(p, -48), somarDias(p, -47), somarDias(p, -2), somarDias(p, 60)])
}

export function diaUtil(iso: string): boolean {
  const semana = new Date(utc(iso)).getUTCDay()
  return semana !== 0 && semana !== 6 && !feriados(Number(iso.slice(0, 4))).has(iso)
}

export function quartoDiaUtil(ano: number, mes: number): string {
  let iso = `${ano}-${String(mes).padStart(2, '0')}-01`
  for (let n = 0; ; iso = somarDias(iso, 1)) if (diaUtil(iso) && ++n === 4) return iso
}

/**
 * Dia do lembrete antes do vencimento. Vencimento dia 07: o 4º dia útil do mês;
 * se ele cair no dia 07 ou depois (janeiro com feriado no dia 1º), o último dia
 * útil antes do vencimento. Outros vencimentos: 4 dias corridos antes.
 */
export function diaDoAntes(vencimento: string): string | null {
  if (vencimento.slice(8, 10) !== '07') return somarDias(vencimento, -4)
  const quarto = quartoDiaUtil(Number(vencimento.slice(0, 4)), Number(vencimento.slice(5, 7)))
  if (quarto < vencimento) return quarto
  for (let d = somarDias(vencimento, -1); d.slice(0, 7) === vencimento.slice(0, 7); d = somarDias(d, -1)) if (diaUtil(d)) return d
  return null
}

/** A mensagem da régua que vale hoje neste turno, ou null. */
export function etapaDoDia(c: { dueDate: string; status: string }, hoje: string, turno: Turno): Etapa | null {
  if (!EM_ABERTO.has(c.status)) return null
  const atraso = diasEntre(c.dueDate, hoje)
  if (turno === 'tarde') return atraso === 0 ? 'dia17' : null
  if (atraso === 0) return 'dia'
  if (atraso < 0) return diaDoAntes(c.dueDate) === hoje ? 'antes' : null
  return ATRASOS[atraso] ?? null
}

/** Variáveis do modelo: vencimento, link, dias de atraso e prazo (D+18: envio + 2 dias, às 17:00). */
export function variaveis(c: { dueDate: string; invoiceUrl?: string; bankSlipUrl?: string }, hoje: string, etapa: Etapa | 'pago') {
  return {
    vencimento: brData(c.dueDate),
    linkPagamento: c.invoiceUrl || c.bankSlipUrl || '',
    ...(etapa === 'd10' || etapa === 'd18' ? { diasAtraso: String(diasEntre(c.dueDate, hoje)) } : {}),
    ...(etapa === 'd18' ? { prazoLimite: brData(somarDias(hoje, 2)) } : {}),
  }
}

/** Telefone → chave de comparação: DDD + 8 últimos dígitos (ignora +55 e o 9 a mais). */
export function chaveTelefone(tel?: string | null): string | null {
  let d = String(tel || '').replace(/\D/g, '')
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2)
  if (d.length < 10) return null
  return d.slice(0, 2) + d.slice(-8)
}
