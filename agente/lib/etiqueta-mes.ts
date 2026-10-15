import { CRM_MAP } from './crm-map'
import { cardsDoTelefone, telefonesDoContatoId, type CardDoTelefone } from './cards-do-telefone'
import { logExec } from './execlog'
import { addLeadTags, kommoGet } from './kommo'
import { k, redis } from './redis'

/**
 * ETIQUETA DE MÊS DAS ENTRADAS POR CAMPANHA (Ajuste 4, regra da Dra. de 15/10/2026):
 *  - card que entra por formulário do Meta ganha a etiqueta do mês de entrada ("OUT 26");
 *  - card que nasce de conversa espontânea pelo WhatsApp não ganha etiqueta de mês;
 *  - vários formulários no mesmo mês = uma etiqueta só;
 *  - o card novo reúne as etiquetas de mês dos cards anteriores do mesmo telefone
 *    (JAN 26 + FEV 26 + SET 26). Nenhuma etiqueta é apagada, nem dos cards antigos.
 * No Kommo da Dra., cada formulário enviado vira um card novo (conferido em 15/10/2026),
 * então "nova entrada" = card novo. O relógio (/api/tick) varre os cards criados
 * desde a última volta. Liga com ETIQUETA_MES_ATIVA=true.
 */

/** Nomes dos meses como a Dra. já usa nas etiquetas de 2026 ("ABRIL 26", "MAIO 26", "OUT 26"). */
const MESES = ['JAN', 'FEV', 'MAR', 'ABRIL', 'MAIO', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
const PREFIXOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
/** As variações que já existem na conta: "OUT 26", "Out 24", "Outubro 24", "MAIO25", "SET/26". */
const RX_MES = /^(jan(?:eiro)?|fev(?:ereiro)?|mar(?:ço|co)?|abr(?:il)?|mai(?:o)?|jun(?:ho)?|jul(?:ho)?|ago(?:sto)?|set(?:embro)?|out(?:ubro)?|nov(?:embro)?|dez(?:embro)?)\.?\s*[/-]?\s*(\d{4}|\d{2})$/i

/** "OUT 26" → "2026-10"; etiqueta que não é de mês → null. Puro. */
export function mesDaEtiqueta(nome: string): string | null {
  const m = RX_MES.exec(nome.trim())
  if (!m) return null
  const mes = PREFIXOS.indexOf(m[1].slice(0, 3).toLowerCase()) + 1
  const ano = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2])
  return `${ano}-${String(mes).padStart(2, '0')}`
}

/** Data → etiqueta do mês em Brasília ("OUT 26"). Puro. */
export function etiquetaDoMes(quando: Date): string {
  const [ano, mes] = quando.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }).split('-')
  return `${MESES[Number(mes) - 1]} ${ano.slice(2)}`
}

const CAMPOS_FORMULARIO = [CRM_MAP.campos.formVoceE, CRM_MAP.campos.formSalario, CRM_MAP.campos.formDescontos]

/** Entrou por formulário de campanha? A origem do card é o nome do formulário ("Geral - Formulário Remarketing - 01/09/2026"). Puro. */
export function ehEntradaDeFormulario(card: Pick<CardDoTelefone, 'custom_fields_values' | '_embedded'>): boolean {
  if (/formul[aá]rio/i.test(card._embedded?.source?.name || '')) return true
  return (card.custom_fields_values || []).some(f => CAMPOS_FORMULARIO.includes(f.field_id))
}

/** Puro: as etiquetas de mês que o card ganha. Nunca tira nenhuma. */
export function etiquetasDoCard(card: CardDoTelefone, outros: CardDoTelefone[]): string[] {
  const tags = (c: CardDoTelefone) => (c._embedded?.tags || []).map(t => t.name)
  const meses = new Set(tags(card).map(mesDaEtiqueta).filter(Boolean))
  const novas: string[] = []
  const somar = (nome: string) => {
    const m = mesDaEtiqueta(nome)
    if (m && !meses.has(m)) { meses.add(m); novas.push(nome) }
  }
  if (ehEntradaDeFormulario(card)) somar(etiquetaDoMes(new Date(card.created_at * 1000)))
  // só o card mais recente reúne: os anteriores a ele, do mais antigo para o mais novo
  const anteriores = outros.filter(o => o.id !== card.id && o.created_at < card.created_at).sort((a, b) => a.created_at - b.created_at)
  for (const o of anteriores) for (const t of tags(o)) somar(t)
  return novas
}

export interface Entrada extends CardDoTelefone { _embedded?: CardDoTelefone['_embedded'] & { contacts?: Array<{ id: number; is_main?: boolean }> } }

/** Lê os cards do mesmo telefone e diz o que o card ganharia (não grava). */
export async function calcularEntrada(card: Entrada): Promise<{ novas: string[]; formulario: boolean; outros: CardDoTelefone[] }> {
  const contatos = card._embedded?.contacts || []
  const contato = contatos.find(c => c.is_main) || contatos[0]
  const telefones = contato ? await telefonesDoContatoId(contato.id) : []
  const outros = telefones.length ? (await cardsDoTelefone(telefones)).filter(o => o.id !== card.id) : []
  return { novas: etiquetasDoCard(card, outros), formulario: ehEntradaDeFormulario(card), outros }
}

const K_ULTIMA = () => k('mes', 'ultima')
const K_VISTO = (id: number) => k('mes', 'visto', id)
const K_DIARIO = () => k('mes', 'diario')

/**
 * Uma volta do relógio: cards criados desde a última volta (com 10 min de folga), do mais
 * antigo para o mais novo. Cada card é tratado uma vez. Se algum falhar, a próxima volta
 * olha de novo a mesma janela (até 3 dias para trás).
 */
export async function varrerEntradas(agora = Date.now()): Promise<string[]> {
  const ultima = Number(await redis.get(K_ULTIMA())) || agora - 40 * 60_000
  const de = Math.floor(Math.max(ultima - 10 * 60_000, agora - 3 * 86400_000) / 1000)
  const cards: Entrada[] = []
  for (let pagina = 1; pagina <= 4; pagina++) {
    const d = await kommoGet<{ _embedded?: { leads?: Entrada[] }; _links?: { next?: unknown } }>(`/api/v4/leads?filter[created_at][from]=${de}&with=contacts,source&limit=250&page=${pagina}`)
    cards.push(...(d?._embedded?.leads || []))
    if (!d?._links?.next) break
  }
  const feitos: string[] = []
  let falhou = false
  for (const card of cards.sort((a, b) => a.created_at - b.created_at)) {
    if ((await redis.set(K_VISTO(card.id), '1', { nx: true, ex: 7 * 86400 })) !== 'OK') continue
    try {
      const { novas, formulario } = await calcularEntrada(card)
      if (novas.length) await addLeadTags(card.id, novas)
      const linha = `${card.id} ${formulario ? 'formulário' : 'sem formulário'}: ${novas.length ? `+ ${novas.join(', ')}` : 'nada a acrescentar'}`
      await redis.lpush(K_DIARIO(), JSON.stringify({ ts: new Date(agora).toISOString(), leadId: card.id, formulario, novas })).then(() => redis.ltrim(K_DIARIO(), 0, 499)).catch(() => undefined)
      feitos.push(linha)
    } catch (e) {
      falhou = true
      await redis.del(K_VISTO(card.id))
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 300)
      feitos.push(`${card.id}: ERRO ${msg}`)
      await logExec({ tipo: 'erro', leadId: card.id, detalhe: `etiqueta de mês: ${msg}` })
    }
  }
  if (!falhou) await redis.set(K_ULTIMA(), agora)
  return feitos
}
