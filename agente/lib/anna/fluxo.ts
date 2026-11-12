import { colunaPorRenda, CRM_MAP, MOTIVO_DESQUALIFICADO, PIPELINES, STATUS } from '../crm-map'
import type { Regua } from '../followup'
import type { ChatMsg } from '../history'
import type { Etapa, LeadState, Oferta } from '../state'
import { AGENDA, brt, deBrt, periodoDoSlot, diaIso, primeiraMaiuscula, proximoDiaUtil, quandoExtenso, quandoOferta, type Periodo, type Slot } from './agenda'
import { compor, ehPerguntaRobo, PENDENTE, type Entrada, type Leitura } from './interprete'
import type { Redacao } from './redator'
import { brl, TEXTOS } from './textos'
import { opcaoNoHistorico } from './recuperar'
import { leituraMemoria, valoresTexto } from '../memoria'

/**
 * O roteiro da Anna como máquina de estados. Tudo que é decisão (próxima
 * mensagem, coluna do funil, oferta de horário, passagem para humano) é CÓDIGO;
 * o modelo só lê o turno do lead (interprete.ts) e, na saída, reescreve a
 * mensagem decidida como conversa (redator.ts), com o texto da Dra. como
 * referência e fallback. As dependências entram por `Deps`, então o fluxo
 * inteiro roda em teste sem Kommo, Redis nem Google.
 */

/** O lead vai ver os valores e mandar depois ("vou olhar o contracheque", "te mando mais tarde"). Puro. */
const RX_DEPOIS = /\b(depois|mais tarde|amanh[aã]|daqui a pouco|j[aá] te (mando|passo|envio)|assim que|mandarei|enviarei|passarei|na (segunda|ter[cç]a|quarta|quinta|sexta)(-feira)?|no (s[aá]bado|domingo|fim de semana)|semana que vem|pr[oó]xima semana|outro dia)(?![a-zà-ú0-9])|\bte (mando|passo|envio|encaminho|respondo)\b|quando (eu )?chegar|levantamento|irei (fazer|ver|verificar|passar|mandar|enviar)|vou (ver|verificar|olhar|conferir|pegar|procurar|consultar|organizar|separar|reunir|juntar|providenciar|levantar|buscar|calcular)|preciso (ver|verificar|olhar|conferir|pegar|procurar|consultar|organizar|separar|reunir|juntar|providenciar|levantar|buscar|calcular)|n[aã]o (sei|lembro) (de cabe[cç]a|agora|no momento)|n[aã]o tenho (aqui|agora|em m[aã]os)/i
/** Só uma confirmação ("combinado", "ok", "tá bom"…), sem mais nada. Puro. */
export const RX_OK = /^\s*(combinado|ok(ay)?|t[aá]( bom| certo)?|certo|beleza|blz|pode deixar|sim|perfeito|fechado|show|claro|👍+|obrigad[oa]|vou mandar|mando sim)[\s.!,]*(obrigad[oa])?[\s.!]*$/i
/** Só um cumprimento ou resposta genérica ("oi", "sim", "bom dia", "tudo bem?"). Puro. */
export const RX_GENERICO = /^\s*(oi+|ol[aá]|opa|e a[ií]|sim|ok(ay)?|certo|claro|pode ser|quero|tenho interesse|bom dia|boa tarde|boa noite|tudo bem\??|tudo bom\??|oi,? tudo bem\??|ol[aá],? (bom dia|boa tarde|boa noite))[\s.!,]*$/i
export const vaiMandarDepois = (texto: string) => RX_DEPOIS.test(texto || '') && !/\?/.test(texto || '')
/** O lead disse que manda depois, mesmo junto de uma pergunta ("Envio mais tarde. Com quem falo?"). Puro. */
export const disseQueMandaDepois = (texto: string) => RX_DEPOIS.test(texto || '')
/** O lead vai ver a disponibilidade ou responder depois ("vou ver minha agenda", "te confirmo amanhã"). Puro. */
export const RX_RESPONDE_DEPOIS = new RegExp(`${RX_DEPOIS.source}|disponibilidade|minha agenda|meu hor[aá]rio|te (aviso|confirmo|falo|retorno|respondo)|(vou|preciso|deixa eu) (ver|verificar|consultar|olhar|confirmar|checar)`, 'i')
/** "Com quem eu falo?", "quem é você?" (Dra., 10/11). Puro. */
export const RX_IDENTIDADE = /com quem (eu )?(falo|t[oô] falando|estou falando|to falando)|quem (é|e) (voc[eê]|vc)\b|quem (fala|est[aá] falando)|qual (é |e )?(o )?seu nome/i

const SEMANA_RX: Array<[RegExp, number]> = [[/domingo/i, 0], [/segunda/i, 1], [/ter[cç]a/i, 2], [/quarta/i, 3], [/quinta/i, 4], [/sexta/i, 5], [/s[aá]bado/i, 6]]
/**
 * Puro: a partir de quando os follow-ups podem cobrar, quando o lead disse que manda depois (Dra., 10/11: não cobrar
 * antes do momento que ele indicou). "amanhã" → amanhã às 14h; um dia da semana → esse dia às 14h; "semana que vem"
 * → segunda às 14h; "mais tarde", "quando chegar em casa", "vou verificar" → no dia seguinte às 10h. Nunca antes de 2 h.
 */
export function esperaDoLead(texto: string, agora: Date): number {
  const b = brt(agora)
  const dia = (n: number, h: number) => deBrt(b.ano, b.mes, b.dia + n, h, 0).getTime()
  const t = texto || ''
  let quando: number
  if (/amanh[aã]/i.test(t)) quando = dia(1, 14)
  else if (/semana que vem|pr[oó]xima semana/i.test(t)) quando = dia(((1 - b.semana + 7) % 7) || 7, 14)
  else {
    const sem = SEMANA_RX.find(([rx]) => rx.test(t))
    quando = sem ? dia(((sem[1] - b.semana + 7) % 7) || 7, 14) : dia(1, 10)
  }
  return Math.max(quando, agora.getTime() + 2 * 3600_000)
}
/** A régua começa 2 h antes do 1º follow-up: base para o 1º follow-up sair em `espera`. */
const baseParaEspera = (espera: number) => espera - 2 * 3600_000

/** Puro: os valores da 2ª pergunta que ainda faltam. */
export function valoresQueFaltam(s: Pick<LeadState, 'rendaBruta' | 'rendaLiquida' | 'descontoConta'>): Array<'bruta' | 'liquida' | 'conta'> {
  return [s.rendaBruta == null ? 'bruta' : null, s.rendaLiquida == null ? 'liquida' : null, s.descontoConta == null ? 'conta' : null].filter((x): x is 'bruta' | 'liquida' | 'conta' => !!x)
}
const LINHA_VALOR = {
  bruta: 'Sua renda bruta mensal, antes dos descontos.',
  liquida: 'Sua renda líquida mensal, depois dos descontos do contracheque.',
  conta: 'Quanto o banco desconta diretamente da sua conta corrente quando o salário é depositado.',
}
/** Puro: a lista do que falta, no formato da Dra. (as três: o texto dela; parte: só o que falta). */
export function listaDoQueFalta(s: LeadState): string {
  const f = valoresQueFaltam(s)
  if (f.length === 3 || !f.length) return TEXTOS.valoresDepois
  const nums = ['1️⃣', '2️⃣', '3️⃣']
  return `*Para darmos continuidade à avaliação do seu caso, ${f.length === 1 ? 'falta só uma informação' : 'faltam só duas informações'}:*\n\n` +
    f.map((x, i) => `${nums[i]} ${LINHA_VALOR[x]}`).join('\n') +
    '\n\n*Assim que conseguir reunir, pode me encaminhar por aqui, tudo bem?*'
}
const temValores = (l: Leitura) => l.renda_bruta != null || l.renda_liquida != null || l.desconto_conta != null

/** Só acima disto a Anna oferece reunião (regra da Dra., 15/10/2026: renda bruta acima de R$ 15 mil). */
export const RENDA_OFERTA_REUNIAO = 15000
/** abaixo disso: Desqualificado (Dra., 03/11) */
export const RENDA_MINIMA = 10000
/** pedido de atendimento presencial */
const ETAPAS_QUALIFICACAO = new Set<string>(['q1', 'q2', 'limite', 'q3'])
/**
 * Passagens para a equipe que pedem uma providência para o atendimento continuar → AÇÃO SDR (Dra., 09/11).
 * Fora daqui (outro assunto, já é cliente, tem advogado, quer contratar) a equipe assume de vez. Puro.
 */
export function providenciaDaPassagem(motivo: string): string | null {
  if (motivo === 'pediu atendimento humano') return 'o lead pediu para falar com uma pessoa da equipe; responder pelo WhatsApp'
  if (motivo === 'perguntou se é robô') return 'o lead perguntou se está falando com um robô; responder pelo WhatsApp e seguir o atendimento'
  if (motivo === 'agenda indisponível' || motivo === 'sem horário livre nos próximos dias') return 'marcar a reunião com o lead: a agenda não tinha horário livre para a Anna oferecer'
  if (/^recusou \d+ horários/.test(motivo)) return 'combinar com o lead o horário da reunião (ele recusou os horários oferecidos)'
  if (motivo === 'renda até 15 mil pediu reunião') return 'o lead pediu reunião: avaliar se o escritório pode atender e responder'
  if (motivo === 'pediu para remarcar') return 'remarcar a reunião com o lead'
  return null
}
/** leitura de documento que o inbound põe no histórico (media.ts) */
const RX_DOC_LIDO = /\[(imagem|documento) do lead\]:/i
const RX_DOC_FALHOU = /\[(imagem|documento) recebido, mas não consegui abrir\]/i
/** pergunta de honorários, valores ou preço (Dra., 09/11) */
export const RX_HONORARIOS = /honor[aá]rio|quanto (voc[eê]s )?cobra|quanto (custa|cobram|fica|sai|[eé]) (o |a )?(servi[cç]o|processo|a[cç][aã]o|trabalho|advogad|consulta|atendimento)|quanto custa|qual (o |[eé] o )?(valor|pre[cç]o) (do|da|de|pra|para) (servi[cç]o|processo|a[cç][aã]o|trabalho|consulta|atendimento|voc[eê]s|advogad)|valor (do|da|de) (servi[cç]o|processo|a[cç][aã]o|trabalho|consulta|atendimento)|quanto (eu )?(vou|vai) pagar|\bpre[cç]o\b|\bcobram\b/i
/** reunião marcada e o caminho do cancelamento (Dra., 09/11) */
export const ETAPAS_REUNIAO = new Set<string>(['agendado', 'cancelou_motivo', 'remarcar_pergunta', 'desistencia_pergunta'])
/** "depois eu entro em contato", "vou deixar para outra ocasião" */
export const RX_DEPOIS_CONTATO = /depois (eu )?(entro em contato|te procuro|procuro voc[eê]s|falo com voc[eê]s|retorno|chamo)|vou deixar para (outra|uma outra) (ocasi[aã]o|hora|vez)|outra hora eu (vejo|chamo|procuro)|quando der eu (chamo|procuro|retorno)|mais pra frente eu (vejo|chamo|procuro)/i
/** motivo de cancelamento já dito: imprevisto, trabalho, saúde, compromisso */
export const RX_MOTIVO = /imprevisto|surgiu|reuni[aã]o no trabalho|trabalh|hospital|m[eé]dic|doente|consulta|compromisso|precisei sair|viagem|viajando|emerg[eê]ncia|n[aã]o vou conseguir nesse hor[aá]rio|esqueci|problema/i
const RX_SIM = /^\s*(sim|s|claro|pode|pode ser|quero|quero sim|vamos|ok|bora|isso|com certeza|aceito|gostaria)\b/i
const RX_CONFIRMA = /^\s*(sim|s|confere|confirmo|isso|isso mesmo|correto|certo|exato|est[aá] certo|t[aá] certo|perfeito|ok|positivo)\b/i
const RX_NAO = /^\s*(n[aã]o|nao quero|n[aã]o precisa|deixa|melhor n[aã]o)\b/i
const RX_DUVIDA_REUNIAO = /adianta|vale a pena|precisa mesmo|pra qu[eê]|para qu[eê]|resolve alguma coisa|serve pra/i
const RX_PRESENCIAL = /presencial|pessoalmente|no escrit[oó]rio|ir a[ií] no|ir at[eé] o escrit/i

