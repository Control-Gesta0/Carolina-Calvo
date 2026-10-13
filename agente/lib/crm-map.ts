/**
 * MAPA DO CRM — Carolina Calvo Advogados (patch do cliente, nunca copie por cima).
 *
 * IDs lidos AO VIVO na conta 33595135 em 08/10 e 13/10/2026. A conta muda: rode
 * /api/validate depois de qualquer mexida no funil e antes de cada deploy.
 * Bots com 0 = Salesbot ainda não criado na tela (o validate acusa).
 */

export const PIPELINES = { sdr: 9733267, closer: 9809931, financeiro: 9809951, gestao: 9809959 } as const

export const STATUS = {
  contatoInicial: 74896319,
  ate5: 74896331,
  de5a10: 74896323,
  de10a15: 108957127,
  acima15: 108957131,
  agendarReuniao: 109942607,
  outrosAssuntos: 75768039,
  naoQuerContinuar: 76490255,
  reuniaoAgendada: 75401491, // funil Closer
  clienteDecisao: 75538167, // funil Closer
  perdido: 143, // "Venda perdida" quando o funil é Gestão operacional
  ganho: 142,
} as const

/** Modelo aprovado na Meta → Salesbot que envia esse modelo (um bot por modelo, criado na tela). */
export interface Modelo { templateId: number; nome: string; botId: number }

const modelo = (templateId: number, nome: string, botId = 0): Modelo => ({ templateId, nome, botId })

export const CRM_MAP = {
  /** textarea que o Salesbot de texto livre envia */
  respostaFieldId: 805202,
  /** a IA NUNCA escreve nestes campos */
  camposProibidos: [] as number[],

  campos: {
    primeiroNome: 805158,
    horarioReuniao: 805160,
    linkMeet: 805162,
    /** data/hora da reunião (date_time, epoch em SEGUNDOS) — o mesmo do modelo "Lembrete Reunião" */
    reuniao: 803540,
    objetivo: 805204,
    rendaBruta: 805206,
    rendaLiquida: 805208,
    descontoConta: 805210,
    // respostas do formulário do Facebook (só leitura)
    formVoceE: 803678,
    formSalario: 803682,
    formDescontos: 803838,
  },

  tags: {
    cliente: 'cliente',
    semReuniao: 'ANNA renda abaixo 10k',
    passouHumano: 'ANNA passou para humano',
    agendou: 'ANNA agendou',
  },

  /** tarefa criada para a equipe quando a Anna passa o atendimento */
  tarefa: { responsavelId: 12068987, tipo: 1, prazoMin: 60 },

  /** funis onde a Anna nunca fala (clientes e financeiro) */
  pipelinesProibidos: [PIPELINES.gestao, PIPELINES.financeiro] as number[],
  /** etapas da equipe dentro do SDR/Closer onde a Anna não mexe */
  etapasProtegidas: [STATUS.ganho, STATUS.perdido, STATUS.clienteDecisao] as number[],

  modelos: {
    primeiroContato: modelo(51584, 'Anna - Primeiro contato'),
    lembrete24h: modelo(51586, 'Anna - Lembrete reunião 24h'),
    lembrete1h: modelo(51588, 'Anna - Lembrete reunião 1h'),
    lembrete15m: modelo(51590, 'Anna - Lembrete reunião 15min'),
    follow1: modelo(49790, 'Follow 1'),
    follow2: modelo(49666, 'Follow 2'),
    follow3: modelo(49452, 'Follow up 3'),
    follow4: modelo(49454, 'Follow up 4'),
    fupHorario: modelo(46734, 'FUP horário reunião'),
    se524h: modelo(47012, 'SE 5 24h'),
    fupEncerramento: modelo(46746, 'FUP encerramento 48h'),
    perguntaReuniao: modelo(48922, 'Pergunta reunião'),
  } satisfies Record<string, Modelo>,

  midia: {
    instrucaoVisao: 'Descreva em português, em no máximo 4 frases, o arquivo que um lead mandou pelo WhatsApp para um escritório de advocacia de superendividamento: tipo de documento (contracheque, extrato, contrato, print), banco ou órgão, e os valores legíveis de salário bruto, líquido e descontos. Não avalie direitos. O que não estiver legível, diga "ilegível".',
  },
}

export type ChaveModelo = keyof typeof CRM_MAP.modelos

/** Coluna do SDR pela renda bruta (R$/mês). */
export function colunaPorRenda(renda: number): number {
  if (renda <= 5000) return STATUS.ate5
  if (renda < 10000) return STATUS.de5a10
  if (renda <= 15000) return STATUS.de10a15
  return STATUS.acima15
}
