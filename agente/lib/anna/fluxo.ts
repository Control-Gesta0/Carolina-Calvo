import { colunaPorRenda, CRM_MAP, PIPELINES, STATUS } from '../crm-map'
import type { Regua } from '../followup'
import type { ChatMsg } from '../history'
import type { Etapa, LeadState, Oferta } from '../state'
import { AGENDA, diaIso, primeiraMaiuscula, proximoDiaUtil, quandoExtenso, quandoOferta, type Periodo, type Slot } from './agenda'
import { compor, ehPerguntaRobo, PENDENTE, type Entrada, type Leitura } from './interprete'
import type { Redacao } from './redator'
import { brl, TEXTOS } from './textos'

/**
 * O roteiro da Anna como máquina de estados. Tudo que é decisão (próxima
 * mensagem, coluna do funil, oferta de horário, passagem para humano) é CÓDIGO;
 * o modelo só lê o turno do lead (interprete.ts) e, na saída, reescreve a
 * mensagem decidida como conversa (redator.ts), com o texto da Dra. como
 * referência e fallback. As dependências entram por `Deps`, então o fluxo
 * inteiro roda em teste sem Kommo, Redis nem Google.
 */

/** Só acima disto a Anna oferece reunião (regra da Dra., 15/10/2026: renda bruta acima de R$ 15 mil). */
export const RENDA_OFERTA_REUNIAO = 15000

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
  passarParaHumano(motivo: string, resumo: string): Promise<void>
  tarefa(texto: string): Promise<void>
  agendarMsg5(token: string, quando: number): Promise<void>
  novoToken(): string
  iniciarRegua(regua: Regua, base: number): Promise<void>
  cancelarRegua(): Promise<void>
  agenda: {
    disponivel(): boolean
    buscar(o: { periodo?: Periodo; aPartirDoDia?: string; mesmoDia: boolean }): Promise<Slot | null>
    reservar(slot: Slot): Promise<void>
    /** confere de novo no Google e cria o evento com Meet; null = o horário foi ocupado */
    confirmar(slot: Slot, titulo: string, descricao: string): Promise<{ eventId: string; link: string } | null>
  }
  agendarLembretes(inicio: Date, eventId: string): Promise<void>
  /** reescreve a mensagem do roteiro como conversa (redator.ts); sem ela, sai o texto pronto */
  redigir?(r: Redacao): Promise<string>
}

export interface Resultado { acao: string; enviado?: string; leitura?: Leitura; /** na passagem: o resumo que vai para a tarefa da equipe */ resumo?: string }

const PAUSA_ANALISE_MS = 30 * 60_000

const reguaDaEtapa = (e: Etapa): Regua | null =>
  e === 'q1' || e === 'q2' || e === 'q3' ? 'qualificacao' : e === 'oferta' || e === 'preferencia' ? 'agendamento' : null

const slotDaOferta = (o: Oferta): Slot => ({ chave: o.chave, inicio: new Date(o.inicio), fim: new Date(o.fim) })

function resumoLead(s: LeadState): string {
  const obj = s.objetivo === 1 ? 'suspender descontos' : s.objetivo === 2 ? 'reestruturar dívidas' : s.objetivo === 3 ? 'suspender e reestruturar' : 'não informado'
  return [
    `Objetivo: ${obj}`,
    `Renda bruta: ${s.rendaBruta != null ? brl(s.rendaBruta) : '?'}`,
    `Líquido: ${s.rendaLiquida != null ? brl(s.rendaLiquida) : '?'}`,
    `Desconto em conta: ${s.descontoConta != null ? brl(s.descontoConta) : '?'}`,
  ].join(' · ')
}

