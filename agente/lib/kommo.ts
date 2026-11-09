import { CONFIG } from './config'

/**
 * Client da API do Kommo (v4 + endpoint legado v2 do Salesbot).
 * - Retry em 429/5xx. O Salesbot passa retry5xx:false: um 502 pode ter
 *   rodado o bot, e repetir duplicaria a mensagem (kommo/PEGADINHAS §7).
 * - PATCH de tags SUBSTITUI o conjunto inteiro: só addLeadTags/removeLeadTags.
 */

export const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

async function kommo<T>(method: string, path: string, body?: unknown, opts?: { retries?: number; retry5xx?: boolean }): Promise<T> {
  const retries = opts?.retries ?? 3
  const retry5xx = opts?.retry5xx ?? true
  for (let attempt = 0; ; attempt++) {
    let res: Response
    try {
      res = await fetch(`${CONFIG.kommoDomain}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${CONFIG.kommoToken}`,
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      })
    } catch (e) {
      // falha de rede ("fetch failed"): repete, menos no Salesbot (retry5xx:false), que pode ter rodado
      if (retry5xx && attempt < retries) { await sleep(1000 * (attempt + 1)); continue }
      throw e
    }
    const text = await res.text()
    if (res.ok) return (text ? JSON.parse(text) : {}) as T
    const retryable = res.status === 429 || (retry5xx && res.status >= 500)
    if (retryable && attempt < retries) {
      await sleep(res.status === 429 ? 2000 * 2 ** attempt : 1000 * (attempt + 1))
      continue
    }
    throw new Error(`Kommo ${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`)
  }
}

export const kommoGet = <T>(path: string) => kommo<T>('GET', path)
export const kommoPost = <T>(path: string, body: unknown) => kommo<T>('POST', path, body)

export interface KommoFieldValue { field_id: number; values: Array<{ value?: unknown; enum_id?: number }> }

export interface KommoLead {
  id: number
  name?: string
  status_id: number
  pipeline_id: number
  responsible_user_id?: number
  custom_fields_values?: KommoFieldValue[] | null
  _embedded?: { tags?: Array<{ id: number; name: string }>; contacts?: Array<{ id: number; is_main?: boolean }> }
}

export async function getLead(leadId: number): Promise<KommoLead> {
  return kommo<KommoLead>('GET', `/api/v4/leads/${leadId}?with=contacts`)
}

export const leadTags = (lead: KommoLead) => (lead._embedded?.tags || []).map(t => t.name)

export async function updateLeadFields(leadId: number, values: KommoFieldValue[]): Promise<void> {
  await kommo('PATCH', `/api/v4/leads/${leadId}`, { custom_fields_values: values })
}

export async function updateLeadStatus(leadId: number, statusId: number, pipelineId: number): Promise<void> {
  await kommo('PATCH', `/api/v4/leads/${leadId}`, { status_id: statusId, pipeline_id: pipelineId })
}

async function setLeadTags(leadId: number, names: string[]): Promise<void> {
  // Array vazio não limpa: o Kommo ignora. Para zerar, é preciso tags_to_delete.
  await kommo('PATCH', `/api/v4/leads/${leadId}`, { _embedded: { tags: names.map(name => ({ name })) } })
}

export async function addLeadTags(leadId: number, names: string[]): Promise<void> {
  if (!names.length) return
  // tags_to_add só acrescenta: não regrava o conjunto inteiro. Regravar perdia etiqueta quando outro processo
  // (ou alguém salvando o card) gravava ao mesmo tempo (caso Adriana, 09/11: "atendimento-humano" sumiu)
  try {
    await kommo('PATCH', `/api/v4/leads/${leadId}`, { tags_to_add: names.map(name => ({ name })) })
    return
  } catch { /* conta sem tags_to_add: regrava o conjunto (merge local) */ }
  const current = leadTags(await getLead(leadId))
  const lower = new Set(current.map(t => t.toLowerCase()))
  const add = names.filter(n => !lower.has(n.toLowerCase()))
  if (add.length) await setLeadTags(leadId, [...current, ...add])
}

/** Remove tags sem apagar as outras. Usa tags_to_delete (funciona mesmo quando sobra zero tag). */
export async function removeLeadTags(leadId: number, names: string[]): Promise<void> {
  if (!names.length) return
  const lead = await getLead(leadId)
  const drop = new Set(names.map(n => n.toLowerCase()))
  const alvo = (lead._embedded?.tags || []).filter(t => drop.has(t.name.toLowerCase()))
  if (!alvo.length) return
  try {
    await kommo('PATCH', `/api/v4/leads/${leadId}`, { tags_to_delete: alvo.map(t => ({ id: t.id })) })
  } catch (e) {
    // Conta sem suporte a tags_to_delete: regrava o conjunto restante (merge local)
    const kept = leadTags(lead).filter(n => !drop.has(n.toLowerCase()))
    if (!kept.length) throw e
    await setLeadTags(leadId, kept)
  }
  // Prova: relê o lead. Tag que "saiu com 200" e continua lá = IA que não desliga.
  const still = leadTags(await getLead(leadId)).filter(n => drop.has(n.toLowerCase()))
  if (still.length) throw new Error(`tags não removidas do lead ${leadId}: ${still.join(', ')}`)
}

