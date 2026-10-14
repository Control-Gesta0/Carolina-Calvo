# Central de IA · Anna (Carolina Calvo Advogados)

Painel sobre a Anna, a atendente inicial do escritório da Dra. Carolina Calvo no
WhatsApp oficial (+55 61 3246-7013, dentro do Kommo). Identidade da Control
Gestão, padrão Central v5, em **quatro abas**:

| Aba | Rotas | O que faz |
|---|---|---|
| Estatísticas | `/` · `/operacao` · `/resultados` · `/configuracoes` | Visão geral, Operação (agora, passagens, reuniões, histórico, funil), Resultados e Sistema |
| Teste | `/teste` | laboratório: conversa com a Anna sem tocar no Kommo, no WhatsApp nem na agenda da Dra.; botão Corrigir em cada resposta |
| Ensinar | `/ensinar` | a equipe pede mudanças em português, com arquivo ou link se quiser, e a IA altera o rascunho; publica só depois do exame automático |
| Como usar | `/como-usar` | passo a passo, fluxo do lead ligado aos textos da base no ar, "Sua base" e o dia a dia da equipe no Kommo (conteúdo em `lib/como-usar.ts`) |

Mais o **Pergunte à Central** (botão no menu, `Ctrl K`), com resposta calculada
em código, e o login por senha (cookie assinado, 12 horas).

- Estatísticas: só leitura e **zero tokens**, tudo calculado em código a partir
  do diário do agente e do Kommo. Teste e o exame de Ensinar usam o modelo (o
  custo aparece na tela).
- **Fail-closed**: sem as fontes, a tela mostra "verificando" ou o erro. Nunca
  mostra "operando bem" por falta de dado.
- O segredo do agente fica só no servidor; o navegador fala com `/api/*`, que
  exige sessão.

## Como os dados chegam

```
navegador → /api/exec | /api/live   (Central, exige login)
          → AGENT_URL/api/central?recurso=…            (agente, header x-central-secret)
          → Redis (diário de execuções) + Kommo (funis SDR e Closer, conferência do mapa, webhooks)
navegador → /api/base | /api/teste                     (Central, exige login)
          → AGENT_URL/api/base | /api/teste            (agente, mesmo header)
```

O contrato de dados vive em `../agente/lib/central-data.ts`. `lib/types.ts`
aqui é o espelho: mudou lá, mude aqui.

## Deploy na Vercel (projeto separado do agente: `central-carolina-calvo`)

1. O agente precisa estar com `/api/central` no ar. Confira com
   `curl -H "x-central-secret: $SEGREDO" "https://anna-carolina-calvo.vercel.app/api/central?recurso=execucoes"`.
2. Projeto Vercel com **Root Directory = `central`** (ou deploy pela CLI de dentro
   desta pasta). A Vercel detecta Next.js.
3. Variáveis de ambiente (veja `.env.example`):

| Variável | Valor |
|---|---|
| `AGENT_URL` | `https://anna-carolina-calvo.vercel.app` (sem barra no fim) |
| `AGENT_SECRET` | o `CENTRAL_SECRET` do agente (mesmo valor nos dois projetos) |
| `APP_PASSWORD` | senha de acesso da equipe |
| `AUTH_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

`CENTRAL_DEMO` fica **vazio** em produção.

4. Smoke: `/login`, depois `/`, `/operacao`, `/resultados`, `/configuracoes`
   (Sistema: agente e Kommo verdes, avisos dos dois webhooks), `/teste` (mandar
   uma mensagem) e `/ensinar`.

## Rodar local

```bash
npm ci
CENTRAL_DEMO=1 APP_PASSWORD=teste AUTH_SECRET=$(openssl rand -hex 32) npm run dev
```

Com `CENTRAL_DEMO=1` a Central usa dados fictícios (`lib/demo-data.json`, nomes
inventados), gerados pelas mesmas funções do agente com
`cd ../agente && npx tsx scripts/demo-central.ts`, e mostra um aviso no topo.

## Limites conhecidos

- O diário do agente guarda as **últimas 2.000 execuções**. Métricas de 30 dias
  cobrem só o que ainda está nele (Resultados mostra desde quando).
- Custo = só o modelo de linguagem (US$ → R$ por `COST_USD_BRL` no agente,
  padrão 5,40). Transcrição de áudio, leitura de imagem e infraestrutura não entram.
- A faixa de renda (10 mil ou mais / abaixo de 10 mil) é a última renda bruta
  que o lead informou. Lead que não informou a renda não entra nessa conta.
- "Reuniões marcadas" conta as reuniões que a Anna marcou. Reunião marcada pela
  equipe direto na agenda não aparece aqui.
- O resumo completo da passagem (objetivo, renda, desconto) fica na tarefa do
  Kommo; a Central mostra o texto que a Anna mandou ao lead.
- Funil: leads abertos nas etapas do SDR e do Closer (até 2.500) e os fechados
  como ganho ou perdido nos últimos 30 dias. "Parado" é card sem nenhuma
  atualização há 7 dias ou mais.
- Laboratório: a pausa de 30 minutos da 4ª mensagem é pulada (a 5ª sai na hora),
  fotos e áudios não entram, e o limite é de 300 mensagens por dia.