/** O que cada mensagem do roteiro precisa fazer: vai para a redação junto com o texto da Dra. */
export const OBJETIVO: Record<string, string> = {
  pergunta1: 'se apresentar e perguntar o que a pessoa quer saber: se é possível suspender por até 6 meses os descontos bancários e o pagamento das dívidas, reestruturar as dívidas com juros revisados, ou as duas coisas',
  pergunta2: 'pedir os três valores da análise inicial: a renda bruta mensal, quanto recebe líquido depois dos descontos do contracheque e quanto o banco desconta direto da conta corrente por mês',
  q2_falta: 'agradecer o que a pessoa já informou e pedir só o que falta',
  mensagem3: 'mostrar que, sem esse desconto na conta corrente e recebendo o salário líquido inteiro, seria um alívio financeiro, e perguntar se a pessoa concorda',
  mensagem3_sem_desconto: 'mostrar que, reduzindo os descontos e sobrando mais do salário, seria um alívio financeiro, e perguntar se a pessoa concorda',
  mensagem4: 'dizer que a situação é delicada, que vai encaminhar a conversa para a Dra. Carolina analisar e que volta a falar em alguns minutos',
  mensagem5: 'contar que já passou o caso para a Dra. Carolina; explicar que o primeiro atendimento é on-line e que nele a Dra. explica a possibilidade de pedir na Justiça a suspensão dos descontos por até 6 meses, além da revisão de juros e da reestruturação das dívidas; oferecer o horário e perguntar se pode agendar',
  nova_oferta: 'oferecer o horário, on-line, e perguntar se pode agendar',
  horario_ocupado: 'avisar que o horário anterior acabou de ser preenchido, oferecer o novo horário, on-line, e perguntar se pode agendar',
  manha_ou_tarde: 'dizer que não tem problema e perguntar se a pessoa prefere de manhã ou à tarde',
  oferta_pendente: 'retomar a oferta de horário e perguntar se pode agendar',
  sem_reuniao: 'agradecer as informações, dizer que o caso fica registrado para a equipe da Dra. Carolina avaliar o melhor caminho e que a pessoa pode escrever por aqui se tiver alguma dúvida',
  passa_humano: 'dizer que vai pedir para alguém da equipe da Dra. Carolina continuar o atendimento por aqui',
  sem_agenda: 'dizer que vai pedir para a equipe da Dra. Carolina confirmar o melhor horário por aqui',
  desistiu: 'respeitar a decisão e dizer que a pessoa pode chamar por aqui se mudar de ideia',
  pendente_q1: 'retomar a pergunta sobre o que a pessoa quer saber: a suspensão dos descontos, a reestruturação das dívidas ou as duas coisas',
  livre: 'responder a dúvida da pessoa só com o que está na referência e, no fim, retomar a pergunta do roteiro',
}
/** Ficam como a Dra. escreveu: a confirmação (data, link e orientações) e o texto da ética da OAB. */
const FIXOS = new Set(['agendado', 'possui_advogado'])

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
  const enviado = await falar(ctx, deps, TEXTOS.pergunta1(ctx.primeiroNome), 'q1', { id: 'pergunta1', obrigatorio: ['Anna', 'Dra. Carolina Calvo', '6 meses'] })
  return { acao: 'abriu: pergunta 1', enviado }
}

async function humano(ctx: Ctx, deps: Deps, motivo: string, texto: string, leitura?: Leitura, id = 'passa_humano'): Promise<Resultado> {
  const resumo = `${leitura?.resumo || ctx.textoTurno.slice(0, 200)} · ${resumoLead(ctx.state)}`
  const enviado = await dizer(ctx, deps, texto, { id })
  await deps.passarParaHumano(motivo, resumo)
  await deps.patch({ etapa: 'humano', finalizado: { motivo, em: ctx.agora.toISOString() } })
  return { acao: `passou para humano: ${motivo}`, enviado, leitura, resumo }
}

