// Uso: NODE_PATH=$(npm root -g) node gerar-pdf.cjs relatorio.html "../Relatório caso Erika - 22-10.pdf"
const { chromium } = require('playwright'); const path = require('path')
;(async () => { const [h, out] = process.argv.slice(2); const b = await chromium.launch(); const p = await b.newPage()
  await p.goto('file://' + path.resolve(h), { waitUntil: 'networkidle' }); await p.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true }); await b.close(); console.log('ok', out) })()
