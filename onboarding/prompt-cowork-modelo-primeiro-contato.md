# Prompt para o Cowork: modelo novo de primeiro contato e bots dos lembretes

> Situação em 16/10/2026: a Dra. mudou a apresentação da 1ª mensagem para "Recebemos o seu contato sobre Superendividamento". A Anna já usa esse texto com quem escreve primeiro pelo WhatsApp.
> O lead de formulário recebe a 1ª mensagem por um modelo aprovado pela Meta, o "Anna - Primeiro contato" (51744), que ainda diz "sobre os descontos bancários". Modelo novo só pode ser enviado à Meta pela tela do Kommo: a integração cria o rascunho, mas não manda para aprovação (testado em 13/10).
>
> - **Parte 1:** cria o modelo "Anna - Primeiro contato v2" e manda para a Meta. O 51744 continua como está.
> - **Parte 2:** escolhe nos 3 bots de lembrete os modelos que já estão aprovados. Isso estava pendente e é necessário para os lembretes de reunião saírem.
> - **Depois:** o bot do primeiro contato (54154) recebe o modelo novo quando a Meta aprovar. O prompt curto para isso está no fim deste arquivo.
>
> Também dá para seguir os passos à mão. O prompt não leva nenhum segredo.

```text
Implantação da Anna (Carolina Calvo Advogados). Faça pelo meu Chrome, nesta ordem, e no fim me devolva um relatório único.

AUTORIZAÇÃO
Autorizo você a fazer sem nova confirmação, no Kommo https://advogadacarolinacalvo.kommo.com (account_id 33595135):
- criar 1 modelo novo de WhatsApp e enviá-lo para revisão da Meta;
- abrir 3 Salesbots da Anna, escolher o modelo no bloco "Enviar mensagem" e salvar.

LIMITES
- Não exclua, não desative e não edite nenhum outro modelo, bot, automação ou etapa. O modelo "Anna - Primeiro contato" (51744) fica como está.
- Senhas e códigos de verificação são comigo. Se pedirem, me chame e espere.
- Se um passo travar, anote o que a tela mostrou, pule só aquele item e siga.

Confirme que está na conta advogadacarolinacalvo antes de começar.

==================================================
PARTE 1 · MODELO NOVO DE PRIMEIRO CONTATO
==================================================
a. Vá em Configurações > Comunicação (ou Chats e mensagens) > Modelos e clique em criar modelo de WhatsApp.
b. Preencha:
   - Nome: Anna - Primeiro contato v2
   - Categoria: Marketing (a mesma do modelo 51744, que foi aprovado assim)
   - Idioma: Português (Brasil)
   - Conta/número do WhatsApp: o do escritório, o mesmo dos outros modelos da Anna
   - Sem cabeçalho, sem rodapé, sem botões
c. Texto do modelo, exatamente assim, com as linhas em branco:

Olá, [VARIÁVEL]. Aqui é a Anna, da equipe da Dra. Carolina Calvo. Recebemos o seu contato sobre Superendividamento.

Você quer saber se, no seu caso, é possível:

1) suspender os descontos bancários e pagamento das dívidas por até 6 meses?
2) reestruturar o pagamento das dívidas em condições mais favoráveis e com juros revisados?
3) as duas opções acima.

É só me responder com o número.

d. No lugar de [VARIÁVEL], insira pelo seletor de campos do editor o campo do lead "IA - Primeiro nome" (no código aparece como {{lead.cf.805158}}). Não digite o nome à mão.
e. Exemplo da variável (a Meta pede): Maria
f. Confira o texto com o do item c, salve e clique em "Enviar para revisão"/"Enviar para aprovação". Anote o ID do modelo novo e o status que aparece (Em revisão, Aprovado ou Rejeitado, com o motivo).

==================================================
PARTE 2 · MODELOS NOS 3 BOTS DE LEMBRETE
==================================================
Estes modelos já estão aprovados pela Meta. Atenção: existem dois modelos com cada nome. Escolha o APROVADO; o rascunho antigo não aparece na lista ou aparece sem o selo de aprovado.

| Bot   | Nome do bot                                    | Modelo a escolher                        |
| 54156 | Anna · Modelo · Anna - Lembrete reunião 24h    | Anna - Lembrete reunião 24h (ID 51746)   |
| 54158 | Anna · Modelo · Anna - Lembrete reunião 1h     | Anna - Lembrete reunião 1h (ID 51748)    |
| 54160 | Anna · Modelo · Anna - Lembrete reunião 15min  | Anna - Lembrete reunião 15min (ID 51750) |

Em cada bot:
a. Abra o bot para edição.
b. No bloco "Enviar mensagem", clique em modelo e escolha o modelo da tabela.
c. Não acrescente bloco, condição, espera, tag nem mudança de etapa.
d. Salve sem gatilho: quando abrir "Condição de execução", clique em Cancelar e depois em "Sair sem salvar" só nesse modal. Reabra o bot e confira que o modelo ficou salvo.
e. Não mexa no bot 54154 (primeiro contato): ele recebe o modelo novo quando a Meta aprovar.

==================================================
RELATÓRIO FINAL
==================================================
1. Parte 1: nome, ID e status do modelo novo; se a variável ficou como campo "IA - Primeiro nome".
2. Parte 2: tabela com bot | modelo escolhido | salvou e conferiu (sim/não).
3. Tudo o que travou ou foi pulado, com o que a tela mostrou.
```

## Quando a Meta aprovar o modelo novo

Cole o relatório na sessão do Claude Code. Quando o modelo aparecer como aprovado, rode este prompt curto no Cowork:

```text
No Kommo advogadacarolinacalvo, abra o Salesbot 54154 "Anna · Modelo · Anna - Primeiro contato". No bloco "Enviar mensagem", escolha o modelo APROVADO "Anna - Primeiro contato v2". Não acrescente nada. Salve sem gatilho: em "Condição de execução", clique em Cancelar e depois em "Sair sem salvar" só nesse modal. Reabra o bot, confira que o modelo ficou salvo e me diga o ID do modelo escolhido.
```

Depois, o Claude Code troca o modelo e os bots em `agente/lib/crm-map.ts`:
- `primeiroContato` passa para o modelo novo, com o bot 54154;
- os 3 lembretes recebem os bots 54156, 54158 e 54160.

Por fim, ele confere que o modelo e o bot estão certos.