export interface Ctx {
  agora: Date
  nomeContato: string
  /** primeiro nome para usar na conversa (vazio se o nome do WhatsApp não parece nome) */
  primeiroNome: string
  state: LeadState
  /** turno atual do lead (mensagens desde a última resposta) */
  textoTurno: string
  /** conversa deste ciclo com a Anna */
  conversa: ChatMsg[]
}

export interface Deps {
  interpretar(e: Entrada): Promise<Leitura>
  enviar(texto: string): Promise<void>
  patch(p: Partial<LeadState>): Promise<LeadState>
  salvarCampos(valores: Record<number, string | number>): Promise<void>
  mover(statusId: number, pipelineId: number): Promise<void>
  addTags(tags: string[]): Promise<void>
  nota(texto: string): Promise<void>
  /** tag de humano, tira o gate, tarefa para a equipe, nota, cancela régua */
  passarParaHumano(motivo: string, resumo: string, prioritaria?: boolean): Promise<void>
  tarefa(texto: string): Promise<void>
  agendarMsg5(token: string, quando: number): Promise<void>
  novoToken(): string
  iniciarRegua(regua: Regua, base: number): Promise<void>
  cancelarRegua(): Promise<void>
  agenda: {
    disponivel(): boolean | Promise<boolean>
    buscar(o: { periodo?: Periodo; aPartirDoDia?: string; mesmoDia: boolean; horaExata?: string; antecedenciaMin?: number; excluir?: string[] }): Promise<Slot | null>
    reservar(slot: Slot): Promise<void>
    /** o horário está livre na agenda da Dra. (e não reservado para outro lead)? Sem ela, vale a busca */
    livre?(slot: Slot): Promise<boolean>
    /** confere de novo no Google e cria o evento com Meet; null = o horário foi ocupado */
    confirmar(slot: Slot, titulo: string, descricao: string): Promise<{ eventId: string; link: string } | null>
  }
  agendarLembretes(inicio: Date, eventId: string): Promise<void>
  /** a reunião também na agenda do Kommo (tarefa "Reunião" no horário), Dra., 05/11 */
  tarefaReuniao?(inicio: Date, texto: string): Promise<void>
  /** valores de um atendimento anterior do mesmo telefone (memória); null = nada registrado ou memória desligada */
  memoria?(): Promise<LeadState['memoria'] | null>
  /** reescreve a mensagem do roteiro como conversa (redator.ts); sem ela, sai o texto pronto */
  redigir?(r: Redacao): Promise<string>
  /** cancela a reunião marcada: apaga o evento no Google, limpa os campos da reunião (os lembretes param),
   *  conclui a tarefa "Reunião" no Kommo e registra no card (Dra., 09/11) */
  cancelarReuniao?(reuniao: NonNullable<LeadState['reuniao']>, motivo: string): Promise<void>
  /** AÇÃO SDR (Dra., 09/11): move, etiqueta da faixa, tarefa com responsável e prazo, pausa. false = lead fora das faixas 10 A 15 / ACIMA DE 15 */
  encaminharAcaoSdr?(providencia: string, resumo: string): Promise<boolean>
}

export interface Resultado { acao: string; enviado?: string; leitura?: Leitura; /** na passagem: o resumo que vai para a tarefa da equipe */ resumo?: string; /** job que volta mais tarde (o lead disse quando responde) */ reagendarPara?: number }

/** encaminhamento → oferta: 15 minutos (Dra., 05/11; antes 30) */
const PAUSA_ANALISE_MS = 15 * 60_000

export const reguaDaEtapa = (e: Etapa): Regua | null =>
  e === 'q1' || e === 'q2' || e === 'limite' || e === 'q3' ? 'qualificacao' : e === 'oferta' || e === 'preferencia' ? 'agendamento' : null

const slotDaOferta = (o: Oferta): Slot => ({ chave: o.chave, inicio: new Date(o.inicio), fim: new Date(o.fim) })

function resumoLead(s: LeadState): string {
  const obj = s.objetivo === 1 ? 'suspender descontos' : s.objetivo === 2 ? 'reestruturar dívidas' : s.objetivo === 3 ? 'suspender e reestruturar' : 'não informado'
  return [
    `Objetivo: ${obj}`,
    `Renda bruta: ${s.rendaBruta != null ? brl(s.rendaBruta) : '?'}`,
    `Líquido: ${s.rendaLiquida != null ? brl(s.rendaLiquida) : '?'}`,
    `Desconto em conta: ${s.descontoConta != null ? brl(s.descontoConta) : '?'}`,
    ...(s.limite ? [`Cheque especial e cartão: "${s.limite.slice(0, 120)}"`] : []),
  ].join(' · ')
}

/** O que cada mensagem do roteiro precisa fazer: vai para a redação junto com o texto da Dra. */
export const OBJETIVO: Record<string, string> = {
  pergunta1: 'se apresentar e perguntar o que a pessoa quer saber: se é possível suspender por até 6 meses os descontos bancários e o pagamento das dívidas, reestruturar as dívidas com juros revisados, ou as duas coisas',
  pergunta2: 'pedir os três valores da análise inicial: a renda bruta mensal, quanto recebe líquido depois dos descontos do contracheque e quanto o banco desconta direto da conta corrente por mês',
  q2_falta: 'agradecer o que a pessoa já informou e pedir só o que falta',
  aguardo_valores: 'dizer que aguarda o retorno, que os valores são essenciais para avaliar a suspensão judicial dos descontos por até 6 meses e a redução das dívidas com a revisão dos juros, que quanto antes vierem mais cedo a análise avança, e perguntar se está combinado',
  pergunta_limite: 'perguntar se a pessoa usa o limite do cheque especial e se tem cartão de crédito ativo com limite disponível',
  mensagem3: 'mostrar que, sem esses descontos na conta corrente e recebendo o salário líquido inteiro, seria um alívio financeiro, sem citar o valor, e perguntar se a pessoa concorda',
  mensagem3_sem_desconto: 'mostrar que, reduzindo os descontos e sobrando mais do salário, seria um alívio financeiro, e perguntar se a pessoa concorda',
  mensagem4: 'dizer que a situação é delicada, que vai encaminhar a conversa para a Dra. Carolina analisar e que volta a falar em alguns minutos',
  mensagem5: 'dizer que a Dra. Carolina analisou o caso e o considerou delicado; que abriu um espaço na agenda no horário oferecido, on-line, para o primeiro atendimento; que nele vai explicar a possibilidade de obter judicialmente a suspensão dos descontos por até 6 meses, a revisão dos juros e a reestruturação das dívidas; que cada dia é mais um dia com descontos e esse é o único horário; perguntar se pode confirmar',
  nova_oferta: 'oferecer o horário, on-line, e perguntar se pode agendar',
  horario_ocupado: 'avisar que o horário anterior acabou de ser preenchido, oferecer o novo horário, on-line, e perguntar se pode agendar',
  manha_ou_tarde: 'para facilitar o agendamento, perguntar qual período costuma ser melhor para a pessoa: manhã ou tarde',
  oferta_pendente: 'retomar a oferta de horário e perguntar se pode agendar',
  sem_reuniao: 'agradecer as informações, dizer que o caso fica registrado para a equipe da Dra. Carolina avaliar o melhor caminho e que a pessoa pode escrever por aqui se tiver alguma dúvida',
  passa_humano: 'dizer que vai pedir para alguém da equipe da Dra. Carolina continuar o atendimento por aqui',
  sem_agenda: 'dizer que vai pedir para a equipe da Dra. Carolina confirmar o melhor horário por aqui',
  desistiu: 'respeitar a decisão e dizer que a pessoa pode chamar por aqui se mudar de ideia',
  pendente_q1: 'retomar a pergunta de qual opção a pessoa quer saber: 1, 2 ou 3',
  q1_numero: 'pedir que a pessoa responda com o número da opção: 1, 2 ou 3',
  livre: 'responder a dúvida da pessoa só com o que está na referência e, no fim, retomar a pergunta do roteiro',
}
/** Ficam como a Dra. escreveu: a confirmação (data, link e orientações) e o texto da ética da OAB. */
const FIXOS = new Set(['pergunta1', 'pergunta2', 'q1_numero', 'agendado', 'possui_advogado', 'como_funciona', 'encaminha_10_15', 'recorrente_retoma', 'honorarios', 'doc_confirma', 'doc_equipe', 'doc_ilegivel', 'valores_equipe', 'valores_conferir', 'identidade', 'valores_depois', 'aguardo_curto', 'q1_so_opcao', 'oferta_equipe_follow', 'oferta_equipe_outro'])

interface Fala { id: string; obrigatorio?: string[]; /** começo da régua (o lead disse quando manda): sem ela, agora */ baseRegua?: number }

