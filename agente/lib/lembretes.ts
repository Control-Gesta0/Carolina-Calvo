import { CRM_MAP, PIPELINES, STATUS, type ChaveModelo } from './crm-map'
import { agendarJob } from './jobs'

/**
 * LEMBRETES DE REUNIÃO PRESOS À REUNIÃO QUE OS ORIGINOU (Dra., 12/11 e 13/11, casos Adriana e Antonio).
 * Cada lembrete leva o evento e o horário da reunião para a qual foi programado. Na hora de sair, só vale se o card
 * continua com ESSA reunião: mesmo horário no campo "Reunião", card no Closer e o mesmo evento, no mesmo horário, na
 * agenda Google. Reunião cancelada, apagada ou remarcada (15h → 17h) = os lembretes da antiga não saem nunca; a nova
 * tem os seus.
 *
 * Os robôs do Kommo "Reunião agendada - 2h / 1h / 15 minutos" não conseguem fazer essa conferência (leem só o campo
 * na hora de enviar). Enquanto os gatilhos deles estiverem na etapa Closer › Reunião agendada, os lembretes de 1h e
 * 15 min da Anna não saem com o card nessa etapa, para não duplicar. Quando os gatilhos forem retirados, mudar para false.
 */
export const LEMBRETES_DO_KOMMO_ATIVOS = true

export const ANTECEDENCIAS: Array<[ChaveModelo, number]> = [['lembrete24h', 24 * 3600_000], ['lembrete1h', 3600_000], ['lembrete15m', 15 * 60_000]]

/** Programa os lembretes desta reunião (marcada pela Anna ou pela equipe). */
export async function agendarLembretesReuniao(leadId: number, inicio: Date, eventId: string, agora = Date.now()): Promise<number> {
  const seg = Math.floor(inicio.getTime() / 1000)
  let n = 0
  for (const [modelo, antes] of ANTECEDENCIAS) {
    const quando = inicio.getTime() - antes
    if (quando <= agora + 5 * 60_000) continue
    await agendarJob({ tipo: 'lembrete', leadId, quando, token: `${eventId}@${seg}`, dados: { modelo, inicio: seg, eventId } })
    n++
  }
  return n
}

/**
 * Puro: o lembrete ainda é da reunião válida? 'ok' ou o motivo de não sair.
 * google: o evento lido agora na agenda (null = apagado; undefined = não deu para ler, a conferência do card vale).
 */
export function lembreteVale(o: {
  inicioDoLembrete: number
  campoReuniao: number | null
  pipelineId: number
  statusId: number
  google?: { status: string; inicio: string } | null
}): 'ok' | string {
  if (!o.campoReuniao) return 'a reunião foi cancelada (data apagada no card)'
  if (o.campoReuniao !== o.inicioDoLembrete) return 'a reunião foi remarcada: este lembrete era do horário anterior'
  if (o.pipelineId !== PIPELINES.closer || CRM_MAP.etapasProtegidas.includes(o.statusId)) return 'o card não está mais com a reunião marcada (fora do Closer)'
  if (o.google === null || o.google?.status === 'cancelled') return 'a reunião foi apagada da agenda da Dra.'
  if (o.google && Math.floor(Date.parse(o.google.inicio) / 1000) !== o.inicioDoLembrete) return 'a reunião mudou de horário na agenda da Dra.'
  return 'ok'
}

/** Puro: enquanto os robôs do Kommo estão na etapa, 1h e 15 min ficam com eles (sem duplicar). */
export function kommoCobre(modelo: ChaveModelo, pipelineId: number, statusId: number, robosAtivos = LEMBRETES_DO_KOMMO_ATIVOS): boolean {
  return robosAtivos && modelo !== 'lembrete24h' && pipelineId === PIPELINES.closer && statusId === STATUS.reuniaoAgendada
}
