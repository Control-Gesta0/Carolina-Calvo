# Automações do Kommo que convivem com a Anna

Leitura feita pelo Cowork em 13/10/2026, só leitura, nada foi alterado. Este arquivo registra o que cada automação faz com os leads da Anna e como resolvemos cada caso. O pedido do escritório foi conferir antes de implantar, para não duplicar disparos nem mexer em mensagens que já funcionam.

## O que a Anna já faz para não duplicar (no código)

| Automação do escritório | O que faz | Como a Anna convive |
|---|---|---|
| Closer › Reunião agendada: bots "Reunião agendada - 2h / 1h / 15 minutos" | Lembretes antes do campo **Reunião** (803540) | A Anna preenche **Reunião** e **Agendamento** com o horário marcado, e esses lembretes saem como hoje. Os lembretes de 1h e 15 min da Anna **só saem se o card não estiver mais em Reunião agendada**. O de 24h é da Anna, porque o escritório não tem esse. |
| Closer › Reunião agendada: "24 horas depois de Lead: Agendamento" | Move o card para Cliente decisão | A Anna passou a preencher **Agendamento** (773220) junto com Reunião. Antes só preenchia Reunião. Nos leads antigos, 171 de 192 têm os dois iguais. |
| Closer › Cliente decisão: robô "Follow Cliente decisão" (52156) | 24h depois envia "Pergunta reunião" e coloca a tag "Follow-up Cliente Decisão Enviado" | A régua pós-proposta da Anna fica **desligada** (`POS_PROPOSTA_ATIVO=false`). A automação do escritório já faz isso. |
| Salesbot "Follow up" (52612), comando "/follow up" | FOLLOW 1 a 4 e Venda perdida | É manual. A Anna roda a mesma régua sozinha nos leads dela. **A equipe não deve disparar "/follow up" num lead com a tag `ia`.** |
| "FOLLOW AGENDAR REUNIÃO" (53764) e "Ativar follow 1 a 4" | Follow-ups manuais | Mesma regra: não usar nos leads da Anna. |

## O que precisa de decisão do escritório

### 1. Robôs de "retorno imediato" desfazem a coluna da Anna

- **"SDR- Alterar etapa plan-Rtrnimed." (50370):** ligado ao entrar em **5 A 10 MIL** e **10 A 15 MIL**. Espera o lead responder e move o card para **5 A 10 MIL**.
  - Efeito: a Anna põe quem ganha de 10 a 15 mil em "10 A 15 MIL". Na resposta seguinte do lead, o robô devolve o card para "5 A 10 MIL".
- **"SDR RETORNO IMEDIATO" (39652):** ligado em Reunião agendada, Cliente decisão e nas etapas seguintes do Closer. Quando o lead escreve, move o card para **SDR › 5 A 10 MIL**.
  - Efeito: depois de agendar, se o lead responder "obrigado", o card sai de Reunião agendada.
  - Com isso não saem os lembretes de 2h, 1h e 15 min do escritório, nem a mudança para Cliente decisão.
  - A Anna cobre os lembretes de 1h e 15 min nesse caso, quando os bots dela tiverem modelo.
- **"Acompanha resposta e move para RI" (48895):** faz a mesma coisa.

**Proposta:** pôr um primeiro bloco nesses 3 robôs: "se o lead tem a tag `ia`, parar". Só muda o comportamento nos leads da Anna, e nenhuma mensagem é alterada. Isso precisa do OK do escritório antes de mexer.

### 2. Robô "Campanha" ao entrar em SDR › Contato inicial

Ainda não foi lido. Se ele manda mensagem ao lead novo, duplica com o "Primeiro contato" da Anna. Ler antes de ligar `AUTO_GATE_FORM_LEADS`.

### 3. CLOSED (SDR, Closer e Gestão operacional) e "Fluxo Superendividamento - Vídeo"

Quando um lead fechado volta a escrever, essas automações movem o card para o SDR e podem mandar o vídeo. A Anna não fala com leads de Gestão operacional nem de Financeiro, nem nas etapas protegidas. Um lead perdido que volta para o SDR com a tag `ia` e sem etapa da Anna recebe o primeiro contato.

## IDs úteis

- Etapas e funis:
  - SDR › 5 A 10 MIL = 74896323
  - destino do "Move para retorno imediato" no funil Gestão operacional = 75401675
- Modelos já aprovados e conferidos na tela:
  - 49790 = Follow 1
  - 48922 = Pergunta reunião
- Campos de data:
  - Reunião = 803540, usado pelos lembretes e pelo modelo "Lembrete Reunião"
  - Agendamento = 773220, usado pela mudança para Cliente decisão