/** Envia a mensagem (redigida como conversa, quando há redator) e devolve o texto que saiu. */
async function dizer(ctx: Ctx, deps: Deps, texto: string, f: Fala): Promise<string> {
  const final = FIXOS.has(f.id) || !deps.redigir ? texto : await deps.redigir({
    id: f.id, referencia: texto, objetivo: OBJETIVO[f.id] || OBJETIVO.livre, obrigatorio: (f.obrigatorio || []).filter(Boolean),
    conversa: ctx.conversa, primeiroNome: ctx.primeiroNome,
  })
  await deps.enviar(final)
  return final
}

/** Envia e, se a mensagem deixa uma pergunta em aberto, (re)começa a régua certa. */
async function falar(ctx: Ctx, deps: Deps, texto: string, etapa: Etapa, f: Fala): Promise<string> {
  const final = await dizer(ctx, deps, texto, f)
  const regua = reguaDaEtapa(etapa)
  if (regua) await deps.iniciarRegua(regua, f.baseRegua ?? ctx.agora.getTime())
  return final
}

/** Primeira mensagem quando o lead escreveu antes de a Anna se apresentar. */
export async function abrir(ctx: Ctx, deps: Deps): Promise<Resultado> {
  await deps.patch({ etapa: 'q1', inicioEm: ctx.agora.getTime() })
  const enviado = await falar(ctx, deps, TEXTOS.pergunta1(ctx.primeiroNome, ctx.agora), 'q1', { id: 'pergunta1', obrigatorio: ['6 meses'] })
  return { acao: 'abriu: pergunta 1', enviado }
}

async function humano(ctx: Ctx, deps: Deps, motivo: string, texto: string, leitura?: Leitura, id = 'passa_humano'): Promise<Resultado> {
  const resumo = `${leitura?.resumo || ctx.textoTurno.slice(0, 200)} · ${resumoLead(ctx.state)}`
  const enviado = await dizer(ctx, deps, texto, { id })
  // providência da equipe para continuar o atendimento (Dra., 09/11): faixa de 10 mil ou mais → AÇÃO SDR
  const providencia = providenciaDaPassagem(motivo)
  const foiAcaoSdr = providencia && deps.encaminharAcaoSdr ? await deps.encaminharAcaoSdr(providencia, resumo) : false
  if (!foiAcaoSdr) await deps.passarParaHumano(motivo, resumo)
  await deps.patch({ etapa: 'humano', etapaAntes: ctx.state.etapa, finalizado: { motivo, em: ctx.agora.toISOString() } })
  return { acao: `passou para humano: ${motivo}`, enviado, leitura, resumo }
}

async function oferecer(ctx: Ctx, deps: Deps, busca: { periodo?: Periodo; aPartirDoDia?: string; horaExata?: string; antecedenciaMin?: number }, textoDe: (q: string) => string, id: string): Promise<Resultado> {
  if (!(await deps.agenda.disponivel())) return humano(ctx, deps, 'agenda indisponível', TEXTOS.semAgenda, undefined, 'sem_agenda')
  const mesmoDia = (ctx.state.rendaBruta ?? 0) >= AGENDA.rendaMesmoDia && !busca.aPartirDoDia
  const slot = await deps.agenda.buscar({ ...busca, mesmoDia, excluir: ctx.state.recusados })
  if (!slot) return humano(ctx, deps, 'sem horário livre nos próximos dias', TEXTOS.semAgenda, undefined, 'sem_agenda')
  await deps.agenda.reservar(slot)
  const quando = quandoOferta(slot.inicio, ctx.agora)
  await deps.patch({ etapa: 'oferta', oferta: { chave: slot.chave, inicio: slot.inicio.toISOString(), fim: slot.fim.toISOString(), em: ctx.agora.getTime() } })
  const enviado = await falar(ctx, deps, textoDe(quando), 'oferta', { id, obrigatorio: id === 'mensagem5' ? [quando, '6 meses'] : [quando] })
  return { acao: `ofereceu ${slot.chave}`, enviado }
}

/** Marca a reunião no slot (o oferecido ou o que o lead pediu): agenda Google, campos, Closer, mensagem, lembretes e tarefa. */
async function agendar(ctx: Ctx, deps: Deps, slot: Slot, leitura?: Leitura): Promise<Resultado> {
  const s = ctx.state
  const nome = ctx.primeiroNome || ctx.nomeContato || 'lead'
  const ev = await deps.agenda.confirmar(slot, `Reunião on-line · ${nome} · superendividamento`, `Marcada pela Anna (WhatsApp).\n${resumoLead(s)}`)
  if (!ev) return oferecer(ctx, deps, {}, TEXTOS.horarioOcupado, 'horario_ocupado')
  const quando = primeiraMaiuscula(quandoExtenso(slot.inicio))
  await deps.cancelarRegua()
  // a reunião entra no estado ANTES do campo "Reunião": o webhook do campo não pode achar que foi a equipe
  // e criar outro evento no Google (reuniao-equipe.ts)
  await deps.patch({ reuniao: { eventId: ev.eventId, inicio: slot.inicio.toISOString(), link: ev.link, criadaEm: ctx.agora.toISOString() } })
  await deps.salvarCampos({
    [CRM_MAP.campos.reuniao]: Math.floor(slot.inicio.getTime() / 1000),
    [CRM_MAP.campos.agendamento]: Math.floor(slot.inicio.getTime() / 1000),
    [CRM_MAP.campos.horarioReuniao]: quandoExtenso(slot.inicio),
    [CRM_MAP.campos.linkMeet]: ev.link,
  })
  await deps.mover(STATUS.reuniaoAgendada, PIPELINES.closer)
  await deps.addTags([CRM_MAP.tags.agendou])
  const texto = TEXTOS.agendado(quando, ev.link)
  await deps.enviar(texto)
  await deps.patch({ etapa: 'agendado', oferta: undefined, ofertaEquipe: undefined, remarcacao: undefined, recusas: 0, recusados: [], reuniao: { eventId: ev.eventId, inicio: slot.inicio.toISOString(), link: ev.link, criadaEm: ctx.agora.toISOString() } })
  await deps.agendarLembretes(slot.inicio, ev.eventId)
  await deps.tarefaReuniao?.(slot.inicio, `Reunião on-line com ${nome} (marcada pela Anna). Meet: ${ev.link}`)
  return { acao: `agendou ${slot.chave}`, enviado: texto, leitura }
}

/** AÇÃO SDR (Dra., 09/11): encaminha, avisa o lead e pausa. null = lead fora das faixas de 10 mil ou mais. */
async function irParaAcaoSdr(ctx: Ctx, deps: Deps, providencia: string, texto: string, id: string, leitura: Leitura): Promise<Resultado | null> {
  if (!deps.encaminharAcaoSdr) return null
  const resumo = `${leitura.resumo || ctx.textoTurno.slice(0, 200)} · ${resumoLead(ctx.state)}`
  if (!(await deps.encaminharAcaoSdr(providencia, resumo))) return null
  const enviado = await dizer(ctx, deps, texto, { id })
  await deps.patch({ etapa: 'humano', etapaAntes: ctx.state.etapa, finalizado: { motivo: `AÇÃO SDR: ${providencia}`, em: ctx.agora.toISOString() } })
  return { acao: `AÇÃO SDR: ${providencia}`, enviado, leitura }
}

/**
 * DOCUMENTO NA QUALIFICAÇÃO (Dra., 09/11). Documento lido com segurança: a Anna confirma a renda bruta com o lead
 * antes de classificar (docPendente). Os descontos do contracheque nunca viram "desconto em conta corrente": esse
 * valor ela pergunta à parte. Documento que não abriu ou ilegível: AÇÃO SDR (faixas de 10 mil ou mais) ou pede os
 * valores por escrito. null = o fluxo normal segue (ex.: documento sem renda ou renda já informada).
 */
async function tratarDocumento(ctx: Ctx, deps: Deps, leitura: Leitura): Promise<Resultado | null> {
  const s = ctx.state
  const t = ctx.textoTurno
  leitura.desconto_conta = null // contracheque mostra consignado, não o débito na conta corrente
  const bruta = leitura.renda_bruta
  const liquida = leitura.renda_liquida
  const ilegivel = RX_DOC_FALHOU.test(t) || (bruta == null && /ileg[ií]ve(l|is)|n[aã]o (est[aá]|s[aã]o) leg[ií]ve|n[aã]o (d[aá]|foi poss[ií]vel) (para |de )?ler|desfocad|cortad/i.test(t))
  // renda já confirmada na conversa (caso Francisco, 11/11): o documento era só para um valor que falta. Não vai para
  // AÇÃO SDR; o card fica na coluna da renda e a Anna pede por escrito só o que falta
  if (ilegivel && s.rendaBruta != null) {
    const falta = PENDENTE.q2(s)
    if (!falta || !valoresQueFaltam(s).length) return null
    const enviado = await falar(ctx, deps, `Não consegui ver os valores com clareza na imagem. ${falta}`, 'q2', { id: 'livre' })
    return { acao: 'documento ilegível com a renda já confirmada: pediu por escrito só o que falta', enviado, leitura }
  }
  if (ilegivel) {
    const r = await irParaAcaoSdr(ctx, deps, 'o lead enviou um documento que a Anna não conseguiu ler; conferir o documento na conversa e registrar no card a renda bruta, o líquido e o desconto em conta corrente', TEXTOS.docEquipe, 'doc_equipe', leitura)
    if (r) return r
    await deps.patch({ etapa: 'q2' })
    const enviado = await falar(ctx, deps, TEXTOS.docIlegivel, 'q2', { id: 'doc_ilegivel' })
    return { acao: 'documento ilegível: pediu os valores por escrito', enviado, leitura }
  }
  if (bruta == null || s.rendaBruta != null) return null
  if (liquida != null && liquida > bruta) {
    const r = await irParaAcaoSdr(ctx, deps, `o documento do lead mostra líquido (${brl(liquida)}) maior que o bruto (${brl(bruta)}); conferir os valores com o lead`, TEXTOS.valoresEquipe, 'valores_equipe', leitura)
    if (r) return r
    await deps.patch({ etapa: 'q2' })
    const enviado = await falar(ctx, deps, TEXTOS.valoresConferir, 'q2', { id: 'valores_conferir' })
    return { acao: 'documento com valores contraditórios: pediu para conferir', enviado, leitura }
  }
  await deps.patch({ etapa: 'q2', docPendente: { rendaBruta: bruta, ...(liquida != null ? { rendaLiquida: liquida } : {}) } })
  const valores = liquida != null ? `${brl(bruta)} e o líquido de ${brl(liquida)}` : brl(bruta)
  const enviado = await falar(ctx, deps, TEXTOS.docConfirma(valores), 'q2', { id: 'doc_confirma', obrigatorio: [brl(bruta)] })
  return { acao: 'documento lido: confirmando a renda bruta com o lead', enviado, leitura }
}