async function oferecer(ctx: Ctx, deps: Deps, busca: { periodo?: Periodo; aPartirDoDia?: string }, textoDe: (q: string) => string, id: string): Promise<Resultado> {
  if (!deps.agenda.disponivel()) return humano(ctx, deps, 'agenda indisponível', TEXTOS.semAgenda, undefined, 'sem_agenda')
  const mesmoDia = (ctx.state.rendaBruta ?? 0) >= AGENDA.rendaMesmoDia && !busca.aPartirDoDia
  const slot = await deps.agenda.buscar({ ...busca, mesmoDia })
  if (!slot) return humano(ctx, deps, 'sem horário livre nos próximos dias', TEXTOS.semAgenda, undefined, 'sem_agenda')
  await deps.agenda.reservar(slot)
  const quando = quandoOferta(slot.inicio, ctx.agora)
  await deps.patch({ etapa: 'oferta', oferta: { chave: slot.chave, inicio: slot.inicio.toISOString(), fim: slot.fim.toISOString(), em: ctx.agora.getTime() } })
  const enviado = await falar(ctx, deps, textoDe(quando), 'oferta', { id, obrigatorio: id === 'mensagem5' ? [quando, '6 meses'] : [quando] })
  return { acao: `ofereceu ${slot.chave}`, enviado }
}

