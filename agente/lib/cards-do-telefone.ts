import { kommoGet } from './kommo'
import { chaveTelefone } from './telefone'

/**
 * Todos os cards do mesmo telefone, em qualquer funil. No Kommo da Dra. cada nova entrada
 * (formulário ou WhatsApp) costuma criar um CONTATO novo com um card só, então juntar
 * pelo contato não basta: a busca é pela chave do telefone (DDD + 8 últimos dígitos).
 */

export interface CardDoTelefone {
  id: number
  name?: string
  pipeline_id: number
  status_id: number
  created_at: number
  updated_at?: number
  custom_fields_values?: Array<{ field_id: number }> | null
  _embedded?: { tags?: Array<{ id: number; name: string }>; source?: { id: number; name: string } | null }
}

interface Contato { id: number; custom_fields_values?: Array<{ field_code?: string; values: Array<{ value?: unknown }> }> | null; _embedded?: { leads?: Array<{ id: number }> } }

export const telefonesDoContato = (c: Pick<Contato, 'custom_fields_values'>): string[] =>
  (c.custom_fields_values || []).filter(f => f.field_code === 'PHONE').flatMap(f => f.values.map(v => String(v.value || '')))

export async function telefonesDoContatoId(contatoId: number): Promise<string[]> {
  return telefonesDoContato(await kommoGet<Contato>(`/api/v4/contacts/${contatoId}`))
}

export async function cardsDoTelefone(telefones: Array<string | null | undefined>): Promise<CardDoTelefone[]> {
  const chaves = [...new Set(telefones.map(chaveTelefone).filter((c): c is string => !!c))]
  const ids = new Set<number>()
  for (const chave of chaves) {
    const d = await kommoGet<{ _embedded?: { contacts?: Contato[] } }>(`/api/v4/contacts?query=${chave.slice(-8)}&with=leads&limit=50`)
    for (const c of d?._embedded?.contacts || []) {
      if (telefonesDoContato(c).some(t => chaveTelefone(t) === chave)) for (const l of c._embedded?.leads || []) ids.add(l.id)
    }
  }
  const lista = [...ids]
  const cards: CardDoTelefone[] = []
  for (let i = 0; i < lista.length; i += 50) {
    const filtro = lista.slice(i, i + 50).map(id => `filter[id][]=${id}`).join('&')
    const d = await kommoGet<{ _embedded?: { leads?: CardDoTelefone[] } }>(`/api/v4/leads?${filtro}&with=source&limit=50`)
    cards.push(...(d?._embedded?.leads || []))
  }
  return cards
}
