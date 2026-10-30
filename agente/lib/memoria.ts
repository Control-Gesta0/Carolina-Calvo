import { CONFIG } from './config'
import { CRM_MAP, PIPELINES, STATUS } from './crm-map'
import { cardsDoTelefone, telefonesDoContatoId, type CardDoTelefone } from './cards-do-telefone'
import type { KommoLead } from './kommo'
import { brl } from './anna/textos'

/**
 * MEMÓRIA DOS ATENDIMENTOS (Ajuste 3, escopo combinado com a Dra.):
 *  - consulta todos os cards do MESMO TELEFONE (cada entrada nova costuma criar contato e card novos);
 *  - se ele já informou renda e descontos num atendimento anterior, a Anna cita SÓ o que está
 *    registrado e pergunta se a situação melhorou, piorou ou continua igual; "igual" reaproveita os valores;
 *  - nunca afirma lembrar do que não está registrado (valores de formulário são faixas, não entram);
 *  - quem já fez reunião, tem reunião marcada ou já é cliente não é qualificado de novo: a equipe recebe
 *    tarefa com o histórico e nenhuma mensagem sai.
 * Liga com MEMORIA=true (todos) ou MEMORIA=teste (só TEST_LEAD_IDS).
 */

export const memoriaVale = (leadId: number) =>
  CONFIG.memoria === 'on' || (CONFIG.memoria === 'teste' && CONFIG.testLeadIds.includes(leadId))

export interface ValoresAnteriores { quando: string; rendaBruta?: number; rendaLiquida?: number; descontoConta?: number }

