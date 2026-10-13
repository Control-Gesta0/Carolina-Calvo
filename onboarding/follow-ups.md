# Follow-ups da Anna: régua atual medida no Kommo e como vai ser automatizada

> Levantamento de 13/10/2026 pela API do Kommo (só leitura): textos dos modelos aprovados e 30 dias de eventos (13/09 a 13/10). Os textos abaixo estão **exatamente** como estão salvos no Kommo, sem nenhuma alteração.
> A configuração interna dos Salesbots (blocos, esperas e condições) não aparece na API. Ela será conferida na tela pelo Cowork antes da implantação (`prompt-cowork-ler-salesbots.md`).

## 1 · Régua de qualificação (lead parou de responder)

Medido em 239 disparos nos últimos 30 dias. Os intervalos se repetem ao minuto, o que indica esperas fixas no Salesbot.

| Etapa | Modelo | Quando sai hoje (medido) | Como a Anna vai reproduzir |
|---|---|---|---|
| FOLLOW 1 | Follow 1 (`49790`) | 2h depois da última mensagem enviada sem resposta (mediana 2,02h) | 2h depois da última mensagem da Anna sem resposta |
| FOLLOW 2 | Follow 2 (`49666`) | 21h depois do FOLLOW 1, ou seja, cerca de 23h depois da última mensagem (123 de 123 casos) | 21h depois do FOLLOW 1 |
| FOLLOW 3 | Follow up 3 (`49452`) | 48h depois do FOLLOW 2 (72 de 72 casos) | 48h depois do FOLLOW 2 |
| FOLLOW FINAL | Follow up 4 (`49454`) | 72h depois do FOLLOW 3 (58 de 58 casos) | 72h depois do FOLLOW 3 |
| Encerramento | (sem mensagem) | 24h depois do FINAL, a tag sai e o lead vai para **Gestão operacional › Venda perdida** | Igual, salvo decisão em contrário (pergunta 4) |

Da última mensagem sem resposta até o encerramento são 167 horas (6 dias e 23 horas). Hoje a régua roda também no sábado e no domingo, e os envios observados ficaram todos entre 7h e 20h.

Os intervalos que a Dra. descreveu (2h, 24h, 48h e 72h) batem com o medido quando lidos como a distância entre uma etapa e a seguinte. A única diferença é o FOLLOW 2: ele sai 21h depois do FOLLOW 1, o que dá cerca de 23h depois da última mensagem. A Anna vai usar os valores medidos.

### Textos (como estão no Kommo)

**Follow 1** · modelo `49790` · Marketing · aprovado

> Você sabia que, em muitos casos, é possível obter uma decisão judicial para *suspender os descontos de empréstimos por até 6 meses* ?
>
> Me responda: os descontos acontecem apenas no *contracheque* ou também na *conta corrente* ?
>
> Com essa informação, consigo verificar qual é o próximo passo do seu atendimento.

**Follow 2** · modelo `49666` · Marketing · aprovado

> Ontem eu lhe fiz uma pergunta e não tive retorno.
>
> Dependendo da forma como os descontos acontecem, pode haver *medida judicial para aliviar a sua situação financeira* .
>
> Me responda apenas: *os descontos acontecem apenas no contracheque ou também na conta corrente* ?

**Follow up 3** · modelo `49452` · Marketing · aprovado

> Muitas pessoas acreditam que precisam continuar suportando esses descontos, quando na verdade existem alternativas que desconhecem.
>
> *Se ainda tiver interesse, basta responder esta mensagem* . Assim verifico se o seu caso pode ser analisado pelo escritório.

**Follow up 4** · modelo `49454` · Marketing · aprovado

> Como não tive seu retorno, vou *encerrar seu atendimento* .
>
> Se ainda desejar verificar se existe alguma medida para reduzir o impacto dos descontos, basta *responder esta mensagem a qualquer momento* . Terei prazer em dar continuidade ao seu atendimento.

