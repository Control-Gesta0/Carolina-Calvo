# Prompt para o Cowork: 8 Salesbots da cobrança

> Situação conferida no Kommo em 14/10/2026: 7 dos 8 modelos de cobrança estão aprovados pela Meta. O "5 dias de atraso" (51762) continua em revisão.
>
> A cobrança funciona como os modelos da Anna. A API do Kommo não envia modelo de WhatsApp, então cada modelo ganha um Salesbot de um bloco só, e o código dispara o bot certo. Faltam esses 8 bots.
>
> O prompt não leva segredo nenhum. Cole o bloco abaixo numa sessão do Cowork com o Chrome logado no Kommo do escritório, com um usuário administrador. Se o `prompt-cowork-modelos-google.md` ainda não rodou, dá para colar os dois juntos.

```text
Tarefa na conta Kommo do escritório Carolina Calvo Advogados, pelo meu Chrome: criar 8 Salesbots de cobrança. No fim, me devolva um relatório.

AUTORIZAÇÃO
Eu, Guilherme (Control Gestão, responsável técnico), autorizo você a criar, sem nova confirmação, os 8 Salesbots listados abaixo e a salvá-los sem gatilho.

LIMITES
- Não exclua, não desative e não edite nenhum bot, modelo, funil, etapa ou lead que já existe. Pode ABRIR bots existentes só para olhar, sem salvar.
- Não ligue nenhum bot a etapa do funil, Digital Pipeline, gatilho ou comando "/". Quem dispara esses bots é a nossa API.
- Senhas e códigos de verificação ficam comigo. Se a tela pedir, pare e me chame.
- Se um passo travar, anote o que a tela mostrou, pule só aquele bot e siga.

CONTA
https://advogadacarolinacalvo.kommo.com (account_id 33595135). Confirme que está nessa conta antes de qualquer clique.

REFERÊNCIA
A lista de Salesbots da conta já tem 13 bots da Anna, criados do mesmo jeito: "Anna · Texto livre" (54152) e "Anna · Modelo · ..." (54154 a 54176).
Antes de começar, abra "Anna · Modelo · Follow 1" (54162) só para ver como ficou. Feche sem salvar. Os bots novos devem ficar iguais a ele, trocando só o nome e o modelo.

COMO MONTAR CADA BOT
1. Na lista de Salesbots, crie um bot novo.
2. Nome do bot: o da tabela abaixo, exatamente.
3. Um bloco só, "Enviar mensagem":
   - escolha a opção de MODELO (template do WhatsApp oficial), não texto livre;
   - selecione o modelo indicado na tabela;
   - deixe destinatário e canal como vierem por padrão, como nos bots da Anna (destinatário "Todos os contatos", canais "Todos"), e anote o que a tela mostrou.
4. Nada de condição, espera, tag, tarefa ou mudança de etapa. Nenhum outro bloco.
5. Salve sem gatilho:
   - ao salvar, o Kommo abre "Condição de execução" com um gatilho sugerido;
   - clique em "Cancelar" e depois em "Sair sem salvar", só nesse modal;
   - o aviso "Seu bot nunca será executado sem um gatilho" é esperado.
6. Reabra o bot e confira que o modelo ficou salvo no bloco.
7. Anote o ID do bot: é o número na URL do bot aberto para edição, ou o que aparece na lista.

OS 8 BOTS
| Nº | Nome do bot                       | Modelo a escolher (ID)                   |
| 1  | Cobrança · Antes do vencimento    | Cobrança - Antes do vencimento (51754)   |
| 2  | Cobrança · Dia do vencimento      | Cobrança - Dia do vencimento (51756)     |
| 3  | Cobrança · Vencimento 17h         | Cobrança - Vencimento 17h (51758)        |
| 4  | Cobrança · 1 dia de atraso        | Cobrança - 1 dia de atraso (51760)       |
| 5  | Cobrança · 5 dias de atraso       | Cobrança - 5 dias de atraso (51762)      |
| 6  | Cobrança · 10 dias de atraso      | Cobrança - 10 dias de atraso (51764)     |
| 7  | Cobrança · 18 dias de atraso      | Cobrança - 18 dias de atraso (51766)     |
| 8  | Cobrança · Pagamento confirmado   | Cobrança - Pagamento confirmado (51768)   |

ATENÇÃO AOS MODELOS
- Existem rascunhos antigos com os mesmos nomes (IDs 51592 a 51606). Eles nunca foram aprovados e não servem. O seletor do bot costuma listar só os aprovados. Se aparecerem dois com o mesmo nome, escolha o aprovado e anote.
- O modelo 5 ("5 dias de atraso") estava em revisão na Meta. Se ele não aparecer no seletor:
  - crie o bot 5 só com o nome e o bloco "Enviar mensagem" vazio;
  - salve sem gatilho, do mesmo jeito;
  - marque "aguardando aprovação" no relatório.
  Quando a Meta aprovar, basta abrir esse bot, clicar em modelo no bloco e escolher o "Cobrança - 5 dias de atraso".
- Se o seletor mostrar o texto do modelo, confira que começa como o esperado. Não altere nada no modelo.

RELATÓRIO
1. Tabela: nº | nome do bot | ID do bot | modelo escolhido (nome e ID, se aparecer) | pronto ou aguardando aprovação.
2. Destinatário e canal que ficaram no bloco "Enviar mensagem".
3. Qualquer aviso ou erro que a tela mostrou.
```

Depois, cole o relatório na sessão do Claude Code. Os IDs entram em `agente/lib/crm-map.ts`, nos `botId` dos modelos `cobranca*`, e o `/api/validate` deixa de apontar os bots como pendentes.
