/** Telefone → chave de comparação: DDD + 8 últimos dígitos (ignora +55 e o 9 a mais). Puro. */
export function chaveTelefone(tel?: string | null): string | null {
  let d = String(tel || '').replace(/\D/g, '')
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2)
  if (d.length < 10) return null
  return d.slice(0, 2) + d.slice(-8)
}
