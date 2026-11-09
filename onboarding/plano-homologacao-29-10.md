# Plano até a homologação (resposta da Dra. em 29/10/2026)

A Anna continua pausada para leads reais. Tudo abaixo roda só nos cards de teste.

## Os 7 pontos da Dra.

| # | Ponto | Situação | Teste e evidência | Data |
|---|---|---|---|---|
| 1 | Primeira mensagem para lead novo | Depende da Meta aprovar o modelo "Anna - Primeiro contato v2" e do robô de saudação (Guilherme) | Card como lead de formulário com o número +55 11 96486-6458, depois de excluir no Kommo o card e os contatos antigos dele (Cowork, Parte 0): saudação, resposta, régua | Depois da aprovação |
| 2 | Régua F1 a F4 sem duplicidade | F1 27/10 e F2 28/10 saíram; a trava contra envio duplicado está no ar desde 28/10 | (11) 97895-1830: F3 30/10 07h e F4 02/11 07h, cada um uma vez só | 30/10 e 02/11 |
| 3 | Pós-reunião depois de reunião apagada | **Corrigido em 29/10** (commit eaa0d31): antes de enviar, a Anna confere na agenda da Dra. se a reunião continua lá. Apagada ou desmarcada: não envia e anota no card | Três reuniões de teste: uma mantida (a mensagem sai), uma apagada da agenda (não sai, com a nota) e uma em que o cliente não compareceu, com o card movido para Closer › Não compareceu (não sai) | 30/10 e 31/10 |
| 4 | Reteste das correções | Desconto "débito em conta" sem valor já não vira zero | (41) 98802-5120 do zero: desconto sem valor, pergunta do limite, "Ok, aguardo" | 30/10 |
| 5 | Robôs antigos | Inventário de 13/10 em `automacoes-existentes.md` | Lista de todos os robôs que mandam mensagem ou mudam etapa, com a proposta (fica, sai ou muda) para a Dra. decidir; depois, teste junto com a Anna | Lista em 03/11 |
| 6 | Demais regras e treino | Regras no código, sem evidência ainda | Renda até 15 mil e acima; proteção do Closer; memória; lead que já fez reunião; proposta sem resposta (régua de agendamento 2h, 24h, 48h). Treino depois da exportação das conversas | 30/10 a 02/11 |
| 7 | Reunião de 30/10 | Acompanhamento técnico | — | 30/10 |

## Cronograma

- **30/10 (sex):** F3 às 7h; reunião técnica; reset do card de teste do (41) e reteste das correções; reunião de teste mantida, para o pós-reunião.
- **31/10 (sáb):** pós-reunião da reunião mantida (sai) e da reunião apagada (não sai); régua de agendamento sem resposta em andamento.
- **30/10 a 01/11:** renda até 15 mil e acima, proteção do Closer, memória e lead que já fez reunião, em cards de teste.
- **02/11 (seg):** F4 às 7h.
- **03/11 (ter):** relatório complementar de evidências e a lista dos robôs antigos para a Dra.
- **Homologação:** a combinar depois do relatório complementar, dependendo da aprovação do modelo v2 pela Meta.

## Roteiro do reteste da qualificação no +55 11 96486-6458 (depois da saudação)

O (41) 98802-5120 saiu dos testes em 30/10. O reteste passa para o número novo, que continua a conversa depois de receber a saudação.

| Passo | Eduardo manda | A Anna deve |
|---|---|---|
| 1 | (recebe a saudação do robô, com as opções 1️⃣ 2️⃣ 3️⃣) | — |
| 2 | `3` | Pedir os três valores |
| 3 | `Bruta 20 mil, líquido 16 mil e tenho débito em conta` | **Não** registrar desconto zero: perguntar o valor do desconto |
| 4 | `Vou olhar no extrato e te mando depois` | Mandar o "Ok, aguardo…" |
| 5 | `O desconto em conta é 7 mil` | Fazer a pergunta do cheque especial e do cartão |
| 6 | `Uso o cheque especial e tenho cartão com limite` | Mandar "…Seria um alívio importante para você, concorda?" |
| 7 | `Sim` | Mandar "…Retorno em alguns minutos." e, 30 min depois, oferecer os horários (renda acima de 15 mil) |
| 8 | **Não responder mais** | Régua de agendamento: 2h, 24h e 48h depois da oferta, uma vez cada |

## Testes sem resposta do lead (feitos pelo Claude)

