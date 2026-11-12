# Cowork · Trava nos lembretes de reunião do Kommo (Dra., 12/11/2026)

**Por quê:** no caso da Adriana Mamare (card 29201828), a reunião das 15:00 foi cancelada às 14:41: a Anna apagou o evento, limpou os campos e tirou o card de Reunião agendada. Mesmo assim, às 14:47, o robô **"Reunião agendada - 15 minutos" (52154)** mandou o lembrete, com o horário vazio ("Horário da reunião: \*\*"). O Kommo agenda esse disparo quando o campo **Reunião** (803540) é preenchido e não desmarca depois, mesmo com o campo apagado ou o card fora da etapa. No caso do Antonio (29199590), o mesmo robô mandou o lembrete às 17:11 de uma reunião das 17:00.

**O que fazer:** só acrescentar uma condição no começo de cada robô. Nenhuma mensagem muda.

## Robôs

Configurações › Salesbot (ou o funil Closer › etapa **Reunião agendada**, nos robôs da etapa):

| ID | Nome |
|---|---|
| 52128 | Reunião agendada - 2h |
| 52152 | Reunião agendada - 1h |
| 52154 | Reunião agendada - 15 minutos |

## Passo a passo (repetir nos 3)

1. Abrir o robô no editor visual.
2. Antes do primeiro bloco de mensagem, inserir um bloco **Condição** com duas regras. Se qualquer uma não for atendida, o robô **para**, sem mensagem:
   - **Campo "Reunião"** do lead **não está vazio**.
   - **Etapa do lead** = **Closer › Reunião agendada**.
3. Ligar a saída "condição atendida" ao bloco de mensagem que já existe, e deixar a saída "não atendida" sem nada (fim).
4. Salvar e manter o robô ativo.

## Conferência (no card de teste 96486)

1. Preencher **Reunião** com um horário daqui a 20 minutos e pôr o card em Closer › Reunião agendada.
2. Apagar o campo **Reunião** e mover o card para SDR › AGENDAR REUNIÃO.
3. Esperar o horário do lembrete de 15 minutos. **Resultado esperado:** nenhuma mensagem.
4. Repetir com o campo preenchido e o card em Reunião agendada. **Resultado esperado:** o lembrete sai com o horário.

## Outros robôs de lembrete ativos na conta (para conferir se estão ligados a alguma etapa)

| ID | Nome | Observação |
|---|---|---|
| 15630 | Confirmação - reunião 24 horas antes | antigo; ver se está em alguma etapa |
| 15634 | Confirmação - reunião 2 horas antes | antigo; duplicaria com o 52128 |
| 16402 | Lembrete cliente | ver uso |
| 52014 | reuniao | ver uso |
| 54250 / 54252 / 54254 | Anna - Lembrete reunião 24h / 1h / 15min | cópias; os da Anna são 54156 / 54158 / 54160 |

Se algum desses estiver ligado a uma etapa do SDR ou do Closer, anotar qual e em que gatilho, sem desligar. A decisão de desligar é da Dra.
