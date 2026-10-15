import { TEXTOS, comTextos } from '../lib/anna/textos'
import { textosDoRoteiro, type Textos } from '../lib/base-core'
import type { Leitura } from '../lib/anna/interprete'
import type { Etapa, LeadState } from '../lib/state'

/**
 * Cenários do EXAME do intérprete (módulo puro: a CLI scripts/evals.ts e o exame
 * da Central usam os mesmos). As mensagens da Anna na conversa saem dos textos
 * da versão candidata: o exame testa a Anna do jeito que ela vai falar.
 */


export interface Cenario {
  id: string
  etapa: Etapa
  state?: LeadState
  /** conversa: [quem, texto]; a última precisa ser do lead */
  conversa: Array<['in' | 'out', string]>
  espera: Partial<Leitura> & { intencaoEm?: Leitura['intencao'][] }
  /** a resposta livre é obrigatória? */
  comResposta?: boolean
  criterios?: string[]
}

// Segunda, 13/10/2026, 10:00 em Brasília
export const AGORA = new Date('2026-10-13T13:00:00Z')
export const oferta = { chave: '2026-10-13T15:00', inicio: '2026-10-13T18:00:00.000Z', fim: '2026-10-13T18:30:00.000Z', em: AGORA.getTime() }
const comQ2: LeadState = { objetivo: 3 }

const RESPOSTA_BOA = [
  'Responde primeiro o que o lead perguntou, sem enrolação (um endereço completo ou um dado exato não conta como resposta longa), com educação e tom formal sem soar robótico',
  'Termina com a pergunta pendente do roteiro (informada acima) e tem no máximo um ponto de interrogação; uma pergunta que pede vários valores numa frase conta como uma pergunta só',
  'Não dá orientação jurídica sobre o caso, não promete resultado e não diz que é robô, IA ou assistente virtual',
]

