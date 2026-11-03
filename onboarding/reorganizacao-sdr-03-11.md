# Reorganização do SDR pedida pela Dra. (03/11/2026)

## Regra nova da Anna (no ar, commit 7e9cba5)

| Renda bruta confirmada pelo lead | Coluna | Oferta de reunião |
|---|---|---|
| abaixo de R$ 10 mil | Desqualificado | não |
| R$ 10 mil a R$ 15 mil | 10 A 15 MIL | não |
| acima de R$ 15 mil | ACIMA DE 15 MIL | sim |

A faixa do formulário nunca move o card sozinha. O card só muda de coluna quando o próprio lead informa a renda na conversa.

## Conferência dos cards antes da movimentação

Leitura feita em 03/11/2026, só leitura: nenhum card foi movido.

| Coluna hoje | Cards | Renda abaixo de 10 mil ou sem informação | Sinal de renda de 10 mil ou mais | Só "De 7 a 15 mil" (ambíguo) | Cards de teste |
|---|---|---|---|---|---|
| ATÉ 5 MIL | 5.041 | 3.763 + 316* | 780 | 182 | — |
| 5 A 10 MIL | 299 | 207 | 90 | — | 2 |
| ICMS | 0 | — | — | — | — |

\* 316 cards têm a faixa "De 7 a 15 mil" no formulário, mas também uma tag de faixa abaixo de 10 mil ("7 a 9k", "1 a 3k", "4 a 6k" ou "1 A 6").

O que conta como sinal de renda de 10 mil ou mais:
- campo "IA - Renda bruta" de 10 mil ou mais;
- resposta do formulário de 10 a 15 mil ou acima de 15 mil;
- formulário antigo "Superior a 15 mil";
- tags "10 a 15 k", "Acima de 15", "Acima de 20" ou "ACIMA DE 30".

Destino proposto para os 870 cards com sinal de renda:
- 339 para ACIMA DE 15 MIL;
- 531 para 10 A 15 MIL.

## Robôs que apontam para as colunas que vão sair

Estes robôs movem cards para ATÉ 5 MIL ou 5 A 10 MIL e precisam de um destino novo antes de as colunas serem excluídas:
- 39652 SDR RETORNO IMEDIATO
- 48895 Acompanha resposta e move para RI
- 50370 SDR- Alterar etapa plan-Rtrnimed. (automações 35585046 e 35585012)
- 48672 Retorno Imediato SDR
- 45903 Para retorno imediato
- regra de Venda ganha/perdida do SDR que leva para 5 A 10 MIL (30933818)
- regra de Venda perdida do Closer que leva para 5 A 10 MIL (30933832)
- 15160 Fluxo Superendividamento - Vídeo ("Luíza")

## Feito em 03/11/2026

| O quê | Resultado |
|---|---|
| Decisões do Eduardo | Cards com sinal de renda vão para a coluna da renda. Os 182 ambíguos vão para Desqualificado. Robôs que mandavam para as colunas excluídas passam a mandar para Contato inicial; os que classificam pela faixa salarial ("Luíza", Robo inicial), para Desqualificado. |
| Movimentação | 5.339 cards movidos pela integração entre 17:59 e 18:01: 4.467 para Desqualificado, 532 para 10 A 15 MIL e 340 para ACIMA DE 15 MIL. 1 card tinha sido excluído no Kommo antes da movimentação. A coluna de origem de cada card está em `reorganizacao-sdr-03-11-backup.json`, para desfazer se for preciso. |
| Mensagens e tarefas | Nenhuma tarefa criada. As mensagens dos cards movidos nesse horário foram trocadas com o próprio lead antes ou durante a conversa, sem relação com a movimentação. |
| Coluna ICMS | Excluída (estava vazia e sem robôs). |
| ATÉ 5 MIL e 5 A 10 MIL | Vazias. Saem depois de os robôs serem redirecionados: `prompt-cowork-reorganizacao-sdr.md`. |
