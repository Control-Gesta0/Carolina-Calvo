# Escopo definido na reunião de onboarding (08/10/2026)

> Fontes: mensagem do Guilherme com as regras e os textos da Dra. Carolina, e o resumo da reunião (Fathom, 60 min).
> Estado do projeto: `DIAGNOSTICANDO`. Passa para `DESENHANDO` quando os itens da seção 5 forem respondidos.
> Os textos da Dra. estão no anexo exatamente como foram enviados.

## 1 · Anna, a SDR

| Regra | Definição |
|---|---|
| Nome | **Anna** (o resumo da reunião escreveu "Ana": confirmar a grafia) |
| Apresentação | "Anna, atendente inicial" da equipe da Dra. Carolina |
| Tom | Formal, sem soar robótico |
| Pedido da Dra. | Nunca dizer que é IA ou assistente virtual (ver ponto 5.1) |
| Documentos | Nunca pedir documentos |
| Treino | Conversas de setembro e outubro da Dra. e as objeções, enviadas por ela |
| Base inicial | Leads de superendividamento (SE) de 01/09/2026 até hoje, separados nas colunas por renda bruta |

**Base de 01/09 a 08/10/2026 (retrato do Kommo):** 352 leads SE. Pela faixa do formulário: acima de 15 mil, 121 · de 10 a 15 mil, 145 · de 5 a 10 mil, 75 · até 5 mil, 11. Isso dá 266 leads que podem agendar e 86 abaixo de 10 mil.

### Regras por renda bruta

| Renda bruta | O que a Anna faz |
|---|---|
| Abaixo de R$ 10 mil | Move para a coluna da renda e **não oferece reunião**. A conversa **não é encerrada**: a Anna continua respondendo (decidido em 08/10) |
| De R$ 10 mil a R$ 15 mil | Agenda para preencher a agenda, com preferência para quem ganha acima de R$ 13,5 mil |
| Acima de R$ 15 mil | **Prioridade** |

O formulário é impreciso, então a Anna reconfirma a renda na conversa (mensagem 2) e só então move o card para a coluna certa.

### Roteiro (5 etapas)

1. **Pergunta 1:** o que o lead quer saber (suspender descontos, reestruturar a dívida ou as duas coisas).
2. **Pergunta 2:** renda bruta, salário líquido e desconto direto na conta corrente. Com a resposta, a Anna move o card para a coluna da renda.
3. **Mensagem 3:** reforço da dor, adaptado ao desconto que o lead informou.
4. **Mensagem 4:** avisa que vai levar o caso para a Dra. e faz uma **pausa de 30 minutos**.
5. **Mensagem 5:** convite para a reunião on-line, oferecendo **um único horário**.

### Agenda

| Regra | Definição |
|---|---|
| Ferramenta | Google Agenda com link do Google Meet. Sem link de agendamento para o lead |
| Duração | 30 minutos |
| Oferta | Um horário por vez, na sequência abaixo, para a Dra. fazer as reuniões seguidas |
| Ordem | **Tarde primeiro:** 15:00, 15:30, 16:00, 16:30, 17:00, 17:30. **Depois a manhã, do mais tarde para o mais cedo:** 11:30, 11:00, 10:30, 10:00 |
| Se o lead não puder | Pergunta se prefere manhã ou tarde e oferece no dia seguinte, seguindo a mesma ordem |
| Lembretes | 24 horas, 1 hora e 15 minutos antes |
| Bloqueios | A Dra. cria um evento na própria agenda e a Anna não oferece aquele horário |

A lista enviada tem "16:00" duas vezes na tarde. Pelo resumo da reunião (15h às 17h30), o segundo deve ser 16:30. Falta confirmar.

## 2 · Cobrança automática (Asaas)

| Momento | Mensagem |
|---|---|
| 4º dia útil do mês | Lembrete com o link de pagamento |
| Dia do vencimento, de manhã | "Segue o boleto... vencimento HOJE" |
| Dia do vencimento, 17:00 | "Não localizamos o pagamento..." |
| D+1 | Lembrete de parcela vencida ontem, com o link |
| D+5 | Primeira cobrança, com prazo até 17:00 do dia |
| D+10 | Segunda cobrança: atendimento e atualizações pausados até o pagamento |
| D+18 | Pré-notificação extrajudicial com prazo de 48 horas (data limite = envio + 2 dias, às 17:00) |
| Pagou | Mensagem de confirmação |
| Em atraso | Tag **inadimplentes** |

