import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Política de privacidade da Anna (exigida pelo Google para publicar o app da agenda).
 * Pública, sem dados de ninguém: só descreve o que a integração faz.
 */
const HTML = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Política de privacidade · Anna · Carolina Calvo Advogados</title>
<style>body{font-family:system-ui,sans-serif;max-width:760px;margin:32px auto;padding:0 16px;color:#1d2433;line-height:1.6}h1{font-size:24px}h2{font-size:17px;margin-top:24px}</style></head>
<body><h1>Política de privacidade da Anna</h1>
<p>A Anna é a assistente de atendimento do escritório Carolina Calvo Advogados, operada pela Control Gestão. Esta página explica como ela usa o acesso ao Google Agenda.</p>
<h2>O que a Anna acessa</h2>
<p>Somente a agenda do Google autorizada pelo escritório, com duas permissões: consultar os horários ocupados (para não oferecer um horário em que a Dra. já tem compromisso) e criar, alterar ou apagar as reuniões que a própria Anna marca, com o link do Google Meet.</p>
<h2>O que a Anna não acessa</h2>
<p>A Anna não lê o conteúdo de outros compromissos, e-mails, contatos, arquivos ou fotos, e não recebe a senha da conta Google.</p>
<h2>Uso e guarda dos dados</h2>
<p>Os dados da agenda são usados apenas para marcar reuniões de clientes do escritório. Não são vendidos, compartilhados com terceiros nem usados para publicidade. O acesso fica guardado de forma protegida e é usado só pelo sistema da Anna.</p>
<h2>Como revogar</h2>
<p>O escritório pode remover o acesso a qualquer momento em <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a>.</p>
<h2>Contato</h2>
<p>Carolina Calvo Advogados, com suporte da Control Gestão (eduardo@controlgestao.com.br).</p>
</body></html>`

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  return res.status(200).send(HTML)
}
