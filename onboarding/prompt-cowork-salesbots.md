# Prompt para o Cowork: enviar os 4 modelos para aprovação e criar os 13 Salesbots da Anna

> Cole o bloco abaixo numa sessão do Cowork com o navegador (Claude in Chrome) logado no Kommo do escritório com um usuário administrador.
> Em 13/10/2026 os 4 modelos novos da Anna ainda estavam em rascunho, por isso a Parte 1 vem antes.

```text
Preciso de duas tarefas na conta Kommo do escritório Carolina Calvo Advogados, feitas só pela interface do Kommo:
- PARTE 1: enviar 4 modelos de WhatsApp para aprovação da Meta.
- PARTE 2: criar 13 Salesbots simples e me devolver o ID de cada um.
Eles serão usados pela nossa IA (a Anna), que dispara os bots pela API, um por vez, para enviar mensagens.

CONTA
- https://advogadacarolinacalvo.kommo.com (account_id 33595135). Confirme que está nessa conta antes de qualquer clique.

REGRAS GERAIS
- Não altere, desative nem exclua nada que já existe: modelos, bots, funis, leads ou configurações.
- Não altere o texto, o nome nem a categoria de nenhum modelo.
- Se aparecer login, código de verificação ou pedido de senha, pare e me avise. Não digite credenciais.
- Se a tela obrigar algo diferente do descrito aqui, pare nesse item, anote o que a tela pediu e siga para o próximo.

==================================================
PARTE 1: ENVIAR 4 MODELOS PARA APROVAÇÃO
==================================================
Os 4 modelos abaixo já existem como RASCUNHO. Foram criados pela API, que não deixa ligar o modelo ao número de WhatsApp. Por isso o envio precisa ser feito pela tela.

1. Anna - Primeiro contato (ID 51584, Marketing)
2. Anna - Lembrete reunião 24h (ID 51586, Utilidade)
3. Anna - Lembrete reunião 1h (ID 51588, Utilidade)
4. Anna - Lembrete reunião 15min (ID 51590, Utilidade)

Passo a passo:
a. Abra a área de modelos de mensagem do Kommo (normalmente em Configurações, na parte de modelos/templates de chat).
b. Abra o modelo já aprovado "Lembrete Reunião" só para olhar qual número de WhatsApp está selecionado nele. Anote e não altere nada.
c. Em cada um dos 4 modelos acima: selecione esse mesmo número de WhatsApp, confira (sem mudar) a categoria e o idioma Português (Brasil), salve e clique em enviar para revisão.
d. Se a tela pedir exemplos para as variáveis, use: IA - Primeiro nome = Maria · IA - Horário da reunião = quinta-feira, 09/10, às 15:00 · IA - Link do Meet = https://meet.google.com/abc-defg-hij
e. Confira se o status mudou para "Em revisão" (ou equivalente).
f. Se a Meta sugerir mudar a categoria, não aceite: anote e me avise.

==================================================
PARTE 2: CRIAR 13 SALESBOTS
==================================================
Regras dos bots:
- Cada bot tem UM bloco só: "Enviar mensagem". Nada de condição, espera, tag ou mudança de etapa.
- NÃO ligue nenhum bot a etapa do funil, gatilho, Digital Pipeline ou comando "/". Eles só serão disparados pela API. Se o Kommo exigir um gatilho para salvar, escolha a opção de execução manual e me avise.

BOT 1 (texto livre)
- Nome: "Anna · Texto livre"
- Bloco "Enviar mensagem" cujo conteúdo é só o campo do lead "IA - Resposta (Anna)" (campo 805202). Use o seletor de variáveis/campos do Kommo para inserir esse campo, que aparece como {{lead.cf.805202}}. Não escreva nenhum outro texto.

BOTS 2 a 13 (um por modelo do WhatsApp)
Cada um com um bloco "Enviar mensagem" usando o MODELO do WhatsApp indicado (opção de modelo/template do WhatsApp oficial, não texto livre). Nome do bot = "Anna · Modelo · " + nome do modelo.
2. Anna - Primeiro contato
3. Anna - Lembrete reunião 24h
4. Anna - Lembrete reunião 1h
5. Anna - Lembrete reunião 15min
6. Follow 1
7. Follow 2
8. Follow up 3
9. Follow up 4
10. FUP horário reunião
11. SE 5 24h
12. FUP encerramento 48h
13. Pergunta reunião

Os modelos 2 a 5 só aparecem para seleção depois que a Meta aprovar (de 1 minuto a 48 horas depois da Parte 1). Se ainda não aparecerem, crie o bot só com o nome, deixe o bloco sem modelo, salve e marque "aguardando aprovação" no relatório.

ID DO BOT
O ID aparece na URL quando o bot está aberto para edição (um número) ou na lista de bots. Anote o de cada um.

==================================================
QUANDO TERMINAR, ME DEVOLVA
==================================================
1. Parte 1: tabela com os 4 modelos: nome, número de WhatsApp selecionado e status final (Em revisão, Aprovado, Rejeitado ou Não enviado), com o motivo quando houver.
2. Parte 2: tabela com os 13 bots: número, nome do bot, ID, modelo selecionado (ou "texto do campo 805202") e situação (pronto ou aguardando aprovação).
3. Qualquer aviso que a tela tenha mostrado.
```
