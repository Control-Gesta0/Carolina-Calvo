# Plano até a homologação (resposta da Dra. em 29/10/2026)

A Anna continua pausada para leads reais. Tudo abaixo roda só nos cards de teste.

## Os 7 pontos da Dra.

| # | Ponto | Situação | Teste e evidência | Data |
|---|---|---|---|---|
| 1 | Primeira mensagem para lead novo | Depende da Meta aprovar o modelo "Anna - Primeiro contato v2" e do robô de saudação (Guilherme) | Card como lead de formulário com o número +55 11 96486-6458, depois de excluir no Kommo o card e os contatos antigos dele (Cowork, Parte 0): saudação, resposta, régua | Depois da aprovação |
| 2 | Régua F1 a F4 sem duplicidade | F1 27/10 e F2 28/10 saíram; a trava contra envio duplicado está no ar desde 28/10 | (11) 97895-1830: F3 30/10 07h e F4 02/11 07h, cada um uma vez só | 30/10 e 02/11 |
| 3 | Pós-reunião depois de reunião apagada | **Corrigido em 29/10** (commit eaa0d31): antes de enviar, a Anna confere na agenda da Dra. se a reunião continua lá. Apagada ou desmarcada: não envia e anota no card | Três reuniões de teste: uma mantida (a mensagem sai), uma apagada da agenda (não sai, com a nota) e uma em que o cliente não compareceu, com o card movido para Closer › Não compareceu (não sai) | 30/10 e 31/10 |
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

## Roteiro do reteste no (41) (depois do reset)

| Passo | Eduardo manda | A Anna deve |
|---|---|---|
| 1 | `Oi` | Mandar a 1ª pergunta nova ("Eduardo, boa tarde!", opções 1️⃣ 2️⃣ 3️⃣) |
| 2 | `3` | Pedir os três valores |
| 3 | `Bruta 20 mil, líquido 16 mil e tenho débito em conta` | **Não** registrar desconto zero: perguntar o valor do desconto |
| 4 | `Vou olhar no extrato e te mando depois` | Mandar o "Ok, aguardo…" |
| 5 | `O desconto em conta é 7 mil` | Fazer a pergunta do cheque especial e do cartão |
| 6 | `Uso o cheque especial e tenho cartão com limite` | Mandar "…Seria um alívio importante para você, concorda?" |
| 7 | `Sim` | Mandar "…Retorno em alguns minutos." e, 30 min depois, oferecer os horários (renda acima de 15 mil) |
| 8 | **Não responder mais** | Régua de agendamento: 2h, 24h e 48h depois da oferta, uma vez cada |

## Testes sem resposta do lead (feitos pelo Claude)

- **Já fez reunião:** card novo para o mesmo telefone do (41), com a memória em teste. A Anna não manda nada, põe tarefa e nota para a equipe.
- **Memória com valores:** depois do F4 de 02/11, card novo para o (11), que já informou valores. A Anna cita os valores e pergunta se a situação melhorou, piorou ou continua igual.
- **Renda até 15 mil:** no (11), depois do F4 de 02/11: renda bruta abaixo de 15 mil, sem oferta de reunião.

## O que precisa do Eduardo

1. OK para voltar o card 29046218 ao SDR e zerar o estado da Anna nele.
2. Responder pelo (41) nas horas combinadas.
3. OK para criar e apagar as reuniões de teste na agenda da Dra.
4. Rodar a exportação das conversas de set/out no Cowork (`prompt-cowork-conversas-set-out.md`).
5. Avisar quando o Guilherme tiver o modelo v2 aprovado e o robô de saudação pronto.