## 2 · Régua de agendamento (horário oferecido e não confirmado)

Não há tag nem evento automático que identifique essa régua nos últimos 30 dias, então o envio hoje parece ser manual. Pelo nome, o modelo mais provável para o FOLLOW 1 (2h sem confirmação) é o **FUP horário reunião**. Existem também dois modelos que, pelo nome, parecem ser etapas seguintes dessa régua (**SE 5 24h** e **FUP encerramento 48h**). Falta confirmar na tela (pergunta 1).

**FUP horário reunião** · modelo `46734` · Marketing · aprovado

> você prefere *continuar como está* ou *entender o que pode ser ajustado pra parar esse prejuízo* ?

**SE 5 24h** · modelo `47012` · Marketing · aprovado

> Quem continua *adiando esse tipo de decisão* normalmente afunda cada vez mais na própria situação financeira.
>
> Porque *o banco não espera*.
>
> Os *descontos continuam*.
>
> E os *juros continuam*.

**FUP encerramento 48h** · modelo `46746` · Marketing · aprovado

> Vou encerrar por aqui.
>
> *Mas antes, preciso te dizer algo com sinceridade*: muita gente passa anos reclamando da situação financeira enquanto o banco continua retirando dinheiro da conta sem resistência nenhuma.
>
> *E o pior*: com o tempo, a pessoa começa a achar normal viver assim.
>
> Se você decidir parar de deixar isso para depois e realmente resolver sua situação, me chama.

## 3 · Régua pós-reunião e proposta

Existe uma automação de uma etapa: **24h depois que o lead entra em Closer › Cliente decisão**, sai uma mensagem e o robô põe a tag **Follow-up Cliente Decisão Enviado**. Foram 47 casos nos últimos 30 dias, todos exatamente 24h depois da entrada na etapa. A mensagem não aparece nos eventos, e o modelo mais provável é o **Pergunta reunião** ("Ontem você esteve em reunião...").

Os demais modelos de pós-reunião não aparecem em nenhuma automação, ou seja, hoje a equipe envia à mão. Falta definir a ordem e os intervalos (pergunta 2).

**Pergunta reunião** · modelo `48922` · Utility · aprovado

> Olá, tudo bem? Ontem você esteve em reunião com a Dra. Carolina Calvo.  Ficou com alguma dúvida que eu possa esclarecer?

**Pós reunião** · modelo `45379` · Marketing · aprovado

> Olá, passando para saber como você ficou em relação ao que conversamos.
>
> Você já tem todas as informações e os caminhos possíveis.
>
> Agora depende da sua decisão pra gente dar andamento.
>
> Me confirma como prefere seguir?

**FUP Reunião** · modelo `45642` · Marketing · aprovado

> Olá, você esteve em reunião com a Dra. Carolina e viu claramente o impacto que sua situação tem na sua *vida financeira*.
>
> O que normalmente trava aqui não é falta de solução — é *decisão*.
>
> Então vamos simplificar:
>
> Você quer resolver isso agora ou prefere ter que lidar com as *consequências financeiras disso* ?

**Fechamento 2** · modelo `46756` · Marketing · aprovado

> Olá.
>
> Vou ser direta: *o banco não está esperando você decidir*.
>
> Enquanto você adia, *os descontos continuam, os juros aumentam e sua renda segue comprometida mês após mês*.
>
> Você já entendeu o problema e viu que isso dificilmente se resolve sozinho. O que falta *agora é decisão.*
>
> 📌 Amanhã é o *último dia da condição* liberada para o seu caso.
>
> Além da estratégia principal da ação, está incluída sem custo adicional a *ação de seguro prestamista* (havendo viabilidade jurídica).
>
> E sendo transparente com você: *esse tipo de seguro costuma existir em muitos contratos* e, isoladamente, uma ação dessa normalmente teria custo próprio para ingresso.
>
> * A pergunta é simples*:
>
> você quer continuar nesse cenário por mais alguns meses ou quer *começar a mudar isso agora*?

