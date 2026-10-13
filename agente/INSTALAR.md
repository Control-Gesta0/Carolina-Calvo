# Anna · SDR de IA da Carolina Calvo Advogados

> **Estado (13/10/2026): construída, aguardando prova.** Typecheck limpo,
> `npm test` 83/83 após os ajustes de 13/10 (bots e automações antigas), exame do intérprete 63/63 (21 cenários × 3, GPT-5.4 Mini real), `scripts/validate.ts`
> sem problemas contra o Kommo vivo. **Ainda não rodou com lead real**: faltam as peças
> externas da lista abaixo e o teste ponta a ponta no WhatsApp.

## O que ela faz

```
Lead de formulário ganha a tag "ia" ─→ /api/lead ─→ modelo "Anna - Primeiro contato" (pergunta 1)
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

> Atalho: as peças 1, 2, 3, 5 e a leitura da 7 estão nos prompts do Cowork no Chrome: `onboarding/prompt-cowork-go-live.md` (1ª rodada, feita em 13/10) e `onboarding/prompt-cowork-go-live-2.md` (só o que precisa da tela do Kommo ou da conta da Dra.). Vercel, relógio e webhooks saem daqui pela API.

| # | Peça | Quem | Como |
|---|---|---|---|
| 1 | Aprovar os 4 modelos novos na Meta | Cowork | Os rascunhos da API (51584–51590) não têm número WABA e a tela não deixa ligar. Criar de novo pela tela: `onboarding/prompt-cowork-go-live-2.md` (Parte 1) → trocar os `templateId` em `lib/crm-map.ts` |
| 2 | 13 Salesbots | **feito em 13/10** | Texto livre = **54152** (`KOMMO_BOT_ID`). Modelos 54162–54176 já no `crm-map.ts`. Os bots 54154–54160 esperam a aprovação dos 4 modelos para escolher o modelo; até lá o `botId` deles fica 0 e a Anna só começa quando o lead escreve |
| 3 | Credenciais do Google | Dra. ou Guilherme com a conta dela | `tutoriais/01-google-agenda.mp4` ou Parte 3 do prompt 2 → `GOOGLE_*` |
| 4 | Redis e relógio | **feito em 13/10** | Redis compartilhado com prefixo `anna-cc:`. QStash `anna-carolina-calvo-tick` (`*/5 * * * *` → `/api/tick`, Bearer `CRON_SECRET`), criado com `scripts/criar-relogio.ts --criar` |
| 5 | Deploy | **feito em 13/10** | https://anna-carolina-calvo.vercel.app (time Control Gestão, ligado ao GitHub: cada push no branch republica). Criado com `scripts/vercel.ts --publicar`. `/api/validate` em produção: `ok: true`, sem problemas |
| 6 | Webhooks | **feito em 13/10** | 47513131 `add_message` → `/api/inbound` e 47513135 `add_lead`, `update_lead`, `status_lead` → `/api/lead`, criados com `scripts/create-webhook.ts --criar`. A conta não tinha nenhum webhook antes |
| 7 | Automações antigas | lidas em 13/10 | `onboarding/automacoes-existentes.md`: o código já evita duplicar lembretes e preenche o campo Agendamento. Falta o OK do escritório para a exceção da tag `ia` nos robôs de "retorno imediato" |

## Ordem para ligar

1. `npm ci && npm run typecheck && npm test` → verde.
2. `EVAL_REPS=3 npm run evals` → todos aprovados (custa centavos na chave do escritório).
3. Peças 1 a 5. `npx tsx scripts/validate.ts` → `prontoParaLeadReal: true`.
4. Relógio: `npx tsx scripts/criar-relogio.ts --criar` e conferir no log do QStash o primeiro tique com 200.
5. Webhooks (peça 6).
6. **E2E com lead de teste** (número da equipe, em `TEST_LEAD_IDS`, com a tag `ia`):
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
7. Rampagem: 10 leads com a tag → todos → `AUTO_GATE_FORM_LEADS=true`.

## Arquivos

| Do cliente (patch) | Motor (asset do template Kommo v2) |
|---|---|
| `lib/crm-map.ts` `lib/regras.ts` `prompts/anna.md` `config/follow-ups.json` `lib/anna/*` `scripts/evals.ts` | `lib/buffer.ts` `history.ts` `kommo.ts` `media.ts` `transport.ts` `guards.ts` `execlog.ts` `redis.ts` `reset.ts` `api/inbound.ts` `api/salesbot.ts` |

O roteiro fixo (`lib/anna/fluxo.ts`) substitui o cérebro por portas do template, porque a Dra. tem texto fechado para cada etapa: o modelo não pode reescrever esses textos. As peças novas e genéricas (`lib/jobs.ts`, `lib/followup.ts`, `lib/modelos.ts`, `lib/google.ts`, `lib/anna/agenda.ts`) são candidatas a voltar para a skill depois da prova.
