# Cobrança automática pelo Asaas

Módulo construído em 14/10/2026. O código está em `agente/lib/asaas.ts`, `agente/lib/cobranca/`, `agente/api/cobranca.ts` e `agente/api/asaas.ts`.

**O módulo nasce desligado.** Sem `COBRANCA_ATIVA=true`, nenhuma mensagem sai: cada rodada só registra o que sairia.

## Como funciona

1. **Relógio:** o QStash chama `/api/cobranca` às **9h** e às **17h** (Brasília), todos os dias.
2. **Leitura:** o módulo lê no Asaas as cobranças em aberto e as pagas nas últimas 24h. Do Asaas ele só lê, nunca grava.
3. **Régua:** para cada cobrança, decide qual mensagem vale hoje:

| Quando | Modelo aprovado | Variáveis |
|---|---|---|
| Vencimento dia 07: 4º dia útil do mês. Outro dia: 4 dias antes (9h) | Cobrança - Antes do vencimento | nome, vencimento, link |
| No dia do vencimento (9h) | Cobrança - Dia do vencimento | link |
| No dia do vencimento, se não pagou (17h) | Cobrança - Vencimento 17h | nenhuma |
| D+1 (9h) e a tag **inadimplentes** | Cobrança - 1 dia de atraso | link |
| D+5 (9h) | Cobrança - 5 dias de atraso | vencimento, link |
| D+10 (9h) | Cobrança - 10 dias de atraso | nome, vencimento, dias, link |
| D+18 (9h), prazo = envio + 2 dias | Cobrança - 18 dias de atraso | nome, vencimento, dias, prazo, link |
| Pagou | Cobrança - Pagamento confirmado. A tag sai se não houver outra parcela vencida | nome, vencimento |

4. **Card do cliente:** o Kommo não tem CPF, então o card é achado pelo **telefone do cliente no Asaas** (DDD e 8 últimos dígitos). Entre os cards do contato vale o de Gestão operacional, depois o do Financeiro.
   - A cobrança **nunca** sai num card do SDR ou do Closer, onde a Anna atende.
   - Sem card de cliente, a mensagem não sai e a simulação mostra "sem card".
5. **Envio:** o módulo preenche os campos "Cobrança - ..." do card e dispara o Salesbot do modelo, igual aos modelos da Anna.
   - Cada cobrança recebe cada mensagem **uma vez só**, mesmo que a rodada se repita.
   - Uma rodada envia no máximo 80 mensagens.
6. **Pagamento confirmado:** chega na hora pelo webhook do Asaas, entre 8h e 20h. Fora desse horário, ou sem webhook, sai na rodada das 9h.
7. **Respostas dos clientes:** a Anna não fala com cards do Financeiro nem da Gestão operacional. O comprovante e as dúvidas ficam com a equipe, como hoje.

## Para ligar (nesta ordem)

1. **Chave do Asaas:** a Dra. gera pelo tutorial `tutoriais/02-asaas.mp4` e manda. Ela vai na Vercel como `ASAAS_API_KEY`.
2. **Simulação com dados reais:** `GET /api/cobranca?simular=1&turno=manha` mostra cada cobrança do dia, a mensagem e o card achado. Confira com a equipe:
   - os "sem card", que pedem para corrigir o telefone no Asaas ou no Kommo;
   - se algum cliente está no card errado.
3. **Os 8 Salesbots:** pelo Cowork, com `onboarding/prompt-cowork-bots-cobranca.md`. Os IDs entram em `agente/lib/crm-map.ts`.
4. **Webhook do Asaas:** `npx tsx scripts/criar-webhook-asaas.ts --criar`, com `ASAAS_WEBHOOK_TOKEN`. Isso mexe na conta do escritório: só com o OK dele.
5. **Relógio:** `npx tsx scripts/criar-relogio.ts --criar --cobranca`.
6. **Teste ponta a ponta:**
   - cobrança de R$ 5,00 no Asaas para o celular de alguém da equipe, vencendo hoje;
   - o card desse contato em `COBRANCA_TESTE_LEADS`;
   - `COBRANCA_ATIVA=true`.
   Conferir a mensagem das 9h, a das 17h e a confirmação depois de pagar.
7. **Ligar para todos:** esvaziar `COBRANCA_TESTE_LEADS`.

## Decisões que precisam do OK da Dra.

1. **Notificações do próprio Asaas** (e-mail, SMS e WhatsApp): precisam ser desligadas para os clientes da régua. Sem isso, o cliente recebe a cobrança em dobro.
2. **Fim de semana e feriado:** a mensagem sai no dia exato, mesmo sábado ou domingo. Os textos do D+1 ("vencimento ontem") e do D+5 ("5 dias de atraso") só fazem sentido no dia certo. A alternativa é não cobrar no fim de semana e pular essas mensagens.
3. **Dia útil** (para o 4º dia útil): segunda a sexta, fora estes feriados:
   - os nacionais;
   - Carnaval, Sexta-feira Santa e Corpus Christi;
   - 30/11 (feriado do DF).
4. **Número:** a cobrança sai pelo WhatsApp oficial (+55 61 3246-7013), com modelos aprovados e custo por envio da Meta. Não sai pelo WhatsApp Lite.
5. **Link:** é a página da fatura do Asaas, que tem boleto, Pix e cartão. O texto do dia do vencimento diz "Segue o boleto".
6. **Textos escritos pela Control Gestão:** "Antes do vencimento" e "Pagamento confirmado" precisam do OK da Dra. Mudar o texto depois exige nova aprovação da Meta.
7. **Tag inadimplentes:** entra no D+1 e sai quando o cliente não tem mais parcela vencida.

## Onde ver

- `GET /api/cobranca?log=1` mostra as últimas rodadas, item por item: enviado, simulado, sem card, sem bot, já enviado ou erro.
- O `/api/validate` traz o bloco `cobranca` com as pendências. Elas não seguram a Anna.
