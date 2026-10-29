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
  /** Closer › Retorno imediato: criada em 22/10/2026 (pedido da Dra.), logo depois de Cliente decisão */
  retornoImediato: 113268367,
  naoCompareceu: 75401495, // funil Closer
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
    /** data/hora da reunião (date_time, epoch em SEGUNDOS). As automações do escritório leem os dois:
     *  "Reunião" → lembretes 2h/1h/15min em Closer › Reunião agendada (modelo "Lembrete Reunião");
     *  "Agendamento" → 24h depois, o card vai para Cliente decisão. 171 de 192 leads têm os dois iguais. */
    reuniao: 803540,
    agendamento: 773220,
    objetivo: 805204,
    rendaBruta: 805206,
    rendaLiquida: 805208,
    descontoConta: 805210,
    // respostas do formulário do Facebook (só leitura)
    formVoceE: 803678,
    formSalario: 803682,
    formDescontos: 803838,
    // cobrança (variáveis dos modelos de cobrança; o código preenche antes de disparar o bot)
    linkPagamento: 805164,
    vencimento: 805166,
    diasAtraso: 805168,
    prazoLimite: 805170,
  },

  tags: {
    cliente: 'cliente',
    semReuniao: 'ANNA renda até 15k',
    passouHumano: 'ANNA passou para humano',
    agendou: 'ANNA agendou',
    /** posta pela equipe depois da reunião: a Anna nunca qualifica de novo quem tem esta tag */
    jaFezReuniao: 'JÁ FEZ REUNIÃO',
    /** cobrança: entra no D+1 e sai quando o cliente não tem mais parcela vencida */
    inadimplente: 'inadimplentes',
  },

  /** tarefa criada para a equipe quando a Anna passa o atendimento */
  tarefa: { responsavelId: 12068987, tipo: 1, prazoMin: 60 },
  /** lead que quer contratar ou respondeu em Cliente decisão: retorno imediato */
  tarefaPrioritaria: { responsavelId: 12068987, tipo: 1, prazoMin: 15 },

  /** funis onde a Anna nunca fala (clientes e financeiro) */
  pipelinesProibidos: [PIPELINES.gestao, PIPELINES.financeiro] as number[],
  /** etapas da equipe dentro do SDR/Closer onde a Anna não mexe */
  etapasProtegidas: [STATUS.ganho, STATUS.perdido, STATUS.clienteDecisao] as number[],

  modelos: {
    // Os 4 da Anna foram recriados pela tela (os rascunhos 51584–51590 da API não tinham número WABA)
    // e a Meta aprovou em 13/10. Modelos escolhidos nos bots pelo Eduardo em 19/10 (entrada em produção).
    // 29/10: modelo v2 com o texto da Dra. de 28/10 (aprovado pela Meta), enviado pelo robô de saudação
    // do Kommo (SDR › Contato inicial, tag anna-teste) e pelo Salesbot 54604. O 51744 (bot 54154) ficou antigo.
    primeiroContato: modelo(52384, 'Anna - Primeiro contato v2', 54604),
    lembrete24h: modelo(51746, 'Anna - Lembrete reunião 24h', 54156),
    lembrete1h: modelo(51748, 'Anna - Lembrete reunião 1h', 54158),
    lembrete15m: modelo(51750, 'Anna - Lembrete reunião 15min', 54160),
    follow1: modelo(49790, 'Follow 1', 54162),
    follow2: modelo(49666, 'Follow 2', 54164),
    follow3: modelo(49452, 'Follow up 3', 54166),
    follow4: modelo(49454, 'Follow up 4', 54168),
    fupHorario: modelo(46734, 'FUP horário reunião', 54170),
    se524h: modelo(47012, 'SE 5 24h', 54172),
    fupEncerramento: modelo(46746, 'FUP encerramento 48h', 54174),
    perguntaReuniao: modelo(48922, 'Pergunta reunião', 54176),
    // Cobrança (Asaas): recriados pela tela e aprovados em 14/10 (51762 em revisão nesse dia).
    // Salesbots "Cobrança · ..." criados pelo Cowork em 14/10 (onboarding/prompt-cowork-bots-cobranca.md).
    // botId 0 = não dispara (resultado "sem bot"). O 5 dias (bot 54192) está com o bloco vazio até a Meta
    // aprovar o 51762: só entra aqui depois que o modelo for escolhido nele.
    cobrancaAntes: modelo(51754, 'Cobrança - Antes do vencimento', 54184),
    cobrancaDia: modelo(51756, 'Cobrança - Dia do vencimento', 54186),
    cobranca17h: modelo(51758, 'Cobrança - Vencimento 17h', 54188),
    cobrancaD1: modelo(51760, 'Cobrança - 1 dia de atraso', 54190),
    cobrancaD5: modelo(51762, 'Cobrança - 5 dias de atraso', 0),
    cobrancaD10: modelo(51764, 'Cobrança - 10 dias de atraso', 54194),
    cobrancaD18: modelo(51766, 'Cobrança - 18 dias de atraso', 54196),
    cobrancaPago: modelo(51768, 'Cobrança - Pagamento confirmado', 54198),
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
