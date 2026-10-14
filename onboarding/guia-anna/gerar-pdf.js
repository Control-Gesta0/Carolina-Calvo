// Gera o PDF do guia: NODE_PATH=/opt/node22/lib/node_modules node gerar-pdf.js guia.html "../Guia de uso - Anna.pdf"
const { chromium } = require('playwright')
const path = require('path')
;(async () => {
  const [html, pdf, pngDir] = process.argv.slice(2)
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 1.5 })
  await p.goto('file://' + path.resolve(html), { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready)
  const estouros = await p.evaluate(() => [...document.querySelectorAll('.pagina')].map((pg, i) => {
    const c = pg.querySelector('.conteudo'); return c && c.scrollHeight > c.clientHeight + 1 ? `pág ${i + 1}: sobra ${c.scrollHeight - c.clientHeight}px` : null
  }).filter(Boolean))
  console.log('estouros:', estouros.length ? estouros : 'nenhum')
  const fontes = await p.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family))
  console.log('fontes:', [...new Set(fontes)].join(', ') || '(sistema)')
  await p.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true })
  if (pngDir) {
    const n = await p.locator('.pagina').count()
    for (let i = 0; i < n; i++) await p.locator('.pagina').nth(i).screenshot({ path: `${pngDir}/p${String(i + 1).padStart(2, '0')}.png` })
  }
  await b.close()
})().catch(e => { console.error(e); process.exit(1) })
