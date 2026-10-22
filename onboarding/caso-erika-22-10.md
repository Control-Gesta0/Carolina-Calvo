# Caso Erika Nachi (card 28990828): diagnóstico, correções e auditoria

Registro de 22/10/2026, feito a partir do histórico de eventos do Kommo (quem fez cada mudança e quando), do diário da Anna e das conversas guardadas por ela.

## A. O que aconteceu

| Quando (Brasília) | O que houve | Quem fez |
|---|---|---|
| 20/10 16:02 | A lead entra pelo formulário "Geral - Formulário Remarketing". Ganha a tag `ia`, a Anna manda a 1ª mensagem (modelo aprovado) e a etiqueta OUT 26 | Anna |
| 20/10 18:05 | Follow-up de 2 horas | Anna |
| 21/10 10:09 a 11:08 | A Dra. assume a conversa, qualifica e marca a reunião. A Anna fica em silêncio porque a equipe escreveu | Dra. Carolina |
| 21/10 11:09:02 | A Dra. move o card para Closer › Reunião agendada | Dra. Carolina |
| 21/10 11:09:10 | **8 segundos depois de a lead escrever "Ok"**, o card vai para SDR › 5 A 10 MIL | robô do Kommo |
| 21/10 16:18 → 16:25 | A Dra. devolve o card ao Closer. A lead responde "Ok combinado" e o robô o leva de novo para SDR › 5 A 10 MIL | Dra. / robô |
| 21/10 18:11 | Depois da reunião, a Dra. põe a tag JÁ FEZ REUNIÃO e move o card para Closer › Cliente decisão | Dra. Carolina |
| 22/10 14:06:09 | A lead escreve "Boa tarde" | lead |
| 22/10 14:06:16 | **7 segundos depois**, o card sai de Cliente decisão e vai para SDR › 5 A 10 MIL | robô do Kommo |
| 22/10 14:06:26 | A Anna responde "Qual das opções você quer saber: 1, 2 ou 3?" | Anna (erro) |
| 22/10 14:07:04 | A lead diz que vai fechar com a Dra. A Anna classifica como "já é cliente", passa para a equipe e responde | Anna (erro) |

**Quem moveu o card para o SDR:** foram os robôs antigos do Kommo, não a Anna. Nas três vezes, a mudança saiu do sistema segundos depois de a lead escrever. É o comportamento documentado em 13/10 dos robôs "SDR RETORNO IMEDIATO" (39652) e "Acompanha resposta e move para RI" (48895): quando o lead escreve num card do Closer, eles movem o card para SDR › 5 A 10 MIL. A Anna não mexeu na etapa desse card em nenhum momento.

**Por que a Anna requalificou:**
1. Ela só tinha registrado a 1ª pergunta, porque toda a qualificação foi feita pela Dra., na mão.
2. A regra da época era: quando a equipe escreve, a Anna espera 6 horas e depois volta a atender.
3. No dia seguinte, a lead escreveu e o robô tinha acabado de levar o card para o SDR. A Anna não tinha nenhuma trava para card que veio do Closer, então retomou a pergunta em que tinha parado.

**Por que classificou como "já é cliente":** a intenção "já é cliente" estava definida de um jeito amplo ("fala de um processo em andamento"). A frase "vou fechar com ela para iniciar meu processo" caiu nela. Não existia uma intenção para quem quer contratar.

## B. O que foi corrigido

Na Anna (commit `b8a8fd2`, publicado em 22/10):
1. **Proteção do Closer:** quando um robô tira um card do Closer e põe no SDR, a Anna devolve o card ao Closer.
   - Vale para a conta toda, não só para os leads da Anna.
   - Roda na hora em que o lead escreve e também a cada 5 minutos.
   - **Cliente decisão** → **Closer › Retorno imediato**, com tarefa prioritária de 15 minutos: "Lead deseja contratar — retorno imediato", se o lead fala em fechar ou contratar, ou "Lead respondeu em Cliente decisão — retorno imediato".
   - **Outras etapas do Closer** → voltam para a etapa em que estavam. Há tarefa prioritária só se o lead fala em contratar.
   - **Nenhuma mensagem** é enviada ao lead. Se a equipe já tiver mexido no card depois do robô, vale a decisão da equipe.
2. **A Anna não conversa:**
   - com card que está no Closer;
   - com card que já passou pelo Closer alguma vez;
   - com card que tem a tag JÁ FEZ REUNIÃO.
3. **Intenção "quer contratar":**
   - a Anna não manda mensagem nem pergunta nada;
   - move o card para Closer › Retorno imediato e cria a tarefa "Lead deseja contratar — retorno imediato", com prazo de 15 minutos;
   - só vale se o lead falou de fato em fechar, contratar, assinar ou iniciar o processo.

   "Já é cliente" passou a exigir contrato assinado ou processo em andamento. Quem só fez reunião não é cliente.
4. **Quando a equipe escreve, a Anna sai e não volta sozinha:**
   - ela põe a tag `atendimento-humano` e uma nota no card;
   - ela não retoma mais depois de 6 horas;
   - para devolver o lead à Anna, a equipe tira a tag.
5. **Kommo:** a etapa **Closer › Retorno imediato** foi criada, logo depois de Cliente decisão.

Os robôs antigos continuam ligados. Eles ainda movem o card por alguns segundos, e a Anna devolve. Se a Dra. quiser, eles podem ser ajustados no Kommo para mover direto para Closer › Retorno imediato.

## C. Auditoria (01/10 a 22/10)

- **139 movimentações Closer → SDR:**
  - **138 feitas por robô:** 68 de Cliente decisão, 67 de Reunião agendada e 3 de Não compareceu, todas para SDR › 5 A 10 MIL;
  - **1 feita pela Dra.:** de Cliente decisão para AGENDAR REUNIÃO.
- **Datas:** 120 das 138 aconteceram antes de a Anna começar a atender (19/10, 9h46). O comportamento é dos robôs, anterior à Anna.
- **Cards distintos movidos por robô:** 56. Em 22/10, **40 deles continuavam no SDR**.
- **Cards da Anna:** só 2 desses 56 tinham a tag `ia`:
  - Erika (28990828), já devolvida para Closer › Retorno imediato, com tarefa prioritária;
  - 28978570, movido de Reunião agendada em 20/10. A Anna está bloqueada para ele pela nova regra.

A lista completa está no relatório entregue ao Eduardo. Os 40 cards que continuam no SDR podem voltar ao Closer de uma vez, cada um para a etapa de onde saiu, se a Dra. autorizar.

## D, E e F. Testes

- **Testes automáticos: 169 de 169 aprovados.** Incluem:
  - o robô tirando o card do Closer;
  - Cliente decisão com "quero fechar o contrato" → Retorno imediato, com tarefa de contratar;
  - a Anna sem conversar no Closer;
  - "quer contratar" sem mensagem.
- **Exame de conversa da IA:** 24 cenários, 3 rodadas cada (72 de 72), incluindo as frases da Erika e "Doutora, pensei melhor e quero fechar o contrato.". A qualificação normal, as ofertas de horário e as passagens continuam iguais.
- **Teste real no WhatsApp:** card de teste em Closer › Cliente decisão, com a mensagem "Doutora, pensei melhor e quero fechar o contrato.". Resultado registrado abaixo.
