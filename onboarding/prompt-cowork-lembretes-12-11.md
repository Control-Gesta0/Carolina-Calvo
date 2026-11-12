# Prompt para o Cowork: trava nos lembretes de reunião do Kommo (12/11/2026)

> Cole o bloco abaixo numa sessão do Cowork com o Chrome logado no Kommo do escritório, com um usuário administrador. O prompt não leva nenhum segredo.
>
> **Por quê:** no caso da Adriana Mamare (card 29201828), a reunião das 15:00 foi cancelada às 14:41. A Anna apagou o evento, limpou os campos e tirou o card de Reunião agendada. Mesmo assim, às 14:47, o robô **"Reunião agendada - 15 minutos" (52154)** mandou o lembrete com o horário vazio ("Horário da reunião: \*\*"). No Antonio (29199590), o mesmo robô mandou às 17:11 o lembrete de uma reunião das 17:00. O Kommo programa o envio quando o campo **Reunião** é preenchido e não cancela depois, mesmo com o campo apagado ou o card fora da etapa.
>
> **O que muda:** só uma condição no início dos 3 robôs de lembrete. Nenhuma mensagem muda. Os outros robôs só são lidos.

```text
Ajuste nos lembretes de reunião (Carolina Calvo Advogados). Faça pelo meu Chrome, no Kommo https://advogadacarolinacalvo.kommo.com (account_id 33595135), nesta ordem, e no fim me devolva um relatório único. Confirme que está nessa conta antes de começar.

AUTORIZAÇÃO (só isto pode ser alterado)
- Parte 2: acrescentar UM bloco de condição no início de cada um destes 3 Salesbots, sem mudar o texto das mensagens:
  52128 "Reunião agendada - 2h"
  52152 "Reunião agendada - 1h"
  52154 "Reunião agendada - 15 minutos"
- Parte 4: no card de teste 29157690 (telefone +55 11 96486-6458), mudar o campo "Reunião" e a etapa, só para o teste.

LIMITES
- NÃO altere, desative, exclua nem reordene nenhum outro robô, Salesbot, automação, modelo, etapa, campo, tag, card ou contato.
- NÃO mude o gatilho nem o horário dos 3 robôs (continuam 2h, 1h e 15 min antes do campo "Reunião").
- Não escreva para nenhum lead. O único card que pode ser mexido é o 29157690.
- Senhas e códigos de verificação são comigo. Se pedirem, me chame e espere.
- Se um passo travar, anote o que a tela mostrou, pule só aquele item e siga.

==================================================
PARTE 1 · LER OS 3 ROBÔS (ANTES DE MEXER)
==================================================
a. Vá em Leads > funil Closer > botão de automação/robôs (Digital Pipeline) e abra a etapa "Reunião agendada".
b. Para cada robô de lembrete dessa etapa, anote: nome, ID do Salesbot, gatilho exato (ex.: "15 minutos antes de: Reunião"), se tem condição e para quais leads vale.
c. Abra cada Salesbot (52128, 52152, 52154) em Configurações > Salesbot (ou pelo próprio robô da etapa) e anote os blocos na ordem: primeiro bloco, mensagem enviada, campos usados no texto ("Horário da reunião").
d. Tire um print de cada Salesbot antes da alteração.

==================================================
PARTE 2 · CONDIÇÃO NO INÍCIO DOS 3 SALESBOTS
==================================================
Em cada um dos 3 (52128, 52152, 52154):
a. Abra no editor visual.
b. Antes do primeiro bloco de mensagem, insira um bloco "Condição" com as duas regras abaixo, as duas obrigatórias (E):
   1. Lead > campo "Reunião" > não está vazio (está preenchido).
   2. Lead > Etapa (status) > é igual a Closer › "Reunião agendada".
c. Ligue a saída "condição atendida" ao bloco de mensagem que já existia.
d. Deixe a saída "condição não atendida" sem nada (o robô termina sem mandar mensagem).
e. Salve. Confira que o Salesbot continua ATIVO e que o robô da etapa continua apontando para ele.
f. Se o bloco "Condição" não oferecer a regra da etapa, faça só a regra do campo "Reunião", anote isso no relatório e siga.
g. Se o editor não deixar inserir um bloco antes da mensagem, NÃO recrie o robô: anote o que apareceu e pare esta parte.
Tire um print de cada Salesbot depois da alteração.

==================================================
PARTE 3 · LER OUTROS ROBÔS DE LEMBRETE (SÓ LEITURA)
==================================================
Estes Salesbots estão ativos na conta. Para cada um, descubra se está ligado a alguma etapa (SDR ou Closer) ou a algum gatilho, e anote nome, ID, etapa, gatilho e o texto que manda. NÃO altere nem desative nenhum:
- 15630 "Confirmação - reunião 24 horas antes"
- 15634 "Confirmação - reunião 2 horas antes"
- 16402 "Lembrete cliente"
- 52014 "reuniao"
- 54250 "Anna - Lembrete reunião 24h", 54252 "Anna - Lembrete reunião 1h", 54254 "Anna - Lembrete reunião 15min"
  (os usados pela Anna são 54156, 54158 e 54160; estes 3 parecem cópias)
Percorra também as etapas do Closer e do SDR e anote QUALQUER outro robô que mande lembrete ou confirmação de reunião.

==================================================
PARTE 4 · TESTE NO CARD 29157690
==================================================
Antes de começar, anote a etapa, o campo "Reunião" e as etiquetas atuais do card, para devolver no fim.
Teste C (horário apagado):
a. Preencha "Reunião" com hoje, daqui a 20 minutos (hora de Brasília), e mova o card para Closer › Reunião agendada.
b. Espere 2 minutos. Apague o campo "Reunião" e mova o card para SDR › AGENDAR REUNIÃO.
c. Espere passar o horário em que sairia o lembrete de 15 minutos e confira na conversa do card. RESULTADO ESPERADO: nenhuma mensagem de lembrete.
Teste de controle (lembrete válido):
d. Preencha "Reunião" com daqui a 20 minutos e mova o card para Closer › Reunião agendada. Não mexa mais.
e. Confira se o lembrete de 15 minutos sai com o horário preenchido.
f. Depois, apague o campo "Reunião" e devolva o card para a etapa e as etiquetas anotadas no início.
Observação: o campo "Reunião" preenchido cria um evento na agenda Google da Dra., e o campo apagado remove esse evento. Isso é esperado.

==================================================
RELATÓRIO
==================================================
1. Parte 1: os 3 robôs como estavam (gatilho, condição, blocos), com prints.
2. Parte 2: o que foi alterado em cada um, com prints, e qualquer limitação (ex.: sem regra de etapa).
3. Parte 3: tabela dos outros robôs de lembrete: ID, nome, etapa/gatilho, texto, ativo sim/não.
4. Parte 4: horário de cada passo e se o lembrete saiu ou não, nos dois testes.
5. Tudo que travou ou ficou diferente do esperado.
```