A maioria dos vencimentos é no dia 07. Para quem vence em outro dia, sai um lembrete 4 dias antes e outro no dia do vencimento.

## 3 · Configuração técnica

| Item | Estado |
|---|---|
| Kommo (token) | recebido e validado em 08/10 |
| OpenAI (chave) | recebida e validada em 08/10 (HTTP 200, modelos da linha GPT-5.4 disponíveis). Guardada fora do repositório; vai para as variáveis da Vercel |
| OpenAI (faturamento) | limite de US$ 20/mês, recarga automática de US$ 10 quando o saldo cai abaixo de US$ 5 |
| Google Agenda | pendente: a Dra. gera pelo tutorial `tutoriais/01-google-agenda.mp4` |
| Asaas | pendente: a Dra. gera pelo tutorial `tutoriais/02-asaas.mp4` |

## 4 · O que ainda não foi definido

- Follow-up durante a qualificação: quantas tentativas, intervalo e quando desistir.
- Follow-up após a proposta: etapa que dispara, onde a equipe escreve o resumo e a cadência.
- Passagem para humano: quem recebe, como fica sabendo e por quanto tempo a Anna fica em silêncio.
- Textos que faltam na cobrança: 4º dia útil, lembrete de 4 dias antes (vencimentos fora do dia 07) e confirmação de pagamento. A Dra. vai mandar as mensagens finais num arquivo só.

## 5 · Pontos de atenção (precisam de decisão antes de construir)

### 5.1 "Nunca dizer que é IA" · **decidido**

**Decisão de 08/10:** a Anna nunca toca no assunto. Se o lead perguntar se é robô, ela passa a conversa para a equipe.


A Anna pode atender sem se apresentar como IA ou assistente virtual. O que não dá para implementar é **negar** quando o lead pergunta diretamente. Para um escritório de advocacia, a mentira descoberta vira problema de ética profissional e de reputação, e o lead costuma perguntar justamente quando já desconfia.

**Proposta:** a Anna nunca toca no assunto. Se o lead perguntar "é robô?", ela não confirma nem nega: diz que vai chamar alguém da equipe e passa a conversa para um humano.

### 5.2 Mensagens 4 e 5: "a Dra. analisou seu caso" · **a confirmar com a proposta abaixo**

**Resposta de 08/10:** a pausa existe só para parecer que alguém analisou.

**Como vai ser implementado:** a pausa de 30 minutos e o "vou encaminhar para a Dra. Carolina" continuam. O encaminhamento passa a ser real: a Anna grava uma nota no card com o resumo do caso, sem exigir nenhuma ação da Dra. O que não entra é a frase falsa "a Dra. analisou seu caso" nem "o seu caso é urgente" dito para todo lead.

Mensagem 5 proposta, com o mesmo efeito:

> Já passei o seu caso para a Dra. Carolina Calvo.
>
> Pelo que você me contou, a sua situação é delicada. Por isso, o primeiro atendimento é ON LINE: nessa reunião ela vai explicar a possibilidade de obter judicialmente a SUSPENSÃO dos descontos bancários por até 6 MESES, além da *REVISÃO DE JUROS e reestruturação das suas dívidas*.
>
> Ela pode atender você HOJE às 17:00, ON LINE. Posso agendar?

**Contexto do diagnóstico:**

Hoje a pausa de 30 minutos **simula** a análise. Ninguém olha o caso, mas a mensagem 5 afirma que a Dra. analisou e que o caso é urgente. Isso vale para todo lead, inclusive os que não são urgentes. A doutrina da casa trata isso como promessa que mente: o texto descreve um processo que não existe.

Opções:
- **(a) Tornar verdade.** Na mensagem 4, a Anna envia um resumo de 3 linhas para o WhatsApp da Dra. Se em 30 minutos ela não vetar, a mensagem 5 sai. Com isso, "a Dra. viu o seu caso" passa a ser verdade.
- **(b) Manter a pausa e ajustar o texto.** A mensagem 5 deixa de afirmar a análise. Exemplo: "Pelo que o senhor me contou, a Dra. Carolina consegue explicar na reunião a possibilidade de suspender os descontos...".

Recomendação: (a), se a Dra. topar dar um OK rápido. Caso contrário, (b).

### 5.3 Janela de 24 horas do WhatsApp oficial · **modelos criados**

