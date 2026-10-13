/**
 * Textos da Anna. Os marcados [DRA] são os textos da Dra. Carolina, como ela
 * enviou em 08/10/2026 (só espaço antes de pontuação foi corrigido). Os
 * marcados [CG] foram escritos pela Control Gestão no tom dela e precisam do OK.
 * A Anna nunca diz que é IA nem assistente virtual (decisão de 08/10).
 */

const saudacao = (nome?: string) => (nome ? `Olá, ${nome}.` : 'Olá.')

export const TEXTOS = {
  /** [DRA] 1ª pergunta, com a apresentação da Anna (lead que escreveu primeiro) */
  pergunta1: (nome?: string) =>
    `${saudacao(nome)} Aqui é a Anna, da equipe da Dra. Carolina Calvo.\n\n` +
    'Você quer saber se, no seu caso, é possível:\n\n' +
    '1) suspender os descontos bancários e pagamento das dívidas por até 6 meses?\n' +
    '2) reestruturar o pagamento das dívidas em condições mais favoráveis e com juros revisados?\n' +
    '3) as duas opções acima.',

  /** [DRA] 2ª pergunta */
  pergunta2:
    'Ótimo! Preciso apenas de três informações:\n\n' +
    '1) Qual é a sua renda bruta mensal?\n' +
    '2) Quanto você recebe líquido, após todos os descontos do contracheque?\n' +
    '3) Atualmente, quanto o banco desconta diretamente da sua conta corrente todos os meses?\n\n' +
    'Com essas informações, consigo fazer uma análise inicial e direcionar a melhor estratégia.',

  /** [DRA] 3ª mensagem, com o valor do desconto quando o lead informou (adaptação pedida na reunião) */
  mensagem3: (descontoConta: number | null) =>
    descontoConta && descontoConta > 0
      ? `Acredito que sem esses ${brl(descontoConta)} de descontos em conta corrente, tendo todo o seu salário líquido seria uma grande ajuda para respirar e ter um alívio financeiro, concorda?`
      : // [CG] variante para quem não tem desconto em conta corrente
        'Acredito que reduzindo esses descontos e sobrando mais do seu salário todo mês seria uma grande ajuda para respirar e ter um alívio financeiro, concorda?',

  /** [DRA] 4ª mensagem (o encaminhamento é real: vira nota e tarefa no card) */
  mensagem4: 'A sua *situação é delicada*, vou encaminhar esta conversa para a Dra. Carolina analisar e em alguns minutos *volto a falar com você*.',

  /** [CG] 5ª mensagem: mesma oferta da Dra., sem afirmar uma análise que não aconteceu */
  mensagem5: (quando: string) =>
    'Já passei o seu caso para a Dra. Carolina Calvo.\n\n' +
    'Pelo que você me contou, a sua situação é delicada. Por isso, o primeiro atendimento é ON LINE: nessa reunião ela vai explicar a possibilidade de obter judicialmente a SUSPENSÃO dos descontos bancários por até 6 MESES, além da *REVISÃO DE JUROS e reestruturação das suas dívidas*.\n\n' +
    `Ela pode atender você ${quando}, ON LINE. Posso agendar?`,

  /** [CG] nova oferta depois que o lead escolheu manhã ou tarde */
  novaOferta: (quando: string) => `Ela pode atender você ${quando}, ON LINE. Posso agendar?`,

  /** [CG] o horário aceito foi ocupado entre a oferta e o "sim" */
  horarioOcupado: (quando: string) => `Esse horário acabou de ser preenchido. Ela pode atender você ${quando}, ON LINE. Posso agendar?`,

  /** [CG] o lead não pode no horário oferecido (regra da Dra.: perguntar manhã ou tarde) */
  manhaOuTarde: 'Sem problema. Você prefere de manhã ou à tarde?',

  /** [DRA] confirmação, a partir do modelo "Agendado" (o link agora vai junto) */
  agendado: (quando: string, link: string) =>
    `*Agendado!* ${quando}, ON LINE pelo Google Meet.\n\n` +
    `Link de acesso: ${link}\n\n` +
    'Para que a análise seja a mais completa possível, peço que tenha em mãos *o seu último contracheque e o último extrato bancário*, pois serão utilizados para o *cálculo de superendividamento*.\n\n' +
    'Também é importante que você esteja *em um local tranquilo e com boa conexão de internet*, para que o atendimento transcorra da melhor forma.\n\n' +
    'Caso tenha algum imprevisto e não possa comparecer, peço, por gentileza, que *nos avise com antecedência*.',

  /** [CG] renda abaixo de R$ 10 mil: a Anna não marca reunião, a equipe avalia */
  semReuniao: 'Obrigada pelas informações. Vou deixar o seu caso registrado para a equipe da Dra. Carolina avaliar o melhor caminho, e alguém da equipe continua com você por aqui.',

  /** [CG] passagem para humano (pediu pessoa, perguntou se é robô, remarcação, assunto de outra área) */
  passaHumano: 'Vou pedir para alguém da equipe da Dra. Carolina continuar o seu atendimento por aqui.',

  /** [CG] sem agenda disponível (Google fora do ar ou sem horário nos próximos dias) */
  semAgenda: 'Vou pedir para a equipe da Dra. Carolina confirmar o melhor horário com você por aqui.',

  /** [CG] o lead disse que não quer continuar */
  desistiu: 'Tudo bem, entendo. Se mudar de ideia, é só me chamar por aqui.',

  /** [DRA] lead que já tem advogado no caso (resposta pronta "Possui advogado") */
  possuiAdvogado: 'Compreendo sua situação, mas, caso você já tenha um advogado atuando no processo, a Dra. não poderá auxiliá-lo, pois isso poderia comprometer a ética profissional estabelecida pela OAB. Recomendo que entre em contato diretamente com o seu advogado para tratar da questão.',
}

export function brl(v: number): string {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })}`
}