/** Job da pausa de 30 min: a 5ª mensagem com o primeiro horário da sequência. */
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
  const ofertaVencida = !!s.oferta && new Date(s.oferta.inicio).getTime() < ctx.agora.getTime() + 30 * 60_000
  const quandoOfertado = s.oferta && !ofertaVencida ? quandoOferta(new Date(s.oferta.inicio), ctx.agora) : undefined
  const leitura = await deps.interpretar({
    etapa, pendente: PENDENTE[etapa](s, quandoOfertado), state: s, conversa: ctx.conversa, agora: ctx.agora, nomeContato: ctx.nomeContato,
  })

  switch (leitura.intencao) {
    case 'pergunta_se_robo': return humano(ctx, deps, 'perguntou se é robô', TEXTOS.passaHumano, leitura)
    case 'pede_humano': return humano(ctx, deps, 'pediu atendimento humano', TEXTOS.passaHumano, leitura)
    case 'tem_advogado': return humano(ctx, deps, 'já tem advogado no caso', TEXTOS.possuiAdvogado, leitura, 'possui_advogado')
    case 'ja_e_cliente': return humano(ctx, deps, 'já é cliente', TEXTOS.passaHumano, leitura)
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

  switch (etapa) {
    case 'q1': {
      if (leitura.opcao) {
        await deps.patch({ objetivo: leitura.opcao })
        await deps.salvarCampos({ [CRM_MAP.campos.objetivo]: String(leitura.opcao) })
        const enviado = await falar(ctx, deps, TEXTOS.pergunta2, 'q2', { id: 'pergunta2', obrigatorio: ['bruta', 'líquido', 'conta corrente'] })
        await deps.patch({ etapa: 'q2' })
        return { acao: `opção ${leitura.opcao}: pergunta 2`, enviado, leitura }
      }
      const livre = await responderLivre()
      if (livre) return livre
      const enviado = await falar(ctx, deps, PENDENTE.q1(ctx.state), 'q1', { id: 'pendente_q1' })
      return { acao: 'q1 sem opção: perguntou de novo', enviado, leitura }
    }

    case 'q2': {
      const patch: Partial<LeadState> = {}
      const campos: Record<number, number> = {}
      if (leitura.renda_bruta != null && s.rendaBruta == null) { patch.rendaBruta = leitura.renda_bruta; campos[CRM_MAP.campos.rendaBruta] = leitura.renda_bruta }
      if (leitura.renda_liquida != null && s.rendaLiquida == null) { patch.rendaLiquida = leitura.renda_liquida; campos[CRM_MAP.campos.rendaLiquida] = leitura.renda_liquida }
      if (leitura.desconto_conta != null && s.descontoConta == null) { patch.descontoConta = leitura.desconto_conta; campos[CRM_MAP.campos.descontoConta] = leitura.desconto_conta }
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
        const desconto = novo.descontoConta ?? null
        await deps.patch({ etapa: 'q3' })
        const enviado = await falar(ctx, deps, TEXTOS.mensagem3(desconto), 'q3', desconto && desconto > 0 ? { id: 'mensagem3', obrigatorio: [brl(desconto)] } : { id: 'mensagem3_sem_desconto' })
        return { acao: 'q2 completa: mensagem 3', enviado, leitura }
      }
      if (!Object.keys(patch).length) {
        const livre = await responderLivre()
        if (livre) return livre
      }
      const lista = faltam.length === 1 ? faltam[0] : `${faltam.slice(0, -1).join(', ')} e ${faltam[faltam.length - 1]}`
      const texto = Object.keys(patch).length
        ? `Obrigada. Falta só ${lista}. Pode me informar?`
        : `Para eu fazer a análise inicial, preciso saber ${lista}. Pode me informar?`
      const enviado = await falar(ctx, deps, texto, 'q2', { id: 'q2_falta', obrigatorio: faltando.map(f => f[1]) })
      return { acao: `q2 incompleta (faltam ${faltam.length})`, enviado, leitura }
    }

    case 'q3': {
      if (leitura.intencao === 'pergunta') {
        const livre = await responderLivre()
        if (livre) return livre
      }
      await deps.cancelarRegua()
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
      return { acao: 'mensagem 4: pausa de 30 min', enviado, leitura }
    }

    case 'analise': {
      // A Anna disse que volta em alguns minutos: só responde se o lead perguntou algo
      if (leitura.intencao === 'pergunta' && leitura.resposta) {
        await deps.enviar(leitura.resposta)
        return { acao: 'respondeu durante a pausa', enviado: leitura.resposta, leitura }
      }
      return { acao: 'silêncio: aguardando a pausa de 30 min', leitura }
    }

    case 'oferta':
    case 'preferencia': {
      if (etapa === 'oferta' && leitura.intencao === 'aceita_horario' && s.oferta) {
        const slot = slotDaOferta(s.oferta)
        // oferta velha (o horário já passou ou está em cima): oferece o próximo
        if (slot.inicio.getTime() < ctx.agora.getTime() + 30 * 60_000) return oferecer(ctx, deps, {}, TEXTOS.novaOferta, 'nova_oferta')
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
        await deps.patch({ etapa: 'agendado', oferta: undefined, reuniao: { eventId: ev.eventId, inicio: slot.inicio.toISOString(), link: ev.link, criadaEm: ctx.agora.toISOString() } })
        await deps.agendarLembretes(slot.inicio, ev.eventId)
        return { acao: `agendou ${slot.chave}`, enviado: texto, leitura }
      }
      if (leitura.periodo || leitura.data_preferida) {
        const refDia = s.oferta ? diaIso(new Date(s.oferta.inicio)) : diaIso(ctx.agora)
        const aPartirDoDia = leitura.data_preferida && leitura.data_preferida > diaIso(ctx.agora) ? leitura.data_preferida : proximoDiaUtil(refDia)
        return oferecer(ctx, deps, { periodo: leitura.periodo || undefined, aPartirDoDia }, TEXTOS.novaOferta, 'nova_oferta')
      }
      if (leitura.intencao === 'recusa_horario' || (etapa === 'oferta' && leitura.intencao === 'escolhe_periodo')) {
        await deps.patch({ etapa: 'preferencia', recusas: (s.recusas || 0) + 1 })
        const enviado = await falar(ctx, deps, TEXTOS.manhaOuTarde, 'preferencia', { id: 'manha_ou_tarde', obrigatorio: ['manhã', 'tarde'] })
        return { acao: 'não pode no horário: perguntou manhã ou tarde', enviado, leitura }
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
      if (leitura.resposta) {
        await deps.enviar(leitura.resposta)
        return { acao: `${etapa}: respondeu`, enviado: leitura.resposta, leitura }
      }
      return { acao: `${etapa}: sem resposta necessária`, leitura }
    }
  }
  return { acao: 'nada a fazer', leitura }
}