/**
 * CANCELAMENTO, DESISTÊNCIA E REMARCAÇÃO (Dra., 09/11, caso Nayara). Reunião marcada pela Anna:
 *  - aceitou remarcar (mesmo sem horário) → cancela a reunião e o card vai NA HORA para SDR › AGENDAR REUNIÃO;
 *    com dia/período/hora oferece um horário; o agendamento confirmado leva para Reunião agendada (agendar());
 *  - não vai participar: cancela a reunião; sem motivo, pergunta o motivo; com imprevisto, oferece remarcar;
 *  - não quer mais: uma única tentativa de entender; se mantiver, respeita (Não quer continuar), sem insistir;
 *  - "depois eu entro em contato": cancela, uma mensagem de encerramento, card na coluna da renda.
 * A reunião cancelada sai da agenda Google, da tarefa do Kommo e dos lembretes. Devolve null quando a
 * mensagem não é sobre a reunião (o resto do fluxo decide).
 */
async function tratarCancelamento(ctx: Ctx, deps: Deps, leitura: Leitura): Promise<Resultado | null> {
  const s = ctx.state
  const etapa = s.etapa!
  const t = ctx.textoTurno
  const nome = ctx.primeiroNome || undefined
  const i = leitura.intencao
  const preferencia = !!(leitura.periodo || leitura.data_preferida || leitura.hora_preferida)
  // com a reunião marcada, dia/hora/período só valem como remarcação se forem DIFERENTES da reunião
  // ("confirmado, amanhã às 15h estarei lá" não cancela nada)
  const outraData = etapa !== 'agendado' || !s.reuniao ? preferencia : (() => {
    const ini = new Date(s.reuniao.inicio)
    const hhmm = ini.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
    return (!!leitura.data_preferida && leitura.data_preferida !== diaIso(ini))
      || (!!leitura.hora_preferida && leitura.hora_preferida !== hhmm)
      || (!!leitura.periodo && leitura.periodo !== periodoDoSlot({ chave: `${diaIso(ini)}T${hhmm}` }))
  })()
  const depois = RX_DEPOIS_CONTATO.test(t)
  // "não" no começo só é desistência quando a Anna perguntou se quer remarcar (não quando perguntou o motivo)
  const desiste = i === 'desiste' || ((etapa === 'remarcar_pergunta' || etapa === 'desistencia_pergunta') && RX_NAO.test(t) && !preferencia)
  const aceita = !depois && !desiste && (i === 'remarcar' || i === 'pede_reuniao'
    || (etapa === 'agendado' ? (i === 'escolhe_periodo' || i === 'recusa_horario' || i === 'cancela_reuniao') && outraData : (i === 'escolhe_periodo' || preferencia))
    || (etapa !== 'agendado' && etapa !== 'cancelou_motivo' && (i === 'aceita_horario' || RX_SIM.test(t))))
  const cancela = i === 'cancela_reuniao' || (etapa === 'agendado' && i === 'recusa_horario')

  if (etapa === 'agendado') {
    if (!(aceita || cancela || desiste || depois)) return null
    if (s.reuniao && deps.cancelarReuniao) {
      const motivo = depois ? 'o lead vai entrar em contato depois' : desiste ? 'o lead não quer mais a reunião' : aceita ? 'o lead pediu para remarcar' : 'o lead avisou que não vai participar'
      // a reunião sai do estado ANTES de limpar os campos: o webhook do campo vazio não pode apagar de novo
      await deps.patch({ reuniao: undefined, oferta: undefined })
      await deps.cancelarReuniao(s.reuniao, motivo)
    }
    await deps.patch({ reuniao: undefined, oferta: undefined })
  }

  if (depois) {
    await deps.cancelarRegua()
    const enviado = await dizer(ctx, deps, TEXTOS.comNome('depois_contato', nome), { id: 'depois_contato' })
    // sem a renda registrada, ACIMA DE 15 MIL: só recebe oferta de reunião quem passou dos R$ 15 mil
    await deps.mover(s.rendaBruta ? colunaPorRenda(s.rendaBruta) : STATUS.acima15, PIPELINES.sdr)
    await deps.nota('Anna: o lead prefere retomar depois. Reunião cancelada, sem novo agendamento e sem novas ofertas de horário.')
    await deps.patch({ etapa: 'humano', etapaAntes: 'agendado', remarcacao: undefined, finalizado: { motivo: 'retoma depois', em: ctx.agora.toISOString() } })
    return { acao: 'reunião cancelada: o lead vai entrar em contato depois', enviado, leitura }
  }
  if (desiste) {
    if (etapa === 'desistencia_pergunta') {
      // manteve a decisão: respeita, sem insistir
      await deps.cancelarRegua()
      const enviado = await dizer(ctx, deps, TEXTOS.desistiu, { id: 'desistiu' })
      await deps.mover(STATUS.naoQuerContinuar, PIPELINES.sdr)
      await deps.nota(`Anna: o lead manteve a decisão de não continuar. Reunião cancelada. ${leitura.resumo || ''}`.trim())
      await deps.patch({ etapa: 'humano', etapaAntes: 'agendado', remarcacao: undefined, finalizado: { motivo: 'desistiu da reunião', em: ctx.agora.toISOString() } })
      return { acao: 'desistiu da reunião: Não quer continuar', enviado, leitura }
    }
    const enviado = await dizer(ctx, deps, TEXTOS.comNome('desistencia_pergunta', nome), { id: 'desistencia_pergunta' })
    // reunião cancelada: o card não fica em Reunião agendada; desistência não vai para AGENDAR REUNIÃO (Dra., 09/11)
    if (etapa === 'agendado') await deps.mover(s.rendaBruta ? colunaPorRenda(s.rendaBruta) : STATUS.acima15, PIPELINES.sdr)
    await deps.patch({ etapa: 'desistencia_pergunta', remarcacao: true })
    return { acao: 'não quer mais a reunião: uma tentativa de entender', enviado, leitura }
  }
  if (aceita) {
    // aceitou remarcar: o card vai na hora para AGENDAR REUNIÃO, mesmo sem horário escolhido
    await deps.mover(STATUS.agendarReuniao, PIPELINES.sdr)
    await deps.nota('Anna: o lead quer remarcar a reunião. Card em AGENDAR REUNIÃO até o novo horário ser confirmado.')
    await deps.patch({ etapa: 'preferencia', remarcacao: true, recusas: 0, recusados: [], oferta: undefined })
    const ctxP = { ...ctx, state: { ...s, etapa: 'preferencia' as Etapa, remarcacao: true, recusas: 0, recusados: [] } }
    if (preferencia) {
      const hoje = diaIso(ctx.agora)
      const hora = leitura.hora_preferida && /^\d{2}:\d{2}$/.test(leitura.hora_preferida) ? leitura.hora_preferida : undefined
      const dia = leitura.data_preferida && leitura.data_preferida >= hoje ? leitura.data_preferida : hora ? hoje : proximoDiaUtil(hoje)
      return oferecer(ctxP, deps, { periodo: hora ? undefined : leitura.periodo || undefined, aPartirDoDia: dia, horaExata: hora, antecedenciaMin: AGENDA.antecedenciaConfirmacaoMin }, TEXTOS.novaOferta, 'nova_oferta')
    }
    if (/depois (eu )?vejo|vejo (o hor[aá]rio )?depois|ainda n[aã]o sei (o hor[aá]rio|quando)/i.test(t)) {
      const enviado = await dizer(ctx, deps, TEXTOS.comNome('remarcar_depois', nome), { id: 'remarcar_depois' })
      return { acao: 'aceitou remarcar, horário depois: AGENDAR REUNIÃO', enviado, leitura }
    }
    const enviado = await falar(ctxP, deps, TEXTOS.manhaOuTarde, 'preferencia', { id: 'manha_ou_tarde', obrigatorio: ['manhã', 'tarde'] })
    return { acao: 'aceitou remarcar: AGENDAR REUNIÃO, perguntou o período', enviado, leitura }
  }
  if (cancela || etapa === 'cancelou_motivo') {
    // a reunião foi cancelada e a Anna vai tentar remarcar: o card sai de Reunião agendada na hora e fica em
    // SDR › AGENDAR REUNIÃO, que é a situação real do lead (Dra., 09/11, caso Zizi Cris). Se ele desistir, sai de lá.
    if (etapa === 'agendado') {
      await deps.mover(STATUS.agendarReuniao, PIPELINES.sdr)
      await deps.nota('Anna: o lead não vai participar da reunião. Reunião cancelada e card em AGENDAR REUNIÃO enquanto a Anna tenta remarcar.')
      await deps.patch({ remarcacao: true })
    }
    // cancelou: com o motivo dito (ou respondendo ao "aconteceu algum imprevisto?"), oferece remarcar; sem motivo, pergunta
    if (etapa === 'agendado' && !RX_MOTIVO.test(t)) {
      const enviado = await dizer(ctx, deps, TEXTOS.comNome('cancelou_motivo', nome), { id: 'cancelou_motivo' })
      await deps.patch({ etapa: 'cancelou_motivo' })
      return { acao: 'cancelou a reunião sem motivo: perguntou o motivo', enviado, leitura }
    }
    if (RX_DUVIDA_REUNIAO.test(t)) {
      const enviado = await dizer(ctx, deps, TEXTOS.comNome('questiona_reuniao', nome), { id: 'questiona_reuniao' })
      await deps.patch({ etapa: 'remarcar_pergunta' })
      return { acao: 'duvidou da reunião: explicou e ofereceu remarcar', enviado, leitura }
    }
    const enviado = await dizer(ctx, deps, TEXTOS.comNome('remarcar_oferta', nome), { id: 'remarcar_oferta' })
    await deps.patch({ etapa: 'remarcar_pergunta' })
    return { acao: 'cancelou com imprevisto: ofereceu remarcar', enviado, leitura }
  }
  if (etapa !== 'agendado' && RX_DUVIDA_REUNIAO.test(t)) {
    const enviado = await dizer(ctx, deps, TEXTOS.comNome('questiona_reuniao', nome), { id: 'questiona_reuniao' })
    await deps.patch({ etapa: 'remarcar_pergunta' })
    return { acao: 'duvidou da reunião: explicou e ofereceu remarcar', enviado, leitura }
  }
  if (etapa === 'desistencia_pergunta') {
    // respondeu à tentativa: piorou ou continua igual → vale a avaliação; melhorou ou outro motivo → respeita
    if (leituraMemoria(t) && !/melhor/i.test(t)) {
      const enviado = await dizer(ctx, deps, TEXTOS.comNome('questiona_reuniao', nome), { id: 'questiona_reuniao' })
      await deps.patch({ etapa: 'remarcar_pergunta' })
      return { acao: 'desistência: a situação não melhorou, ofereceu remarcar', enviado, leitura }
    }
    await deps.cancelarRegua()
    const enviado = await dizer(ctx, deps, TEXTOS.desistiu, { id: 'desistiu' })
    await deps.mover(STATUS.naoQuerContinuar, PIPELINES.sdr)
    await deps.nota(`Anna: o lead não quis remarcar a reunião. Motivo: "${t.slice(0, 200)}"`)
    await deps.patch({ etapa: 'humano', etapaAntes: 'agendado', remarcacao: undefined, finalizado: { motivo: 'desistiu da reunião', em: ctx.agora.toISOString() } })
    return { acao: 'desistiu da reunião: Não quer continuar', enviado, leitura }
  }
  return null
}

