# Tutoriais para a Dra. Carolina

| Vídeo | O que ensina | O que ela envia ao Guilherme |
|---|---|---|
| `01-google-agenda.mp4` | Criar o acesso ao Google Agenda (Calendar API, app publicado em produção, cliente OAuth e refresh token pelo OAuth Playground) | ID do cliente, chave secreta do cliente, refresh token e e-mail da agenda |
| `02-asaas.mp4` | Gerar a chave de API de produção do Asaas (Integrações › Chaves de API) | A chave `$aact_prod_...` |

As telas são ilustrativas: o caminho e os nomes dos botões seguem a documentação do Google e do Asaas (outubro/2026), mas o visual pode variar.

## Regerar os vídeos

Os vídeos são gerados quadro a quadro a partir de `fonte/` (motor em `engine.html`, cenas em `google.js` e `asaas.js`):

```bash
cd tutoriais/fonte
NODE_PATH=$(npm root -g) node render.mjs google.js ../01-google-agenda.mp4
NODE_PATH=$(npm root -g) node render.mjs asaas.js ../02-asaas.mp4
# conferir quadros soltos antes: --preview 5,20,40 --frames /tmp/prev
```

Precisa de Playwright com Chromium e de ffmpeg.
