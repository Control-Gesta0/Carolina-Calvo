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
    // testes de 30/10 e 03/11 no WhatsApp, agora no exame
    { id: 'q2-debito-sem-valor', etapa: 'q2', state: comQ2, conversa: [['out', Q2], ['in', 'Bruta 20 mil, líquido 16 mil e tenho débito em conta']], espera: { renda_bruta: 20000, renda_liquida: 16000, desconto_conta: null } },
    { id: 'q2-combinado-depois-do-aguardo', etapa: 'q2', state: comQ2, conversa: [['out', Q2], ['in', 'Vou olhar no extrato e te mando depois'], ['out', TEXTOS.aguardoValores], ['in', 'Combinado']], espera: { intencaoEm: ['outro', 'responde_etapa'], renda_bruta: null, renda_liquida: null, desconto_conta: null } },
    { id: 'memoria-piorou', etapa: 'q2', state: { ...comQ2, memoriaPendente: true, memoria: { quando: 'outubro', rendaBruta: 20000, rendaLiquida: 16000, descontoConta: 7000 } }, conversa: [['out', TEXTOS.memoriaConfirma('outubro', 'renda bruta de R$ 20.000, líquido de R$ 16.000 e desconto em conta de R$ 7.000')], ['in', 'Piorou, minha renda mudou']], espera: { renda_bruta: null, renda_liquida: null, desconto_conta: null } },
    { id: 'memoria-piorou-com-valores', etapa: 'q2', state: { ...comQ2, memoriaPendente: true, memoria: { quando: 'outubro', rendaBruta: 20000, rendaLiquida: 16000, descontoConta: 7000 } }, conversa: [['out', TEXTOS.memoriaConfirma('outubro', 'renda bruta de R$ 20.000, líquido de R$ 16.000 e desconto em conta de R$ 7.000')], ['in', 'piorou, agora a bruta é 12 mil, o líquido 9 mil e o banco tira 3 mil da conta']], espera: { renda_bruta: 12000, renda_liquida: 9000, desconto_conta: 3000 } },
    { id: 'limite-responde', etapa: 'limite', state: { ...comQ2, rendaBruta: 18000, rendaLiquida: 9000, descontoConta: 2500 }, conversa: [['out', TEXTOS.perguntaLimite], ['in', 'uso o cheque especial todo mês, cartão tenho mas está estourado']], espera: { intencaoEm: ['responde_etapa', 'outro'] } },
    {
      id: 'limite-pergunta', etapa: 'limite', state: { ...comQ2, rendaBruta: 18000, rendaLiquida: 9000, descontoConta: 2500 }, conversa: [['out', TEXTOS.perguntaLimite], ['in', 'por que vocês precisam saber do meu cartão?']], espera: { intencao: 'pergunta' }, comResposta: true,
      criterios: RESPOSTA_BOA,
    },
    { id: 'q3-concorda', etapa: 'q3', state: { ...comQ2, rendaBruta: 12000, rendaLiquida: 3800, descontoConta: 2000 }, conversa: [['out', Q3], ['in', 'com certeza, seria um alívio enorme']], espera: { intencaoEm: ['responde_etapa', 'outro'] } },
    {
      id: 'q3-garantia', etapa: 'q3', state: { ...comQ2, rendaBruta: 12000, rendaLiquida: 3800, descontoConta: 2000 }, conversa: [['out', Q3], ['in', 'vocês garantem que vão conseguir suspender os descontos?']], espera: { intencao: 'pergunta' }, comResposta: true,
      criterios: [...RESPOSTA_BOA, 'Não garante resultado: diz que a possibilidade é avaliada pela Dra. na reunião'],
    },
    { id: 'oferta-aceita', etapa: 'oferta', state: { oferta }, conversa: [['out', OFERTA], ['in', 'pode sim, agenda pra mim']], espera: { intencao: 'aceita_horario' } },
    { id: 'oferta-recusa', etapa: 'oferta', state: { oferta }, conversa: [['out', OFERTA], ['in', 'nesse horário eu estou trabalhando']], espera: { intencaoEm: ['recusa_horario', 'escolhe_periodo'], periodo: null } },
    { id: 'oferta-manha', etapa: 'oferta', state: { oferta }, conversa: [['out', OFERTA], ['in', 'hoje não dá, só consigo de manhã']], espera: { intencaoEm: ['escolhe_periodo', 'recusa_horario'], periodo: 'manha', data_preferida: '2026-10-14' } },
    { id: 'preferencia-sexta-tarde', etapa: 'preferencia', state: { oferta }, conversa: [['out', OFERTA], ['in', 'não posso hoje'], ['out', TEXTOS.manhaOuTarde], ['in', 'pode ser sexta à tarde']], espera: { intencao: 'escolhe_periodo', periodo: 'tarde', data_preferida: '2026-10-16' } },
    { id: 'oferta-dia-e-hora', etapa: 'oferta', state: { oferta }, conversa: [['out', OFERTA], ['in', 'nesse horário não dá, pode ser na quinta às 16h?']], espera: { intencaoEm: ['escolhe_periodo', 'recusa_horario'], data_preferida: '2026-10-15', hora_preferida: '16:00' } },
    { id: 'oferta-hoje-depois-16h', etapa: 'oferta', state: { oferta }, conversa: [['out', OFERTA], ['in', 'hoje só consigo depois das 16h']], espera: { intencaoEm: ['escolhe_periodo', 'recusa_horario'], data_preferida: '2026-10-13', hora_preferida: '16:00' } },
    { id: 'oferta-amanha-manha', etapa: 'oferta', state: { oferta }, conversa: [['out', OFERTA], ['in', 'só consigo amanhã de manhã']], espera: { intencaoEm: ['escolhe_periodo', 'recusa_horario'], periodo: 'manha', data_preferida: '2026-10-14', hora_preferida: null } },
    // o 1º pedido de presencial na qualificação sai com o texto da Dra. (código); aqui só a leitura
    { id: 'q2-presencial-sirlei', etapa: 'q2', state: comQ2, conversa: [['out', Q2], ['in', 'Gostaria de agendar pessoalmente'], ['in', 'É possível?']], espera: { intencaoEm: ['pergunta', 'pede_humano'] } },
    {
      id: 'q2-primeira-paga', etapa: 'q2', state: comQ2, conversa: [['out', Q2], ['in', 'O primeiro atendimento é sempre pago?']], espera: { intencao: 'pergunta' }, comResposta: true,
      criterios: [...RESPOSTA_BOA, 'Diz claramente que a primeira reunião on-line é gratuita, sem citar valor nem atendimento pago'],
    },
    { id: 'q2-manda-segunda', etapa: 'q2', state: comQ2, conversa: [['out', Q2], ['in', 'Mandarei todas as informações na segunda-feira, pq conseguirei coleta-las de melhor forma.']], espera: { intencaoEm: ['responde_etapa', 'outro', 'escolhe_periodo'], renda_bruta: null, renda_liquida: null, desconto_conta: null } },
    { id: 'q2-contracheque', etapa: 'q2', state: comQ2, conversa: [['out', Q2], ['in', '[imagem do lead]: Contracheque da Secretaria de Educação do DF. Salário bruto R$ 18.000,00, líquido R$ 9.000,00, descontos de empréstimos consignados R$ 4.500,00.']], espera: { renda_bruta: 18000, renda_liquida: 9000, desconto_conta: null } },
    { id: 'pede-doutora', etapa: 'q2', state: comQ2, conversa: [['out', Q2], ['in', 'quero falar direto com a doutora, por favor']], espera: { intencao: 'pede_humano' } },
    { id: 'robo', etapa: 'q2', state: comQ2, conversa: [['out', Q2], ['in', 'isso aqui é um robô respondendo?']], espera: { intencao: 'pergunta_se_robo', resposta: null } },
    { id: 'advogado', etapa: 'q2', state: comQ2, conversa: [['out', Q2], ['in', 'eu já tenho advogado nesse processo contra o banco']], espera: { intencao: 'tem_advogado' } },
    { id: 'contratar-erika', etapa: 'q1', conversa: [['out', Q1], ['in', 'Boa tarde'], ['out', 'Boa tarde.\n\nQual das opções você quer saber: 1, 2 ou 3?'], ['in', 'Ontem conversei com a doutora vou fechar com ela para iniciar meu processo']], espera: { intencao: 'quer_contratar' } },
    { id: 'contratar-direto', etapa: 'q2', state: comQ2, conversa: [['out', Q2], ['in', 'Doutora, pensei melhor e quero fechar o contrato.']], espera: { intencao: 'quer_contratar' } },
    { id: 'cliente-de-verdade', etapa: 'q1', conversa: [['out', Q1], ['in', 'Já sou cliente da Dra., queria saber como está o meu processo']], espera: { intencao: 'ja_e_cliente' } },
    { id: 'icms', etapa: 'q1', conversa: [['out', Q1], ['in', 'na verdade é sobre ICMS atrasado da minha empresa']], espera: { intencao: 'outro_assunto' } },
    { id: 'cancela-imprevisto', etapa: 'agendado', state: { reuniao: { eventId: 'x', inicio: '2026-10-13T18:00:00.000Z', link: 'https://meet.google.com/x', criadaEm: '' } }, conversa: [['out', TEXTOS.agendado('Terça-feira, 13/10, às 15:00', 'https://meet.google.com/x')], ['in', 'Não vou conseguir participar hoje. Tive um imprevisto.']], espera: { intencao: 'cancela_reuniao' } },
    { id: 'cancela-pode-desmarcar', etapa: 'agendado', state: { reuniao: { eventId: 'x', inicio: '2026-10-13T18:00:00.000Z', link: 'https://meet.google.com/x', criadaEm: '' } }, conversa: [['in', 'Pode desmarcar meu horário, não vou conseguir entrar']], espera: { intencao: 'cancela_reuniao' } },
    { id: 'cancela-nao-quer-mais', etapa: 'agendado', state: { reuniao: { eventId: 'x', inicio: '2026-10-13T18:00:00.000Z', link: 'https://meet.google.com/x', criadaEm: '' } }, conversa: [['in', 'Pode cancelar. Não quero mais a reunião.']], espera: { intencao: 'desiste' } },
    { id: 'cancela-amanha-tarde', etapa: 'agendado', state: { reuniao: { eventId: 'x', inicio: '2026-10-13T18:00:00.000Z', link: 'https://meet.google.com/x', criadaEm: '' } }, conversa: [['in', 'Não posso hoje. Amanhã à tarde consigo.']], espera: { intencao: 'remarcar', periodo: 'tarde', data_preferida: '2026-10-14' } },
    { id: 'remarcar-aceita', etapa: 'remarcar_pergunta', state: {}, conversa: [['out', TEXTOS.comNome('remarcar_oferta', 'Maria')], ['in', 'Sim, quero remarcar']], espera: { intencaoEm: ['remarcar', 'aceita_horario', 'responde_etapa'] } },
    { id: 'agendado-remarcar', etapa: 'agendado', state: { reuniao: { eventId: 'x', inicio: '2026-10-14T18:00:00.000Z', link: 'https://meet.google.com/x', criadaEm: '' } }, conversa: [['in', 'preciso remarcar a reunião de amanhã']], espera: { intencao: 'remarcar' } },
  ]
  }
  return textos ? comTextos(textosDoRoteiro(textos), montar) : montar()
}