**08/10:** os 12 modelos e 7 campos foram criados no Kommo como rascunho (lista em `modelos-whatsapp.md`). Falta enviar para a aprovação da Meta.


Lembretes de reunião e toda a régua de cobrança saem para quem não falou nas últimas 24 horas. No número oficial isso só funciona com **modelos aprovados pela Meta** (categoria utilidade), com custo por envio. Serão uns 12 modelos: 3 lembretes de reunião e cerca de 9 de cobrança.

Também é preciso decidir **por qual número a cobrança sai**. Os clientes conversam pelo WhatsApp Lite, que não tem janela, mas o envio automático por ele precisa ser testado e tem risco de bloqueio se o volume for alto.

### 5.4 Limite da OpenAI · **decidido: fica em US$ 20**

**Decisão de 08/10:** o limite continua em US$ 20/mês. Com isso, o alerta de saldo esgotado na OpenAI passa a ser obrigatório no grupo de alertas.


São cerca de 25 leads por dia, mais áudios e imagens. US$ 20 por mês pode ficar no limite. Quando o limite estoura, a Anna fica muda sem avisar ninguém. Por isso:
- o alerta de erro precisa avisar quando a OpenAI recusar por saldo;
- no primeiro mês, o ideal é subir o limite para US$ 40 e ajustar quando o painel mostrar o custo real (1 a 2 semanas de uso).

### 5.5 Outros pontos

- **Conversas para treino:** o Kommo não entrega o texto das conversas pela API. A Dra. precisa enviar prints ou o texto copiado de 10 a 20 conversas boas, mais as objeções.
- **Automações antigas:** a regra que devolve o lead para "5 A 10 MIL" e o robô FOLLOW 1 a 4 precisam ser desligados nos leads da Anna (levantado na análise de 08/10).
- **Prioridade acima de R$ 15 mil:** falta definir o que muda na prática. Pode ser o primeiro horário livre, horários reservados à tarde ou atendimento antes da fila.
- **Agenda:** falta definir os dias da semana, a antecedência mínima para oferecer "hoje" e quantos dias à frente a Anna pode marcar.
- **Asaas:**
  - as cobranças já existem no Asaas ou o sistema cria a partir do card?
  - como ligar o cliente do Asaas ao card do Kommo (CPF ou telefone)?
  - as notificações automáticas do próprio Asaas continuam ligadas? Se continuarem, o cliente recebe mensagem dupla;
  - os dias úteis consideram feriados do DF?
- **Texto das 17:00:** "Fique atenta" supõe que o cliente é mulher. Sugestão neutra: "Para evitar juros ou encargos por atraso, ...". Só muda com aprovação da Dra.
- **Tag inadimplentes:** entra em D+1? Sai automaticamente quando o pagamento é confirmado?

---

## Anexo · textos da Dra. Carolina (como enviados)

### SDR

**1ª pergunta**
> Você quer saber se, no seu caso, é possível:
> 1) suspender os descontos bancários e pagamento das dívidas por até 6 meses ?
> 2) reestruturar o pagamento das dívidas em condições mais favoráveis e com juros revisados ?
> 3) as duas opções acima.

**2ª pergunta**
> Ótimo ! Preciso apenas de três informações:
> 1) Qual é a sua renda bruta mensal?
> 2) Quanto você recebe líquido, após todos os descontos do contracheque?
> 3) Atualmente, quanto o banco desconta diretamente da sua conta corrente todos os meses?
> Com essas informações, consigo fazer uma análise inicial e direcionar a melhor estratégia.

**3ª mensagem**
> Acredito que sem esses descontos em conta corrente, tendo todo o seu salário líquido seria uma grande ajuda para respirar e ter um alívio financeiro, concorda ?

**4ª mensagem**
> A sua *situação é delicada*, vou encaminhar esta conversa para a Dra. Carolina analisar e em alguns minutos *volto a falar com você*.

**5ª mensagem**
> A Dra. Carolina Calvo analisou seu caso e disse ser delicado.
> Como o seu caso é urgente , o primeiro atendimento é ON LINE, nessa reunião ela irá te explicar sobre a possibilidade de obter judicialmente a SUSPENSÃO dos descontos bancários por até 6 MESES, além da *REVISÃO DE JUROS e reestruturação das suas dívidas* .
> Ela pode te atender HOJE às 17:00 ON LINE , posso agendar ?

### Cobrança