/** Job da pausa de 15 min: a 5ª mensagem com o primeiro horário da sequência. */
export async function quintaMensagem(ctx: Ctx, deps: Deps, token: string): Promise<Resultado> {
  if (ctx.state.etapa !== 'analise' || ctx.state.msg5Token !== token) return { acao: 'msg5 cancelada (etapa mudou)' }
  return oferecer(ctx, deps, {}, TEXTOS.mensagem5, 'mensagem5')
}

/**
 * Retomada (anna-retomar) em que o histórico mostrou respostas que a Anna ainda não tinha usado (Dra., 10/11,
 * caso Gilse): ela segue de onde a conversa realmente parou, com a próxima pergunta, sem repetir nada.
 */
export async function continuarDeOndeParou(ctx: Ctx, deps: Deps): Promise<Resultado> {
  const s = ctx.state
  // renda lida do documento na retomada: confirma com o lead antes de classificar o card (Dra., 12/11, caso Ernane)
  if (s.docPendente?.rendaBruta != null) {
    const d = s.docPendente
    const valores = d.rendaLiquida != null ? `${brl(d.rendaBruta!)} e o líquido de ${brl(d.rendaLiquida)}` : brl(d.rendaBruta!)
    await deps.patch({ etapa: 'q2' })
    const enviado = await falar(ctx, deps, TEXTOS.docConfirma(valores), 'q2', { id: 'doc_confirma', obrigatorio: [brl(d.rendaBruta!)] })
    return { acao: 'retomada: documento lido, confirmando a renda bruta com o lead', enviado }
  }
  if (s.etapa === 'q1') {
    const temValor = s.rendaBruta != null || s.rendaLiquida != null || s.descontoConta != null
    const enviado = temValor
      ? await falar(ctx, deps, TEXTOS.q1SoOpcao, 'q1', { id: 'q1_so_opcao', obrigatorio: ['1', '2', '3'] })
      : await falar(ctx, deps, TEXTOS.pergunta1(ctx.primeiroNome, ctx.agora), 'q1', { id: 'pergunta1', obrigatorio: ['1', '2', '3'] })
    return { acao: `retomada: ${temValor ? 'valores no histórico, pediu só a opção' : '1ª pergunta'}`, enviado }
  }
  if (s.etapa === 'q2') {
    const f = valoresQueFaltam(s)
    if (!f.length) {
      await deps.patch({ etapa: 'limite' })
      const enviado = await falar(ctx, deps, TEXTOS.perguntaLimite, 'limite', { id: 'pergunta_limite', obrigatorio: ['CHEQUE ESPECIAL', 'CARTÃO DE CRÉDITO'] })
      return { acao: 'retomada: valores completos no histórico, pergunta do cheque especial e do cartão', enviado }
    }
    if (f.length === 3) {
      const enviado = await falar(ctx, deps, TEXTOS.pergunta2, 'q2', { id: 'pergunta2', obrigatorio: ['bruta', 'líquido', 'conta corrente'] })
      return { acao: 'retomada: opção no histórico, pergunta 2', enviado }
    }
    const enviado = await falar(ctx, deps, `Obrigada pelas informações! ${PENDENTE.q2(s)}`, 'q2', { id: 'q2_falta' })
    return { acao: `retomada: faltam ${f.length} valores`, enviado }
  }
  if (s.etapa === 'limite') {
    if (s.limite) {
      const desconto = s.descontoConta ?? null
      await deps.patch({ etapa: 'q3' })
      const enviado = await falar(ctx, deps, TEXTOS.mensagem3(desconto), 'q3', desconto && desconto > 0 ? { id: 'mensagem3' } : { id: 'mensagem3_sem_desconto' })
      return { acao: 'retomada: cheque especial já respondido, mensagem do alívio', enviado }
    }
    const enviado = await falar(ctx, deps, TEXTOS.perguntaLimite, 'limite', { id: 'pergunta_limite', obrigatorio: ['CHEQUE ESPECIAL', 'CARTÃO DE CRÉDITO'] })
    return { acao: 'retomada: pergunta do cheque especial e do cartão', enviado }
  }
  return { acao: `retomada: nada a perguntar na etapa ${s.etapa || '(nenhuma)'}` }
}

/**
 * Follow-up do horário oferecido pela EQUIPE (Dra., 10/11): 1 h depois da oferta, uma vez por oferta. Confere se o
 * horário ainda dá (antecedência e agenda livre); se não der, oferece outro. A reunião só é marcada quando o lead
 * confirmar (o turno da oferta trata a resposta).
 */
export async function followOfertaEquipe(ctx: Ctx, deps: Deps, chave: string): Promise<Resultado> {
  const s = ctx.state
  if (s.etapa !== 'oferta' || s.oferta?.chave !== chave || s.ofertaEquipe?.chave !== chave) return { acao: 'follow da oferta da equipe cancelado (a oferta mudou)' }
  if (s.ofertaEquipe.followEnviado) return { acao: 'follow da oferta da equipe já enviado' }
  // a última manifestação do lead depois da oferta vale (Dra., 10/11): "vou ver minha disponibilidade", "te respondo
  // amanhã" → o follow-up espera o momento que ele indicou; sem resposta nem compromisso de retorno, segue o previsto
  const depoisDaOferta = ctx.conversa.filter(m => m.dir === 'in' && m.ts > s.ofertaEquipe!.enviadaEm)
  const vaiResponder = [...depoisDaOferta].reverse().find(m => RX_RESPONDE_DEPOIS.test(m.text))
  if (vaiResponder) {
    const espera = esperaDoLead(vaiResponder.text, new Date(vaiResponder.ts))
    if (ctx.agora.getTime() < espera) return { acao: `follow da oferta da equipe adiado: o lead disse que responde depois ("${vaiResponder.text.slice(0, 60)}")`, reagendarPara: espera }
  }
  const ultima = ctx.conversa[ctx.conversa.length - 1]
  if (ultima?.dir === 'in' && ultima.ts > s.ofertaEquipe.enviadaEm && ultima !== vaiResponder) return { acao: 'follow da oferta da equipe não sai: o lead respondeu depois da oferta' }
  await deps.patch({ ofertaEquipe: { ...s.ofertaEquipe, followEnviado: true } })
  const slot = slotDaOferta(s.oferta)
  const noPrazo = slot.inicio.getTime() >= ctx.agora.getTime() + AGENDA.antecedenciaConfirmacaoMin * 60_000
  const livre = noPrazo && (await deps.agenda.disponivel()) && (deps.agenda.livre ? await deps.agenda.livre(slot) : true)
  if (livre) {
    const enviado = await falar(ctx, deps, TEXTOS.ofertaEquipeFollow, 'oferta', { id: 'oferta_equipe_follow' })
    return { acao: `follow da oferta da equipe (${chave}): horário ainda disponível`, enviado }
  }
  const r = await oferecer({ ...ctx, state: { ...s, recusados: [...(s.recusados || []), chave] } }, deps, {}, TEXTOS.ofertaEquipeOutro, 'oferta_equipe_outro')
  return { ...r, acao: `oferta da equipe (${chave}) não dá mais (${noPrazo ? 'agenda ocupada' : 'fora do prazo'}): ${r.acao}` }
}

/** Coluna pela renda CONFIRMADA na conversa; abaixo de 10 mil, com o motivo da desqualificação no card (Dra., 11/11). */
async function moverPelaRenda(deps: Deps, renda: number): Promise<void> {
  const coluna = colunaPorRenda(renda)
  await deps.mover(coluna, PIPELINES.sdr)
  if (coluna === STATUS.desqualificado) await deps.nota(`Anna: ${MOTIVO_DESQUALIFICADO.renda} Renda bruta confirmada na conversa: ${brl(renda)}.`)
}

