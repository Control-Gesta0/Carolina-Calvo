import { colunaPorRenda, CRM_MAP, PIPELINES, STATUS } from '../crm-map'
import type { Regua } from '../followup'
import type { ChatMsg } from '../history'
import type { Etapa, LeadState, Oferta } from '../state'
import { AGENDA, periodoDoSlot, diaIso, primeiraMaiuscula, proximoDiaUtil, quandoExtenso, quandoOferta, type Periodo, type Slot } from './agenda'
import { compor, ehPerguntaRobo, PENDENTE, type Entrada, type Leitura } from './interprete'
import type { Redacao } from './redator'
import { brl, TEXTOS } from './textos'
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
const RX_DEPOIS = /\b(depois|mais tarde|amanh[aã]|daqui a pouco|j[aá] te (mando|passo|envio)|assim que|mandarei|enviarei|passarei|na (segunda|ter[cç]a|quarta|quinta|sexta)(-feira)?|no (s[aá]bado|domingo|fim de semana)|semana que vem|pr[oó]xima semana|outro dia)\b|vou (ver|verificar|olhar|conferir|pegar|procurar|consultar)|preciso (ver|verificar|olhar|conferir|pegar|procurar|consultar)|n[aã]o (sei|lembro) (de cabe[cç]a|agora|no momento)|n[aã]o tenho (aqui|agora|em m[aã]os)/i
/** Só uma confirmação ("combinado", "ok", "tá bom"…), sem mais nada. Puro. */
export const RX_OK = /^\s*(combinado|ok(ay)?|t[aá]( bom| certo)?|certo|beleza|blz|pode deixar|sim|perfeito|fechado|show|claro|👍+|obrigad[oa]|vou mandar|mando sim)[\s.!,]*(obrigad[oa])?[\s.!]*$/i
/** Só um cumprimento ou resposta genérica ("oi", "sim", "bom dia", "tudo bem?"). Puro. */
export const RX_GENERICO = /^\s*(oi+|ol[aá]|opa|e a[ií]|sim|ok(ay)?|certo|claro|pode ser|quero|tenho interesse|bom dia|boa tarde|boa noite|tudo bem\??|tudo bom\??|oi,? tudo bem\??|ol[aá],? (bom dia|boa tarde|boa noite))[\s.!,]*$/i
export const vaiMandarDepois = (texto: string) => RX_DEPOIS.test(texto || '') && !/\?/.test(texto || '')

/** Só acima disto a Anna oferece reunião (regra da Dra., 15/10/2026: renda bruta acima de R$ 15 mil). */
export const RENDA_OFERTA_REUNIAO = 15000
/** abaixo disso: Desqualificado (Dra., 03/11) */
export const RENDA_MINIMA = 10000
/** pedido de atendimento presencial */
const ETAPAS_QUALIFICACAO = new Set<string>(['q1', 'q2', 'limite', 'q3'])
/** reunião marcada e o caminho do cancelamento (Dra., 09/11) */
export const ETAPAS_REUNIAO = new Set<string>(['agendado', 'cancelou_motivo', 'remarcar_pergunta', 'desistencia_pergunta'])
/** "depois eu entro em contato", "vou deixar para outra ocasião" */
export const RX_DEPOIS_CONTATO = /depois (eu )?(entro em contato|te procuro|procuro voc[eê]s|falo com voc[eê]s|retorno|chamo)|vou deixar para (outra|uma outra) (ocasi[aã]o|hora|vez)|outra hora eu (vejo|chamo|procuro)|quando der eu (chamo|procuro|retorno)|mais pra frente eu (vejo|chamo|procuro)/i
/** motivo de cancelamento já dito: imprevisto, trabalho, saúde, compromisso */
export const RX_MOTIVO = /imprevisto|surgiu|reuni[aã]o no trabalho|trabalh|hospital|m[eé]dic|doente|consulta|compromisso|precisei sair|viagem|viajando|emerg[eê]ncia|n[aã]o vou conseguir nesse hor[aá]rio|esqueci|problema/i
const RX_SIM = /^\s*(sim|s|claro|pode|pode ser|quero|quero sim|vamos|ok|bora|isso|com certeza|aceito|gostaria)\b/i
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
}

export interface Resultado { acao: string; enviado?: string; leitura?: Leitura; /** na passagem: o resumo que vai para a tarefa da equipe */ resumo?: string }

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
const FIXOS = new Set(['pergunta1', 'pergunta2', 'q1_numero', 'agendado', 'possui_advogado', 'como_funciona', 'encaminha_10_15', 'recorrente_retoma'])

