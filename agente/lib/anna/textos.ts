import { CONFIG } from '../config'
import { apresentacao, comAvisoFora } from '../plantao'
import { AsyncLocalStorage } from 'node:async_hooks'

/**
 * Textos da Anna. Os marcados [DRA] são os textos da Dra. Carolina, como ela
 * enviou em 08/10/2026 (só espaço antes de pontuação foi corrigido). Os
 * marcados [CG] foram escritos pela Control Gestão no tom dela e precisam do OK.
 * A Anna nunca diz que é IA nem assistente virtual (decisão de 08/10).
 *
 * Desde o painel v5 eles são EDITÁVEIS pela aba Ensinar da Central (lib/base.ts):
 * TEXTOS_PADRAO é o texto de fábrica; o que a equipe publicou (depois do exame)
 * entra por comTextos() e vale só dentro daquela execução. Sem edição, a saída
 * é byte a byte a de antes (provado em scripts/test.ts).
 * Variáveis entre chaves: {saudacao} "Olá, Maria." · {desconto} "R$ 2.000" ·
 * {quando} "HOJE às 15:00" · {link} o link do Meet.
 */
export const TEXTOS_PADRAO = {
  /** [DRA] 1ª pergunta (lead que escreveu primeiro), texto da Dra. de 28/10. {saudacao} vira "Maria, bom dia!" (ou "Bom dia!") pela hora do envio */
  pergunta1:
    '{saudacao}\n\n' +
    '*Imagine poder respirar financeiramente, com menos descontos comprometendo sua renda todos os meses.*\n\n' +
    'Qual dessas possibilidades faria mais diferença para você hoje?\n\n' +
    '*1️⃣* Buscar judicialmente a *suspensão dos descontos bancários por até 6 meses*.\n\n' +
    '*2️⃣* Buscar a *reestruturação das dívidas*, com revisão dos juros e condições de pagamento mais favoráveis.\n\n' +
    '*3️⃣ AS DUAS OPÇÕES*, para buscar um alívio financeiro e reorganizar suas dívidas.\n\n' +
    '*Me responda apenas 1, 2 ou 3*, para verificarmos o que pode ser feito no seu caso.',

  /** [DRA] 2ª pergunta, texto da Dra. de 28/10 */
  pergunta2:
    'Ótimo!\n\n' +
    'Agora precisamos entender *quanto da sua renda realmente sobra depois dos descontos bancários*.\n\n' +
    'Para isso, me informe apenas três valores:\n\n' +
    '*1️⃣ RENDA BRUTA:* Qual é o seu salário bruto mensal?\n\n' +
    '*2️⃣ SALÁRIO LÍQUIDO:* Quanto você recebe após os descontos do contracheque?\n\n' +
    '*3️⃣ DESCONTOS NA CONTA:* Quanto o banco retira diretamente da sua conta corrente todos os meses?\n\n' +
    'Com essas informações, conseguimos fazer uma *análise inicial do comprometimento da sua renda* e verificar quais medidas jurídicas podem ajudar você a *recuperar seu fôlego financeiro*.\n\n' +
    '*Pode me informar esses três valores?*',

  /** [DRA] o lead diz que vai ver os valores e manda depois (Dra., 27/10; texto novo de 30/10) */
  aguardo_valores:
    'Sem problemas! Aguardo seu retorno.\n\n' +
    '*Esses valores são essenciais* para avaliarmos a possibilidade de *SUSPENDER judicialmente os descontos por até 6 MESES e REDUZIR suas dívidas com a revisão dos juros*.\n\n' +
    '*Quanto antes recebermos as informações, mais cedo poderemos avançar na análise do seu caso.*\n\n' +
    'Combinado?',

  /** [DRA] 3ª mensagem (cheque especial e cartão), texto da Dra. de 28/10 */
  pergunta_limite:
    'Para entendermos melhor *o quanto sua renda está comprometida e quais soluções podem ajudar você a recuperar seu equilíbrio financeiro*, preciso confirmar apenas duas informações:\n\n' +
    '*1️⃣ CHEQUE ESPECIAL:* Você utiliza o limite do cheque especial atualmente?\n\n' +
    '*2️⃣ CARTÃO DE CRÉDITO:* Você utiliza o cartão de crédito atualmente?\n\n' +
    '*Essas respostas são importantes para identificarmos o próximo passo do seu atendimento.*\n\n' +
    'Pode me responder os dois pontos?',

  /** [CG] lead que volta e já informou os valores num atendimento anterior (memória, Ajuste 3). Só cita o que está registrado */
  memoria_confirma: 'Ótimo! Vi aqui que você já falou com a gente em {quando} e, naquela ocasião, informou {valores}.\n\nDe lá para cá, a sua situação *melhorou, piorou ou continua igual*?',

  /** [DRA] 4ª mensagem (alívio), para quem tem desconto em conta corrente, texto da Dra. de 28/10 (sem citar o valor) */
  mensagem3:
    'Acredito que *receber seu salário líquido sem os descontos diretamente na conta corrente* faria uma grande diferença, não é?\n\n' +
    'Imagine ter *mais dinheiro disponível todos os meses para pagar suas despesas, respirar financeiramente e começar a reorganizar sua vida*.\n\n' +
    '*Seria um alívio importante para você, concorda?*',

  /** [CG] variante da 3ª mensagem para quem não tem desconto em conta corrente */
  mensagem3_sem_desconto: 'Acredito que reduzindo esses descontos e sobrando mais do seu salário todo mês seria uma grande ajuda para respirar e ter um alívio financeiro, concorda?',

  /** [DRA] 5ª mensagem (encaminhamento real: vira nota e tarefa no card), texto da Dra. de 28/10 */
  mensagem4:
    'Pelo que você nos relatou, *sua situação financeira merece atenção e uma análise cuidadosa*.\n\n' +
    'Vou encaminhar suas informações para a *Dra. Carolina Calvo avaliar quais medidas jurídicas podem ajudar a aliviar o comprometimento da sua renda*.\n\n' +
    '*Retorno em alguns minutos.*',

  /** [DRA] 5ª mensagem: oferta de horário, texto da Dra. confirmado em 03/11. {quando} = "HOJE às 15:00" etc.; {dia} = "para hoje" etc. */
  mensagem5:
    'A Dra. Carolina Calvo analisou seu caso e considerou *delicado*.\n\n' +
    'Por isso ela abriu um espaço na agenda *{quando}, ON LINE, para o primeiro atendimento*.\n\n' +
    'Nessa conversa, ela vai explicar a *possibilidade* de obter judicialmente a *suspensão dos descontos bancários por até 6 meses*, além da *revisão dos juros* e da *reestruturação das suas dívidas*.\n\n' +
    'Cada dia que passa é *mais um dia com os descontos saindo da sua renda*, e esse é o *único horário que consegui {dia}*.\n\n' +
    '*Posso confirmar para você?*',

  /** [CG] nova oferta depois que o lead escolheu manhã ou tarde */
  nova_oferta: 'Ela pode atender você *{quando}*, ON LINE. Posso agendar?',

  /** [CG] o horário aceito foi ocupado entre a oferta e o "sim" */
  horario_ocupado: 'Esse horário acabou de ser preenchido. Ela pode atender você *{quando}*, ON LINE. Posso agendar?',

  /** [CG] o lead não pode no horário oferecido (regra da Dra.: perguntar manhã ou tarde) */
  /** [DRA] 2ª recusa (Dra., 05/11) */
  manha_ou_tarde: 'Para facilitar seu agendamento, qual período costuma ser melhor para você: manhã ou tarde?',

  /** [DRA] confirmação, a partir do modelo "Agendado" (o link agora vai junto) */
  agendado:
    '*Agendado!* *{quando}*, ON LINE pelo Google Meet.\n\n' +
    'Link de acesso: {link}\n\n' +
    'Para que a análise seja a mais completa possível, peço que tenha em mãos *o seu último contracheque e o último extrato bancário*, pois serão utilizados para o *cálculo de superendividamento*.\n\n' +
    'Também é importante que você esteja *em um local tranquilo e com boa conexão de internet*, para que o atendimento transcorra da melhor forma.\n\n' +
    'Caso tenha algum imprevisto e não possa comparecer, peço, por gentileza, que *nos avise com antecedência*.',

  /** [CG] renda bruta até R$ 15 mil: a Anna não oferece reunião nem cria tarefa (Dra., 15/10); o card fica na coluna da renda */
  sem_reuniao: 'Obrigada pelas informações. Vou deixar o seu caso registrado para a equipe da Dra. Carolina avaliar o melhor caminho. Se tiver alguma dúvida, é só me escrever por aqui.',

  /** [Dra., 09/11] reunião cancelada pelo lead sem dizer o motivo */
  cancelou_motivo: 'Entendo, {nome}! Sem problemas.\n\nAconteceu algum imprevisto ou houve alguma questão que fez você reconsiderar a reunião?\n\nPergunto porque gostaria de entender melhor e verificar se conseguimos encontrar uma alternativa para você.',
  /** [Dra., 09/11] o lead teve um imprevisto: oferta de remarcação */
  remarcar_oferta: 'Sem problemas, {nome}! Imprevistos acontecem, entendo perfeitamente.\n\nPodemos aproveitar e já deixar sua reunião remarcada?\n\nAssim, conseguimos reservar um novo horário na agenda da Dra. Carolina, sem precisar iniciar todo o processo novamente.\n\n*Para você, fica melhor pela manhã ou pela tarde?*',
  /** [Dra., 09/11] aceitou remarcar, mas vai ver o horário depois */
  remarcar_depois: 'Combinado, {nome}! Quando puder, me diga se fica melhor pela manhã ou pela tarde, e eu verifico um horário na agenda da Dra. Carolina para você.',
  /** [Dra., 09/11] não quer mais a reunião: uma única tentativa de entender */
  desistencia_pergunta: 'Entendo, {nome}, e respeito sua decisão.\n\nSó gostaria de entender uma coisa: *sua situação financeira melhorou ou existe algum motivo específico para você não querer continuar com a avaliação neste momento?*\n\nPergunto porque, dependendo do que está acontecendo, ainda podemos verificar possibilidades jurídicas para ajudar você.',
  /** [Dra., 09/11] "depois eu entro em contato" */
  depois_contato: 'Combinado, {nome}! Vou deixar seu atendimento disponível para quando desejar retomar.\n\nSó quero te deixar uma reflexão: *enquanto sua situação financeira permanece sem uma avaliação adequada, os descontos podem continuar comprometendo sua renda todos os meses.*\n\nNossa primeira reunião on-line é gratuita e permite que a Dra. Carolina avalie sua situação e explique quais medidas jurídicas podem ser consideradas.\n\n*Quanto antes conseguirmos analisar seu caso, mais cedo poderemos identificar as possibilidades de atuação.*\n\nQuando decidir continuar, estaremos à disposição por aqui.',
  /** [Dra., 09/11] "será que adianta fazer essa reunião?" */
  questiona_reuniao: 'Entendo sua dúvida, {nome}.\n\nÉ justamente durante essa primeira reunião on-line, que é gratuita, que a Dra. Carolina poderá avaliar melhor sua situação e explicar quais medidas jurídicas podem ser consideradas.\n\nSem conhecer os detalhes do seu caso, não seria correto prometer uma solução.\n\nPor isso, acredito que vale a pena realizar essa avaliação antes de tomar uma decisão.\n\n*Podemos encontrar um horário melhor para você?*',

  /** [Dra., 06/11] o lead pediu atendimento presencial: como funciona o atendimento (sem valores) */
  como_funciona: 'Claro! Vou te explicar como funciona nosso atendimento.\n\nPrimeiro, fazemos uma avaliação on-line do seu caso para verificar se é uma situação em que nosso escritório pode te ajudar.\n\nSe o seu caso estiver dentro da nossa área de atuação, agendamos uma primeira reunião on-line com a Dra. Carolina Calvo, com duração aproximada de 30 minutos.\n\nNessa conversa, a Dra. Carolina vai explicar o que pode ser feito no seu caso e quais são as possibilidades de atuação.\n\n*Essa primeira reunião on-line é totalmente gratuita.*\n\nCaso você tenha interesse em contratar o escritório após essa conversa, podemos agendar um horário para que venha presencialmente.\n\nTudo bem para você?',

  /** [Dra., 06/11] lead recorrente que de novo parou de responder: substitui o 1º follow-up da qualificação, uma vez por ciclo */
  recorrente: 'Olá, {nome}! Tudo bem?\n\nVerifiquei aqui que você já procurou nosso escritório em outras ocasiões, mas acabou não dando continuidade ao atendimento.\n\n*Quero te fazer uma pergunta importante: enquanto você adia essa avaliação, o que realmente mudou na sua situação financeira?*\n\nBuscar orientação é o primeiro passo, mas, sem dar continuidade, não conseguimos avaliar quais medidas podem ser adotadas para ajudar você a sair dessa situação.\n\n*De lá para cá, sua situação financeira melhorou, piorou ou continua igual?*\n\nMe conta, porque quero entender o que está acontecendo e verificar como podemos avançar com seu atendimento.',
  /** [Dra., 06/11] resposta do recorrente ("piorou", "continua igual"): retoma de onde parou; a pergunta da etapa vem logo depois */
  recorrente_retoma: 'Entendi, {nome}. Então é importante avaliarmos sua situação atual para verificar quais possibilidades existem no seu caso.\n\nVamos atualizar algumas informações para dar continuidade.',

  /** [Dra., 06/11] renda bruta de R$ 10 mil a R$ 15 mil: encerramento provisório; a equipe avalia e dá o retorno */
  encaminha_10_15: 'Entendi, {nome}. Obrigada pelas informações!\n\nVou encaminhar sua situação para a nossa equipe responsável.\n\nAssim que tivermos uma posição, entraremos em contato com você por aqui, tudo bem?',

  /** [CG] passagem para humano (pediu pessoa, perguntou se é robô, remarcação, assunto de outra área) */
  passa_humano: 'Vou pedir para alguém da equipe da Dra. Carolina continuar o seu atendimento por aqui.',

  /** [CG] sem agenda disponível (Google fora do ar ou sem horário nos próximos dias) */
  sem_agenda: 'Vou pedir para a equipe da Dra. Carolina confirmar o melhor horário com você por aqui.',

  /** [CG] o lead disse que não quer continuar */
  desistiu: 'Tudo bem, entendo. Se mudar de ideia, é só me chamar por aqui.',

  /** [DRA] lead que já tem advogado no caso (resposta pronta "Possui advogado") */
  possui_advogado: 'Compreendo sua situação, mas, caso você já tenha um advogado atuando no processo, a Dra. não poderá auxiliá-lo, pois isso poderia comprometer a ética profissional estabelecida pela OAB. Recomendo que entre em contato diretamente com o seu advogado para tratar da questão.',

  /** [CG] perguntas de retomada: emendadas depois de uma resposta livre da Anna */
  pendente_q1: 'Qual das opções você quer saber: 1, 2 ou 3?',
  pendente_q2: 'Pode me passar a sua renda bruta, o valor líquido e quanto o banco desconta da sua conta corrente?',
  pendente_limite: 'Você utiliza o limite do cheque especial e tem cartão de crédito com limite disponível?',
  pendente_q3: 'Concorda que, sem esses descontos, seria um alívio financeiro?',
  pendente_preferencia: 'Qual período costuma ser melhor para você: manhã ou tarde?',
}

