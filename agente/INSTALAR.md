# Anna · SDR de IA da Carolina Calvo Advogados

> **Estado (13/10/2026): construída, aguardando prova.** Typecheck limpo, `npm test` 82/82,
> exame do intérprete 63/63 (21 cenários × 3, GPT-5.4 Mini real), `scripts/validate.ts`
> sem problemas contra o Kommo vivo. **Ainda não rodou com lead real**: faltam as peças
> externas da lista abaixo e o teste ponta a ponta no WhatsApp.

## O que ela faz

```
Lead de formulário ganha a tag "anna" ─→ /api/lead ─→ modelo "Anna - Primeiro contato" (pergunta 1)
Lead responde (add_message) ─→ /api/inbound ─→ cancela a régua ─→ buffer 10s
  ─→ roteiro da Dra. em CÓDIGO (lib/anna/fluxo.ts) + GPT só para ler o turno (lib/anna/interprete.ts)
     q1 opção → q2 renda bruta/líquido/desconto (move o card para a coluna da renda)
       → q3 (texto da Dra. com o valor do desconto)
          ├ renda < R$ 10 mil → registra para a equipe, sem reunião
          └ msg 4 → pausa de 30 min (relógio) → msg 5 com UM horário (Google Agenda)
             → aceitou: evento com Meet, Closer › Reunião agendada, lembretes 24h/1h/15min
             → não pode: "manhã ou tarde?" → próximo horário do dia seguinte
  ─→ resposta no campo "IA - Resposta (Anna)" ─→ Salesbot de texto livre ─→ WhatsApp
Lead some ─→ /api/tick (QStash, 5 em 5 min) ─→ réguas de config/follow-ups.json com os modelos aprovados
```

- **Nunca diz que é IA.** "É robô?" é pego em código e passa para a equipe (tag `atendimento-humano`, tarefa no card).
- **Passa para a equipe:** pediu pessoa, já tem advogado (texto da Dra.), já é cliente, outro assunto, remarcação, sem agenda.
- **Agenda em sequência:** tarde 15:00 → 17:30, depois manhã 11:30 → 10:00; seg a sex; prioridade: R$ 13,5 mil ou mais pode ser no mesmo dia, abaixo disso a partir do dia útil seguinte (a confirmar).
- **Follow-up:** qualificação (2h, +21h, +48h, +72h, encerra em 24h), agendamento (2h, 24h e 48h da oferta), pós-proposta (24h depois de Cliente decisão, desligado até a automação antiga sair). Janela 7h–20h. Resposta do lead ou fala da equipe cancela.
- **Diário:** `/api/executions?secret=` com custo por execução.

## Peças que faltam (o validate lista ao vivo)

| # | Peça | Quem | Como |
|---|---|---|---|
| 1 | Aprovar os 4 modelos novos na Meta | Cowork | `onboarding/prompt-cowork-envio-modelos.md` |
| 2 | 13 Salesbots (1 texto livre + 12 modelos) e os IDs | Cowork | `onboarding/prompt-cowork-salesbots.md` → preencher `lib/crm-map.ts` (`botId`) e `KOMMO_BOT_ID` |
| 3 | Credenciais do Google | Dra. | `tutoriais/01-google-agenda.mp4` → `GOOGLE_*` |
| 4 | Redis e relógio | Control Gestão | Upstash: database Redis + QStash Schedule `*/5 * * * *` para `DEPLOY_URL/api/tick` com `Authorization: Bearer <CRON_SECRET>` |
| 5 | Deploy | Control Gestão | Vercel (plano Pro: uso comercial) com as envs de `.env.local.example` |
| 6 | Webhooks | Control Gestão, com OK do escritório | `npx tsx scripts/create-webhook.ts` (lista) → `--criar` |
| 7 | Desligar automações antigas nos leads da Anna | Cowork, com OK | Salesbot das tags FOLLOW 1–4; regra que devolve o lead para "5 A 10 MIL"; automação de 24h em Cliente decisão (antes de `POS_PROPOSTA_ATIVO=true`). Ler antes com `onboarding/prompt-cowork-ler-salesbots.md` |

## Ordem para ligar

1. `npm ci && npm run typecheck && npm test` → verde.
2. `EVAL_REPS=3 npm run evals` → todos aprovados (custa centavos na chave do escritório).
3. Peças 1 a 5. `npx tsx scripts/validate.ts` → `prontoParaLeadReal: true`.
4. Webhooks (peça 6).
5. **E2E com lead de teste** (número da equipe, em `TEST_LEAD_IDS`, com a tag `anna`):
   - ☐ primeiro contato chega no celular pelo modelo;
   - ☐ "3" → pergunta 2;
   - ☐ valores em partes → pede só o que falta;
   - ☐ o card muda de coluna;
   - ☐ áudio com os valores é transcrito;
   - ☐ msg 3 com o desconto;
   - ☐ msg 4, e 30 min depois a msg 5 com horário real;
   - ☐ "não posso" → manhã/tarde → nova oferta;
   - ☐ "pode" → evento com Meet na agenda da Dra., card em Reunião agendada;
   - ☐ lembretes;
   - ☐ "é robô?" → equipe;
   - ☐ silêncio de 2h → FOLLOW 1;
   - ☐ resposta cancela a régua;
   - ☐ `reset` recomeça;
   - ☐ tudo aparece em `/api/executions`.
6. Rampagem: 10 leads com a tag → todos → `AUTO_GATE_FORM_LEADS=true`.

## Arquivos

| Do cliente (patch) | Motor (asset do template Kommo v2) |
|---|---|
| `lib/crm-map.ts` `lib/regras.ts` `prompts/anna.md` `config/follow-ups.json` `lib/anna/*` `scripts/evals.ts` | `lib/buffer.ts` `history.ts` `kommo.ts` `media.ts` `transport.ts` `guards.ts` `execlog.ts` `redis.ts` `reset.ts` `api/inbound.ts` `api/salesbot.ts` |

O roteiro fixo (`lib/anna/fluxo.ts`) substitui o cérebro por portas do template, porque a Dra. tem texto fechado para cada etapa: o modelo não pode reescrever esses textos. As peças novas e genéricas (`lib/jobs.ts`, `lib/followup.ts`, `lib/modelos.ts`, `lib/google.ts`, `lib/anna/agenda.ts`) são candidatas a voltar para a skill depois da prova.
