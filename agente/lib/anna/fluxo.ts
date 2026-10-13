import { colunaPorRenda, CRM_MAP, PIPELINES, STATUS } from '../crm-map'
import type { Regua } from '../followup'
import type { ChatMsg } from '../history'
import type { Etapa, LeadState, Oferta } from '../state'
import { AGENDA, diaIso, primeiraMaiuscula, proximoDiaUtil, quandoExtenso, quandoOferta, type Periodo, type Slot } from './agenda'
import { compor, ehPerguntaRobo, PENDENTE, type Entrada, type Leitura } from './interprete'
import { brl, TEXTOS } from './textos'

/**
 * O roteiro da Anna como máquina de estados. Tudo que é decisão (próxima
 * mensagem, coluna do funil, oferta de horário, passagem para humano) é CÓDIGO;
 * o modelo só lê o turno do lead (interprete.ts). As dependências entram por
 * `Deps`, então o fluxo inteiro roda em teste sem Kommo, Redis nem Google.
 */

export const RENDA_MINIMA_REUNIAO = 10000

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
}

export interface Resultado { acao: string; enviado?: string; leitura?: Leitura }

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

/** Envia e, se a mensagem deixa uma pergunta em aberto, (re)começa a régua certa. */
async function falar(deps: Deps, texto: string, etapa: Etapa, agora: Date): Promise<void> {
  await deps.enviar(texto)
  const regua = reguaDaEtapa(etapa)
  if (regua) await deps.iniciarRegua(regua, agora.getTime())
}

/** Primeira mensagem quando o lead escreveu antes de a Anna se apresentar. */
export async function abrir(ctx: Ctx, deps: Deps): Promise<Resultado> {
  const texto = TEXTOS.pergunta1(ctx.primeiroNome)
  await deps.patch({ etapa: 'q1', inicioEm: ctx.agora.getTime() })
  await falar(deps, texto, 'q1', ctx.agora)
  return { acao: 'abriu: pergunta 1', enviado: texto }
}

async function humano(ctx: Ctx, deps: Deps, motivo: string, texto: string, leitura?: Leitura): Promise<Resultado> {
  await deps.enviar(texto)
  await deps.passarParaHumano(motivo, `${leitura?.resumo || ctx.textoTurno.slice(0, 200)} · ${resumoLead(ctx.state)}`)
  await deps.patch({ etapa: 'humano', finalizado: { motivo, em: ctx.agora.toISOString() } })
  return { acao: `passou para humano: ${motivo}`, enviado: texto, leitura }
}

async function oferecer(ctx: Ctx, deps: Deps, busca: { periodo?: Periodo; aPartirDoDia?: string }, textoDe: (q: string) => string): Promise<Resultado> {
  if (!deps.agenda.disponivel()) return humano(ctx, deps, 'agenda indisponível', TEXTOS.semAgenda)
  const mesmoDia = (ctx.state.rendaBruta ?? 0) >= AGENDA.rendaMesmoDia && !busca.aPartirDoDia
  const slot = await deps.agenda.buscar({ ...busca, mesmoDia })
  if (!slot) return humano(ctx, deps, 'sem horário livre nos próximos dias', TEXTOS.semAgenda)
  await deps.agenda.reservar(slot)
  const texto = textoDe(quandoOferta(slot.inicio, ctx.agora))
  await deps.patch({ etapa: 'oferta', oferta: { chave: slot.chave, inicio: slot.inicio.toISOString(), fim: slot.fim.toISOString(), em: ctx.agora.getTime() } })
  await falar(deps, texto, 'oferta', ctx.agora)
  return { acao: `ofereceu ${slot.chave}`, enviado: texto }
}

/** Job da pausa de 30 min: a 5ª mensagem com o primeiro horário da sequência. */
export async function quintaMensagem(ctx: Ctx, deps: Deps, token: string): Promise<Resultado> {
  if (ctx.state.etapa !== 'analise' || ctx.state.msg5Token !== token) return { acao: 'msg5 cancelada (etapa mudou)' }
  return oferecer(ctx, deps, {}, TEXTOS.mensagem5)
}