/** Os cenários com as mensagens da Anna escritas com estes textos (o padrão, o vigente ou o rascunho). */
export function cenarios(textos?: Textos): Cenario[] {
  const montar = (): Cenario[] => {
    const Q1 = TEXTOS.pergunta1('Maria')
    const Q2 = TEXTOS.pergunta2
    const Q3 = TEXTOS.mensagem3(2000)
    const OFERTA = TEXTOS.mensagem5('HOJE às 15:00')
    return [
    { id: 'q1-as-duas', etapa: 'q1', conversa: [['out', Q1], ['in', 'quero as duas coisas']], espera: { intencao: 'responde_etapa', opcao: 3 } },
    { id: 'q1-numero', etapa: 'q1', conversa: [['out', Q1], ['in', '1']], espera: { opcao: 1 } },
    { id: 'q1-desiste', etapa: 'q1', conversa: [['out', Q1], ['in', 'não tenho mais interesse, obrigado']], espera: { intencao: 'desiste' } },
    {
      id: 'q1-preco', etapa: 'q1', conversa: [['out', Q1], ['in', 'antes, quanto custa a consulta com a doutora?']], espera: { intencao: 'pergunta' }, comResposta: true,
      criterios: [...RESPOSTA_BOA, 'Diz que a primeira reunião é on-line e não é cobrada, sem citar valor de honorários'],
    },
    {
      id: 'q1-endereco', etapa: 'q1', conversa: [['out', Q1], ['in', 'onde fica o escritório?']], espera: { intencao: 'pergunta' }, comResposta: true,
      criterios: [...RESPOSTA_BOA, 'Informa o endereço no Setor Comercial Norte, Asa Norte, Brasília'],
    },
    { id: 'q2-tudo', etapa: 'q2', state: comQ2, conversa: [['out', Q2], ['in', 'ganho uns 12 mil bruto, o líquido cai pra 3.800 e o banco tira 2 mil direto da conta']], espera: { renda_bruta: 12000, renda_liquida: 3800, desconto_conta: 2000 } },
    { id: 'q2-parcial', etapa: 'q2', state: comQ2, conversa: [['out', Q2], ['in', 'meu salário bruto é 9.500']], espera: { renda_bruta: 9500, renda_liquida: null, desconto_conta: null } },
    { id: 'q2-sem-desconto-conta', etapa: 'q2', state: comQ2, conversa: [['out', Q2], ['in', 'bruto 14k, líquido 5k. Na conta não desconta nada, é tudo no contracheque']], espera: { renda_bruta: 14000, renda_liquida: 5000, desconto_conta: 0 } },
    {
      id: 'q2-documento', etapa: 'q2', state: comQ2, conversa: [['out', Q2], ['in', 'preciso te mandar o contracheque?']], espera: { intencao: 'pergunta' }, comResposta: true,
      criterios: [...RESPOSTA_BOA, 'Não pede contracheque, extrato nem nenhum documento; pede só os três valores'],
    },
    {
      id: 'q2-valor-acao', etapa: 'q2', state: comQ2, conversa: [['out', Q2], ['in', 'quanto vocês cobram pra entrar com a ação?']], espera: { intencao: 'pergunta' }, comResposta: true,
      criterios: [...RESPOSTA_BOA, 'Diz que valores e estratégia são tratados somente na reunião com a Dra. Carolina, sem citar valor em dinheiro, parcela ou porcentagem dos honorários ou da ação (dizer que a primeira reunião não é cobrada, ou quanto ela dura, é permitido)'],
    },
    { id: 'q3-concorda', etapa: 'q3', state: { ...comQ2, rendaBruta: 12000, rendaLiquida: 3800, descontoConta: 2000 }, conversa: [['out', Q3], ['in', 'com certeza, seria um alívio enorme']], espera: { intencaoEm: ['responde_etapa', 'outro'] } },
    {
      id: 'q3-garantia', etapa: 'q3', state: { ...comQ2, rendaBruta: 12000, rendaLiquida: 3800, descontoConta: 2000 }, conversa: [['out', Q3], ['in', 'vocês garantem que vão conseguir suspender os descontos?']], espera: { intencao: 'pergunta' }, comResposta: true,
      criterios: [...RESPOSTA_BOA, 'Não garante resultado: diz que a possibilidade é avaliada pela Dra. na reunião'],
    },
    { id: 'oferta-aceita', etapa: 'oferta', state: { oferta }, conversa: [['out', OFERTA], ['in', 'pode sim, agenda pra mim']], espera: { intencao: 'aceita_horario' } },
    { id: 'oferta-recusa', etapa: 'oferta', state: { oferta }, conversa: [['out', OFERTA], ['in', 'nesse horário eu estou trabalhando']], espera: { intencaoEm: ['recusa_horario', 'escolhe_periodo'], periodo: null } },
    { id: 'oferta-manha', etapa: 'oferta', state: { oferta }, conversa: [['out', OFERTA], ['in', 'hoje não dá, só consigo de manhã']], espera: { intencaoEm: ['escolhe_periodo', 'recusa_horario'], periodo: 'manha' } },
    { id: 'preferencia-sexta-tarde', etapa: 'preferencia', state: { oferta }, conversa: [['out', OFERTA], ['in', 'não posso hoje'], ['out', TEXTOS.manhaOuTarde], ['in', 'pode ser sexta à tarde']], espera: { intencao: 'escolhe_periodo', periodo: 'tarde', data_preferida: '2026-10-16' } },
    { id: 'pede-doutora', etapa: 'q2', state: comQ2, conversa: [['out', Q2], ['in', 'quero falar direto com a doutora, por favor']], espera: { intencao: 'pede_humano' } },
    { id: 'robo', etapa: 'q2', state: comQ2, conversa: [['out', Q2], ['in', 'isso aqui é um robô respondendo?']], espera: { intencao: 'pergunta_se_robo', resposta: null } },
    { id: 'advogado', etapa: 'q2', state: comQ2, conversa: [['out', Q2], ['in', 'eu já tenho advogado nesse processo contra o banco']], espera: { intencao: 'tem_advogado' } },
    { id: 'icms', etapa: 'q1', conversa: [['out', Q1], ['in', 'na verdade é sobre ICMS atrasado da minha empresa']], espera: { intencao: 'outro_assunto' } },
    { id: 'agendado-remarcar', etapa: 'agendado', state: { reuniao: { eventId: 'x', inicio: '2026-10-14T18:00:00.000Z', link: 'https://meet.google.com/x', criadaEm: '' } }, conversa: [['in', 'preciso remarcar a reunião de amanhã']], espera: { intencao: 'remarcar' } },
  ]
  }
  return textos ? comTextos(textosDoRoteiro(textos), montar) : montar()
}
