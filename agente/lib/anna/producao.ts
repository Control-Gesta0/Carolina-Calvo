import { CONFIG, googleConfigurado } from '../config'
import { CRM_MAP, PIPELINES, STATUS } from '../crm-map'
import { emptyUsage, type Usage } from '../execlog'
import { cancelarRegua, iniciarRegua } from '../followup'
import { criarReuniao, ocupados } from '../google'
import { appendMessage, getHistory } from '../history'
import { addLeadNote, addLeadTags, addLeadTask, getLead, getMainContactName, leadTags, removeLeadTags, updateLeadFields, updateLeadStatus, type KommoLead } from '../kommo'
import { agendarJob, novoToken } from '../jobs'
import { k, redis } from '../redis'
import { getState, patchState, type LeadState } from '../state'
import { sendReply } from '../transport'
import { AGENDA, proximoSlot, type Slot } from './agenda'
import type { Ctx, Deps } from './fluxo'
import { baseVigente } from '../base'
import { createInterprete } from './interprete'
import crypto from 'crypto'

/**
 * Liga o fluxo da Anna ao mundo real: Kommo (card, tags, tarefas), Redis
 * (estado, fila, reservas de horário) e Google Agenda. Tudo que mexe no CRM é
 * fail-closed: lead fora do SDR, de cliente ou em etapa da equipe não é movido.
 */

// o prompt publicado na base (fatos e informações que a equipe pediu pela Central), lido a cada turno com 10 s de cache
const interprete = createInterprete({ apiKey: CONFIG.openaiApiKey, model: CONFIG.llmModel, prompt: async () => (await baseVigente()).prompt })

/** "MARIA DOLORES DA SILVA" → "Maria". Nome que não parece nome vira vazio. */
export function primeiroNome(nome: string): string {
  const p = (nome || '').trim().split(/\s+/)[0] || ''
  if (!/^[a-zà-ú]{2,20}$/i.test(p) || /^(facebook|lead|contato|cliente|whatsapp|instagram)$/i.test(p)) return ''
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
}

export async function montarCtx(leadId: number, lead: KommoLead, agora = new Date()): Promise<{ ctx: Ctx; state: LeadState }> {
  const state = await getState(leadId)
  const history = await getHistory(leadId)
  const desde = state.inicioEm ?? 0
  const conversa = history.filter(m => m.ts >= desde)
  const i = conversa.map(m => m.dir).lastIndexOf('out')
  const textoTurno = conversa.slice(i + 1).filter(m => m.dir === 'in').map(m => m.text).join('\n')
  const nomeContato = await getMainContactName(lead).catch(() => '')
  return { state, ctx: { agora, nomeContato, primeiroNome: primeiroNome(nomeContato), state, textoTurno, conversa } }
}

// ---------- reservas de horário (um horário oferecido não vai para outro lead) ----------

const RESERVA_MS = 6 * 3600_000

async function reservados(leadId: number): Promise<Set<string>> {
  const all = (await redis.hgetall<Record<string, { leadId: number; ate: number }>>(k('reservas'))) || {}
  const agora = Date.now()
  const vivas = new Set<string>()
  for (const [chave, r] of Object.entries(all)) {
    if (!r || r.ate < agora) { await redis.hdel(k('reservas'), chave); continue }
    if (r.leadId !== leadId) vivas.add(chave)
  }
  return vivas
}

export interface Telemetria { usage: Usage; guard: string[] }

