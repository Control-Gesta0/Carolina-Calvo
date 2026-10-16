# Decisões da Dra. Carolina em 15/10/2026

Este registro complementa o `escopo-definido.md` (reunião de 08/10) e serve para não perguntar de novo o que ela já decidiu. O fluxo de 08/10 continua o mesmo: qualificação, aprofundamento da dor, encaminhamento para análise, intervalo e oferta de horário pela Anna.

## Valendo na Anna

| Decisão | Como está configurado |
|---|---|
| Oferta de reunião só para renda bruta **acima de R$ 15 mil** | Com exatamente R$ 15 mil, não há oferta. A regra antiga da reunião no mesmo dia a partir de R$ 13,5 mil deixou de importar. |
| Até R$ 15 mil: **só a etiqueta** | Tag "ANNA renda até 15k" e card na coluna da renda bruta, no SDR. Sem tarefa, sem mudar de etapa e sem Venda perdida. A mensagem final ao lead não promete que a equipe vai continuar o atendimento. Exceção mantida de 08/10: se o lead pedir reunião, a conversa vai para a equipe, com tarefa. |
| Follow-up 2 horas depois da oferta | Texto exato da equipe: "Ainda não tive sua confirmação sobre o horário que te enviei. Posso reservar esse horário para a sua reunião com a Dra. Carolina?". Fora da janela de 24h do WhatsApp, sai o modelo "FUP horário reunião". Os follow-ups de 24h e 48h continuam como estavam. |
| Fim das sequências de follow-up | A qualificação e a oferta de horário terminam **sem Venda perdida**. O card fica na coluna da renda e, se o lead voltar, a Anna retoma de onde parou. |
| Negrito | As mensagens mantêm em negrito os destaques do texto da Dra.: horários, orientações e perguntas principais. |

## 16/10: textos da Dra. como ela escreveu, com opções numeradas

Na reunião de 16/10, a Dra. pediu para voltar as opções por número. Desfizemos os dois pedidos de "conversa humanizada" de 15/10:

- **1ª pergunta:** é o modelo da Dra., igual ao modelo aprovado "Anna - Primeiro contato". Termina com "É só me responder com o número".
- **2ª pergunta:** voltou a ser numerada, com 1) renda bruta, 2) líquido e 3) desconto em conta.
- **Resposta sem opção:** se o lead responde sem escolher, a Anna pede "Pode me responder com o número da opção: 1, 2 ou 3?". Na retomada depois de uma dúvida, pergunta "Qual das opções você quer saber: 1, 2 ou 3?".
- **Mensagens do roteiro:** saem exatamente como a Dra. escreveu. A camada que reescrevia cada mensagem como conversa está desligada e só volta com `REDACAO=on`. Mesmo ligada, a 1ª e a 2ª pergunta não seriam reescritas.

Ficam como estavam:
- o negrito nos destaques;
- as respostas às dúvidas do lead;
- todas as regras de 15/10.

## Etiqueta de mês (Ajuste 4): pronta e desligada

Ela liga com `ETIQUETA_MES_ATIVA=true` na Vercel, depois da aprovação da Dra. O código está em `agente/lib/etiqueta-mes.ts`, e o relógio confere os cards novos de 5 em 5 minutos.

- Card que entra por **formulário do Meta** ganha a etiqueta do mês de entrada, como "OUT 26". O formulário é identificado pela origem do card, que traz o nome do formulário, por exemplo "Geral - Formulário Remarketing - 01/09/2026".
- Card que nasce de **conversa espontânea pelo WhatsApp** não ganha etiqueta de mês. O escritório não faz campanha de clique para WhatsApp: todas as campanhas são por formulário.
- Vários formulários no mesmo mês geram **uma etiqueta só**.
- O **card mais recente** reúne as etiquetas de mês dos cards anteriores do mesmo telefone, por exemplo JAN 26 + FEV 26 + SET 26. Nenhuma etiqueta é apagada.
- O formato é o que a Dra. já usa: JAN, FEV, MAR, ABRIL, MAIO, JUN, JUL, AGO, SET, OUT, NOV, DEZ, seguido do ano com 2 dígitos.

**Conferência em 15/10** (`npx tsx scripts/etiquetas-mes.ts --dias 30`, só leitura), em 339 cards criados em 30 dias:

- **Cards de formulário:** em 283 de 289, o mês que a equipe pôs à mão é o mesmo da regra. Nos outros 6, a etiqueta manual faltou ou ficou com o mês trocado.
- **Card antigo apagado:** hoje a equipe copia as etiquetas do card antigo para o novo e depois **apaga o card antigo**. O histórico do Kommo mostra isso. A Anna junta as etiquetas em até 5 minutos depois de o card novo entrar, antes da limpeza. Etiqueta de card que já foi apagado não volta.
- **WhatsApp espontâneo:** 30 cards de setembro, sem formulário, ganharam etiqueta à mão. Pela regra nova, não ganham.

## Em aberto

- **Intervalo entre o encaminhamento para análise e a oferta de horário:** em 08/10 ficaram 30 minutos, e em 15/10 a Dra. falou em cerca de 15. Aguardando a confirmação dela antes de mudar.
- **Pós-reunião (funil Closer):** o fluxo é Cliente decisão → Retorno imediato → Cliente indeciso.
  - O follow-up sai 23 horas depois da reunião, para qualquer reunião.
  - Quando o cliente responde, o card vai para Retorno imediato com tarefa, sem mensagem ao cliente.
  - Em Cliente indeciso não há automação.
  - A automação antiga "Follow Cliente decisão" só é desligada depois do teste.
  - Faltam três respostas: quem cria a etapa Retorno imediato; se "Fez reunião está indeciso" será substituída por "Cliente indeciso"; e se a resposta antes das 23 horas também vai para Retorno imediato.
- **Memória dos atendimentos (Ajuste 3):** o escopo foi combinado assim:
  - consultar todos os cards do mesmo telefone;
  - perguntar se a situação melhorou, piorou ou continua igual;
  - nunca afirmar lembrar o que não está registrado.

  A importação dos chats antigos depende de uma exportação pelo suporte do Kommo.
