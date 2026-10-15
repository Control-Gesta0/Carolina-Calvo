/**
 * Conteúdo da aba "Como usar" (o que muda por cliente). A página
 * (app/(painel)/como-usar) é a estrutura e liga cada etapa do fluxo aos textos
 * da base do cliente, lidos ao vivo: quando a equipe muda um texto em Ensinar,
 * o fluxo já mostra o novo. `base` são ids de agente/lib/base-core.ts (ITENS).
 *
 * Fonte do roteiro: agente/lib/anna/fluxo.ts (textos da Dra. em lib/anna/textos.ts),
 * réguas em agente/config/follow-ups.json, motivos em agente/lib/central-data.ts.
 */

/** Cenários do exame de publicação (agente/evals/cenarios.ts; o mesmo número do CENARIO de Ensinar). */
export const CENARIOS_EXAME = 21

export interface Passo { titulo: string; texto: string; href: string; acao: string }

export const PASSOS: Passo[] = [
  {
    titulo: 'Acompanhe',
    texto: 'Estatísticas mostra se a Anna está bem e o que pede decisão, como um lead que pediu para remarcar. Em Operação ficam as passagens para a equipe, as reuniões marcadas e o link de cada lead no Kommo.',
    href: '/', acao: 'Abrir Estatísticas',
  },
  {
    titulo: 'Atenda o que ela passou',
    texto: 'No Kommo, abra as tarefas da Dra. ou filtre pela tag atendimento-humano. A tarefa traz o motivo e o que o lead já informou: objetivo, renda bruta, líquido e desconto em conta. Ninguém precisa perguntar de novo.',
    href: '/operacao?aba=passagens', acao: 'Ver passagens',
  },
  {
    titulo: 'Teste antes de mudar',
    texto: 'Em Teste, converse como um lead. É a mesma Anna do WhatsApp, mas nada vai para o Kommo nem para a agenda da Dra. Resposta errada? Clique em Corrigir embaixo dela e diga como deveria ser.',
    href: '/teste', acao: 'Abrir Teste',
  },
  {
    titulo: 'Ensine',
    texto: 'Em Ensinar › Pedir mudança, escreva o que mudou, anexe um arquivo (PDF, Word, imagem) ou cole um link. Viu algo errado no WhatsApp? Em Conversas reais, clique em Corrigir. A IA muda o rascunho e mostra o antes e o depois.',
    href: '/ensinar', acao: 'Abrir Ensinar',
  },
  {
    titulo: 'Publique com o exame',
    texto: `Teste o rascunho e clique em Publicar com exame: ${CENARIOS_EXAME} conversas de teste rodam com os textos novos e só publica se todas passarem. Se não gostar, Versões anteriores › Voltar para esta.`,
    href: '/ensinar', acao: 'Ir para a publicação',
  },
]

/** Quando a Anna responde (tudo junto; se faltar um, ela fica quieta). */
export const ENTRADA = [
  'o lead tem a tag ia',
  'não tem a tag atendimento-humano nem a tag cliente',
  'ninguém da equipe escreveu para ele pelo Kommo nas últimas 6 horas',
  'o card não está em Gestão operacional nem no Financeiro',
]
export const ENTRADA_NOTA = 'Mensagens seguidas viram uma resposta só: ela espera uns 10 segundos. Áudio, foto e PDF ela ouve ou lê antes de responder. Cada mensagem parte do texto da Dra., e ela escreve com as próprias palavras, reagindo ao que o lead disse. Ela é cordial e nunca diz que é IA.'

export interface Etapa { titulo: string; texto: string; kommo?: string; base: string[] }

/** Como a conversa começa: as duas portas de entrada. */
export const INICIO: Etapa[] = [
  {
    titulo: 'O lead escreve primeiro',
    texto: 'A Anna se apresenta e faz a 1ª pergunta: se ele quer saber se é possível suspender os descontos por até 6 meses, reestruturar as dívidas com juros revisados ou as duas coisas.',
    base: ['pergunta1', 'pendente_q1'],
  },
  {
    titulo: 'O lead veio do formulário',
    texto: 'A Anna começa com o modelo "Anna - Primeiro contato", aprovado pela Meta, com a mesma 1ª pergunta. O texto do modelo só muda com nova aprovação da Meta: é pedido para a Control Gestão.',
    base: [],
  },
]