export function depsProducao(leadId: number, lead: KommoLead, tel: Telemetria = { usage: emptyUsage(), guard: [] }): Deps {
  const tags = () => leadTags(lead).map(t => t.toLowerCase())
  const podeMover = () => lead.pipeline_id === PIPELINES.sdr && !CRM_MAP.etapasProtegidas.includes(lead.status_id)

  const deps: Deps = {
    async interpretar(e) {
      const r = await interprete.interpretar(e)
      for (const key of ['input', 'cached', 'output', 'calls'] as const) tel.usage[key] += r.usage[key]
      tel.guard.push(...r.guard)
      return r.leitura
    },
    async enviar(texto) {
      await sendReply(leadId, texto)
      await appendMessage(leadId, { id: crypto.randomUUID(), dir: 'out', text: texto, ts: Date.now() })
    },
    patch: p => patchState(leadId, p),
    async salvarCampos(valores) {
      const vs = Object.entries(valores).map(([id, value]) => ({ field_id: Number(id), values: [{ value }] })).filter(v => !CRM_MAP.camposProibidos.includes(v.field_id))
      if (vs.length) await updateLeadFields(leadId, vs)
    },
    async mover(statusId, pipelineId) {
      if (!podeMover()) { console.log(`[anna] lead ${leadId}: não movido (funil ${lead.pipeline_id}, etapa ${lead.status_id})`); return }
      if (lead.status_id === statusId && lead.pipeline_id === pipelineId) return
      await updateLeadStatus(leadId, statusId, pipelineId)
      lead = { ...lead, status_id: statusId, pipeline_id: pipelineId }
    },
    addTags: t => addLeadTags(leadId, t),
    nota: t => addLeadNote(leadId, t),
    tarefa: t => addLeadTask(leadId, t, CRM_MAP.tarefa),
    async passarParaHumano(motivo, resumo) {
      await cancelarRegua(leadId)
      await addLeadTags(leadId, [CONFIG.humanTag, CRM_MAP.tags.passouHumano])
      if (CONFIG.gateTag && tags().includes(CONFIG.gateTag)) await removeLeadTags(leadId, [CONFIG.gateTag])
      await addLeadTask(leadId, `Anna passou o atendimento: ${motivo}. ${resumo}`, CRM_MAP.tarefa)
    },
    async agendarMsg5(token, quando) {
      // lead de teste (TEST_LEAD_IDS): a pausa de 30 min vira 1 min, para os testes no WhatsApp não esperarem
      const q = CONFIG.testLeadIds.includes(leadId) ? Math.min(quando, Date.now() + 60_000) : quando
      await agendarJob({ tipo: 'msg5', leadId, quando: q, token })
    },
    novoToken,
    iniciarRegua: (regua, base) => iniciarRegua(leadId, regua, base),
    async cancelarRegua() { await cancelarRegua(leadId) },
    agenda: {
      disponivel: googleConfigurado,
      async buscar(o) {
        const agora = new Date()
        const busy = await ocupados(agora, new Date(agora.getTime() + (AGENDA.horizonteDias + 1) * 86400_000))
        return proximoSlot({ agora, ocupados: busy, reservados: await reservados(leadId), ...o })
      },
      async reservar(slot) {
        await redis.hset(k('reservas'), { [slot.chave]: { leadId, ate: Date.now() + RESERVA_MS } })
      },
      async confirmar(slot: Slot, titulo, descricao) {
        // trava do horário: dois leads dizendo "sim" no mesmo segundo não criam dois eventos
        if ((await redis.set(k('slotlock', slot.chave), String(leadId), { nx: true, ex: 120 })) !== 'OK') return null
        const busy = await ocupados(slot.inicio, slot.fim)
        if (busy.some(b => b.inicio < slot.fim.getTime() && b.fim > slot.inicio.getTime())) return null
        const ev = await criarReuniao({ inicio: slot.inicio, fim: slot.fim, titulo, descricao })
        await redis.hdel(k('reservas'), slot.chave)
        return { eventId: ev.id, link: ev.link }
      },
    },
    async agendarLembretes(inicio, eventId) {
      const t = inicio.getTime()
      for (const [modelo, antes] of [['lembrete24h', 24 * 3600_000], ['lembrete1h', 3600_000], ['lembrete15m', 15 * 60_000]] as const) {
        const quando = t - antes
        if (quando > Date.now() + 5 * 60_000) await agendarJob({ tipo: 'lembrete', leadId, quando, token: eventId, dados: { modelo } })
      }
    },
  }
  return deps
}

export { getLead, STATUS }
