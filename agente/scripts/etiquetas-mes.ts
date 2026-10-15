// Etiqueta de mês (Ajuste 4) contra os cards reais. Por padrão SÓ LÊ:
//   npx tsx scripts/etiquetas-mes.ts                  → cards dos últimos 14 dias: o que a regra poria × o que a equipe pôs à mão
//   npx tsx scripts/etiquetas-mes.ts --dias 30
//   npx tsx scripts/etiquetas-mes.ts --lead 123       → um card: o que ele ganharia agora
//   npx tsx scripts/etiquetas-mes.ts --lead 123 --aplicar   → grava (só para teste em card combinado)
import type { Entrada } from '../lib/etiqueta-mes'
import { loadEnv } from './env'

loadEnv()

async function main() {
  const { calcularEntrada, etiquetasDoCard, mesDaEtiqueta } = await import('../lib/etiqueta-mes')
  const { addLeadTags, kommoGet } = await import('../lib/kommo')
  const arg = (n: string) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined }
  const leadId = Number(arg('--lead') || 0)

  if (leadId) {
    const card = await kommoGet<Entrada>(`/api/v4/leads/${leadId}?with=contacts,source`)
    const r = await calcularEntrada(card)
    console.log(`card ${leadId} · origem "${card._embedded?.source?.name || '-'}" · ${r.formulario ? 'formulário' : 'sem formulário'}`)
    console.log(`etiquetas de mês hoje: ${(card._embedded?.tags || []).map(t => t.name).filter(t => mesDaEtiqueta(t)).join(', ') || '-'}`)
    console.log(`outros cards do telefone: ${r.outros.map(o => `${o.id} (${(o._embedded?.tags || []).map(t => t.name).filter(t => mesDaEtiqueta(t)).join(', ') || 'sem mês'})`).join('; ') || '-'}`)
    console.log(`acrescentaria: ${r.novas.join(', ') || 'nada'}`)
    if (process.argv.includes('--aplicar') && r.novas.length) { await addLeadTags(leadId, r.novas); console.log('gravado.') }
    return
  }

  const dias = Number(arg('--dias') || 14)
  const de = Math.floor(Date.now() / 1000) - dias * 86400
  const cards: Entrada[] = []
  for (let p = 1; p <= 20; p++) {
    const d = await kommoGet<{ _embedded?: { leads?: Entrada[] }; _links?: { next?: unknown } }>(`/api/v4/leads?filter[created_at][from]=${de}&with=contacts,source&limit=250&page=${p}`)
    cards.push(...(d?._embedded?.leads || []))
    if (!d?._links?.next) break
  }
  const meses = (tags: string[]) => [...new Set(tags.map(mesDaEtiqueta).filter((m): m is string => !!m))].sort()
  const conta = new Map<string, number>()
  const exemplos = new Map<string, string[]>()
  for (const card of cards.sort((a, b) => a.created_at - b.created_at)) {
    const r = await calcularEntrada(card)
    const manual = meses((card._embedded?.tags || []).map(t => t.name))
    // a regra "do zero": o mesmo card sem as etiquetas de mês postas à mão
    const limpo = { ...card, _embedded: { ...card._embedded, tags: (card._embedded?.tags || []).filter(t => !mesDaEtiqueta(t.name)) } }
    const regra = meses(etiquetasDoCard(limpo, r.outros))
    const tipo = r.formulario ? 'formulário' : 'WhatsApp/outro'
    const caso = `${tipo} · ${JSON.stringify(regra) === JSON.stringify(manual) ? 'igual ao manual' : !manual.length ? 'manual sem etiqueta' : !regra.length ? 'regra sem etiqueta (manual tem)' : 'diferente'}`
    conta.set(caso, (conta.get(caso) || 0) + 1)
    if (!caso.endsWith('igual ao manual')) exemplos.set(caso, [...(exemplos.get(caso) || []), `${card.id} regra=${regra.join('+') || '-'} manual=${manual.join('+') || '-'}`])
  }
  console.log(`${cards.length} cards criados nos últimos ${dias} dias\n`)
  for (const [caso, n] of [...conta].sort((a, b) => b[1] - a[1])) console.log(`${String(n).padStart(4)}  ${caso}`)
  for (const [caso, l] of exemplos) console.log(`\n${caso}:\n  ${l.slice(0, 8).join('\n  ')}`)
}

main().catch(e => { console.error(e); process.exit(1) })
