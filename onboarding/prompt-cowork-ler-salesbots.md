# Prompt para o Cowork: conferir os Salesbots de follow-up (somente leitura)

> Cole o bloco abaixo numa sessão do Cowork com o navegador (Claude in Chrome) logado no Kommo do escritório com um usuário administrador. Nada é alterado: a tarefa é só ler e relatar.

```text
Preciso que você CONFIRA, sem alterar nada, como estão configurados hoje os follow-ups automáticos na conta Kommo do escritório Carolina Calvo Advogados. Vamos automatizar essas réguas com uma IA e preciso reproduzir exatamente o que existe, sem duplicar disparos.

CONTA
- https://advogadacarolinacalvo.kommo.com (account_id 33595135). Confirme que está nessa conta antes de começar.

REGRA PRINCIPAL
- Somente leitura. Não salve, não publique, não ative, não desative, não exclua e não edite nada. Se algum botão abrir um modal de edição, feche sem salvar.
- Se aparecer login, código de verificação ou pedido de senha, pare e me avise.

O QUE JÁ SABEMOS PELOS DADOS (para você confirmar ou corrigir)
1. Régua de qualificação: um Salesbot põe as tags FOLLOW 1, FOLLOW 2, FOLLOW 3 e FOLLOW 4 e envia os modelos "Follow 1", "Follow 2", "Follow up 3" e "Follow up 4". Intervalos medidos: FOLLOW 1 sai 2h depois da última mensagem sem resposta; FOLLOW 2 sai 21h depois do FOLLOW 1; FOLLOW 3, 48h depois do FOLLOW 2; FOLLOW 4, 72h depois do FOLLOW 3. 24h depois do FOLLOW 4 a tag sai e o lead vai para Gestão operacional › Venda perdida. A equipe costuma iniciar isso digitando "/follow up" na conversa.
2. Pós-reunião: 24h depois que o lead entra em Closer › Cliente decisão, sai uma mensagem e entra a tag "Follow-up Cliente Decisão Enviado". Suspeitamos que o modelo seja "Pergunta reunião".
3. Agendamento: não achamos automação. Suspeitamos que o follow-up de 2h sem confirmação de horário use o modelo "FUP horário reunião" e que existam etapas com "SE 5 24h" e "FUP encerramento 48h".
4. Existe também uma regra que, quando um lead em Reunião agendada ou Cliente decisão manda mensagem, move o lead para SDR › 5 A 10 MIL.

ONDE OLHAR
- Lista de Salesbots da conta (Configurações ou a área de Salesbot/automação).
- Digital Pipeline de cada funil: SDR, Closer, Financeiro e Gestão operacional. Abra as etapas e veja os gatilhos e bots ligados a cada uma.
- Comandos de chat (os bots que aparecem ao digitar "/" numa conversa), em especial o "/follow up".

PARA CADA SALESBOT OU AUTOMAÇÃO RELACIONADA A FOLLOW-UP, AGENDAMENTO, PÓS-REUNIÃO OU À REGRA DO ITEM 4, ANOTE:
- nome do bot e onde ele está ligado (etapa do funil, comando "/", gatilho de mensagem recebida etc.);
- como ele começa (gatilho exato) e se roda sozinho ou só por comando manual;
- cada bloco em ordem: esperas (com o tempo exato e se é "esperar resposta" ou "esperar tempo"), modelos enviados (nome exato do modelo), tags colocadas e retiradas, mudanças de etapa e condições (por exemplo, "se o cliente respondeu");
- o que acontece quando o lead responde no meio da sequência;
- se o bot tem restrição de horário ou de dia da semana;
- se está ativo ou desativado.

QUANDO TERMINAR, ME DEVOLVA
1. Uma lista dos bots e automações encontrados, com o fluxo de cada um bloco a bloco, no formato acima.
2. Uma tabela comparando o que você viu com os itens 1 a 4 de "O QUE JÁ SABEMOS", marcando "confere" ou "diferente: ...".
3. Qualquer outro bot que envie mensagem automática a leads e que possa duplicar com uma IA nova.
Se possível, tire um print de cada bot aberto e cite o nome do print junto da descrição.
```