**Quero fechar** · modelo `46832` · Marketing · aprovado

> Passando para te lembrar que *hoje é o último dia* da condição especial liberada pela Dra. Carolina para o seu caso. 📌
>
> ✅ Fechando até *HOJE* 07/05/2026 *às 23h59*, será incluída sem custo adicional a análise relacionada à *ação de seguro prestamista* (havendo viabilidade jurídica).
>
> Enquanto a *decisão é adiada*, o banco continua aumentando o comprometimento da sua renda e consolidando cobranças que poderiam estar sendo *canceladas*.
>
> Após hoje, essa condição será *encerrada*.
> Se quiser deixar seu caso encaminhado dentro dessa condição, me responde com:
>
> *QUERO FECHAR*

**Atenção a dois textos:**

- **Quero fechar** tem a data fixa "HOJE 07/05/2026". Mandado hoje sem alteração, informa uma data errada ao cliente.
- **Fechamento 2** diz "Amanhã é o último dia da condição liberada para o seu caso". Só entra na régua se a proposta registrada pela equipe tiver uma validade real.

## 4 · Como a automação vai funcionar

- **Acionamento automático.** A Anna marca o horário da última mensagem que enviou. Se o lead não responder:
  - em 2 horas, começa a régua de **agendamento**, se essa última mensagem foi uma oferta de horário;
  - em 2 horas, começa a régua de **qualificação** nos demais casos;
  - quando a equipe move o lead para a etapa de proposta (hoje, Cliente decisão), começa a régua de **pós-proposta**.
  - Ninguém precisa mais digitar `/follow up`.
- **Resposta cancela tudo.** Qualquer mensagem do lead apaga, na mesma hora, todos os próximos disparos da régua. A Anna volta a conversar a partir do ponto em que parou.
- **Uma régua por vez.** Cada lead tem no máximo uma régua ativa. Começar outra substitui a anterior, e nunca saem duas sequências em paralelo.
- **Também cancelam a régua:**
  - passagem para humano ou tag de atendimento humano;
  - reunião marcada (a partir daí só saem os lembretes de reunião);
  - lead em Gestão operacional ou Financeiro, ou com a tag Cliente;
  - lead marcado como perdido.
- **Modelos aprovados.** Todos os passos usam os modelos já aprovados, sem mudar o texto, porque a partir da 2ª etapa a janela de 24h da Meta já fechou.
- **Sem duplicidade com o robô antigo.** Antes de ligar a Anna, é preciso:
  - desligar, nos leads da Anna, o Salesbot que põe as tags FOLLOW 1 a 4;
  - desligar a automação de 24h em Cliente decisão, para ela não mandar a mesma mensagem duas vezes.
  - Isso é conferido na tela pelo Cowork antes da virada.

## 5 · Decisões de 13/10/2026

1. **Agendamento:** a régua é **FUP horário reunião** 2h depois da oferta de horário, **SE 5 24h** 24h depois da oferta e **FUP encerramento 48h** 48h depois da oferta. Depois disso, o lead segue o mesmo encerramento da qualificação: vai para Venda perdida 24h depois (a confirmar).
2. **Pós-proposta:** a primeira mensagem é **Pergunta reunião**, 24h depois da entrada em Cliente decisão. As etapas seguintes ainda não foram definidas e continuam manuais.
3. **Horário:** os envios saem das 7h às 20h, todos os dias. O que cair fora desse horário sai às 7h do dia seguinte, e as etapas seguintes contam a partir do envio real.
4. **Encerramento:** continua indo para **Gestão operacional › Venda perdida**.
5. **Renda abaixo de R$ 10 mil:** recebe a régua de qualificação normalmente. A única diferença é que a Anna não marca reunião.

A configuração para a construção está em `config/follow-ups.json`.