/** Um turno do lead. */
export async function turno(ctx: Ctx, deps: Deps): Promise<Resultado> {
  const s = ctx.state
  const etapa = s.etapa
  if (!etapa) return abrir(ctx, deps)
  if (etapa === 'humano') return { acao: 'silêncio: atendimento com a equipe' }

  // "É robô?" pego em código: a Anna nunca nega nem confirma, passa para a equipe
  if (ehPerguntaRobo(ctx.textoTurno)) return humano(ctx, deps, 'perguntou se é robô', TEXTOS.passaHumano)

  const quandoOfertado = s.oferta ? quandoOferta(new Date(s.oferta.inicio), ctx.agora) : undefined
  const leitura = await deps.interpretar({
    etapa, pendente: PENDENTE[etapa](s, quandoOfertado), state: s, conversa: ctx.conversa, agora: ctx.agora, nomeContato: ctx.nomeContato,
  })

  switch (leitura.intencao) {
    case 'pergunta_se_robo': return humano(ctx, deps, 'perguntou se é robô', TEXTOS.passaHumano, leitura)
    case 'pede_humano': return humano(ctx, deps, 'pediu atendimento humano', TEXTOS.passaHumano, leitura)
    case 'tem_advogado': return humano(ctx, deps, 'já tem advogado no caso', TEXTOS.possuiAdvogado, leitura)
    case 'ja_e_cliente': return humano(ctx, deps, 'já é cliente', TEXTOS.passaHumano, leitura)
    case 'outro_assunto': return humano(ctx, deps, 'assunto de outra área', TEXTOS.passaHumano, leitura)
    case 'remarcar': return humano(ctx, deps, 'pediu para remarcar', TEXTOS.passaHumano, leitura)
    case 'desiste': {
      await deps.cancelarRegua()
      await deps.enviar(TEXTOS.desistiu)
      await deps.mover(STATUS.naoQuerContinuar, PIPELINES.sdr)
      await deps.nota(`Anna: o lead disse que não quer continuar. ${leitura.resumo}`)
      await deps.patch({ etapa: 'humano', finalizado: { motivo: 'desistiu', em: ctx.agora.toISOString() } })
      return { acao: 'lead desistiu: movido para Não quer continuar', enviado: TEXTOS.desistiu, leitura }
    }
  }

  // Pergunta fora do roteiro: responde e volta para a pergunta pendente (a régua recomeça)
  const responderLivre = async (): Promise<Resultado | null> => {
    if (!leitura.resposta) return null
    const texto = compor(leitura.resposta, PENDENTE[etapa](s, quandoOfertado))
    await falar(deps, texto, etapa, ctx.agora)
    return { acao: `respondeu fora do roteiro (${leitura.intencao})`, enviado: texto, leitura }
  }

  switch (etapa) {
    case 'q1': {
      if (leitura.opcao) {
        await deps.patch({ objetivo: leitura.opcao })
        await deps.salvarCampos({ [CRM_MAP.campos.objetivo]: String(leitura.opcao) })
        await falar(deps, TEXTOS.pergunta2, 'q2', ctx.agora)
        await deps.patch({ etapa: 'q2' })
        return { acao: `opção ${leitura.opcao}: pergunta 2`, enviado: TEXTOS.pergunta2, leitura }
      }
      const livre = await responderLivre()
      if (livre) return livre
      const texto = 'Pode me responder com o número da opção: 1, 2 ou 3?'
      await falar(deps, texto, 'q1', ctx.agora)
      return { acao: 'q1 sem opção: pediu o número', enviado: texto, leitura }
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

      const faltam = [
        novo.rendaBruta == null ? 'a sua renda bruta mensal' : '',
        novo.rendaLiquida == null ? 'quanto você recebe líquido' : '',
        novo.descontoConta == null ? 'quanto o banco desconta da sua conta corrente por mês' : '',
      ].filter(Boolean)
      if (!faltam.length) {
        const texto = TEXTOS.mensagem3(novo.descontoConta ?? null)
        await deps.patch({ etapa: 'q3' })
        await falar(deps, texto, 'q3', ctx.agora)
        return { acao: 'q2 completa: mensagem 3', enviado: texto, leitura }
      }
      if (!Object.keys(patch).length) {
        const livre = await responderLivre()
        if (livre) return livre
      }
      const texto = Object.keys(patch).length
        ? `Obrigada. Falta só ${faltam.length === 1 ? faltam[0] : `${faltam.slice(0, -1).join(', ')} e ${faltam[faltam.length - 1]}`}. Pode me informar?`
        : `Para eu fazer a análise inicial, preciso desses valores: ${faltam.join(', ')}. Pode me informar?`
      await falar(deps, texto, 'q2', ctx.agora)
      return { acao: `q2 incompleta (faltam ${faltam.length})`, enviado: texto, leitura }
    }

    case 'q3': {
      if (leitura.intencao === 'pergunta') {
        const livre = await responderLivre()
        if (livre) return livre
      }
      await deps.cancelarRegua()
      if ((s.rendaBruta ?? 0) < RENDA_MINIMA_REUNIAO) {
        await deps.enviar(TEXTOS.semReuniao)
        await deps.addTags([CRM_MAP.tags.semReuniao])
        await deps.tarefa(`Anna: renda bruta abaixo de R$ 10 mil, sem reunião marcada pela IA. Avaliar o caso. ${resumoLead(s)}`)
        await deps.patch({ etapa: 'sem_reuniao' })
        return { acao: 'renda abaixo de 10 mil: registrado para a equipe', enviado: TEXTOS.semReuniao, leitura }
      }
      const token = deps.novoToken()
      await deps.enviar(TEXTOS.mensagem4)
      await deps.nota(`Anna encaminhou o caso para a Dra. Carolina. ${resumoLead(s)}`)
      await deps.patch({ etapa: 'analise', msg5Token: token })
      await deps.agendarMsg5(token, ctx.agora.getTime() + PAUSA_ANALISE_MS)
      return { acao: 'mensagem 4: pausa de 30 min', enviado: TEXTOS.mensagem4, leitura }
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
        if (slot.inicio.getTime() < ctx.agora.getTime() + 30 * 60_000) return oferecer(ctx, deps, {}, TEXTOS.novaOferta)
        const nome = ctx.primeiroNome || ctx.nomeContato || 'lead'
        const ev = await deps.agenda.confirmar(slot, `Reunião on-line · ${nome} · superendividamento`, `Marcada pela Anna (WhatsApp).\n${resumoLead(s)}`)
        if (!ev) return oferecer(ctx, deps, {}, TEXTOS.horarioOcupado)
        const quando = primeiraMaiuscula(quandoExtenso(slot.inicio))
        await deps.cancelarRegua()
        await deps.salvarCampos({
          [CRM_MAP.campos.reuniao]: Math.floor(slot.inicio.getTime() / 1000),
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
        return oferecer(ctx, deps, { periodo: leitura.periodo || undefined, aPartirDoDia }, TEXTOS.novaOferta)
      }
      if (leitura.intencao === 'recusa_horario' || (etapa === 'oferta' && leitura.intencao === 'escolhe_periodo')) {
        await deps.patch({ etapa: 'preferencia', recusas: (s.recusas || 0) + 1 })
        await falar(deps, TEXTOS.manhaOuTarde, 'preferencia', ctx.agora)
        return { acao: 'não pode no horário: perguntou manhã ou tarde', enviado: TEXTOS.manhaOuTarde, leitura }
      }
      const livre = await responderLivre()
      if (livre) return livre
      const texto = etapa === 'oferta' ? PENDENTE.oferta(s, quandoOfertado) : TEXTOS.manhaOuTarde
      await falar(deps, texto, etapa, ctx.agora)
      return { acao: `${etapa}: repetiu a pergunta`, enviado: texto, leitura }
    }

    case 'agendado':
    case 'sem_reuniao': {
      if (etapa === 'sem_reuniao' && leitura.intencao === 'pede_reuniao') return humano(ctx, deps, 'renda abaixo de 10 mil pediu reunião', TEXTOS.passaHumano, leitura)
      if (leitura.resposta) {
        await deps.enviar(leitura.resposta)
        return { acao: `${etapa}: respondeu`, enviado: leitura.resposta, leitura }
      }
      return { acao: `${etapa}: sem resposta necessária`, leitura }
    }
  }
  return { acao: 'nada a fazer', leitura }
}
