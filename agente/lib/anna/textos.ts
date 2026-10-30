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

  /** [CG] 5ª mensagem: mesma oferta da Dra., sem afirmar uma análise que não aconteceu */
  mensagem5:
    'Já passei o seu caso para a Dra. Carolina Calvo.\n\n' +
    'Pelo que você me contou, a sua situação é delicada. Por isso, o primeiro atendimento é ON LINE: nessa reunião ela vai explicar a possibilidade de obter judicialmente a SUSPENSÃO dos descontos bancários por até 6 MESES, além da *REVISÃO DE JUROS e reestruturação das suas dívidas*.\n\n' +
    'Ela pode atender você *{quando}*, ON LINE. Posso agendar?',

  /** [CG] nova oferta depois que o lead escolheu manhã ou tarde */
  nova_oferta: 'Ela pode atender você *{quando}*, ON LINE. Posso agendar?',

  /** [CG] o horário aceito foi ocupado entre a oferta e o "sim" */
  horario_ocupado: 'Esse horário acabou de ser preenchido. Ela pode atender você *{quando}*, ON LINE. Posso agendar?',

  /** [CG] o lead não pode no horário oferecido (regra da Dra.: perguntar manhã ou tarde) */
  manha_ou_tarde: 'Sem problema. Você prefere de manhã ou à tarde?',

  /** [DRA] confirmação, a partir do modelo "Agendado" (o link agora vai junto) */
  agendado:
    '*Agendado!* *{quando}*, ON LINE pelo Google Meet.\n\n' +
    'Link de acesso: {link}\n\n' +
    'Para que a análise seja a mais completa possível, peço que tenha em mãos *o seu último contracheque e o último extrato bancário*, pois serão utilizados para o *cálculo de superendividamento*.\n\n' +
    'Também é importante que você esteja *em um local tranquilo e com boa conexão de internet*, para que o atendimento transcorra da melhor forma.\n\n' +
    'Caso tenha algum imprevisto e não possa comparecer, peço, por gentileza, que *nos avise com antecedência*.',

  /** [CG] renda bruta até R$ 15 mil: a Anna não oferece reunião nem cria tarefa (Dra., 15/10); o card fica na coluna da renda */
  sem_reuniao: 'Obrigada pelas informações. Vou deixar o seu caso registrado para a equipe da Dra. Carolina avaliar o melhor caminho. Se tiver alguma dúvida, é só me escrever por aqui.',

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
  pendente_preferencia: 'Você prefere de manhã ou à tarde?',
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

/** "Maria, bom dia!" / "Boa tarde!" pela hora de Brasília (Dra., 28/10) */
export function saudacao(nome?: string, agora = new Date()): string {
  const h = Number(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }).format(agora)) % 24
  const s = h >= 5 && h < 12 ? 'bom dia' : h >= 12 && h < 18 ? 'boa tarde' : 'boa noite'
  return nome ? `${nome}, ${s}!` : `${s.charAt(0).toUpperCase()}${s.slice(1)}!`
}

export const TEXTOS = {
  pergunta1: (nome?: string, agora = new Date()) => preencher(texto('pergunta1'), { saudacao: saudacao(nome, agora) }),
  get pergunta2() { return texto('pergunta2') },
  get perguntaLimite() { return texto('pergunta_limite') },
  get aguardoValores() { return texto('aguardo_valores') },
  memoriaConfirma: (quando: string, valores: string) => preencher(texto('memoria_confirma'), { quando, valores }),
  mensagem3: (descontoConta: number | null) => (descontoConta && descontoConta > 0 ? texto('mensagem3') : texto('mensagem3_sem_desconto')),
  get mensagem4() { return texto('mensagem4') },
  mensagem5: (quando: string) => preencher(texto('mensagem5'), { quando }),
  novaOferta: (quando: string) => preencher(texto('nova_oferta'), { quando }),
  horarioOcupado: (quando: string) => preencher(texto('horario_ocupado'), { quando }),
  get manhaOuTarde() { return texto('manha_ou_tarde') },
  agendado: (quando: string, link: string) => preencher(texto('agendado'), { quando, link }),
  get semReuniao() { return texto('sem_reuniao') },
  get passaHumano() { return texto('passa_humano') },
  get semAgenda() { return texto('sem_agenda') },
  get desistiu() { return texto('desistiu') },
  get possuiAdvogado() { return texto('possui_advogado') },
}

export function brl(v: number): string {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })}`
}
