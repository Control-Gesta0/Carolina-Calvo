# Prompt para o Cowork: 8 Salesbots da cobrança

> Os 8 modelos de cobrança foram aprovados pela Meta em 14/10/2026. O "5 dias de atraso" estava em revisão nesse dia.
> A cobrança usa o mesmo desenho dos modelos da Anna: a API do Kommo não envia modelo, então cada modelo tem um Salesbot de um bloco, e o código dispara o bot certo. Faltam esses 8 bots.
> Se o prompt `prompt-cowork-modelos-google.md` ainda não rodou, dá para colar os dois juntos no Cowork.

```text
Mais uma tarefa na conta Kommo do escritório Carolina Calvo Advogados (https://advogadacarolinacalvo.kommo.com, account_id 33595135), pelo meu Chrome. No fim, me devolva um relatório.

AUTORIZAÇÃO
Eu, Guilherme (Control Gestão, responsável técnico), autorizo você a criar sem nova confirmação os 8 Salesbots abaixo, do mesmo jeito que você criou os bots "Anna · Modelo · ...".

LIMITES
- Não exclua, não desative e não edite nenhum bot, modelo, funil ou lead que já existe.
- Senhas e códigos são comigo.
- Se um passo travar, anote o que a tela mostrou, pule só aquele item e siga.

COMO MONTAR CADA BOT
- Um bloco só: "Enviar mensagem" com o MODELO do WhatsApp oficial indicado (opção de modelo, não texto livre). Nada de condição, espera, tag ou mudança de etapa.
- Escolha o modelo APROVADO. Existem rascunhos antigos com o mesmo nome: eles não servem.
- Salve sem gatilho, como nos bots da Anna: quando abrir "Condição de execução", clique em Cancelar e depois em "Sair sem salvar" só nesse modal. Reabra o bot e confira que o modelo ficou salvo.
- Nome do bot = "Cobrança · " + nome do modelo.

OS 8 BOTS
| Nº | Nome do bot                                   | Modelo (ID)                                    |
| 1  | Cobrança · Antes do vencimento                | Cobrança - Antes do vencimento (51754)         |
| 2  | Cobrança · Dia do vencimento                  | Cobrança - Dia do vencimento (51756)           |
| 3  | Cobrança · Vencimento 17h                     | Cobrança - Vencimento 17h (51758)              |
| 4  | Cobrança · 1 dia de atraso                    | Cobrança - 1 dia de atraso (51760)             |
| 5  | Cobrança · 5 dias de atraso                   | Cobrança - 5 dias de atraso (51762)            |
| 6  | Cobrança · 10 dias de atraso                  | Cobrança - 10 dias de atraso (51764)           |
| 7  | Cobrança · 18 dias de atraso                  | Cobrança - 18 dias de atraso (51766)           |
| 8  | Cobrança · Pagamento confirmado               | Cobrança - Pagamento confirmado (51768)        |

Se o modelo 5 ainda não aparecer na lista porque está em revisão:
- crie o bot só com o nome e salve sem modelo;
- marque "aguardando aprovação" no relatório.

O ID de cada bot é o número na URL do bot aberto para edição (ou na lista de bots).

RELATÓRIO
Tabela com nº | nome do bot | ID do bot | modelo escolhido | pronto ou aguardando aprovação. E qualquer aviso que a tela mostrou.
```

Depois, cole o relatório na sessão do Claude Code. Os IDs entram em `agente/lib/crm-map.ts`, nos `botId` dos modelos `cobranca*`.
