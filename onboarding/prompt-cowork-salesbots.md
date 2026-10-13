# Prompt para o Cowork: criar os 13 Salesbots de envio da Anna

> Cole o bloco abaixo numa sessão do Cowork com o navegador (Claude in Chrome) logado no Kommo do escritório com um usuário administrador.

```text
Preciso que você crie 13 Salesbots SIMPLES na conta Kommo do escritório Carolina Calvo Advogados e me devolva o ID de cada um. Eles serão disparados pela API da nossa IA (a Anna), um por vez, para enviar mensagens. Trabalhe só pela interface do Kommo.

CONTA
- https://advogadacarolinacalvo.kommo.com (account_id 33595135). Confirme que está nessa conta antes de começar.

REGRAS
- Cada bot tem UM bloco só: "Enviar mensagem". Nada de condição, espera, tag ou mudança de etapa.
- NÃO ligue nenhum bot a etapa do funil, gatilho, Digital Pipeline ou comando "/". Eles só são disparados pela API. Se o Kommo exigir um gatilho para salvar, escolha a opção de execução manual e me avise.
- Não altere, desative nem exclua nenhum bot existente.
- Se aparecer login, código de verificação ou senha, pare e me avise.

BOT 1 (texto livre)
- Nome: "Anna · Texto livre"
- Bloco "Enviar mensagem" com o conteúdo igual ao campo do lead "IA - Resposta (Anna)" (campo 805202). Use o seletor de variáveis/campos do Kommo para inserir esse campo, que aparece como {{lead.cf.805202}}. Não escreva nenhum outro texto.

BOTS 2 a 13 (um por modelo aprovado do WhatsApp)
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

Os modelos 2 a 5 podem ainda estar em revisão na Meta e não aparecer para seleção. Nesse caso, crie o bot só com o nome, deixe o bloco sem modelo, salve e marque "aguardando aprovação" no relatório.

ID DO BOT
O ID aparece na URL quando o bot está aberto para edição (um número) ou na lista de bots. Anote o de cada um.

QUANDO TERMINAR, ME DEVOLVA
Uma tabela: número, nome do bot, ID, modelo selecionado (ou "texto do campo 805202"), situação (pronto ou aguardando aprovação). Inclua qualquer aviso que a tela tenha mostrado.
```