export type TextoId = keyof typeof TEXTOS_PADRAO
export type TextosAnna = Record<TextoId, string>

const vigentes = new AsyncLocalStorage<Partial<TextosAnna>>()

/** Roda fn com estes textos (o publicado na base, ou o rascunho no laboratório). Fora dele vale o padrão. */
export const comTextos = <T>(textos: Partial<TextosAnna>, fn: () => T): T => vigentes.run(textos, fn)

/** Texto em uso agora (vigente desta execução, ou o padrão). */
export const texto = (id: TextoId): string => vigentes.getStore()?.[id] ?? TEXTOS_PADRAO[id]

/** Troca {variavel} pelo valor; variável sem valor fica como está (o validarTexto barra variável desconhecida). */
export const preencher = (t: string, v: Record<string, string>) => t.replace(/\{([a-z_]+)\}/g, (m, k: string) => v[k] ?? m)

/** "HOJE às 15:00" → "para hoje"; "AMANHÃ às 11:00" → "para amanhã"; "na quinta-feira (15/10) às 15:00" → "para quinta-feira (15/10)". Puro. */
export function diaDaOferta(quando: string): string {
  const dia = quando.split(' às ')[0].replace(/^(na|no) /, '').trim()
  return `para ${dia === 'HOJE' ? 'hoje' : dia === 'AMANHÃ' ? 'amanhã' : dia}`
}

