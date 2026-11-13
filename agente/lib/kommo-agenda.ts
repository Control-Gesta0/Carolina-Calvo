import type { Intervalo } from './anna/agenda'
import { deBrt, brt } from './anna/agenda'
import { kommoGet } from './kommo'

/**
 * CALENDÁRIO DO KOMMO COMO AGENDA OCUPADA (Dra., autorizado em 12/11, confirmado em 13/11): antes de oferecer ou
 * confirmar uma reunião, a Anna considera também os compromissos e bloqueios da Dra. no calendário do Kommo, mesmo que
 * o horário pareça livre no Google. No Kommo, o calendário é feito de tarefas: o início é o prazo (complete_till) e o
 * fim é o prazo + a duração.
 */

export interface TarefaKommo { id: number; task_type_id: number; is_completed: boolean; complete_till: number; duration?: number | null; text?: string }

/** tipos de tarefa que marcam a agenda mesmo sem duração (reunião, bloqueio, audiência, viagem) */
export const TIPOS_DE_AGENDA = new Set([2, 4217119, 3665151, 3660959, 3660963, 3715151, 4112479, 3661999])
/** "AGENDA FECHADA" e "Viagem" sem horário (dia todo) fecham o dia inteiro */
const TIPOS_DIA_TODO = new Set([3665151, 4112479])

/**
 * Puro: os intervalos ocupados pelas tarefas abertas do calendário do Kommo.
 * - com duração: do prazo até o prazo + duração (ex.: AGENDA FECHADA 16:00–17:00);
 * - reunião, bloqueio, audiência ou viagem sem duração, com horário: 30 min a partir do prazo;
 * - AGENDA FECHADA ou Viagem "dia todo" (prazo 23:59, sem duração): o dia inteiro;
 * - tarefas de acompanhamento sem duração (cobrar docs, follow-up) não ocupam a agenda.
 */
export function intervalosDasTarefas(tarefas: TarefaKommo[]): Intervalo[] {
  const out: Intervalo[] = []
  for (const t of tarefas) {
    if (t.is_completed) continue
    const ini = t.complete_till * 1000
    const dur = Number(t.duration || 0)
    if (dur > 0) { out.push({ inicio: ini, fim: ini + dur * 1000 }); continue }
    if (!TIPOS_DE_AGENDA.has(t.task_type_id)) continue
    const b = brt(new Date(ini))
    const diaTodo = b.hora === 23 && b.min === 59
    if (diaTodo) {
      if (TIPOS_DIA_TODO.has(t.task_type_id)) out.push({ inicio: deBrt(b.ano, b.mes, b.dia).getTime(), fim: deBrt(b.ano, b.mes, b.dia, 23, 59).getTime() + 60_000 })
      continue
    }
    out.push({ inicio: ini, fim: ini + 30 * 60_000 })
  }
  return out
}

/** Os intervalos ocupados no calendário do Kommo entre `de` e `ate` (tarefas abertas). */
export async function ocupadosNoKommo(de: Date, ate: Date): Promise<Intervalo[]> {
  // começa 1 dia antes: uma tarefa que começou ontem com duração longa ainda pode ocupar hoje
  const from = Math.floor(de.getTime() / 1000) - 86400
  const to = Math.floor(ate.getTime() / 1000)
  const tarefas: TarefaKommo[] = []
  for (let page = 1; page <= 8; page++) {
    const d = await kommoGet<{ _embedded?: { tasks?: TarefaKommo[] } }>(
      `/api/v4/tasks?filter[is_completed]=0&filter[complete_till][from]=${from}&filter[complete_till][to]=${to}&limit=250&page=${page}`)
    const ts = d?._embedded?.tasks || []
    tarefas.push(...ts)
    if (ts.length < 250) break
  }
  return intervalosDasTarefas(tarefas)
}