/** O roteiro fixo da Dra., depois da 1ª pergunta. */
export const ROTEIRO: Etapa[] = [
  {
    titulo: '2ª pergunta: renda e descontos',
    texto: 'Escolhida a opção, pede a renda bruta, o valor líquido e quanto o banco desconta direto da conta corrente. Se faltar um valor, pede só o que falta.',
    kommo: 'Com a renda bruta, o card vai para a coluna da renda no SDR: ATÉ 5 MIL, 5 A 10 MIL, 10 A 15 MIL ou ACIMA DE 15 MIL. Os valores vão para os campos IA - Renda bruta, IA - Renda líquida e IA - Desconto em conta.',
    base: ['pergunta2', 'pendente_q2'],
  },
  {
    titulo: '3ª mensagem: o alívio sem o desconto',
    texto: 'Usa o valor que o banco desconta da conta ("sem esses R$ 2.000 de descontos... concorda?"). Quem não tem desconto em conta recebe a outra versão.',
    base: ['mensagem3', 'mensagem3_sem_desconto', 'pendente_q3'],
  },
]

export const ATE_15K = {
  titulo: 'Renda bruta de até R$ 15 mil',
  texto: 'A Anna não oferece reunião (regra da Dra.). Avisa que o caso fica registrado para a equipe e para de conduzir. Não cria tarefa: a equipe filtra pela tag quando quiser trabalhar esses leads.',
  kommo: [
    'O card fica no SDR, na coluna da renda.',
    'Tag "ANNA renda até 15k".',
    'Sem tarefa, sem mudar de etapa e sem Venda perdida.',
    'Se o lead pedir reunião depois, ela passa para a equipe.',
  ],
  base: ['sem_reuniao'],
}

export const ACIMA_15K = {
  titulo: 'Renda bruta acima de R$ 15 mil',
  passos: [
    '4ª mensagem: vai encaminhar a conversa para a Dra. Carolina analisar. Fica uma nota no card.',
    '30 minutos depois, a 5ª mensagem oferece um horário real da agenda Google da Dra.',
    'Reunião on-line de 30 minutos pelo Google Meet, de segunda a sexta. Primeiro as tardes, das 15:00 às 17:30. Depois as manhãs, começando às 11:30 e indo até as 10:00.',
    'Pode ser no mesmo dia, com pelo menos 1 hora de antecedência.',
    'Não pode no horário: ela pergunta se prefere manhã ou tarde e oferece outro.',
  ],
  base: ['mensagem4', 'mensagem5', 'manha_ou_tarde', 'nova_oferta', 'horario_ocupado', 'pendente_preferencia'],
}

export const AGENDADO = {
  titulo: 'Aceitou o horário: reunião marcada',
  texto: 'A Anna confirma a reunião com o dia, a hora e o link do Meet.',
  kommo: [
    'Evento com Google Meet na agenda da Dra.',
    'Card para Closer › REUNIÃO AGENDADA.',
    'Campos Reunião e Agendamento preenchidos, além de IA - Horário da reunião e IA - Link do Meet.',
    'Tag "ANNA agendou".',
    'O lembrete de 24 horas antes é da Anna. Os de 2 horas, 1 hora e 15 minutos são da automação do escritório. Se o card saiu de Reunião agendada, a Anna cobre os de 1 hora e 15 minutos.',
  ],
  base: ['agendado'],
}

/** Em qualquer ponto do roteiro: a Anna passa para a equipe (chaves de MOTIVOS do agente). */
export const QUALQUER_MOMENTO: Array<{ motivo: string; texto: string }> = [
  { motivo: 'perguntou_robo', texto: 'Perguntou se está falando com um robô. Ela não confirma nem nega: passa.' },
  { motivo: 'pediu_humano', texto: 'Pediu para falar com a Dra. ou com uma pessoa.' },
  { motivo: 'tem_advogado', texto: 'Já tem advogado atuando no caso. Recebe o texto da Dra. sobre a ética da OAB.' },
  { motivo: 'ja_e_cliente', texto: 'Já é cliente do escritório.' },
  { motivo: 'outro_assunto', texto: 'O assunto é de outra área, como tributário ou trabalhista.' },
  { motivo: 'remarcar', texto: 'Tem reunião marcada e pediu para remarcar. Urgente.' },
  { motivo: 'sem_agenda', texto: 'A agenda Google não respondeu ou não tem horário livre nos próximos dias. Urgente.' },
  { motivo: 'abaixo_pediu_reuniao', texto: 'Renda até R$ 15 mil e pediu reunião mesmo assim.' },
]
export const QUALQUER_MOMENTO_BASE = ['passa_humano', 'possui_advogado', 'sem_agenda']