/** "Maria, bom dia!" / "Boa tarde!" pela hora de Brasília (Dra., 28/10) */
export function saudacao(nome?: string, agora = new Date()): string {
  const h = Number(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }).format(agora)) % 24
  const s = h >= 5 && h < 12 ? 'bom dia' : h >= 12 && h < 18 ? 'boa tarde' : 'boa noite'
  return nome ? `${nome}, ${s}!` : `${s.charAt(0).toUpperCase()}${s.slice(1)}!`
}

export const TEXTOS = {
  // plantão ligado: "Maria, boa noite! Aqui é a Anna, da equipe de plantão…" (Dra., 04/11)
  pergunta1: (nome?: string, agora = new Date()) => preencher(texto('pergunta1'), { saudacao: CONFIG.plantao ? `${saudacao(nome, agora)} ${apresentacao(agora)}` : saudacao(nome, agora) }),
  get pergunta2() { return texto('pergunta2') },
  get perguntaLimite() { return texto('pergunta_limite') },
  get aguardoValores() { return texto('aguardo_valores') },
  memoriaConfirma: (quando: string, valores: string) => preencher(texto('memoria_confirma'), { quando, valores }),
  mensagem3: (descontoConta: number | null) => (descontoConta && descontoConta > 0 ? texto('mensagem3') : texto('mensagem3_sem_desconto')),
  get mensagem4() { return texto('mensagem4') },
  mensagem5: (quando: string) => preencher(texto('mensagem5'), { quando, dia: diaDaOferta(quando) }),
  novaOferta: (quando: string) => preencher(texto('nova_oferta'), { quando }),
  horarioOcupado: (quando: string) => preencher(texto('horario_ocupado'), { quando }),
  get manhaOuTarde() { return texto('manha_ou_tarde') },
  agendado: (quando: string, link: string) => preencher(texto('agendado'), { quando, link }),
  // encerramentos que passam para a equipe: entre 22h e 4h, com o aviso de fora do horário (Dra., 04/11)
  get semReuniao() { return comAvisoFora(texto('sem_reuniao'), new Date(), CONFIG.plantao) },
  recorrente: (nome?: string) => (nome ? preencher(texto('recorrente'), { nome }) : texto('recorrente').replace(', {nome}!', '!')),
  recorrenteRetoma: (nome?: string) => (nome ? preencher(texto('recorrente_retoma'), { nome }) : texto('recorrente_retoma').replace(', {nome}.', '.')),
  get comoFunciona() { return texto('como_funciona') },
  /** textos da remarcação com {nome}; sem nome, some ", {nome}" */
  comNome: (id: 'cancelou_motivo' | 'remarcar_oferta' | 'remarcar_depois' | 'desistencia_pergunta' | 'depois_contato' | 'questiona_reuniao', nome?: string) =>
    nome ? preencher(texto(id), { nome }) : texto(id).replace(', {nome}', ''),
  encaminha1015: (nome?: string) => comAvisoFora(nome ? preencher(texto('encaminha_10_15'), { nome }) : texto('encaminha_10_15').replace(', {nome}', ''), new Date(), CONFIG.plantao),
  get passaHumano() { return comAvisoFora(texto('passa_humano'), new Date(), CONFIG.plantao) },
  get semAgenda() { return comAvisoFora(texto('sem_agenda'), new Date(), CONFIG.plantao) },
  get desistiu() { return texto('desistiu') },
  get possuiAdvogado() { return texto('possui_advogado') },
}

export function brl(v: number): string {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })}`
}