export async function addLeadNote(leadId: number, text: string): Promise<void> {
  await kommo('POST', `/api/v4/leads/${leadId}/notes`, [{ note_type: 'common', params: { text } }])
}

/** Dispara o Salesbot de envio. Sem retry em 5xx (ver topo do arquivo). */
export async function runSalesbot(botId: number, leadId: number): Promise<void> {
  await kommo('POST', '/api/v2/salesbot/run', [{ bot_id: botId, entity_id: leadId, entity_type: 'leads' }], { retry5xx: false })
}

export function fieldValue(lead: KommoLead, fieldId: number): unknown {
  const f = (lead.custom_fields_values || []).find(v => v.field_id === fieldId)
  return f?.values?.[0]?.value ?? null
}

export function fieldEnumIds(lead: KommoLead, fieldId: number): number[] {
  const f = (lead.custom_fields_values || []).find(v => v.field_id === fieldId)
  return (f?.values || []).map(v => v.enum_id).filter((x): x is number => typeof x === 'number')
}

/** Tarefa para a equipe (a Anna passou o atendimento, pediu remarcação etc.). */
/**
 * Puro: 23:59 do dia de hoje em Brasília, em segundos. É como o Kommo guarda a tarefa de "Dia todo": ela aparece
 * no topo do dia no calendário, fora da grade de horários, que fica só com as reuniões (Dra., 09/11).
 */
export function fimDoDiaBrt(agoraMs = Date.now()): number {
  const dia = new Date(agoraMs - 3 * 3600_000).toISOString().slice(0, 10)
  return Math.floor(new Date(`${dia}T23:59:00-03:00`).getTime() / 1000)
}

export async function addLeadTask(leadId: number, text: string, o: { responsavelId: number; tipo: number; prazoMin: number }): Promise<void> {
  // tarefas de acompanhamento da Anna: "Dia todo" (antes vencia em prazoMin e aparecia na grade como se fosse reunião)
  await kommo('POST', '/api/v4/tasks', [{
    text, entity_id: leadId, entity_type: 'leads', task_type_id: o.tipo, responsible_user_id: o.responsavelId,
    complete_till: fimDoDiaBrt(),
  }])
}

/** Tarefa com data e duração (a reunião na agenda do Kommo, como a equipe faz: tipo "Reunião", 30 min). */
export async function addLeadTaskAt(leadId: number, text: string, o: { responsavelId: number; tipo: number; quando: number; duracaoS: number }): Promise<void> {
  await kommo('POST', '/api/v4/tasks', [{ text, entity_id: leadId, entity_type: 'leads', task_type_id: o.tipo, responsible_user_id: o.responsavelId, complete_till: o.quando, duration: o.duracaoS }])
}

/** Limpa campos do card (valor nulo). */
export async function limparCampos(leadId: number, campos: number[]): Promise<void> {
  if (!campos.length) return
  await kommo('PATCH', `/api/v4/leads/${leadId}`, { custom_fields_values: campos.map(field_id => ({ field_id, values: null })) })
}

/** Conclui as tarefas abertas de um tipo no card (ex.: a tarefa "Reunião" de uma reunião cancelada). Devolve quantas. */
export async function concluirTarefas(leadId: number, tipo: number, resultado: string): Promise<number> {
  const d = await kommo<{ _embedded?: { tasks?: Array<{ id: number; task_type_id: number; is_completed: boolean }> } }>('GET',
    `/api/v4/tasks?filter[entity_type]=leads&filter[entity_id]=${leadId}&filter[is_completed]=0&limit=50`).catch(() => null)
  const abertas = (d?._embedded?.tasks || []).filter(t => t.task_type_id === tipo && !t.is_completed)
  if (abertas.length) await kommo('PATCH', '/api/v4/tasks', abertas.map(t => ({ id: t.id, is_completed: true, result: { text: resultado } })))
  return abertas.length
}

const templateCache = new Map<number, string>()

/** Texto de um modelo de chat (para o anti-eco reconhecer o envio do Salesbot). */
export async function getTemplateText(id: number): Promise<string> {
  const hit = templateCache.get(id)
  if (hit !== undefined) return hit
  const t = await kommo<{ content?: string }>('GET', `/api/v4/chats/templates/${id}`)
  templateCache.set(id, t.content || '')
  return t.content || ''
}

/** Nome do contato principal do lead (o nome do lead de formulário é "Facebook №..."). */
export async function getMainContactName(lead: KommoLead): Promise<string> {
  const c = (lead._embedded?.contacts || []).find(x => x.is_main) || lead._embedded?.contacts?.[0]
  if (!c) return ''
  const contato = await kommo<{ name?: string }>('GET', `/api/v4/contacts/${c.id}`)
  return (contato.name || '').trim()
}

/**
 * Mensagem de saída que vem de um robô do Kommo, não da equipe. Pelo texto: no Kommo a mensagem
 * da equipe e a do robô chegam com o mesmo autor (0). Hoje: o modelo "Lembrete Reunião" (48482),
 * usado pelos lembretes de 2h, 1h e 15 min da reunião (Salesbots 52128, 52152, 52154). Puro.
 */
export const ehMensagemDeRoboKommo = (texto: string) => /Este [ée] um lembrete da \*?sua reuni[ãa]o agendada/i.test(texto || '')