interface Fala { id: string; obrigatorio?: string[] }

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
  if (regua) await deps.iniciarRegua(regua, ctx.agora.getTime())
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
  await deps.passarParaHumano(motivo, resumo)
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
  await deps.patch({ etapa: 'agendado', oferta: undefined, remarcacao: undefined, recusas: 0, recusados: [], reuniao: { eventId: ev.eventId, inicio: slot.inicio.toISOString(), link: ev.link, criadaEm: ctx.agora.toISOString() } })
  await deps.agendarLembretes(slot.inicio, ev.eventId)
  await deps.tarefaReuniao?.(slot.inicio, `Reunião on-line com ${nome} (marcada pela Anna). Meet: ${ev.link}`)
  return { acao: `agendou ${slot.chave}`, enviado: texto, leitura }
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
  const responderLivre = async (): Promise<Resultado | null> => {
    if (!leitura.resposta) return null
    const texto = compor(leitura.resposta, PENDENTE[etapa](s, quandoOfertado))
    const enviado = await falar(ctx, deps, texto, etapa, { id: 'livre', obrigatorio: etapa === 'oferta' ? [quandoOfertado || ''] : [] })
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

  switch (etapa) {
    case 'q1': {
      if (leitura.opcao) {
        await deps.patch({ objetivo: leitura.opcao })
        await deps.salvarCampos({ [CRM_MAP.campos.objetivo]: String(leitura.opcao) })
        // memória: já informou os valores antes → confirma se a situação mudou, em vez de perguntar tudo de novo
        const mem = deps.memoria ? await deps.memoria().catch(() => null) : null
        if (mem && valoresTexto(mem)) {
          const enviado = await falar(ctx, deps, TEXTOS.memoriaConfirma(mem.quando, valoresTexto(mem)), 'q2', { id: 'memoria_confirma', obrigatorio: ['melhorou', 'igual'] })
          await deps.patch({ etapa: 'q2', memoria: mem, memoriaPendente: true })
          return { acao: `opção ${leitura.opcao}: memória (valores de ${mem.quando})`, enviado, leitura }
        }
        const enviado = await falar(ctx, deps, TEXTOS.pergunta2, 'q2', { id: 'pergunta2', obrigatorio: ['bruta', 'líquido', 'conta corrente'] })
        await deps.patch({ etapa: 'q2' })
        return { acao: `opção ${leitura.opcao}: pergunta 2`, enviado, leitura }
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

    case 'q2': {
      const patch: Partial<LeadState> = {}
      const campos: Record<number, number> = {}
      const disse = { rendaBruta: leitura.renda_bruta, rendaLiquida: leitura.renda_liquida, descontoConta: leitura.desconto_conta }
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
            const livre = await responderLivre()
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
      if (patch.rendaBruta != null) await deps.mover(colunaPorRenda(patch.rendaBruta), PIPELINES.sdr)
      if (Object.keys(patch).length) await deps.patch(patch)

      const faltando = [
        novo.rendaBruta == null ? ['a sua renda bruta mensal', 'bruta'] : null,
        novo.rendaLiquida == null ? ['quanto você recebe líquido', 'líquido'] : null,
        novo.descontoConta == null ? ['quanto o banco desconta da sua conta corrente por mês', 'conta corrente'] : null,
      ].filter((x): x is string[] => !!x)
      const faltam = faltando.map(f => f[0])
      if (!faltam.length) {
        // Dra., 27/10: antes da mensagem do alívio, cheque especial e cartão de crédito
        await deps.patch({ etapa: 'limite' })
        const enviado = await falar(ctx, deps, TEXTOS.perguntaLimite, 'limite', { id: 'pergunta_limite', obrigatorio: ['CHEQUE ESPECIAL', 'CARTÃO DE CRÉDITO'] })
        return { acao: 'q2 completa: pergunta do cheque especial e do cartão', enviado, leitura }
      }
      const recebeuValor = Object.keys(campos).length > 0
      // Dra., 27/10: "vou ver e depois te mando" → a mensagem dela sobre a importância dos valores (a régua segue)
      // a mensagem do "aguardo" termina em "Combinado?": um "combinado"/"ok" não pede resposta (a régua segue)
      const ultimaAnna = [...ctx.conversa].reverse().find(m => m.dir === 'out')?.text || ''
      if (!recebeuValor && ultimaAnna.includes('Aguardo seu retorno') && RX_OK.test(ctx.textoTurno)) {
        return { acao: 'q2: o lead confirmou que manda os valores depois; aguardando', leitura }
      }
      if (!recebeuValor && vaiMandarDepois(ctx.textoTurno)) {
        const enviado = await falar(ctx, deps, TEXTOS.aguardoValores, 'q2', { id: 'aguardo_valores', obrigatorio: ['SUSPENDER'] })
        return { acao: 'q2: o lead vai mandar os valores depois', enviado, leitura }
      }
      if (!recebeuValor) {
        const livre = await responderLivre()
        if (livre) return livre
      }
      const lista = faltam.length === 1 ? faltam[0] : `${faltam.slice(0, -1).join(', ')} e ${faltam[faltam.length - 1]}`
      const texto = recebeuValor
        ? `Obrigada. Falta só ${lista}. Pode me informar?`
        : `Para eu fazer a análise inicial, preciso saber ${lista}. Pode me informar?`
      const enviado = await falar(ctx, deps, texto, 'q2', { id: 'q2_falta', obrigatorio: faltando.map(f => f[1]) })
      return { acao: `q2 incompleta (faltam ${faltam.length})`, enviado, leitura }
    }

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
