# Prompt para o Cowork: entrada da Anna em produção (Kommo)

> Situação em 19/10/2026. A Anna já está no ar, mas só responde a leads com a tag `ia`. Para os leads novos de formulário entrarem nela automaticamente, faltam três ajustes no Kommo que só se fazem pela tela:
> 1. escolher o modelo aprovado em cada um dos 4 bots de modelo da Anna. Sem isso ela não manda o primeiro contato nem os lembretes;
> 2. impedir que o robô "Campanha" mande mensagem ao lead novo ao mesmo tempo que a Anna;
> 3. impedir que os robôs de retorno imediato tirem da coluna da renda os cards da Anna.
>
> Quando o relatório voltar, o Claude Code liga a entrada automática dos leads de formulário (`AUTO_GATE_FORM_LEADS`) e acompanha o primeiro lead real.
> O prompt não leva nenhum segredo.

```text
Implantação da Anna (Carolina Calvo Advogados), entrada em produção. Faça pelo meu Chrome, nesta ordem, e no fim me devolva um relatório único.

AUTORIZAÇÃO
Autorizo você a fazer sem nova confirmação, no Kommo https://advogadacarolinacalvo.kommo.com (account_id 33595135):
- escolher o modelo no bloco "Enviar mensagem" dos 4 Salesbots de modelo da Anna e salvar;
- abrir o Salesbot "Campanha" (16332), ler e, se ele mandar mensagem ao lead, desativá-lo no funil SDR;
- acrescentar no início de 3 robôs de retorno imediato uma condição que os faz parar quando o lead tem a tag "ia".

LIMITES
- Não altere texto de mensagem nenhuma, não exclua bot, etapa, campo nem modelo.
- Fora o que está descrito, não ligue nem desligue nada.
- Senhas e códigos são comigo. Se pedirem, me chame e espere.
- Se um passo travar ou a tela for diferente do descrito, anote o que viu, pule só aquele item e siga.

Confirme que está na conta advogadacarolinacalvo antes de começar.

==================================================
PARTE 1 · MODELOS NOS 4 BOTS DA ANNA
==================================================
| Bot   | Nome do bot                                     | Modelo a escolher (APROVADO)              |
| 54154 | Anna · Modelo · Anna - Primeiro contato         | Anna - Primeiro contato (ID 51744)        |
| 54156 | Anna · Modelo · Anna - Lembrete reunião 24h     | Anna - Lembrete reunião 24h (ID 51746)    |
| 54158 | Anna · Modelo · Anna - Lembrete reunião 1h      | Anna - Lembrete reunião 1h (ID 51748)     |
| 54160 | Anna · Modelo · Anna - Lembrete reunião 15min   | Anna - Lembrete reunião 15min (ID 51750)  |

Atenção: existem dois modelos com cada nome. Escolha o APROVADO. O rascunho antigo (IDs 51584 a 51590) não aparece na lista ou aparece sem o selo de aprovado.
Se já existir um modelo APROVADO chamado "Anna - Primeiro contato v2", use esse no bot 54154 no lugar do 51744.

Em cada bot:
a. Abra o bot para edição.
b. No bloco "Enviar mensagem", clique em modelo e escolha o da tabela.
c. Não acrescente bloco, condição, espera, tag nem mudança de etapa.
d. Salve sem gatilho: quando abrir "Condição de execução", clique em Cancelar e depois em "Sair sem salvar" só nesse modal.
e. Reabra o bot e confira que o modelo ficou salvo.

==================================================
PARTE 2 · ROBÔ "CAMPANHA" (16332)
==================================================
a. Em Leads > SDR, abra as automações da etapa "Contato inicial" (ou o Salesbot "Campanha" em Configurações > Salesbots) e leia o que ele faz.
b. Anote no relatório, passo a passo: o que dispara o robô, se ele manda mensagem ao lead (qual texto ou modelo), se põe tag ou muda etapa.
c. Se ele MANDA MENSAGEM ao lead novo: desative esse robô na etapa "Contato inicial" do SDR (desligar ou remover o gatilho dele nessa etapa, sem excluir o bot). A partir de agora, quem manda a primeira mensagem é a Anna.
d. Se ele não manda mensagem (só move, marca ou cria tarefa), não mexa.

==================================================
PARTE 3 · ROBÔS DE RETORNO IMEDIATO
==================================================
Robôs: "SDR- Alterar etapa plan-Rtrnimed." (50370), "SDR RETORNO IMEDIATO" (39652) e "Acompanha resposta e move para RI" (48895).
Hoje, quando o lead responde, eles movem o card para SDR > 5 A 10 MIL. Nos leads da Anna isso desfaz a coluna da renda.

Em cada um:
a. Abra o Salesbot para edição.
b. Logo no início, antes do primeiro passo atual, acrescente uma condição: "Se o lead tem a tag ia → parar (encerrar o bot)". Se não houver, siga o fluxo atual sem nenhuma mudança.
c. Não altere nenhum outro passo, mensagem ou etapa.
d. Salve mantendo os gatilhos que já existem. Neste caso não cancele a condição de execução: ela já existe e deve continuar igual.
e. Reabra e confira que a condição ficou no início.
Se o editor não permitir condição por tag, não mexa e anote o que a tela oferece.

==================================================
RELATÓRIO FINAL
==================================================
1. Parte 1: tabela com bot | modelo escolhido (nome e ID) | salvou e conferiu (sim/não).
2. Parte 2: o que o robô "Campanha" faz e o que foi feito com ele.
3. Parte 3: tabela com robô | condição da tag ia acrescentada (sim/não) | observação.
4. Tudo o que travou ou foi pulado, com o que a tela mostrou.
```

## Depois do Cowork (na sessão do Claude Code)

Cole o relatório. O Claude Code então:
- coloca os IDs dos bots 54154 a 54160 em `agente/lib/crm-map.ts`;
- liga `AUTO_GATE_FORM_LEADS=true` na Vercel, para que todo lead novo de formulário no SDR ganhe a tag `ia` e receba o primeiro contato da Anna;
- acompanha os primeiros leads reais no diário da Anna e no Kommo.