**Dia do vencimento, 17:00**
> Até o momento, *não localizamos em nosso sistema o pagamento da sua parcela de honorários com vencimento na data de hoje*.
> Fique atenta para *não pagar juros ou encargos por atraso*.
> Lembramos que, conforme a *Cláusula 7ª (Subcláusulas 1ª e 5ª)* do seu contrato, o vencimento da parcela de honorários *não está atrelado ou condicionado ao envio de atualizações ou andamentos processuais*.

**Dia do vencimento, manhã**
> Bom dia.
> Segue o boleto referente à sua ação.
> Data de vencimento no dia de HOJE.
> Link para pagamento:
> Caso o pagamento já tenha sido efetuado, peço a gentileza de me encaminhar o comprovante.
> Desde já, agradeço.

**D+1**
> Passando por aqui para lembrar que a sua parcela com vencimento ontem ainda não consta com baixa em nosso sistema financeiro.
> Para facilitar a sua regularização ainda hoje e mantermos o seu contrato 100% em dia, segue O LINK DE PAGAMENTO
> Por favor, me envie o comprovante por aqui. Se já tiver efetuado o pagamento, por favor desconsidere esta mensagem.

**D+5**
> Olá, tudo bem ?
> Constatamos em nosso sistema financeiro que a sua parcela com vencimento em 07/x/26 permanece pendente de quitação, completando hoje 5 dias de atraso .
> Para mantermos a regularidade do seu contrato e evitarmos o encaminhamento do seu débito para as medidas administrativas previstas, disponibilizo abaixo o link de pagamento :
> Por gentileza, realize o pagamento e nos envie o comprovante por aqui até às 17:00 de hoje para darmos a baixa imediata no sistema.
> Caso tenha ocorrido algum imprevisto financeiro atípico neste mês, me avise por este canal para que possamos avaliar a melhor alternativa para a sua situação.
> Ficamos no aguardo da sua confirmação!

**D+10**
> Olá, X como vai?
> Constatamos em nosso sistema financeiro que a sua parcela com vencimento em [Data de Vencimento] continua pendente de quitação, completando hoje [Nº] dias de atraso .
> Para mantermos a transparência em relação à condução do seu caso, alinhamos os seguintes pontos:
> 1) Acompanhamento Processual Mantido: Esclarecemos que o nosso setor jurídico continua acompanhando e monitorando ativamente o seu processo na Justiça, garantindo a total segurança dos seus prazos e a rigorosa defesa técnica dos seus direitos.
> 2) Pausa no Repasse de Informações e Suporte: No entanto, enquanto durar a pendência financeira, o repasse de atualizações processuais, o envio de relatórios de andamento, agendamentos de reuniões e o suporte ativo de atendimento por este canal de WhatsApp ficam oficialmente paralisados, sendo restabelecidos imediatamente após a baixa do pagamento.
> Para regularizar a sua situação hoje, reativar o seu suporte de atendimento e liberar o envio de atualizações, disponibilizamos o link de pagamento abaixo:
> Por gentileza, realize o pagamento e nos envie o comprovante por aqui até às 17:00 de hoje para darmos a baixa imediata no sistema e liberarmos o seu fluxo de atendimento.
> Ficamos no aguardo da sua confirmação!

**D+18 (pré-notificação extrajudicial, ultimato de 48h)**
> Fulano,
> Verificamos em nosso sistema financeiro que a sua parcela com *vencimento em [Data de Vencimento]* permanece pendente de quitação, *completando hoje [Nº] dias de atraso* .
> Como *não tivemos o seu retorno* às nossas tentativas de contato anteriores, reforçamos os termos da condução da sua pasta:
> *1) Acompanhamento Processual Mantido:* O nosso setor jurídico continua monitorando e resguardando a sua ação na Justiça com total segurança, garantindo a defesa dos seus direitos.
> *2) Atendimento e Atualizações Paralisados:* No entanto, o repasse de informações do processo e o suporte ativo por este canal de WhatsApp seguem oficialmente *paralisados até a regularização do débito* .
> Para evitarmos o encerramento do seu plano facilitado e o encaminhamento do débito para notificação extrajudicial com aplicação das multas contratuais, estipulamos o *prazo limite até [COLOCAR SEMPRE 2 DIAS APÓS O ENVIO DESSA MSG]* *, às 17:00* , para a quitação da parcela.
> Ficamos no aguardo.
