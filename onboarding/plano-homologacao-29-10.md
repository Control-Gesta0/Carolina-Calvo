# Plano até a homologação (resposta da Dra. em 29/10/2026)

A Anna continua pausada para leads reais. Tudo abaixo roda só nos cards de teste.

## Os 7 pontos da Dra.

| # | Ponto | Situação | Teste e evidência | Data |
|---|---|---|---|---|
| 1 | Primeira mensagem para lead novo | Depende da Meta aprovar o modelo "Anna - Primeiro contato v2" e do robô de saudação (Guilherme) | Card como lead de formulário, com um número que nunca falou com o escritório: saudação, resposta, régua | Depois da aprovação |
| 2 | Régua F1 a F4 sem duplicidade | F1 27/10 e F2 28/10 saíram; a trava contra envio duplicado está no ar desde 28/10 | (11) 97895-1830: F3 30/10 07h e F4 02/11 07h, cada um uma vez só | 30/10 e 02/11 |
| 3 | Pós-reunião depois de reunião apagada | **Corrigido em 29/10** (commit eaa0d31): antes de enviar, a Anna confere na agenda da Dra. se a reunião continua lá. Apagada ou desmarcada: não envia e anota no card | Duas reuniões de teste: uma mantida (a mensagem sai) e uma apagada (não sai, com a nota) | 30/10 e 31/10 |
| 4 | Reteste das correções | Desconto "débito em conta" sem valor já não vira zero | (41) 98802-5120 do zero: desconto sem valor, pergunta do limite, "Ok, aguardo" | 30/10 |
| 5 | Robôs antigos | Inventário de 13/10 em `automacoes-existentes.md` | Lista de todos os robôs que mandam mensagem ou mudam etapa, com a proposta (fica, sai ou muda) para a Dra. decidir; depois, teste junto com a Anna | Lista em 03/11 |
| 6 | Demais regras e treino | Regras no código, sem evidência ainda | Renda até 15 mil e acima; proteção do Closer; memória; lead que já fez reunião; proposta sem resposta (régua de agendamento 2h, 24h, 48h). Treino depois da exportação das conversas | 30/10 a 02/11 |
| 7 | Reunião de 30/10 | Acompanhamento técnico | — | 30/10 |

## Cronograma

- **30/10 (sex):** F3 às 7h; reunião técnica; reset do card de teste do (41) e reteste das correções; reunião de teste mantida, para o pós-reunião.
- **31/10 (sáb):** pós-reunião da reunião mantida (sai) e da reunião apagada (não sai); régua de agendamento sem resposta em andamento.
- **30/10 a 01/11:** renda até 15 mil e acima, proteção do Closer, memória e lead que já fez reunião, em cards de teste.
- **02/11 (seg):** F4 às 7h.
- **03/11 (ter):** relatório complementar de evidências e a lista dos robôs antigos para a Dra.
- **Homologação:** a combinar depois do relatório complementar, dependendo da aprovação do modelo v2 pela Meta.

## O que precisa do Eduardo

1. OK para voltar o card 29046218 ao SDR e zerar o estado da Anna nele.
2. Responder pelo (41) nas horas combinadas.
3. OK para criar e apagar as reuniões de teste na agenda da Dra.
4. Rodar a exportação das conversas de set/out no Cowork (`prompt-cowork-conversas-set-out.md`).
5. Avisar quando o Guilherme tiver o modelo v2 aprovado e o robô de saudação pronto.
