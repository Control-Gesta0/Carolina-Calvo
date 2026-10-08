# Carolina Calvo · perguntas da reunião de onboarding

> Escopo contratado (8 itens): agenda no Google, leitura de arquivos, follow-up na qualificação,
> follow-up após proposta, passagem para humano, painel (com relatório semanal dentro), limites.
> Análise completa da conta em `analise-e-roteiro-reuniao.md`.

## Antes de começar (base)

1. Quem é a equipe? Cada pessoa tem login no Kommo? (hoje só existe o seu)
2. A IA atende só superendividamento ou outros assuntos também (BRB, ICMS, previdenciário)?
3. Quem é um lead bom para reunião?
4. E quem não é? (ex.: ganha até 5 mil, desconto abaixo de 35%, aposentado do INSS)
5. A reunião é gratuita? Online ou presencial?
6. Como a IA vai se chamar? Fala "senhor/senhora" ou de forma mais próxima?
7. Pode me mandar de 5 a 10 conversas boas que viraram reunião?
8. Hoje, quando um lead agendado manda mensagem, uma automação devolve ele para "5 A 10 MIL". Posso desligar?
9. O robô atual (mensagem automática e FOLLOW 1 a 4) pode ser desligado nos leads da IA?

## 1 · Agendamento (Google Agenda)

10. Qual conta e qual agenda do Google a IA vai usar? Quem pode autorizar o acesso?
11. Quais dias e horários a IA pode oferecer?
12. Quanto dura cada reunião? Precisa de intervalo entre uma e outra?
13. Qual a antecedência mínima? Até quantos dias à frente pode marcar?
14. Qual a ordem de preenchimento: sempre o primeiro horário livre, completar um dia antes de abrir o próximo, ou outra regra?
15. Se o lead recusar o horário, quantas outras opções a IA oferece antes de chamar a equipe?
16. Qualquer compromisso na agenda conta como ocupado, ou só os bloqueios que vocês criarem?
17. A IA pode remarcar ou cancelar sozinha quando o lead pedir?
18. O que vai no convite: nome, telefone, resumo do caso? Gera link do Meet?
19. Alguém mais marca reunião nessa agenda além da IA?
20. Quer lembrete antes da reunião? Quanto tempo antes?

## 2 · Arquivos (áudio, imagem, print, PDF)

21. Quais documentos a IA deve pedir antes da reunião (contracheque, extrato, contrato do empréstimo)?
22. O que ela deve anotar no card quando recebe cada um?
23. Algum dado ela nunca pode pedir? (senha gov.br, senha do banco)
24. No WhatsApp oficial a IA entende áudio mas responde em texto. Tudo bem?

## 3 · Follow-up durante a qualificação

25. Depois de quanto tempo sem resposta a IA retoma?
26. Quantas tentativas no máximo?
27. Em quais dias e horários ela pode mandar? Fim de semana pode?
28. Quando ela desiste, para qual etapa o lead vai e com qual motivo?
29. Quem cuida do Business Manager da Meta para aprovar os modelos de mensagem?

## 4 · Follow-up após a proposta

30. Qual etapa dispara o acompanhamento? Criamos "Proposta enviada" ou usamos "Cliente decisão"?
31. Onde a equipe escreve o resumo da proposta?
32. O que o resumo precisa ter? (valor, forma de pagamento, validade, dúvidas do cliente)
33. A IA pode repetir o valor da proposta para o lead?
34. Quantas tentativas, com qual intervalo, e quando ela para?
35. Os leads que já estão em "Cliente decisão" (569) entram ou só os novos?

## 5 · Passagem para humano

36. Em quais situações a IA para e chama alguém? (pediu humano, já é cliente, urgência, reclamação, dúvida jurídica, quer fechar, quer desconto)
37. Quem recebe esse lead?
38. Como essa pessoa fica sabendo: tarefa no Kommo, mensagem no WhatsApp ou os dois?
39. Quando alguém da equipe responde no chat, a IA fica quieta por quanto tempo?
40. Fora do horário da equipe, o que a IA diz para quem pediu atendimento humano?

## 6 · Painel (com o relatório semanal)

41. Quem vai acessar o painel?
42. Quais 3 números você quer ver primeiro ao abrir?
43. Quem cuida dos anúncios? Dá para colocar UTM neles? (hoje nenhum lead chega com UTM)
44. Quer ver o gasto com anúncio no painel ou só o custo da IA?
45. Quem pode corrigir a IA pelo painel e quem aprova antes de valer?
46. Em que dia da semana quer o relatório?
47. Quem recebe aviso no WhatsApp quando der erro?

## 7 · Limites

48. O que a IA responde quando perguntam "quanto custa?"
49. E quando perguntam "eu tenho direito?" ou "quanto vou conseguir reduzir?"
50. Tem mais alguma frase ou promessa proibida?
51. Se perguntarem se é robô, ela confirma?

## 8 · Resultado (para provar que funcionou)

52. Qual o valor médio de um contrato?
53. Qual etapa significa contrato fechado? Dá para marcar ganho no Kommo quando fechar?
54. Nos últimos 30 dias foram 346 leads, 67 reuniões e 16 contratos enviados. Bate?

---

## Alinhar na reunião (não são perguntas)

- **Janela de 24h do WhatsApp oficial.** Se o lead respondeu nas últimas 24h, o follow-up sai personalizado. Depois disso, só sai com modelo aprovado pela Meta, que tem texto fixo com poucos campos variáveis (nome, assunto) e custo por envio. O follow-up após a proposta quase sempre cai fora das 24h.
- **Histórico da conversa.** O Kommo não entrega conversas antigas pela API. A IA tem histórico a partir do dia em que entra. Para leads anteriores, o resumo da proposta é o que ela vai usar.
- **Google Agenda é construção nova** neste projeto (o modelo Kommo não agenda sozinho). Precisa de alguém com acesso à conta Google para autorizar. Para bloquear horário, basta criar um evento na própria agenda.
- **Pré-requisitos:** desligar a regra que devolve lead para "5 A 10 MIL" e separar o robô atual dos leads da IA. Sem isso, os dois brigam pelo mesmo lead.