- **Já fez reunião:** card novo para o mesmo telefone do (41), com a memória em teste. A Anna não manda nada, põe tarefa e nota para a equipe.
- **Memória com valores:** depois do F4 de 02/11, card novo para o (11), que já informou valores. A Anna cita os valores e pergunta se a situação melhorou, piorou ou continua igual.
- **Renda até 15 mil:** no (11), depois do F4 de 02/11: renda bruta abaixo de 15 mil, sem oferta de reunião.

## O que precisa do Eduardo

1. OK para voltar o card 29046218 ao SDR e zerar o estado da Anna nele.
2. Responder pelo (41) nas horas combinadas.
3. OK para criar e apagar as reuniões de teste na agenda da Dra.
4. Rodar a exportação das conversas de set/out no Cowork (`prompt-cowork-conversas-set-out.md`).
5. Avisar quando o Guilherme tiver o modelo v2 aprovado e o robô de saudação pronto.

## Resultados registrados

| Quando | Teste | Resultado |
|---|---|---|
| 29/10 16:15 | Pós-reunião com a reunião apagada da agenda (card do (41)) | ✅ Não enviou; nota no card "a reunião não está mais na agenda da Dra." |
| 29/10 16:25 | Pós-reunião com a reunião mantida na agenda | ✅ Enviou "Pergunta reunião" (saída registrada no WhatsApp às 16:25:04) |
| 29/10 15:01 | Robô antigo 52156 no (41) | ⚠️ Mandou de novo "Ontem você esteve em reunião", 24h depois de o card entrar em Cliente decisão (vai para a decisão da Dra.) |
| 29/10 17:18 | 1ª mensagem: lead de formulário novo para +55 11 96486-6458 (card 29078930), robô de saudação 54604 | ❌ O robô do Kommo não enviou, nem com o card devolvido à etapa às 17:32. A Anna avisou a equipe às 17:50 com nota no card. Diagnóstico pela tela do Kommo pendente. |
| 30/10 07:05 | Follow 3 do (11) | ✅ Uma saída só no WhatsApp (07:05:06). Saiu às 07:05, e não às 07:00, porque o relógio da Anna roda a cada 5 minutos. |
| 30/10 10:10 | Pós-reunião com o card em Closer › Não compareceu | ✅ Não enviou; nota no card "o card está em Não compareceu" |
| 30/10 10:05 | Lead que já fez reunião (card novo para o telefone do (41), com a memória em teste) | ✅ Nenhuma mensagem; tarefa e nota para a equipe com o histórico do telefone |
| 30/10 10:15 | Encerramento do (41) | Cards 29046218 e 29083586 em Venda perdida; as 3 reuniões de teste apagadas da agenda da Dra. |
| 30/10 10:29 | 1ª mensagem para +55 11 96486-6458, depois de marcar "Forçar mensagem" no robô de saudação | ✅ Saudação v2 saiu às 10:29:04 ("Olá, Guilherme!…"); a Anna confirmou e começou a régua (Follow 1 às 12:29 se não houver resposta) |
| 30/10 10:32–10:35 | Reteste da qualificação no 96486-6458 | ✅ Desconto "débito em conta" sem valor não virou zero; "Ok, aguardo"; pergunta do cheque especial e cartão; encaminhamento com desconto R$ 7.000 e card em ACIMA DE 15 MIL |
| 30/10 10:52 | Texto novo do "aguardo" (Dra.) | Aplicado (commit e2a99c5). Ver no WhatsApp na segunda, 02/11, depois do follow-up de 48h: `reset` do 96486-6458 e refazer até "vou olhar no extrato", respondendo "Combinado" depois |
| 30/10 11:10 | Oferta de horários (96486-6458) | ✅ Uma saída só (11:10:06) |
| 30/10 12:29–12:35 | Follow 1 antigos da qualificação | ✅ Nenhum saiu: a régua foi cancelada no encaminhamento |
| 30/10 13:15 | Follow-up de agendamento de 2h | ✅ Uma saída só (13:15:04): "Ainda não tive sua confirmação sobre o horário…" Próximos: 31/10 e 01/11 por volta das 11:10 |
| 31/10 11:15 | Follow-up de agendamento de 24h (96486-6458) | ✅ Uma saída só (11:15:05): "Quem continua *adiando esse tipo de decisão*…" |
| 01/11 11:15 | Follow-up de agendamento de 48h, o último | ✅ Uma saída só (11:15:04): "Vou encerrar por aqui…". O card ficou em ACIMA DE 15 MIL, sem ir para Venda perdida (regra da Dra.) |
| 02/11 07:10 | Follow 4 do (11), o último da régua de qualificação | ✅ Uma saída só (07:10:03): "Como não tive seu retorno, vou *encerrar seu atendimento*…". Régua completa: F1 27/10 07:00 · F2 28/10 07:00 (duplicado antes da trava) · F3 30/10 07:05 · F4 02/11 07:10 |
| 03/11 09:26–10:07 | Memória + "aguardo" novo + renda até 15 mil (card novo 29120530 para o 96486-6458, lead voltando pelo formulário) | ✅ Saudação; "Vi aqui que você já falou com a gente em outubro… R$ 20.000… R$ 16.000… R$ 7.000"; "piorou" → pergunta 2; "aguardo" novo; "Combinado" sem resposta; valores 12.000 / 9.000 / 3.000; cheque especial; sem oferta de reunião, tag "ANNA renda até 15k" e card em 5 A 10 MIL |
| 03/11 | Achados e ajustes | Mês da memória pela criação do card (dizia "novembro"); "Entendi." em vez de "Ótimo!" depois de "piorou"; lead que volta com o card antigo aberto tem a conversa presa no card antigo (fechada à mão no teste; resolver antes da ativação); exame com 4 casos novos, 30 × 5 aprovados |
| 03/11 10:29 | Lead que volta: Anna fecha a conversa presa no card antigo (card 29121088) | ✅ Conversa 14896 do card 29120530 fechada, régua cancelada e nota no card antigo (1ª tentativa falhou: o Kommo devolve o número da conversa em talk_id; corrigido) |
| 03/11 11:14 | Saudação disparada pela própria Anna (`PRIMEIRO_CONTATO=anna`, card 29121490) | ✅ Card às 11:14:16, nome preenchido às 11:14:20, saudação às 11:14:22 numa conversa nova já ligada ao card novo. Falta tirar a automação da etapa Contato inicial (38384528), senão a saudação sai duas vezes |
| 03/11 | Texto da oferta de horário confirmado pela Dra. (commit 2b4bbeb) | ✅ Exame da IA depois da recarga da OpenAI: 30 situações aprovadas, inclusive aceite, recusa e escolha de período na oferta nova (1 rodada, para poupar crédito: intérprete US$ 0,03) |
| 04/11 10:41 | Etiqueta de mês religada (`ETIQUETA_MES_ATIVA=true`) | ✅ Às 10:45 o relógio pôs "NOV 26" nos 2 cards de formulário de 04/11 que estavam sem etiqueta (29130678, 29131526); os cards do WhatsApp não ganharam nada; os que a equipe já tinha etiquetado à mão ficaram como estavam |
| 04/11 | Plantão | Pronto no código, desligado (`PLANTAO`). Falta: a Dra. aprovar as frases e dizer o que fazer entre 22h e 4h; os 2 modelos pelo Cowork (`prompt-cowork-modelos-plantao.md`) e a aprovação da Meta |
| 04/11 | Cache da IA | Cache de 24 h ligado: 2.176 de 2.376 tokens de entrada vêm do cache, perto de 70% mais barato por chamada |
| 04/11 14:12 | Plantão ligado para os cards de teste (`PLANTAO=true`, robôs 54660 e 54662, modelos 52494 e 52496) — expediente | ✅ Card 29134380: a Anna disparou o robô de expediente (54660); saiu "Olá, Guilherme! Aqui é a Anna, da equipe da Dra. Carolina Calvo. *Imagine poder respirar…*" e o envio foi confirmado no WhatsApp. Teste do plantão marcado para 17:05 |
| 04/11 17:06 | Saudação de plantão em dia útil (card 29135952) | ✅ A Anna disparou o robô de plantão (54662); saiu "Olá, Guilherme! Aqui é a Anna, da equipe de plantão do escritório da Dra. Carolina Calvo. *Imagine poder respirar…*" e o envio foi confirmado no WhatsApp |
| 05/11 10:56–13:00 | Coluna AGUARDANDO QUALIFICAÇÃO (card 29141404) | ⚠️ Inconclusivo: às 10:57 a equipe da Dra. (usuário 12068987) moveu à mão 7 cards de Contato inicial para a coluna nova, inclusive o de teste, antes do Follow 1. O Follow 1 saiu às 13:00 (uma vez) e o card já estava na coluna. A etiqueta "NOV 26" entrou sozinha às 11:00. Refazer com um card novo, sem ninguém mover |
| 05/11 17:04 | **Anna ligada no SDR (operação assistida)** | Vercel: `GATE_TAG=ia`, `AUTO_GATE_FORM_LEADS=true`, `POS_REUNIAO=true`, `PROTEGE_CLOSER=true`, `MEMORIA=true` (deploy pronto às 17:04). Antes, a etiqueta `ia` saiu de 41 cards antigos da fase de 19–22/10, que tinham conversa da Anna parada; a lista está em `ativacao-sdr-05-11-tag-ia-removida.json`. Robôs em conflito tirados das etapas pelo Cowork (`prompt-cowork-ativacao-sdr.md`) |
| 05/11 17:18 | Primeiro lead real depois da ativação (card 29144956) | ✅ Etiqueta `ia` posta sozinha; saudação de plantão saiu uma vez só às 17:18:47 ("Olá, Lexington! Aqui é a Anna, da equipe de plantão…"); Follow 1 agendado para 19:18. O card 29144956 veio do formulário; o 29144970 (17:20, conversa iniciada pelo WhatsApp) não é da Anna e ficou sem etiqueta |
| 06/11 | Retorno da Dra. sobre o 1º dia no SDR | (1) Lembrete de 2h do robô do Kommo lido como "a equipe escreveu" (Sirlei, Zacheu): a Anna saía do atendimento → agora mensagem de robô (autor 0 no Kommo) não conta como equipe. (2) Lead escrevendo na hora da reunião para remarcar ia para Retorno imediato → só depois do fim da reunião e se a equipe não estiver conversando. (3) "Follow de reunião não está indo": reuniões marcadas antes da ativação ficaram sem o pós-reunião (o robô 52156 saiu) → o relógio confere de hora em hora e agenda o que faltou; as de 05/11 saem hoje. (4) Sirlei: "presencial R$ 200" vinha da base → trocado pelo procedimento da Dra. (avaliação, reunião on-line gratuita, presencial só para contratar), com o texto dela. (5) Sirlei pediu 11h e a Anna marcou 10h30 → o aceite com outra hora marca a hora pedida. (6) Aureni ficou sem resposta (falha de rede no Kommo às 09:30) → o Kommo repete o pedido e, se ainda falhar, a equipe recebe nota e tarefa. (7) 10 a 15 mil: encerramento provisório da Dra. + tarefa. (8) Espera de 60 a 90 s na qualificação. (9) Miranda: "mando na segunda" agora vira o aguardo. Testes 256/256; exame 36 situações aprovadas (1 rodada). Commit 1554b62 |
| 06/11 16:07 | Cowork da ativação (`prompt-cowork-ativacao-sdr.md`), relatório em claude.ai/artifact/U4H6hqRcqFa9ocDzSfxSFj | Correção do registro de 05/11: os robôs só saíram nesta data. SDR: 50370 (35585046, 35585012) e 15160 (30972480) removidos; 48895, 48672, 45903, 39652 e 52156 já não estavam em nenhuma etapa; "horário de funcionamento" (41258) sem ligação; saudação 38384528 (só para a tag anna-teste) removida às 16:07. A regra 30933818 (Venda ganha/perdida → SDR) estava inválida desde a exclusão de 5 A 10 MIL em 04/11 e caiu no salvamento: recriada como 38486604, destino SDR › Contato inicial. Closer sem regras inválidas. Ficam rodando as conversas já abertas pelos robôs antigos (Retorno Imediato SDR 7.280, 50370 5.912, 39652 1.196, horário 166, 52156 2). O lembrete de 15 min está certo: Zacheu (14:30) recebeu às 12:30, 13:30 e 14:15 |
| 06/11 | Robô x equipe | A 1ª correção usava o autor da mensagem (0 = robô), mas no Kommo a equipe também sai com autor 0 (remarcação do Zacheu). Corrigido no commit c9fd113: só o texto do modelo "Lembrete Reunião" conta como robô. Nenhuma mensagem foi classificada pela regra antiga entre os dois deploys |
| 06/11 17:00 | Decisões do Eduardo (os 4 pontos) | (1) Aureni: a resposta que faltou saiu às 16:58 (abaixo de 10 mil, mensagem de encerramento). (2) Etiqueta `nao-entregue`: quando a saudação dá Erro, a equipe põe a etiqueta e o card vai para a coluna da faixa do formulário; a Anna para (commit 74a4b1e). (3) Lead recorrente: a mensagem da Dra. sai no lugar do 1º follow-up para quem já procurou antes sem continuar (commit 1b4c2e1). (4) Regra do Closer Venda perdida → SDR › Contato inicial: `prompt-cowork-regra-closer.md` |
| 07/11 10:07 | Saudação de plantão no sábado, com a Anna em produção (card 29157690, número de teste 96486) | ✅ Card às 10:07:15; etiqueta `ia` e "NOV 26" postas pela Anna na entrada; conversa antiga do card 29141404 fechada; robô de plantão 54662 disparado às 10:07:23; saiu "Olá, Guilherme! Aqui é a Anna, da equipe de plantão do escritório da Dra. Carolina Calvo. *Imagine poder respirar…*" e o envio foi confirmado no WhatsApp às 10:07:25. Follow 1 agendado para 12:07 |
| 09/11 | Pedidos da Dra.: pausa/retomada (caso Adriana) e cancelamento/remarcação (caso Nayara) | Commit 4e4b30d. Adriana: a etiqueta `atendimento-humano` sumia porque a Anna regravava o conjunto de etiquetas do card; agora entra com `tags_to_add`, a pausa também fica no Redis (a etiqueta é recolocada se sumir), a conversa da equipe entra no histórico e a equipe devolve com a etiqueta `anna-retomar`. Nayara: reunião marcada pela Anna, cancelamento/imprevisto/desistência/"depois entro em contato"/remarcação com os textos da Dra.; aceitou remarcar → SDR › AGENDAR REUNIÃO na hora; a reunião cancelada sai do Google, da tarefa do Kommo e dos lembretes. Testes 276/276 (inclui os testes A a E da Dra. simulados); exame 41 situações aprovadas. **Pendente:** testes reais no Kommo (testes 1–4 da pausa e A–E da remarcação) — o container reiniciou e esta sessão perdeu o acesso ao Kommo e ao Redis |
| 09/11 | Conferência dos pedidos de 09/11 | **Adriana (29168036):** a etiqueta `atendimento-humano` entrou às 09:29:24 e continua no card (nenhum evento de remoção): a tela estava aberta antes ou a etiqueta ficou no "+N". **Pausa em produção (card de teste 29157690):** etiqueta `anna-retomar` → as duas etiquetas saíram em menos de 10 s e a nota "atendimento devolvido… etapa q1" entrou (10:58); mensagem de fora da Anna (robô de texto livre, como a equipe) → pausa com etiqueta e nota com a instrução (10:59). **Agenda do Kommo:** desde 05/11 a tarefa "Reunião" da Anna falhava com 403 "Client UUID mismatch" (o tipo 4217119 é de outra integração); trocado para o tipo padrão (2), conferido no card de teste (commit 307e7e5). **Zizi (29163500):** reunião de 09/11 10:00 cancelada às 10:00 (evento apagado, campos limpos), nenhum lembrete depois; card em AGENDAR REUNIÃO desde 10:26; a partir do commit b99edf3 o card sai de Reunião agendada já no cancelamento. **Nayara (29157740):** a equipe assumiu às 08:54 e moveu à mão; a reunião de 09/11 10:30 continua no Google e nos campos. **Simulação com o intérprete real:** teste da Dra. (Zizi), A a E, sem motivo, "será que adianta?" e teste 3 da pausa, todos com o resultado esperado |
| 09/11 tarde | Revisão de erros de todos os pontos | 3 erros achados na revisão do código e corrigidos (commit bc3eaad): (1) com reunião marcada, uma confirmação com dia/hora ("Confirmado, hoje às 15h estarei lá") podia cancelar a reunião — agora dia/hora/período só contam se forem diferentes da reunião; (2) "Não, tive um compromisso" depois da pergunta do motivo virava desistência; (3) desistência sem renda registrada deixava o card em Reunião agendada sem reunião — agora ACIMA DE 15 MIL. Testes 279/279; simulação com o intérprete real repetida com os casos novos, todos certos. Produção: nas últimas 200 execuções (07/11 17:25 a 09/11 11:06) o único erro é o 403 da tarefa de reunião, já corrigido. Os 3 casos de "card no Closer" (Aparecida 07:25, Nayara 08:31, Zizi 09:47) são de antes da versão nova entrar no ar (entre 09:47 e 10:00) |
| 09/11 tarde | Honorários e faixa do formulário (Dra., 09/11) | Commit cf71ef1. Pergunta de honorários / quanto custa na qualificação → texto da Dra. ("Compreendemos sua preocupação com os honorários!…"), uma vez por conversa. No 1º follow-up, formulário "de 10 a 15" → 10 A 15 MIL e "acima de 15" → ACIMA DE 15 MIL; só até 5 mil, de 5 a 10 mil e faixa ambígua/vazia ficam em AGUARDANDO QUALIFICAÇÃO. Dos 30 cards que estavam em AGUARDANDO, 18 foram movidos pela faixa (11 para ACIMA DE 15 MIL, 7 para 10 A 15 MIL), com nota em cada um; backup em `aguardando-faixa-09-11-backup.json`. Ficaram 12 (5 a 10 mil, até 5 mil e sem faixa). Testes 282/282 |