export const PASSAGEM = [
  'Coloca as tags atendimento-humano e "ANNA passou para humano".',
  'Tira a tag ia: daqui em diante quem responde é a equipe.',
  'Cria uma tarefa para a Dra. com prazo de 60 minutos, com o motivo e o que o lead já informou.',
  'Cancela o follow-up daquele lead.',
]

export const DESISTIU = {
  titulo: 'Disse que não quer continuar',
  texto: 'A Anna responde com educação e para. O card vai para SDR › NÃO QUER CONTINUAR, com uma nota.',
  base: ['desistiu'],
}

/** Réguas de follow-up (agente/config/follow-ups.json). */
export const FOLLOWUP = {
  regras: 'Das 7h às 20h, com os modelos aprovados pela Meta e, 2 horas depois da oferta, o texto que a equipe já usava. Fora dessa janela, a mensagem sai às 7h do dia seguinte. Qualquer resposta do lead ou mensagem da equipe cancela a régua. No fim, o card não vai para Venda perdida: fica no SDR, na coluna da renda, e se o lead voltar a escrever a Anna retoma de onde parou.',
  reguas: [
    {
      titulo: 'Parou de responder na qualificação',
      etapas: [
        'Follow 1: 2 horas depois da última mensagem da Anna',
        'Follow 2: 21 horas depois do Follow 1',
        'Follow up 3: 48 horas depois do Follow 2',
        'Follow up 4: 72 horas depois do Follow up 3',
        'Sem resposta: a sequência termina e o card fica na coluna da renda',
      ],
    },
    {
      titulo: 'Não respondeu à oferta de horário',
      etapas: [
        '"Ainda não tive sua confirmação sobre o horário que te enviei. Posso reservar esse horário para a sua reunião com a Dra. Carolina?": 2 horas depois da oferta',
        'SE 5 24h: 24 horas depois da oferta',
        'FUP encerramento 48h: 48 horas depois da oferta',
        'Sem resposta: a sequência termina e o card fica na coluna da renda',
      ],
    },
  ],
  nota: 'A mensagem 24 horas depois de Cliente decisão é da automação do escritório ("Follow Cliente decisão"), não da Anna.',
}

/** Travas em código: valem mesmo que o modelo tente o contrário. */
export const TRAVAS = [
  'Nunca diz que é IA, robô ou assistente virtual. Se perguntarem, passa para a equipe.',
  'Nunca fala de honorários, valor da ação, parcela ou porcentagem. Isso é assunto da reunião com a Dra.',
  'Nunca promete resultado ("garantido", "com certeza vamos conseguir").',
  'Não pede para o lead mandar documento, foto ou print. Na confirmação, pede para ter o contracheque e o extrato em mãos na reunião.',
  'Uma pergunta por mensagem, sem travessão e sem emoji.',
  'Quem decide o que dizer, a coluna do card, o horário e a passagem é o código. O modelo lê o que o lead escreveu e escreve a mensagem a partir do texto da Dra.; horários, valores e informações são conferidos antes de sair, e se a redação não passar sai o texto da Dra.',
  'Só oferece horário livre na agenda Google da Dra. e confere de novo antes de marcar.',
]

/** Quem muda o quê. */
export const QUEM_MUDA = {
  voce: [
    'Os textos do roteiro: 1ª e 2ª perguntas, 3ª, 4ª e 5ª mensagens',
    'As ofertas de horário e a confirmação da reunião',
    'Os textos de quando a Anna para: passagem, renda até 15 mil, sem horário, advogado',
    'As retomadas depois de uma dúvida do lead',
    'Os fatos que ela responde: reunião, endereço, atendimento presencial',
    'Informações novas sobre o escritório',
  ],
  control: [
    'A regra dos R$ 15 mil (só acima disso ela oferece reunião)',
    'Dias e horários da agenda da Dra.',
    'Os follow-ups: quando e quantos',
    'Os modelos aprovados pela Meta',
    'Colunas, tags, campos e tarefas do Kommo',
    'Quando ela passa para a equipe',
  ],
  nunca: ['Dizer que é IA', 'Falar de honorários ou do valor da ação', 'Prometer resultado', 'Pedir documento ao lead'],
}

