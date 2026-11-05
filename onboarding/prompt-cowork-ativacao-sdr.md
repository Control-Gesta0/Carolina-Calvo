# Prompt para o Cowork: tirar os robôs que conflitam com a Anna no SDR (05/11/2026)

> **Para que serve.** A Dra. autorizou a Anna em operação assistida no SDR, "com os robôs conflitantes devidamente ajustados e testados". Este prompt tira das etapas os robôs que mandariam mensagem junto com a Anna ou mexeriam nos cards dela. Os robôs não são excluídos: só sai a ligação com a etapa. O relatório guarda como estava cada uma, para desfazer se for preciso.
>
> **Ordem.** A automação da saudação (38384528) sai por último, com o horário anotado. Depois, o Claude Code liga a Anna para todos os leads de formulário e manda a saudação aos que chegaram nesse intervalo.
>
> Cole o bloco no Cowork, com o Chrome logado no Kommo do escritório. O prompt não leva nenhum segredo.

```text
Implantação da Anna (Carolina Calvo Advogados), no Kommo https://advogadacarolinacalvo.kommo.com (account_id 33595135). Confirme a conta antes de começar.

AUTORIZAÇÃO
Só pode REMOVER DA ETAPA (excluir a automação/gatilho da etapa no funil) as ligações listadas abaixo, e desligar o robô do item 6. O robô (Salesbot) em si continua existindo.

LIMITES
- Não exclua nenhum Salesbot, modelo, etapa, campo, tag ou card.
- Não edite o conteúdo de nenhum robô: mensagens, esperas, condições, blocos.
- Não mexa nos robôs da Anna: 54604, 54660, 54662, 54154 a 54160, 54184 a 54198, nem em nenhum outro com nome começando por "Anna".
- Não mexa nos que ficam: lembretes "Reunião agendada" 2h, 1h e 15 min (52128, 52152, 52154); "24 horas depois de Lead: Agendamento" → Cliente decisão; Não compareceu (21100); Campanha (16332); Follow up (52612), FOLLOW AGENDAR REUNIÃO (53764) e Ativar follow 1 a 4 (são manuais); as regras "chat iniciado por mensagem de entrada → mudar etapa" de Venda ganha/perdida (30933818 e 30933832).
- Não escreva para nenhum lead.
- Senhas e códigos são comigo. Se pedirem, me chame e espere.
- Se um item não estiver como descrito, não altere: anote o que viu e siga.

ANTES DE REMOVER CADA LIGAÇÃO, anote: funil, etapa, nome/ID do robô ou da regra, gatilho (ex.: "ao entrar na etapa", "mensagem recebida") e condições. É isso que permite desfazer.

==================================================
A · FUNIL SDR (Leads > SDR > Automatizar)
==================================================
1. "SDR- Alterar etapa plan-Rtrnimed." (50370): remova de TODAS as etapas do SDR em que aparecer (ex.: 10 A 15 MIL, ACIMA DE 15 MIL, Não quer continuar, Outros assuntos, Desqualificado). Se tiver duas automações (35585046 e 35585012), remova as duas.
2. "Fluxo Superendividamento - Vídeo" (15160, "Luíza"): remova das etapas Venda ganha e Venda perdida do SDR, e de qualquer outra etapa do SDR em que aparecer.
3. "Acompanha resposta e move para RI" (48895), "Retorno Imediato SDR" (48672) e "Para retorno imediato" (45903): remova de todas as etapas do SDR em que aparecerem.
4. Varredura: abra as etapas Incoming, Contato inicial, AGUARDANDO QUALIFICAÇÃO, 10 A 15 MIL, ACIMA DE 15 MIL, AGENDAR REUNIÃO, Não quer continuar, Outros assuntos e Desqualificado. Liste TODAS as automações de cada uma. Se sobrar alguma, fora da lista que fica e da saudação 38384528, que MANDE MENSAGEM ao lead ou MUDE A ETAPA do card quando o lead responde, NÃO remova: anote para eu decidir.

==================================================
B · FUNIL CLOSER (Leads > Closer > Automatizar)
==================================================
5. "SDR RETORNO IMEDIATO" (39652): remova de todas as etapas do Closer em que aparecer (Reunião agendada, Cliente decisão e as seguintes).
6. "Follow Cliente decisão" (52156), em Cliente decisão: remova da etapa. (A pergunta pós-reunião passa a ser da Anna.)

==================================================
C · HORÁRIO DE FUNCIONAMENTO
==================================================
7. Robô "horário de funcionamento" (41258): veja onde ele está ligado (etapa, canal de WhatsApp, configuração de horário de atendimento / resposta automática fora do horário em Configurações > Comunicação). Desligue a ligação com o WhatsApp Business "Carolina Calvo Advocacia" e com as etapas do SDR e do Closer. NÃO mexa no WhatsApp Lite 556131424636 (Gestão operacional). Se houver opção de parar o robô nas conversas em que ele está rodando, use; se não, anote.

==================================================
D · POR ÚLTIMO: A SAUDAÇÃO AUTOMÁTICA
==================================================
8. Funil SDR, etapa Contato inicial (ou Incoming): a automação 38384528, que roda o Salesbot 54604 "Anna · Saudação (primeiro contato)" quando o card entra na etapa. Remova da etapa. NÃO exclua o Salesbot 54604.
   Anote a HORA EXATA (com minutos) em que salvou. Ela é necessária para o passo seguinte.

==================================================
E · CONFERÊNCIA
==================================================
9. Reabra as automações dos funis SDR e Closer e confirme que os itens 1 a 8 não aparecem mais e que os que ficam continuam lá.

RELATÓRIO
- Para cada item de 1 a 8: o que estava ligado (funil, etapa, gatilho, condições), o que foi removido, e se conferiu reabrindo (sim/não).
- Item 4: a lista do que sobrou nas etapas do SDR e precisa de decisão, ou "nada".
- Item 7: onde estava ligado e o que foi desligado.
- Item 8: a hora exata em que a saudação automática saiu.
- O que travou ou foi pulado, com o que a tela mostrou.
```

## Depois do Cowork

Cole o relatório na sessão do Claude Code. Ele faz, nesta ordem:
1. Liga a Anna no SDR na Vercel: `GATE_TAG=ia`, `AUTO_GATE_FORM_LEADS=true`, `POS_REUNIAO=true`, `PROTEGE_CLOSER=true`, `MEMORIA=true`.
2. Manda a saudação aos leads de formulário que chegaram depois da hora do item 8.
3. Faz o teste com um card novo e acompanha os primeiros leads reais.
4. Avisa a Dra. que a Anna está no SDR.
