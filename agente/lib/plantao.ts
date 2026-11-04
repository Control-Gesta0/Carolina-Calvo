import { CONFIG } from './config'

/**
 * PLANTÃO (Dra., 16/10 e 04/11/2026): fora do expediente a Anna se apresenta como equipe de plantão.
 * Expediente = segunda a sexta, das 9h às 16h59 (Brasília). Todo o resto é plantão: segunda a sexta
 * das 4h às 8h59 e das 17h às 22h, sábado e domingo das 4h às 22h, e a madrugada.
 * Liga com PLANTAO=true. Os robôs de saudação vêm de SAUDACAO_EXPEDIENTE e SAUDACAO_PLANTAO ("bot:modelo").
 */

export const APRESENTACAO = {
  expediente: 'Aqui é a Anna, da equipe da Dra. Carolina Calvo.',
  plantao: 'Aqui é a Anna, da equipe de plantão do escritório da Dra. Carolina Calvo.',
}

/** Puro: a hora (Brasília) é de plantão? */
export function emPlantao(d: Date): boolean {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short', hour: '2-digit', hour12: false }).formatToParts(d)
  const dia = p.find(x => x.type === 'weekday')?.value || ''
  const h = Number(p.find(x => x.type === 'hour')?.value) % 24
  const util = !['Sat', 'Sun'].includes(dia)
  return !(util && h >= 9 && h < 17)
}

export const apresentacao = (d: Date) => (emPlantao(d) ? APRESENTACAO.plantao : APRESENTACAO.expediente)

/** Aviso no fim do atendimento feito fora do horário (Dra., 04/11): a Anna atende normal e avisa no fim. */
export const AVISO_FORA_DO_HORARIO = 'Estamos fora do horário comercial. A equipe da Dra. Carolina Calvo dá continuidade ao seu atendimento a partir das 9h do próximo dia útil.'

/** Puro: entre 22h e 3h59 (Brasília), fora até do plantão. */
export function foraDoHorario(d: Date): boolean {
  const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }).format(d)) % 24
  return h >= 22 || h < 4
}

/** Puro: a mensagem que encerra o atendimento da Anna, com o aviso quando é fora do horário. */
export const comAvisoFora = (texto: string, d: Date, ligado: boolean) => (ligado && foraDoHorario(d) ? `${texto}\n\n${AVISO_FORA_DO_HORARIO}` : texto)

/** "54700:52500" → { botId, templateId }. Puro. */
export function lerSaudacao(v?: string): { botId: number; templateId: number } | null {
  const [b, t] = String(v || '').split(':').map(Number)
  return b > 0 && t > 0 ? { botId: b, templateId: t } : null
}

/** O robô de saudação desta hora, quando o plantão está ligado e os dois robôs existem. */
export function saudacaoDaHora(d: Date): { botId: number; templateId: number } | null {
  if (!CONFIG.plantao) return null
  const exp = lerSaudacao(process.env.SAUDACAO_EXPEDIENTE)
  const pla = lerSaudacao(process.env.SAUDACAO_PLANTAO)
  if (!exp || !pla) return null
  return emPlantao(d) ? pla : exp
}
