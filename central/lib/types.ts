/**
 * Contrato de dados Agente → Central. ESPELHO de ../agente/lib/central-data.ts
 * (o agente é a fonte). Mudou lá, mude aqui.
 */

/** O que a execução produziu: reunião marcada ou passagem para a equipe. */
export type Marco = 'agendou' | 'passou'
/** Faixa da renda bruta informada (abaixo de 10 mil a Anna não marca reunião). */
export type Perfil = 'acima_10k' | 'abaixo_10k'

export type TipoExecucao = 'resposta' | 'inicio' | 'agendou' | 'humano' | 'followup' | 'job' | 'pulou' | 'erro' | 'reset'

export interface Execution {
  ts: string
  contactId: string
  nome: string
  tipo: TipoExecucao
  resultado: 'respondeu' | 'erro' | 'pulou'
  detalhe: string
  duracaoMs: number
  tools: string[]
  travas: string[]
  midia?: { audios: number; imagens: number; documentos: number }
  /** etapa do roteiro depois da execução (q1, q2, q3, analise, oferta, preferencia, agendado, sem_reuniao, humano) */
  etapa?: string
  turnoLead?: string
  respostaIA?: string
  marco?: Marco
  motivo?: string
  perfil?: Perfil
  custo?: {
    totalBrl: number
    modeloUsd: number
    usdBrl: number
    tokens: { input: number; cached: number; output: number; chamadas: number }
  }
}

export interface Marcos {
  /** leads que receberam mensagem da Anna */
  atendidos: number
  /** leads que informaram a renda bruta */
  rendaInformada: number
  /** renda bruta de R$ 10 mil ou mais (seguem para a oferta de reunião) */
  acima10k: number
  /** renda bruta abaixo de R$ 10 mil (sem reunião, ficam para a equipe) */
  abaixo10k: number
  /** reuniões marcadas pela Anna */
  agendados: number
  /** passados para a equipe */
  passagens: number
  /** leads que receberam follow-up ou lembrete */
  followups: number
}

export interface MotivoN { motivo: string; rotulo: string; n: number }

export interface Passagem {
  ts: string
  contactId: string
  nome: string
  motivo: string
  rotulo: string
  perfil?: Perfil
  resumo: string
  urgente: boolean
  link: string
}

export interface Agendamento {
  ts: string
  contactId: string
  nome: string
  /** a confirmação que a Anna mandou (dia, hora e link) */
  resumo: string
  link: string
}

export interface Financial {
  hoje: number
  seteDias: number
  trintaDias: number
  totalRegistrado: number
  execucoesComCusto: number
  execucoesSemCusto: number
  medioPorExecucao: number
  porDia: Array<{ data: string; custo: number; execucoes: number }>
  usdBrl: number
  observacao: string
}

export interface ExecutionData {
  execucoes: Execution[]
  saude24h: { total: number; respondeu: number; erros: number; pulou: number }
  marcos: { hoje: Marcos; seteDias: Marcos; trintaDias: Marcos }
  motivos: { hoje: MotivoN[]; seteDias: MotivoN[]; trintaDias: MotivoN[] }
  passagens: Passagem[]
  agendamentos: Agendamento[]
  financeiro: Financial
  cobertura: { desde: string | null; registros: number }
  modelo: string
}

export interface FunilEtapa {
  id: string
  /** "SDR › 10 A 15 MIL", "Closer › REUNIÃO AGENDADA"… */
  label: string
  n: number
  /** a Anna move cards para esta etapa? */
  ia: boolean
  valor: number
  parados: number
  amostras: Array<{ id: string; nome: string; valor: number; diasParado: number }>
}

export interface LiveData {
  geradoEm: string
  conversas: Array<{ id: string; nome: string; ultimaMsg: string; minutosAtras: number; estado: 'ia' | 'humano' | 'fora' }>
  grupos: { iaAtendendo: number; comHumano: number; foraDaIA: number }
  conversas24h: number
  respostaMedianaSegundos: number | null
  pipeline: { nome: string }
  funil: FunilEtapa[]
  /** abertas = leads abertos nas etapas dos funis SDR e Closer; ganhas e perdidas = fechados nos últimos 30 dias (SDR, Closer e Gestão operacional) */
  leads: { total: number; abertas: number; ganhas: number; perdidas: number; comIA: number; tagsDisponiveis: boolean }
  regras: { modoGate: string; gateTag: string; humanTag: string; expediente: string }
  saude: { crmOk: boolean; problemas: string[] }
  /** o Kommo está entregando? último aviso de cada webhook */
  webhooks?: Record<string, { ultimo: { em: string; resultado: string } | null; recebidos7d: number }>
}