export interface Memoria {
  /** cards anteriores do mesmo telefone (sem o atual), do mais novo para o mais antigo */
  cards: Array<{ id: number; criado: number; situacao: string }>
  valores: ValoresAnteriores | null
  /** por que a Anna não qualifica de novo (null = pode qualificar) */
  bloqueio: string | null
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** "outubro" (mesmo ano) ou "setembro de 2025". Puro. */
export function mesExtenso(seg: number, agora = new Date()): string {
  const d = new Date(seg * 1000 - 3 * 3600_000)
  const ano = d.getUTCFullYear()
  return `${MESES[d.getUTCMonth()]}${ano === agora.getUTCFullYear() ? '' : ` de ${ano}`}`
}

const tagsDe = (c: Pick<CardDoTelefone, '_embedded'>) => (c._embedded?.tags || []).map(t => t.name.toLowerCase())
const num = (c: CardDoTelefone, id: number): number | undefined => {
  const f = (c.custom_fields_values as Array<{ field_id: number; values?: Array<{ value?: unknown }> }> | null | undefined)?.find(v => v.field_id === id)
  const v = Number(f?.values?.[0]?.value)
  return Number.isFinite(v) && f?.values?.[0]?.value !== '' && f?.values?.[0]?.value != null ? v : undefined
}

/** Puro: em que pé ficou um card anterior. */
export function situacaoDoCard(c: CardDoTelefone): { texto: string; cliente: boolean; reuniao: boolean } {
  const tags = tagsDe(c)
  const cliente = tags.includes(CRM_MAP.tags.cliente) || c.pipeline_id === PIPELINES.gestao || c.pipeline_id === PIPELINES.financeiro || c.status_id === STATUS.ganho
  const fez = tags.includes(CRM_MAP.tags.jaFezReuniao.toLowerCase())
  const closer = c.pipeline_id === PIPELINES.closer && c.status_id !== STATUS.perdido
  const reuniao = fez || closer
  const texto = cliente ? 'cliente do escritório'
    : fez ? 'já fez reunião com a Dra.'
    : closer ? (c.status_id === STATUS.reuniaoAgendada ? 'reunião marcada' : 'no Closer (pós-reunião)')
    : c.status_id === STATUS.perdido ? 'encerrado (venda perdida)'
    : 'atendimento sem reunião'
  return { texto, cliente, reuniao }
}

/** Puro: monta a memória a partir dos cards do mesmo telefone. */
export function montarMemoria(atualId: number, cards: CardDoTelefone[], agora = new Date()): Memoria {
  const anteriores = cards.filter(c => c.id !== atualId).sort((a, b) => b.created_at - a.created_at)
  const sits = anteriores.map(c => ({ c, s: situacaoDoCard(c) }))
  const comValor = anteriores.find(c => num(c, CRM_MAP.campos.rendaBruta) != null)
  const valores: ValoresAnteriores | null = comValor ? {
    quando: mesExtenso(comValor.updated_at || comValor.created_at, agora),
    rendaBruta: num(comValor, CRM_MAP.campos.rendaBruta),
    rendaLiquida: num(comValor, CRM_MAP.campos.rendaLiquida),
    descontoConta: num(comValor, CRM_MAP.campos.descontoConta),
  } : null
  const cli = sits.find(x => x.s.cliente)
  const reu = sits.find(x => x.s.reuniao)
  // frase com verbo: "este lead já fez reunião…", "…tem reunião marcada…", "…está no Closer (pós-reunião)…"
  const frase = (t: string) => t.startsWith('já ') ? t : t === 'reunião marcada' ? 'tem reunião marcada' : `está ${t}`
  const bloqueio = cli ? `já é cliente do escritório (card ${cli.c.id})` : reu ? `${frase(reu.s.texto)} (card ${reu.c.id}, ${mesExtenso(reu.c.created_at, agora)})` : null
  return { cards: sits.map(x => ({ id: x.c.id, criado: x.c.created_at, situacao: x.s.texto })), valores, bloqueio }
}

/** Puro: "renda bruta de R$ 18.000, líquido de R$ 9.000 e desconto em conta de R$ 2.500" (só o que existe). */
export function valoresTexto(v: ValoresAnteriores): string {
  const partes = [
    v.rendaBruta != null ? `renda bruta de ${brl(v.rendaBruta)}` : '',
    v.rendaLiquida != null ? `líquido de ${brl(v.rendaLiquida)}` : '',
    v.descontoConta != null ? (v.descontoConta > 0 ? `desconto em conta de ${brl(v.descontoConta)}` : 'nenhum desconto em conta corrente') : '',
  ].filter(Boolean)
  return partes.length > 1 ? `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}` : partes[0] || ''
}

/** Puro: o lead disse que a situação continua igual ('igual'), que mudou ('mudou') ou não dá para saber (null). */
export function leituraMemoria(texto: string): 'igual' | 'mudou' | null {
  const t = (texto || '').toLowerCase()
  if (/n[aã]o mudou|nada mudou|n[aã]o mudou nada|sem mudan/.test(t)) return 'igual'
  if (/melhor|pior|mudou|aument|diminu|caiu|subiu|reduz|outro valor|valores? novos?|est[aá] diferente/.test(t)) return 'mudou'
  if (/igual|mesm[ao]s?|continua|permanece|do mesmo jeito|tudo certo|isso mesmo|os mesmos/.test(t)) return 'igual'
  return null
}

/** Puro: resumo para a nota e a tarefa da equipe. */
export function resumoMemoria(m: Memoria, agora = new Date()): string {
  if (!m.cards.length) return ''
  const lista = m.cards.slice(0, 5).map(c => `card ${c.id} (${mesExtenso(c.criado, agora)}): ${c.situacao}`).join('; ')
  return `Este telefone já teve ${m.cards.length} atendimento(s) antes: ${lista}.${m.valores ? ` Último registro com valores (${m.valores.quando}): ${valoresTexto(m.valores)}.` : ''}`
}

/** Lê os cards do mesmo telefone do contato principal do lead. */
export async function memoriaDoLead(lead: KommoLead): Promise<Memoria> {
  const c = (lead._embedded?.contacts || []).find(x => x.is_main) || lead._embedded?.contacts?.[0]
  if (!c) return { cards: [], valores: null, bloqueio: null }
  const cards = await cardsDoTelefone(await telefonesDoContatoId(c.id))
  return montarMemoria(lead.id, cards)
}

/**
 * Início de um ciclo da Anna com o lead (1º contato ou 1ª mensagem dele). Com a memória ligada:
 *  - já fez reunião / reunião marcada / cliente → a Anna não qualifica: tag de humano, tarefa com o
 *    histórico e nenhuma mensagem. Devolve o motivo;
 *  - atendimentos anteriores sem reunião → só uma nota com o histórico para a equipe. Devolve null.
 */
export async function memoriaNoInicio(lead: KommoLead): Promise<string | null> {
  if (!memoriaVale(lead.id)) return null
  const { addLeadNote, addLeadTags, addLeadTask } = await import('./kommo')
  const { patchState } = await import('./state')
  const { k, redis } = await import('./redis')
  const m = await memoriaDoLead(lead)
  if (!m.cards.length) return null
  const resumo = resumoMemoria(m)
  if (m.bloqueio) {
    await addLeadTags(lead.id, [CONFIG.humanTag])
    await addLeadTask(lead.id, `Lead voltou e ${m.bloqueio}: a Anna não qualificou de novo. ${resumo}`, CRM_MAP.tarefa)
    await addLeadNote(lead.id, `Anna: este lead ${m.bloqueio}. Ela não manda mensagem e não qualifica de novo; a equipe assume. ${resumo}`)
    await patchState(lead.id, { etapa: 'humano', finalizado: { motivo: `memória: ${m.bloqueio}`, em: new Date().toISOString() } })
    return `memória: ${m.bloqueio}`
  }
  if ((await redis.set(k('memoria', 'nota', lead.id), '1', { nx: true, ex: 30 * 86400 })) === 'OK') await addLeadNote(lead.id, `Anna (memória): ${resumo}`)
  return null
}