export const TAGS = [
  { tag: 'ia', significa: 'A Anna atende este lead.', quem: 'Combinado com a Control Gestão. A liberação é em etapas: 1 lead de teste, depois 10 leads, depois todos.' },
  { tag: 'atendimento-humano', significa: 'A equipe está com o lead. A Anna não responde.', quem: 'A Anna, na passagem. Vocês também podem colocar a qualquer hora.' },
  { tag: 'ANNA passou para humano', significa: 'Foi a Anna que passou o lead para a equipe.', quem: 'A Anna.' },
  { tag: 'ANNA agendou', significa: 'Reunião marcada pela Anna.', quem: 'A Anna.' },
  { tag: 'ANNA renda até 15k', significa: 'Renda bruta até R$ 15 mil: a Anna não oferece reunião e não cria tarefa. Filtre pela tag.', quem: 'A Anna.' },
  { tag: 'OUT 26, NOV 26…', significa: 'Mês em que o lead entrou por formulário de campanha. Conversa espontânea pelo WhatsApp não ganha. O card novo reúne as dos cards anteriores do mesmo telefone, sem repetir mês.', quem: 'A Anna, até 5 minutos depois de o card entrar (quando liberada pela Dra.).' },
  { tag: 'cliente', significa: 'Já é cliente do escritório. A Anna não fala com ele.', quem: 'A equipe.' },
]

export const ACOES = [
  { titulo: 'Tirar a Anna de um lead', texto: 'Coloque a tag atendimento-humano. Ela para de responder na hora.' },
  { titulo: 'Devolver um lead para a Anna', texto: 'Tire a tag atendimento-humano e coloque a tag ia. Ela começa um atendimento novo, do início do roteiro.' },
  { titulo: 'Responder pelo Kommo', texto: 'Se alguém da equipe escrever para o lead pelo Kommo, a Anna fica 6 horas sem responder aquele lead.' },
]

/** Campos do card que são da Anna (a equipe não edita). */
export const CAMPOS_IA = [
  'IA - Resposta (Anna)', 'IA - Primeiro nome', 'IA - Horário da reunião', 'IA - Link do Meet',
  'IA - Objetivo', 'IA - Renda bruta', 'IA - Renda líquida', 'IA - Desconto em conta',
]

export const COMBINADOS = [
  { titulo: 'Não disparem "/follow up" nem "FOLLOW AGENDAR REUNIÃO" em lead com a tag ia.', porque: 'A Anna já faz o follow-up desses leads. Dois follow-ups ao mesmo tempo confundem o lead.' },
  { titulo: 'Não editem os campos "IA - ..." do card.', porque: 'São da Anna. O IA - Resposta (Anna) é o texto que o Salesbot envia ao lead.' },
  { titulo: 'Não apaguem colunas ou campos que a Anna usa, nem renomeiem as tags dela.', porque: 'Colunas e campos ela encontra pelo número interno do Kommo; tags, pelo nome. Precisa mudar? Peça para a Control Gestão antes.' },
  { titulo: 'Mudou um texto, um fato do escritório ou uma informação?', porque: 'Peça em Ensinar: a IA atualiza e o exame confere. Regra do roteiro vira pedido para a Control Gestão.' },
  { titulo: 'Viram uma resposta estranha?', porque: 'Corrija em Ensinar › Conversas reais. Se for regra do roteiro, a IA registra o pedido para a Control Gestão.' },
]

export const FAQ = [
  { p: 'A Anna diz que é uma IA?', r: 'Não. É decisão do escritório. Se o lead perguntar se é robô, ela não confirma nem nega: passa para a equipe, com tarefa para a Dra.' },
  { p: 'E se o lead mandar áudio, foto ou PDF?', r: 'Ela ouve o áudio e lê a imagem ou o PDF antes de responder, e usa o que leu na conversa. Ela não pede documento.' },
  { p: 'E se o lead perguntar quanto custa?', r: 'Ela diz que a primeira reunião on-line não é cobrada. Honorários e valor da ação ficam para a reunião com a Dra.: ela nunca fala de valor.' },
  { p: 'Por que ela não marcou reunião com um lead?', r: 'Só acima de R$ 15 mil de renda bruta ela oferece reunião: é regra da Dra. Abaixo disso, ela registra o caso e põe a tag "ANNA renda até 15k", sem tarefa. O card fica na coluna da renda: filtre pela tag para trabalhar esses leads.' },
  { p: 'Respondi um lead e a Anna parou. Está com problema?', r: 'Não. Quando alguém da equipe escreve pelo Kommo, ela fica 6 horas sem responder aquele lead para não atropelar vocês.' },
  { p: 'Mudei um texto em Ensinar. Já vale no WhatsApp?', r: `Só depois de publicar. A mudança fica no rascunho até o exame aprovar as ${CENARIOS_EXAME} conversas de teste.` },
]
