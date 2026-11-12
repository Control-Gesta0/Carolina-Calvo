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
  /** SDR › Desqualificado: renda bruta abaixo de R$ 10 mil confirmada pelo lead (Dra., 03/11/2026) */
  desqualificado: 75401467,
  /** SDR › AGUARDANDO QUALIFICAÇÃO: recebeu o 1º follow-up e ainda não informou a renda (Dra., 05/11/2026) */
  aguardandoQualificacao: 113789335,
  /** intervenção humana temporária (Dra., 09/11), depois de AGUARDANDO QUALIFICAÇÃO, amarela */
  acaoSdr: 113936047,
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
    /** faixa de renda preservada quando o card vai para AÇÃO SDR (Dra., 09/11) */
    faixa10a15: 'FAIXA 10 A 15 MIL',
    faixaAcima15: 'FAIXA ACIMA DE 15 MIL',
  },

  /** tarefa criada para a equipe quando a Anna passa o atendimento */
  tarefa: { responsavelId: 12068987, tipo: 1, prazoMin: 60 },
  /** a reunião na agenda do Kommo: tarefa de reunião de 30 min, da Dra., no horário marcado */
  // tipo 2 = "Reunião" padrão do Kommo (Meeting). O tipo "Reunião" 4217119 é de outra integração (client_uuid
  // próprio) e o Kommo recusa a Anna (403 "Client UUID mismatch"): desde 05/11 nenhuma tarefa de reunião entrava (09/11)
  tarefaReuniao: { responsavelId: 12068987, tipo: 2, duracaoS: 1800 },
  /** tipos de tarefa de reunião que contam ao cancelar (o da Anna e o que a equipe usa) */
  tiposTarefaReuniao: [2, 4217119] as number[],
  /** lead que quer contratar ou respondeu em Cliente decisão: retorno imediato */
  tarefaPrioritaria: { responsavelId: 12068987, tipo: 1, prazoMin: 15 },
  /** tarefa da AÇÃO SDR: responsável definido e prazo no fim do dia (Dra., 09/11) */
  tarefaAcaoSdr: { responsavelId: 12068987, tipo: 1, prazoMin: 60 },

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

/**
 * Coluna do SDR pela renda bruta (R$/mês) que o PRÓPRIO lead confirmou na conversa (Dra., 03/11/2026):
 * abaixo de 10 mil → Desqualificado (o escritório não atende comercialmente; as colunas ATÉ 5 MIL e
 * 5 A 10 MIL deixaram de existir) · 10 a 15 mil → 10 A 15 MIL · acima de 15 mil → ACIMA DE 15 MIL.
 * A faixa do formulário nunca move o card sozinha.
 */
export function colunaPorRenda(renda: number): number {
  if (renda < 10000) return STATUS.desqualificado
  if (renda <= 15000) return STATUS.de10a15
  return STATUS.acima15
}

/**
 * Para onde vai o card de Contato inicial no 1º follow-up sem resposta (Dra., 09/11). Puro.
 * Formulário "de 10 a 15" → 10 A 15 MIL; "acima de 15" → ACIMA DE 15 MIL; o resto (até 5, 5 a 10, ambíguo, vazio)
 * → AGUARDANDO QUALIFICAÇÃO. A renda confirmada pelo lead na conversa continua decidindo a coluna final.
 */
export function colunaDoPrimeiroFollow(faixa: string | null | undefined): number {
  const c = colunaPelaFaixa(faixa)
  return c === STATUS.desqualificado ? STATUS.aguardandoQualificacao : c
}

/** Faixa do formulário "até 5 mil" ou "de 5 a 10 mil" (não vale a ambígua "de 7 a 15", nem a vazia). Puro. */
export function faixaAte10Mil(faixa: string | null | undefined): boolean {
  const f = String(faixa || '').toLowerCase().replace(/_/g, ' ')
  return /(^|\s)at[eé] 5( mil)?\b/.test(f) || /\b(de )?5 a 10( mil)?\b/.test(f)
}

export const MOTIVO_DESQUALIFICADO = {
  renda: 'Desqualificado — renda inferior a R$ 10 mil.',
  semResposta: 'Desqualificado — renda do formulário até R$ 10 mil, sem resposta após o segundo follow-up.',
}

/**
 * Dra., 11/11: lead que declarou no formulário renda até R$ 10 mil e não respondeu nada até o 2º follow-up vai para
 * DESQUALIFICADO logo depois do envio. Só sai de Contato inicial ou AGUARDANDO QUALIFICAÇÃO; quem respondeu ou já
 * confirmou renda na conversa segue a qualificação normal. Puro.
 */
export function desqualificaNoSegundoFollow(o: { faixa: string | null | undefined; pipelineId: number; statusId: number; rendaConfirmada: boolean; respondeu: boolean }): boolean {
  return o.pipelineId === PIPELINES.sdr && (o.statusId === STATUS.aguardandoQualificacao || o.statusId === STATUS.contatoInicial)
    && !o.rendaConfirmada && !o.respondeu && faixaAte10Mil(o.faixa)
}

/** Etiqueta que a equipe põe quando a saudação dá "Erro" no WhatsApp (Dra., 05/11). */
export const TAG_NAO_ENTREGUE = 'nao-entregue'

/**
 * Coluna pela faixa de salário do FORMULÁRIO, só para quem não recebe mensagem (etiqueta nao-entregue).
 * Puro. "de_10_a_15_mil" → 10 A 15 MIL; acima de 15 ("acima_de_15_mil", "Superior a 15 mil") → ACIMA DE 15 MIL;
 * o resto, inclusive o ambíguo "De 7 a 15 mil" e faixa vazia → Desqualificado.
 */
export function colunaPelaFaixa(faixa: string | null | undefined): number {
  const f = String(faixa || '').toLowerCase().replace(/_/g, ' ')
  if (/acima de 15|superior a 15|mais de 15/.test(f)) return STATUS.acima15
  if (/\b10 a 15\b/.test(f)) return STATUS.de10a15
  return STATUS.desqualificado
}

/**
 * Puro (Dra., 12/11, caso Antonio): follow-up de qualificação NÃO sai quando a qualificação acabou: card no Closer,
 * em AGENDAR REUNIÃO, em DESQUALIFICADO ou com reunião marcada no futuro. Devolve o motivo, ou null.
 */
export function qualificacaoEncerrada(o: { pipelineId: number; statusId: number; reuniaoMs: number | null; agoraMs: number }): string | null {
  if (o.pipelineId === PIPELINES.closer) return 'card no Closer'
  if (o.pipelineId === PIPELINES.sdr && o.statusId === STATUS.agendarReuniao) return 'card em AGENDAR REUNIÃO'
  if (o.pipelineId === PIPELINES.sdr && o.statusId === STATUS.desqualificado) return 'card em DESQUALIFICADO'
  if (o.reuniaoMs && o.reuniaoMs > o.agoraMs) return 'reunião marcada'
  return null
}