// ---------- Base de dados (espelho de ../agente/api/base.ts e ../agente/lib/exame.ts) ----------

export interface BaseItem {
  id: string
  grupo: string
  titulo: string
  ajuda: string
  padrao: string
  noAr: string
  rascunho: string | null
  problemas: string[]
}

export interface Exame {
  id: string
  status: 'rodando' | 'aprovado' | 'reprovado' | 'erro'
  inicio: string
  fim?: string
  nota: string
  mudancas: string[]
  feitos: number
  total: number
  custoUsd?: number
  versao?: number
  falhas?: Array<{ cenario: string; motivos: string[]; conversa: Array<{ lead: string; resposta: string }> }>
  instaveis?: string[]
  erro?: string
}

export interface MudancaBase { tipo: 'trocar' | 'nova' | 'remover'; id: string; titulo: string; antes: string; depois: string }

export interface MsgConversa {
  id: string
  ts: string
  papel: 'equipe' | 'ia'
  texto: string
  origem?: 'base' | 'teste' | 'real'
  correcao?: { fonte?: 'teste' | 'real'; sessao?: string; mensagemId?: string; contato?: string; nome?: string; ts?: string; lead: string; resposta: string; comoDeveria: string; porque: string }
  analise?: { comoDeveria: string; porque: string }
  destino?: 'base' | 'nova_informacao' | 'control_gestao' | 'recusado' | 'pergunta' | 'nenhum'
  mudancas?: MudancaBase[]
  desfeita?: boolean
  custoUsd?: number | null
  /** arquivos e links do pedido, como a IA leu (o arquivo não fica guardado) */
  anexos?: Array<{ nome: string; origem: 'arquivo' | 'link'; tipo: string; caracteres: number; url?: string; erro?: string }>
}

export interface BaseEstado {
  conversa: MsgConversa[]
  pedidosControlGestao: number
  versao: number
  publicadoEm: string | null
  nota: string | null
  rascunhoEm: string | null
  grupos: Record<string, string>
  itens: BaseItem[]
  alteracoes: string[]
  historico: Array<{ versao: number; publicadoEm: string | null; nota: string | null; mudancas: string[] }>
  exame: Exame | null
}

// ---------- Laboratório (espelho de ../agente/lib/teste.ts) ----------

export interface TesteOpcoes {
  /** lead_escreve: o lead manda a primeira mensagem · formulario: a Anna começa com o modelo "Primeiro contato" */
  inicio: 'lead_escreve' | 'formulario'
  /** cheia: simula a agenda da Dra. sem horário livre */
  agenda: 'livre' | 'cheia'
  versao: 'vigente' | 'rascunho'
}

export interface TesteSessao {
  id: string
  criadoEm: string
  opcoes: TesteOpcoes
  history: Array<{ id: string; dir: 'in' | 'out'; text: string; ts: number }>
  /** o que aconteceria no card do Kommo */
  mundo: {
    state: { etapa?: string; objetivo?: number; rendaBruta?: number; rendaLiquida?: number; descontoConta?: number; reuniao?: { inicio: string; link: string } }
    coluna: string
    tags: string[]
    notas: string[]
    tarefas: string[]
    campos: Record<string, string>
    reguas: string[]
    reuniao?: { quando: string; link: string }
  }
  detalhes: Record<string, { tools: string[]; log: string[]; guard: string[]; ms: number; custoUsd: number; handoff: boolean }>
  turnos: number
  custoUsd: number
}

export interface TesteUso { mensagens: number; custoUsd: number; limite: number; usdBrl: number }

// ---------- Conversas reais para correção (espelho de ../agente/lib/conversas-reais.ts) ----------

export interface ConversaResumo { contato: string; nome: string; ultima: string; respostas: number; previa: string; passou?: string; perfil?: Perfil }

export interface TurnoReal { ts: string; tipo: 'resposta' | 'inicio' | 'agendou' | 'humano' | 'job'; cliente: string; resposta: string; tools: string[]; travas: string[]; motivo?: string }
