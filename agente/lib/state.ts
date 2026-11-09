import { k, redis } from './redis'

/**
 * Estado do lead na conversa com a Anna. A etapa é decisão do CÓDIGO (o roteiro
 * da Dra. é fixo); o modelo só interpreta o que o lead escreveu.
 *
 *   q1 → q2 → limite → q3 → analise (pausa 30 min) → oferta ⇄ preferencia → agendado
 *                └→ sem_reuniao (renda até R$ 15 mil)
 *   qualquer etapa → humano (passou para a equipe)
 */

export type Etapa = 'q1' | 'q2' | 'limite' | 'q3' | 'analise' | 'oferta' | 'preferencia' | 'agendado' | 'sem_reuniao' | 'humano'
  /** cancelamento de reunião (Dra., 09/11): perguntou o motivo · ofereceu remarcar · tentativa única antes da desistência */
  | 'cancelou_motivo' | 'remarcar_pergunta' | 'desistencia_pergunta'

export interface Oferta { chave: string; inicio: string; fim: string; em: number }

export interface LeadState {
  etapa?: Etapa
  /** ts (ms) do início deste ciclo com a Anna — o intérprete só vê a conversa daí em diante */
  inicioEm?: number
  objetivo?: 1 | 2 | 3
  rendaBruta?: number
  rendaLiquida?: number
  descontoConta?: number
  /** resposta do lead sobre cheque especial e cartão de crédito com limite (Dra., 27/10) */
  limite?: string
  oferta?: Oferta
  /** quantas vezes o lead recusou um horário oferecido */
  recusas?: number
  /** horários que o lead recusou nesta conversa (não são oferecidos de novo) */
  recusados?: string[]
  /** renda de R$ 10 a 15 mil: caso encaminhado para a equipe avaliar (Dra., 06/11) */
  aguardaAvaliacao?: boolean
  /** lead recorrente: a mensagem da Dra. já saiu neste ciclo (uma vez só) e a resposta dele está pendente (Dra., 06/11) */
  recorrenteEnviado?: boolean
  recorrentePendente?: boolean
  reuniao?: { eventId: string; inicio: string; link: string; criadaEm: string }
  /** memória (Ajuste 3): valores de um atendimento anterior do mesmo telefone, e se a Anna espera o "melhorou, piorou ou igual" */
  memoria?: { quando: string; rendaBruta?: number; rendaLiquida?: number; descontoConta?: number }
  memoriaPendente?: boolean
  /** PRIMEIRO_CONTATO=kommo: ms em que a Anna passou a esperar a saudação do robô do Kommo (some quando ela sai) */
  saudacaoKommo?: number
  /** modelo da saudação enviada (expediente ou plantão); sem valor = o primeiro contato padrão */
  saudacaoModelo?: number
  /** token do job da 5ª mensagem (pausa de 30 min); trocar o token cancela o job */
  msg5Token?: string
  finalizado?: { motivo: string; em: string; resumo?: string }
  /** etapa em que estava quando passou para a equipe: a etiqueta anna-retomar volta para ela (Dra., 09/11) */
  etapaAntes?: Etapa
  /** remarcação de uma reunião cancelada pelo lead (Dra., 09/11): o card está em SDR › AGENDAR REUNIÃO */
  remarcacao?: boolean
  /** em AÇÃO SDR (Dra., 09/11): faixa para voltar, tarefa a concluir na retomada */
  acaoSdr?: { faixa: number; tarefaId?: number; providencia: string; em: string }
  /** valores lidos de um documento, esperando o lead confirmar a renda bruta (Dra., 09/11) */
  docPendente?: { rendaBruta?: number; rendaLiquida?: number }
}

/** 365 dias: a Anna retoma de onde parou quando o lead volta meses depois (regra da Dra., 15/10/2026) */
const TTL = 365 * 86400

export async function getState(leadId: number): Promise<LeadState> {
  return (await redis.get<LeadState>(k('state', leadId))) || {}
}

export async function patchState(leadId: number, patch: Partial<LeadState>): Promise<LeadState> {
  const next = { ...(await getState(leadId)), ...patch }
  await redis.set(k('state', leadId), next, { ex: TTL })
  return next
}

export async function clearState(leadId: number): Promise<void> {
  await redis.del(k('state', leadId))
}