/** Um turno do lead. */
export async function turno(ctx: Ctx, deps: Deps): Promise<Resultado> {
  const s = ctx.state
  const etapa = s.etapa
  if (!etapa) return abrir(ctx, deps)
  if (etapa === 'humano') return { acao: 'silêncio: atendimento com a equipe' }

  // "É robô?" pego em código: a Anna nunca nega nem confirma, passa para a equipe
  if (ehPerguntaRobo(ctx.textoTurno)) return humano(ctx, deps, 'perguntou se é robô', TEXTOS.passaHumano)

  // oferta vencida (o lead voltou depois do horário): não repete a data velha, busca um horário novo
  const ofertaVencida = !!s.oferta && new Date(s.oferta.inicio).getTime() < ctx.agora.getTime() + AGENDA.antecedenciaConfirmacaoMin * 60_000
  const quandoOfertado = s.oferta && !ofertaVencida ? quandoOferta(new Date(s.oferta.inicio), ctx.agora) : undefined
  const leitura = await deps.interpretar({
    etapa, pendente: PENDENTE[etapa](s, quandoOfertado), state: s, conversa: ctx.conversa, agora: ctx.agora, nomeContato: ctx.nomeContato,
  })

  // pediu atendimento presencial na qualificação: o texto da Dra. sobre como funciona (Dra., 06/11, caso Sirlei).
  // Só a insistência depois da explicação vai para a equipe (pede_humano)
  const semValores = leitura.renda_bruta == null && leitura.renda_liquida == null && leitura.desconto_conta == null && !leitura.opcao
  const jaExplicou = ctx.conversa.some(m => m.dir === 'out' && /presencial/i.test(m.text) && /gratuita/i.test(m.text))
  if (ETAPAS_QUALIFICACAO.has(etapa) && semValores && RX_PRESENCIAL.test(ctx.textoTurno) && !jaExplicou) {
    const enviado = await falar(ctx, deps, TEXTOS.comoFunciona, etapa, { id: 'como_funciona' })
    return { acao: 'pediu presencial: explicou como funciona o atendimento', enviado, leitura }
  }
  // perguntou de honorários / quanto custa na qualificação: o texto da Dra. (09/11), uma vez por conversa
  const jaFalouHonorarios = ctx.conversa.some(m => m.dir === 'out' && m.text.includes('preocupação com os honorários'))
  if (ETAPAS_QUALIFICACAO.has(etapa) && semValores && RX_HONORARIOS.test(ctx.textoTurno) && !jaFalouHonorarios) {
    const enviado = await falar(ctx, deps, TEXTOS.honorarios, etapa, { id: 'honorarios' })
    return { acao: 'perguntou de honorários: texto da Dra.', enviado, leitura }
  }

  // DOCUMENTO (contracheque, extrato) na qualificação (Dra., 09/11)
  if (ETAPAS_QUALIFICACAO.has(etapa) && (RX_DOC_LIDO.test(ctx.textoTurno) || RX_DOC_FALHOU.test(ctx.textoTurno))) {
    const r = await tratarDocumento(ctx, deps, leitura)
    if (r) return r
  }

  // "Com quem eu falo?" (Dra., 10/11): a Anna se identifica e responde só isso, sem informação que não foi pedida.
  // Na 2ª pergunta, se o lead disse que manda os valores depois (agora ou na mensagem anterior), lista o que falta
  // sem cobrar agora e espera; os follow-ups só saem depois do momento que ele indicou
  if (ETAPAS_QUALIFICACAO.has(etapa) && RX_IDENTIDADE.test(ctx.textoTurno) && !temValores(leitura) && !leitura.opcao) {
    const recentes = ctx.conversa.filter(m => m.dir === 'in').slice(-3).map(m => m.text).join('\n')
    const ultimaAnna = [...ctx.conversa].reverse().find(m => m.dir === 'out')?.text || ''
    if (etapa === 'q2' && disseQueMandaDepois(recentes) && /Aguardo seu retorno|Fico aguardando|pode me encaminhar por aqui/i.test(ultimaAnna)) {
      // a Anna já disse que aguarda: só a identificação, sem repetir a lista nem cobrar
      const enviado = await falar(ctx, deps, TEXTOS.identidade, 'q2', { id: 'identidade', baseRegua: baseParaEspera(esperaDoLead(recentes, ctx.agora)) })
      return { acao: 'q2: perguntou com quem fala (já tinha dito que manda depois); só se identificou', enviado, leitura }
    }
    if (etapa === 'q2' && disseQueMandaDepois(recentes)) {
      const texto = `${TEXTOS.identidade.replace(/\s*😊\s*$/u, '')}\n\n${listaDoQueFalta(s)}`
      const enviado = await falar(ctx, deps, texto, 'q2', { id: 'valores_depois', baseRegua: baseParaEspera(esperaDoLead(recentes, ctx.agora)) })
      return { acao: 'q2: perguntou com quem fala e vai mandar os valores depois; identificou-se, listou o que falta e aguarda', enviado, leitura }
    }
    const enviado = await falar(ctx, deps, compor(TEXTOS.identidade, PENDENTE[etapa](s)), etapa, { id: 'identidade' })
    return { acao: 'perguntou com quem fala: identificou-se', enviado, leitura }
  }

  // na oferta, "outro dia ou horário" é preferência, não remarcação de reunião marcada
  if ((etapa === 'oferta' || etapa === 'preferencia') && leitura.intencao === 'remarcar') leitura.intencao = 'escolhe_periodo'

  // reunião marcada pela Anna: o lead cancela, desiste ou quer remarcar (Dra., 09/11, caso Nayara).
  // Em "agendado" o card está no Closer: fora disso a Anna não conversa (quem conversa é a equipe)
  if (ETAPAS_REUNIAO.has(etapa)) {
    const r = await tratarCancelamento(ctx, deps, leitura)
    if (r) return r
    if (etapa === 'agendado') return { acao: 'agendado: nada sobre a reunião, a equipe conduz', leitura }
  }

  switch (leitura.intencao) {
    case 'pergunta_se_robo': return humano(ctx, deps, 'perguntou se é robô', TEXTOS.passaHumano, leitura)
    case 'pede_humano': {
      // fora da qualificação, o primeiro pedido de presencial é respondido pela resposta livre; só a insistência vai para a equipe
      if (RX_PRESENCIAL.test(ctx.textoTurno) && !jaExplicou && leitura.resposta) { leitura.intencao = 'pergunta'; break }
      return humano(ctx, deps, 'pediu atendimento humano', TEXTOS.passaHumano, leitura)
    }
    case 'tem_advogado': return humano(ctx, deps, 'já tem advogado no caso', TEXTOS.possuiAdvogado, leitura, 'possui_advogado')
    case 'ja_e_cliente': return humano(ctx, deps, 'já é cliente', TEXTOS.passaHumano, leitura)
    case 'quer_contratar': {
      // Dra., 22/10: prioridade comercial máxima. Sem pergunta e sem mensagem: Closer › Retorno imediato + tarefa prioritária
      const resumo = `${leitura.resumo || ctx.textoTurno.slice(0, 200)} · ${resumoLead(ctx.state)}`
      await deps.cancelarRegua()
      await deps.passarParaHumano('Lead deseja contratar — retorno imediato', resumo, true)
      await deps.mover(STATUS.retornoImediato, PIPELINES.closer)
      await deps.patch({ etapa: 'humano', etapaAntes: ctx.state.etapa, finalizado: { motivo: 'quer contratar', em: ctx.agora.toISOString() } })
      return { acao: 'passou para humano: quer contratar', leitura, resumo }
    }
    case 'outro_assunto': return humano(ctx, deps, 'assunto de outra área', TEXTOS.passaHumano, leitura)
    case 'remarcar': return humano(ctx, deps, 'pediu para remarcar', TEXTOS.passaHumano, leitura)
    case 'desiste': {
      await deps.cancelarRegua()
      const enviado = await dizer(ctx, deps, TEXTOS.desistiu, { id: 'desistiu' })
      await deps.mover(STATUS.naoQuerContinuar, PIPELINES.sdr)
      await deps.nota(`Anna: o lead disse que não quer continuar. ${leitura.resumo}`)
      await deps.patch({ etapa: 'humano', finalizado: { motivo: 'desistiu', em: ctx.agora.toISOString() } })
      return { acao: 'lead desistiu: movido para Não quer continuar', enviado, leitura }
    }
  }

  // Pergunta fora do roteiro: responde e volta para a pergunta pendente (a régua recomeça)
  const responderLivre = async (e: Etapa = etapa, st: LeadState = s): Promise<Resultado | null> => {
    if (!leitura.resposta) return null
    const texto = compor(leitura.resposta, PENDENTE[e](st, quandoOfertado))
    const enviado = await falar(ctx, deps, texto, e, { id: 'livre', obrigatorio: e === 'oferta' ? [quandoOfertado || ''] : [] })
    return { acao: `respondeu fora do roteiro (${leitura.intencao})`, enviado, leitura }
  }

  // resposta do lead recorrente à mensagem da Dra. ("piorou", "continua igual"): retoma de onde parou,
  // com a pergunta da etapa; se ele já mandou valores ou escolheu a opção, segue o roteiro normal (Dra., 06/11)
  if (s.recorrentePendente) {
    await deps.patch({ recorrentePendente: false })
    const deuDado = leitura.opcao || leitura.renda_bruta != null || leitura.renda_liquida != null || leitura.desconto_conta != null
    if (!deuDado && leituraMemoria(ctx.textoTurno) && PENDENTE[etapa](s)) {
      const enviado = await falar(ctx, deps, `${TEXTOS.recorrenteRetoma(ctx.primeiroNome || undefined)}\n\n${PENDENTE[etapa](s)}`, etapa, { id: 'recorrente_retoma' })
      return { acao: 'recorrente respondeu: retomou de onde parou', enviado, leitura }
    }
  }

  // 2ª pergunta (renda bruta, líquido, desconto em conta). veioDaQ1: o lead escolheu a opção agora e já tinha mandado valores
  const etapaQ2 = async (s: LeadState, veioDaQ1 = false): Promise<Resultado> => {
    // resposta à confirmação dos valores lidos no documento (Dra., 09/11)
    if (s.docPendente) {
      const doc = s.docPendente
      await deps.patch({ docPendente: undefined })
      // a IA relê o documento do histórico: só vale como valor digitado o que tem número NESTA mensagem
      const digitou = /\d/.test(ctx.textoTurno) && (leitura.renda_bruta != null || leitura.renda_liquida != null)
      if (!digitou && RX_CONFIRMA.test(ctx.textoTurno) && !RX_NAO.test(ctx.textoTurno)) {
        leitura.renda_bruta = doc.rendaBruta ?? null
        leitura.renda_liquida = doc.rendaLiquida ?? null
      } else if (!digitou) {
        // não confirmou (ou não deu para saber): pede os valores por escrito, sem usar os do documento
        const enviado = await falar(ctx, deps, `Sem problemas. ${PENDENTE.q2(s)}`, 'q2', { id: 'livre' })
        return { acao: 'documento: o lead não confirmou os valores, pediu por escrito', enviado, leitura }
      }
    }
    const patch: Partial<LeadState> = {}
    const campos: Record<number, number> = {}
    const disse = { rendaBruta: leitura.renda_bruta, rendaLiquida: leitura.renda_liquida, descontoConta: leitura.desconto_conta }
    // valores contraditórios digitados (líquido maior que o bruto): AÇÃO SDR ou pede para conferir (Dra., 09/11)
    const brutaN = disse.rendaBruta ?? s.rendaBruta
    const liquidaN = disse.rendaLiquida ?? s.rendaLiquida
    if (brutaN != null && liquidaN != null && liquidaN > brutaN && (disse.rendaBruta != null || disse.rendaLiquida != null)) {
      const r = await irParaAcaoSdr(ctx, deps, `valores contraditórios: líquido ${brl(liquidaN)} maior que o bruto ${brl(brutaN)}; conferir com o lead`, TEXTOS.valoresEquipe, 'valores_equipe', leitura)
      if (r) return r
      const enviado = await falar(ctx, deps, TEXTOS.valoresConferir, 'q2', { id: 'valores_conferir' })
      return { acao: 'valores contraditórios: pediu para conferir', enviado, leitura }
    }
    if (s.memoriaPendente) {
      // resposta ao "melhorou, piorou ou continua igual?": igual reaproveita os valores registrados;
      // mudou (ou não deu para saber) pede os valores de hoje. Números ditos agora sempre valem.
      const deuValor = disse.rendaBruta != null || disse.rendaLiquida != null || disse.descontoConta != null
      const r = leituraMemoria(ctx.textoTurno)
      patch.memoriaPendente = false
      if (r === 'igual' && s.memoria) {
        disse.rendaBruta ??= s.memoria.rendaBruta ?? null
        disse.rendaLiquida ??= s.memoria.rendaLiquida ?? null
        disse.descontoConta ??= s.memoria.descontoConta ?? null
      } else if (!deuValor) {
        if (leitura.intencao === 'pergunta' && leitura.resposta) {
          const livre = await responderLivre('q2', s)
          if (livre) return livre
        }
        await deps.patch(patch)
        // depois de "piorou", o "Ótimo!" do início da pergunta 2 soa mal: vira "Entendi."
        const texto = TEXTOS.pergunta2.replace(/^\s*\*?Ótimo!\*?/, 'Entendi.')
        const enviado = await falar(ctx, deps, texto, 'q2', { id: 'pergunta2', obrigatorio: ['bruta', 'líquido', 'conta corrente'] })
        return { acao: `memória: situação ${r === 'mudou' ? 'mudou' : 'sem resposta clara'}, pergunta 2`, enviado, leitura }
      }
    }
    if (disse.rendaBruta != null && s.rendaBruta == null) { patch.rendaBruta = disse.rendaBruta; campos[CRM_MAP.campos.rendaBruta] = disse.rendaBruta }
    if (disse.rendaLiquida != null && s.rendaLiquida == null) { patch.rendaLiquida = disse.rendaLiquida; campos[CRM_MAP.campos.rendaLiquida] = disse.rendaLiquida }
    if (disse.descontoConta != null && s.descontoConta == null) { patch.descontoConta = disse.descontoConta; campos[CRM_MAP.campos.descontoConta] = disse.descontoConta }
    const novo = { ...s, ...patch }
    if (Object.keys(campos).length) await deps.salvarCampos(campos)
    if (patch.rendaBruta != null) await moverPelaRenda(deps, patch.rendaBruta)
    if (Object.keys(patch).length) await deps.patch(patch)

    const faltando = [
      novo.rendaBruta == null ? ['a sua renda bruta mensal', 'bruta'] : null,
      novo.rendaLiquida == null ? ['quanto você recebe líquido', 'líquido'] : null,
      novo.descontoConta == null ? ['quanto o banco desconta da sua conta corrente por mês', 'conta corrente'] : null,
    ].filter((x): x is string[] => !!x)
    const faltam = faltando.map(f => f[0])
    if (!faltam.length && !novo.objetivo) {
      // os valores vieram antes da opção (documento na retomada, conversa com a equipe): pede só a opção
      await deps.patch({ etapa: 'q1' })
      const enviado = await falar(ctx, deps, TEXTOS.q1SoOpcao, 'q1', { id: 'q1_so_opcao', obrigatorio: ['1', '2', '3'] })
      return { acao: 'q2 completa sem a opção: pediu só a opção', enviado, leitura }
    }
    if (!faltam.length) {
      // Dra., 27/10: antes da mensagem do alívio, cheque especial e cartão de crédito
      await deps.patch({ etapa: 'limite' })
      const enviado = await falar(ctx, deps, TEXTOS.perguntaLimite, 'limite', { id: 'pergunta_limite', obrigatorio: ['CHEQUE ESPECIAL', 'CARTÃO DE CRÉDITO'] })
      return { acao: 'q2 completa: pergunta do cheque especial e do cartão', enviado, leitura }
    }
    // veio da 1ª pergunta com valores já guardados: conta como "já recebeu" (a Anna só pede o que falta)
    const recebeuValor = Object.keys(campos).length > 0 || veioDaQ1
    // Dra., 27/10: "vou ver e depois te mando" → a mensagem dela sobre a importância dos valores (a régua segue)
    // a mensagem do "aguardo" termina em "Combinado?": um "combinado"/"ok" não pede resposta (a régua segue)
    const ultimaAnna = [...ctx.conversa].reverse().find(m => m.dir === 'out')?.text || ''
    if (!recebeuValor && ultimaAnna.includes('Aguardo seu retorno') && RX_OK.test(ctx.textoTurno)) {
      return { acao: 'q2: o lead confirmou que manda os valores depois; aguardando', leitura }
    }
    if (!recebeuValor && vaiMandarDepois(ctx.textoTurno)) {
      const enviado = await falar(ctx, deps, TEXTOS.aguardoValores, 'q2', { id: 'aguardo_valores', obrigatorio: ['SUSPENDER'], baseRegua: baseParaEspera(esperaDoLead(ctx.textoTurno, ctx.agora)) })
      return { acao: 'q2: o lead vai mandar os valores depois', enviado, leitura }
    }
    // vai mandar depois E perguntou algo (Dra., 10/11): responde só o que foi perguntado e espera, sem cobrar os valores agora
    if (!recebeuValor && disseQueMandaDepois(ctx.textoTurno) && leitura.resposta) {
      const enviado = await falar(ctx, deps, `${leitura.resposta.trim()}\n\n${TEXTOS.aguardoCurto}`, 'q2', { id: 'aguardo_curto', baseRegua: baseParaEspera(esperaDoLead(ctx.textoTurno, ctx.agora)) })
      return { acao: `q2: respondeu (${leitura.intencao}) e aguarda os valores, que o lead manda depois`, enviado, leitura }
    }
    if (!recebeuValor) {
      const livre = await responderLivre('q2', s)
      if (livre) return livre
    }
    const lista = faltam.length === 1 ? faltam[0] : `${faltam.slice(0, -1).join(', ')} e ${faltam[faltam.length - 1]}`
    const texto = recebeuValor
      ? `Obrigada. Falta só ${lista}. Pode me informar?`
      : `Para eu fazer a análise inicial, preciso saber ${lista}. Pode me informar?`
    const enviado = await falar(ctx, deps, texto, 'q2', { id: 'q2_falta', obrigatorio: faltando.map(f => f[1]) })
    return { acao: `q2 incompleta (faltam ${faltam.length})`, enviado, leitura }
  
  }

  switch (etapa) {
    case 'q1': {
      // a opção que o lead já respondeu antes (o "3" que ficou sem resposta, caso Gilse 09/11) vale: nunca pergunta de novo
      const opcao = leitura.opcao || opcaoNoHistorico(ctx.conversa)
      if (!opcao && temValores(leitura)) {
        // mandou os valores antes de escolher a opção (Gilse, 10/11): a Anna guarda os valores e pede só a opção
        const patch: Partial<LeadState> = {}
        const campos: Record<number, number> = {}
        if (leitura.renda_bruta != null && s.rendaBruta == null) { patch.rendaBruta = leitura.renda_bruta; campos[CRM_MAP.campos.rendaBruta] = leitura.renda_bruta }
        if (leitura.renda_liquida != null && s.rendaLiquida == null) { patch.rendaLiquida = leitura.renda_liquida; campos[CRM_MAP.campos.rendaLiquida] = leitura.renda_liquida }
        if (leitura.desconto_conta != null && s.descontoConta == null) { patch.descontoConta = leitura.desconto_conta; campos[CRM_MAP.campos.descontoConta] = leitura.desconto_conta }
        if (Object.keys(campos).length) await deps.salvarCampos(campos)
        if (patch.rendaBruta != null) await moverPelaRenda(deps, patch.rendaBruta)
        if (Object.keys(patch).length) await deps.patch(patch)
        const enviado = await falar(ctx, deps, TEXTOS.q1SoOpcao, 'q1', { id: 'q1_so_opcao', obrigatorio: ['1', '2', '3'] })
        return { acao: 'q1: mandou os valores antes da opção; guardou os valores e pediu só a opção', enviado, leitura }
      }
      if (opcao) {
        await deps.patch({ objetivo: opcao })
        await deps.salvarCampos({ [CRM_MAP.campos.objetivo]: String(opcao) })
        // valores já ditos (agora, antes da opção, ou registrados no card): segue a 2ª pergunta pedindo só o que falta
        const sQ2: LeadState = { ...s, objetivo: opcao, etapa: 'q2' }
        const jaTinha = s.rendaBruta != null || s.rendaLiquida != null || s.descontoConta != null
        if (jaTinha || temValores(leitura)) {
          await deps.patch({ etapa: 'q2' })
          const r = await etapaQ2(sQ2, jaTinha)
          return { ...r, acao: `opção ${opcao}${leitura.opcao ? '' : ' (do histórico)'} · ${r.acao}` }
        }
        // memória: já informou os valores antes → confirma se a situação mudou, em vez de perguntar tudo de novo
        const mem = deps.memoria ? await deps.memoria().catch(() => null) : null
        if (mem && valoresTexto(mem)) {
          const enviado = await falar(ctx, deps, TEXTOS.memoriaConfirma(mem.quando, valoresTexto(mem)), 'q2', { id: 'memoria_confirma', obrigatorio: ['melhorou', 'igual'] })
          await deps.patch({ etapa: 'q2', memoria: mem, memoriaPendente: true })
          return { acao: `opção ${opcao}: memória (valores de ${mem.quando})`, enviado, leitura }
        }
        const enviado = await falar(ctx, deps, TEXTOS.pergunta2, 'q2', { id: 'pergunta2', obrigatorio: ['bruta', 'líquido', 'conta corrente'] })
        await deps.patch({ etapa: 'q2' })
        return { acao: `opção ${opcao}: pergunta 2`, enviado, leitura }
      }
      // Dra., 05/11: o lead volta com "oi", "sim", "bom dia"… → reapresenta a 1ª pergunta inteira, sem presumir nada
      const ultimaAnna = [...ctx.conversa].reverse().find(m => m.dir === 'out')?.text || ''
      if (RX_GENERICO.test(ctx.textoTurno) && !ultimaAnna.includes('Imagine poder respirar')) {
        const enviado = await falar(ctx, deps, TEXTOS.pergunta1(ctx.primeiroNome, ctx.agora), 'q1', { id: 'pergunta1', obrigatorio: ['1', '2', '3'] })
        return { acao: 'q1: resposta genérica, reapresentou a 1ª pergunta', enviado, leitura }
      }
      const livre = await responderLivre()
      if (livre) return livre
      const enviado = await falar(ctx, deps, 'Pode me responder com o número da opção: 1, 2 ou 3?', 'q1', { id: 'q1_numero' })
      return { acao: 'q1 sem opção: pediu o número', enviado, leitura }
    }

    case 'q2': return etapaQ2(s)

    case 'limite': {
      if (leitura.intencao === 'pergunta') {
        const livre = await responderLivre()
        if (livre) return livre
      }
      const limite = ctx.textoTurno.trim().slice(0, 300)
      const desconto = s.descontoConta ?? null
      await deps.patch({ etapa: 'q3', limite })
      await deps.nota(`Anna: cheque especial e cartão de crédito, resposta do lead: "${limite}"`)
      const enviado = await falar(ctx, deps, TEXTOS.mensagem3(desconto), 'q3', desconto && desconto > 0 ? { id: 'mensagem3' } : { id: 'mensagem3_sem_desconto' })
      return { acao: 'limite respondido: mensagem do alívio', enviado, leitura }
    }

    case 'q3': {
      if (leitura.intencao === 'pergunta') {
        const livre = await responderLivre()
        if (livre) return livre
      }
      await deps.cancelarRegua()
      if (!((s.rendaBruta ?? 0) > RENDA_OFERTA_REUNIAO) && (s.rendaBruta ?? 0) >= RENDA_MINIMA) {
        // Dra., 06/11: não é desqualificado; encerramento provisório, tarefa para a equipe avaliar e dar o retorno
        const enviado = await dizer(ctx, deps, TEXTOS.encaminha1015(ctx.primeiroNome || undefined), { id: 'encaminha_10_15' })
        await deps.addTags([CRM_MAP.tags.semReuniao])
        await deps.nota(`Anna encaminhou o caso para a equipe avaliar (renda de R$ 10 a 15 mil). ${resumoLead(s)}`)
        await deps.tarefa(`Avaliar a possibilidade de atendimento (renda de R$ 10 a 15 mil) e dar ao lead o retorno prometido pela Anna. ${resumoLead(s)}`)
        await deps.patch({ etapa: 'sem_reuniao', aguardaAvaliacao: true })
        return { acao: 'renda de 10 a 15 mil: encerramento provisório, tarefa para a equipe', enviado, leitura }
      }
      if (!((s.rendaBruta ?? 0) > RENDA_OFERTA_REUNIAO)) {
        const enviado = await dizer(ctx, deps, TEXTOS.semReuniao, { id: 'sem_reuniao' })
        // Dra., 15/10: só a tag e o card na coluna da renda. Sem tarefa, sem mover, sem Venda perdida.
        await deps.addTags([CRM_MAP.tags.semReuniao])
        await deps.patch({ etapa: 'sem_reuniao' })
        return { acao: 'renda até 15 mil: tag, card na coluna da renda', enviado, leitura }
      }
      const token = deps.novoToken()
      const enviado = await dizer(ctx, deps, TEXTOS.mensagem4, { id: 'mensagem4', obrigatorio: ['Dra. Carolina'] })
      await deps.nota(`Anna encaminhou o caso para a Dra. Carolina. ${resumoLead(s)}`)
      await deps.patch({ etapa: 'analise', msg5Token: token })
      await deps.agendarMsg5(token, ctx.agora.getTime() + PAUSA_ANALISE_MS)
      return { acao: 'mensagem 4: pausa de 15 min', enviado, leitura }
    }

    case 'analise': {
      // A Anna disse que volta em alguns minutos: só responde se o lead perguntou algo
      if (leitura.intencao === 'pergunta' && leitura.resposta) {
        await deps.enviar(leitura.resposta)
        return { acao: 'respondeu durante a pausa', enviado: leitura.resposta, leitura }
      }
      return { acao: 'silêncio: aguardando a pausa de 15 min', leitura }
    }

    case 'oferta':
    case 'preferencia': {
      const horaPedida = leitura.hora_preferida && /^\d{2}:\d{2}$/.test(leitura.hora_preferida) ? leitura.hora_preferida : undefined
      // aceitou, mas com outra hora ("Deixa 11 mesmo, pode agendar às 11", Sirlei 05/11): vale a hora que ele disse
      if (etapa === 'oferta' && leitura.intencao === 'aceita_horario' && s.oferta && horaPedida && horaPedida !== s.oferta.chave.slice(11, 16)) {
        const dia = leitura.data_preferida && leitura.data_preferida >= diaIso(ctx.agora) ? leitura.data_preferida : s.oferta.chave.slice(0, 10)
        const excluir = (s.recusados || []).filter(c => c !== `${dia}T${horaPedida}`)
        const pedido = await deps.agenda.buscar({ aPartirDoDia: dia, horaExata: horaPedida, antecedenciaMin: AGENDA.antecedenciaConfirmacaoMin, mesmoDia: false, excluir })
        if (pedido && pedido.chave === `${dia}T${horaPedida}`) {
          await deps.agenda.reservar(pedido)
          await deps.patch({ recusados: excluir })
          return agendar(ctx, deps, pedido, leitura)
        }
        return oferecer({ ...ctx, state: { ...s, recusados: excluir } }, deps, { aPartirDoDia: dia, horaExata: horaPedida, antecedenciaMin: AGENDA.antecedenciaConfirmacaoMin }, TEXTOS.novaOferta, 'nova_oferta')
      }
      if (etapa === 'oferta' && leitura.intencao === 'aceita_horario' && s.oferta) {
        const slot = slotDaOferta(s.oferta)
        // aceite de um horário já oferecido vale até 30 min antes (Dra., 05/11); mais em cima que isso, oferece outro
        if (slot.inicio.getTime() < ctx.agora.getTime() + AGENDA.antecedenciaConfirmacaoMin * 60_000) return oferecer(ctx, deps, {}, TEXTOS.novaOferta, 'nova_oferta')
        return agendar(ctx, deps, slot, leitura)
      }
      // Dra., 05/11: a preferência que o lead diz vale mais que a sequência; recusou sem dizer quando →
      // 1ª vez, uma alternativa no outro período; 2ª vez, pergunta o período; depois disso, a equipe assume
      const recusou = leitura.intencao === 'recusa_horario' || leitura.intencao === 'escolhe_periodo' || !!(leitura.periodo || leitura.data_preferida || leitura.hora_preferida)
      const recusados = recusou && etapa === 'oferta' && s.oferta ? [...(s.recusados || []), s.oferta.chave] : (s.recusados || [])
      if (recusados !== s.recusados) await deps.patch({ recusados })
      const ctxR = { ...ctx, state: { ...s, recusados } }
      const hoje = diaIso(ctx.agora)
      const hora = leitura.hora_preferida && /^\d{2}:\d{2}$/.test(leitura.hora_preferida) ? leitura.hora_preferida : undefined
      if (leitura.periodo || leitura.data_preferida || hora) {
        // remarcação: prioriza o próximo dia útil (Dra., 09/11)
        const dia = leitura.data_preferida && leitura.data_preferida >= hoje ? leitura.data_preferida : hora ? hoje : s.remarcacao ? proximoDiaUtil(hoje) : undefined
        // pedido do próprio lead com dia ou hora: mínimo de 30 min; só o período: a regra da oferta (1 h)
        const antecedenciaMin = dia || hora ? AGENDA.antecedenciaConfirmacaoMin : undefined
        // o lead pediu exatamente um horário que já tinha recusado ("deixa 11 mesmo"): ele volta a valer
        const ctxP = dia && hora ? { ...ctxR, state: { ...ctxR.state, recusados: recusados.filter(c => c !== `${dia}T${hora}`) } } : ctxR
        return oferecer(ctxP, deps, { periodo: hora ? undefined : leitura.periodo || undefined, aPartirDoDia: dia, horaExata: hora, antecedenciaMin }, TEXTOS.novaOferta, 'nova_oferta')
      }
      if (leitura.intencao === 'recusa_horario' || (etapa === 'oferta' && leitura.intencao === 'escolhe_periodo')) {
        const n = (s.recusas || 0) + 1
        await deps.patch({ recusas: n })
        if (n === 1 && s.oferta) {
          const recusado = slotDaOferta(s.oferta)
          return oferecer(ctxR, deps, { periodo: periodoDoSlot(recusado) === 'manha' ? 'tarde' : 'manha', aPartirDoDia: diaIso(recusado.inicio) }, TEXTOS.novaOferta, 'nova_oferta')
        }
        if (n === 2) {
          await deps.patch({ etapa: 'preferencia' })
          const enviado = await falar(ctx, deps, TEXTOS.manhaOuTarde, 'preferencia', { id: 'manha_ou_tarde', obrigatorio: ['manhã', 'tarde'] })
          return { acao: 'recusou de novo: perguntou o período', enviado, leitura }
        }
        return humano(ctx, deps, `recusou ${n - 1} horários oferecidos`, TEXTOS.semAgenda, leitura, 'sem_agenda')
      }
      if (etapa === 'oferta' && ofertaVencida && !leitura.resposta) return oferecer(ctx, deps, {}, TEXTOS.novaOferta, 'nova_oferta')
      const livre = await responderLivre()
      if (livre) return livre
      const enviado = etapa === 'oferta'
        ? await falar(ctx, deps, PENDENTE.oferta(s, quandoOfertado), etapa, { id: 'oferta_pendente', obrigatorio: [quandoOfertado || ''] })
        : await falar(ctx, deps, TEXTOS.manhaOuTarde, etapa, { id: 'manha_ou_tarde', obrigatorio: ['manhã', 'tarde'] })
      return { acao: `${etapa}: repetiu a pergunta`, enviado, leitura }
    }

    case 'agendado':
    case 'sem_reuniao': {
      if (etapa === 'sem_reuniao' && leitura.intencao === 'pede_reuniao') return humano(ctx, deps, 'renda até 15 mil pediu reunião', TEXTOS.passaHumano, leitura)
      // caso em avaliação (10 a 15 mil): o que o lead escreve fica no card para a equipe ver
      if (etapa === 'sem_reuniao' && s.aguardaAvaliacao && ctx.textoTurno.trim().length > 15) {
        await deps.nota(`Lead escreveu enquanto aguarda a avaliação da equipe: "${ctx.textoTurno.slice(0, 300)}"`)
      }
      if (leitura.resposta) {
        await deps.enviar(leitura.resposta)
        return { acao: `${etapa}: respondeu`, enviado: leitura.resposta, leitura }
      }
      return { acao: `${etapa}: sem resposta necessária`, leitura }
    }
  }
  return { acao: 'nada a fazer', leitura }
}
