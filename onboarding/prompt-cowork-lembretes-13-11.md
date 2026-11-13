# Prompt para o Cowork: retirar os gatilhos dos lembretes antigos da etapa Reunião agendada (13/11/2026)

> Cole o bloco abaixo numa sessão do Cowork com o Chrome logado no Kommo do escritório, com um usuário administrador. O prompt não leva nenhum segredo.
>
> **Por quê:** a Dra. pediu (13/11) que cada lembrete fique preso à reunião que o originou. Se a reunião das 15h for cancelada e remarcada para as 17h, nenhum lembrete das 15h pode sair. Os robôs do Kommo "Reunião agendada - 2h / 1h / 15 minutos" não conseguem fazer isso: o de 15 minutos começa 1 hora antes, espera 45 minutos e lê o campo "Reunião" só na hora de enviar (casos Adriana, 14:47, e Antonio, 17:11). A Anna passa a mandar esses lembretes: cada um vai preso ao evento e ao horário da reunião e é conferido no card e na agenda Google antes de sair.
>
> **O que muda:** só os 3 GATILHOS saem da etapa. Os Salesbots continuam existindo (dá para voltar atrás). Assim que o Cowork terminar, me avise: eu ligo os lembretes da Anna e faço os testes.

```text
Ajuste nos lembretes de reunião (Carolina Calvo Advogados). Faça pelo meu Chrome, no Kommo https://advogadacarolinacalvo.kommo.com (account_id 33595135), nesta ordem, e no fim me devolva um relatório único. Confirme que está nessa conta antes de começar.

AUTORIZAÇÃO (só isto pode ser alterado)
- Excluir da etapa Closer › "Reunião agendada" (Digital Pipeline) EXATAMENTE estes 3 gatilhos de robô:
  36760590 → Salesbot 52128 "Reunião agendada - 2h" (2 horas antes de Lead: Reunião)
  36783698 → Salesbot 52152 "Reunião agendada - 1h" (1 hora antes de Lead: Reunião)
  36783700 → Salesbot 52154 "Reunião agendada - 15 minutos" (1 hora antes de Lead: Reunião, com pausa de 45 min)

LIMITES
- NÃO exclua os Salesbots 52128, 52152 e 52154 (só os gatilhos da etapa). Eles ficam na lista de Salesbots para uma eventual volta.
- NÃO altere, desative, exclua nem reordene nenhum outro gatilho, robô, Salesbot, automação, modelo, etapa, campo, tag, card ou contato. Isso vale para o gatilho "24 horas depois de Lead: Agendamento" (muda para Cliente decisão), que fica como está.
- Não escreva para nenhum lead e não mexa em cards.
- Senhas e códigos de verificação são comigo. Se pedirem, me chame e espere.
- Se um passo travar, anote o que a tela mostrou, pule só aquele item e siga.

==================================================
PARTE 1 · ANTES
==================================================
a. Vá em Leads > funil Closer > automação (Digital Pipeline) e abra a etapa "Reunião agendada".
b. Tire um print da etapa mostrando todos os gatilhos dela.
c. Anote cada gatilho da etapa: tipo, Salesbot, momento ("2 horas antes de Lead: Reunião" etc.) e condição.

==================================================
PARTE 2 · EXCLUIR OS 3 GATILHOS
==================================================
Para cada um dos 3 gatilhos listados na AUTORIZAÇÃO:
a. Confirme pelo nome do Salesbot e pelo momento que é o gatilho certo.
b. Exclua o gatilho da etapa (passe o mouse no gatilho > lixeira/Excluir, ou abra o gatilho > Excluir).
c. Salve o Digital Pipeline, se o Kommo pedir.
Se o Kommo oferecer "desativar" em vez de "excluir", pode desativar: o efeito é o mesmo.

==================================================
PARTE 3 · DEPOIS
==================================================
a. Reabra a etapa "Reunião agendada" e tire um print mostrando que os 3 gatilhos saíram e os outros continuam.
b. Em Configurações > Salesbot, confira que 52128, 52152 e 52154 continuam na lista.

==================================================
RELATÓRIO
==================================================
1. Gatilhos da etapa antes (lista e print).
2. O que foi excluído ou desativado, com o horário.
3. Gatilhos da etapa depois (lista e print).
4. Tudo que travou ou ficou diferente do esperado.
```

## Depois do Cowork (Claude Code)

1. Mudar `LEMBRETES_DO_KOMMO_ATIVOS` para `false` em `agente/lib/lembretes.ts` e subir.
2. Testes no card 29157690 (número de teste), com o campo "Reunião" a mais de 1h05:
   - **B, cancelamento simples:** marcar; apagar o campo e mover para AGENDAR REUNIÃO antes do lembrete de 1 h. Esperado: nenhum lembrete.
   - **C, horário vazio:** marcar; apagar o campo com o card ainda em Reunião agendada. Esperado: nenhum lembrete.
   - **D, 15h → 17h:** marcar T1; antes do lembrete de 1 h, mudar para T2 (T1 + 2 h). Esperado: nenhum lembrete de T1; os de T2 saem com o horário de T2.
