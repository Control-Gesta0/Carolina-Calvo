import type { VercelRequest, VercelResponse } from '@vercel/node'
import { waitUntil } from '@vercel/functions'
import crypto from 'crypto'
import { bloqueio, processLead } from '../lib/agent'
import { getHistory } from '../lib/history'
import { retomar, TAG_RETOMAR } from '../lib/pausa'
import { reguaDaEtapa } from '../lib/anna/fluxo'
import { primeiroNome } from '../lib/anna/producao'
import { CONFIG } from '../lib/config'
import { colunaPelaFaixa, CRM_MAP, PIPELINES, STATUS, TAG_NAO_ENTREGUE } from '../lib/crm-map'
import { logExec, marcarWebhook } from '../lib/execlog'
import { iniciarRegua } from '../lib/followup'
import { memoriaNoInicio } from '../lib/memoria'
import { soltarConversaAntiga } from '../lib/conversa-antiga'
import { esperarSaudacao } from '../lib/saudacao'
import { saudacaoDaHora } from '../lib/plantao'
import { etiquetaDoMes } from '../lib/etiqueta-mes'
import { agendarPosReuniao, posReuniaoVale } from '../lib/pos-reuniao'
import { sincronizarReuniaoEquipe } from '../lib/reuniao-equipe'
import { addLeadNote, addLeadTags, fieldValue, getLead, getMainContactName, leadTags, removeLeadTags, runSalesbot, updateLeadFields, updateLeadStatus, type KommoLead } from '../lib/kommo'
import { cancelarRegua } from '../lib/followup'
import { enviarModelo } from '../lib/modelos'
import { k, redis } from '../lib/redis'
import { clearState, getState, patchState } from '../lib/state'

/**
 * Webhooks de LEAD do Kommo (add_lead, update_lead, status_lead):
 *  - lead com a tag da Anna e sem conversa → primeiro contato com o modelo aprovado
 *    (lead de formulário nunca escreveu, então só modelo entrega);
 *  - AUTO_GATE_FORM_LEADS=true → lead novo de formulário de superendividamento ganha a tag;
 *  - card do Closer com reunião (Reunião agendada / Cliente decisão) → follow-up 23h depois da reunião (POS_REUNIAO).
 * Payload: form-urlencoded "leads[add|update|status][0][id|status_id|pipeline_id]".
 */

interface Evento { tipo: 'add' | 'update' | 'status'; id: number; statusId: number; pipelineId: number }

export function parseLeadWebhook(body: Record<string, unknown>): Evento[] {
  const out: Evento[] = []
  for (const tipo of ['add', 'update', 'status'] as const) {
    for (let i = 0; i < 50; i++) {
      const g = (f: string) => {
        const flat = body[`leads[${tipo}][${i}][${f}]`]
        if (flat !== undefined) return String(flat)
        const nested = (((body.leads as Record<string, unknown> | undefined)?.[tipo] as Record<string, unknown> | undefined)?.[i] as Record<string, unknown> | undefined)?.[f]
        return nested === undefined ? '' : String(nested)
      }
      const id = Number(g('id'))
      if (!id) break
      out.push({ tipo, id, statusId: Number(g('status_id')), pipelineId: Number(g('pipeline_id')) })
    }
  }
  return out
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true, service: 'anna-leads' })
  const provided = String(req.headers['x-webhook-secret'] || req.query.secret || '')
  if (!safeEq(provided, CONFIG.webhookSecret)) {
    await marcarWebhook('lead', '401 secret errado')
    return res.status(401).json({ error: 'unauthorized' })
  }
  const eventos = parseLeadWebhook((req.body || {}) as Record<string, unknown>)
  const diag = eventos.length ? `ok · ${eventos.length} evento(s) · ${eventos[0].tipo} ${eventos[0].id}` : `0 eventos · chaves: ${Object.keys((req.body || {}) as object).slice(0, 6).join(', ')}`
  waitUntil(Promise.all([marcarWebhook('lead', diag), ...eventos.map(tratar)]))
  return res.status(200).json({ ok: true, eventos: eventos.length })
}

function safeEq(a: string, b: string): boolean {
  return crypto.timingSafeEqual(crypto.createHash('sha256').update(a).digest(), crypto.createHash('sha256').update(b).digest())
}

const ehLeadDeFormularioSE = (lead: Awaited<ReturnType<typeof getLead>>) =>
  lead.pipeline_id === PIPELINES.sdr && (lead.custom_fields_values || []).some(f => f.field_id === CRM_MAP.campos.formSalario)

async function tratar(ev: Evento): Promise<void> {
  let iniciou = false
  try {
    // reunião no Closer (marcada pela Anna ou pela equipe): follow-up 23h depois, uma vez por data de reunião
    if (ev.pipelineId === PIPELINES.closer && posReuniaoVale(ev.id)) {
      const r = await agendarPosReuniao(await getLead(ev.id))
      if (r) await logExec({ tipo: 'followup', leadId: ev.id, tools: [r] })
    }
    // reunião marcada, remarcada ou apagada pela equipe no campo "Reunião" → agenda Google da Dra. (09/11)
    await sincronizarReuniaoEquipe(await getLead(ev.id)).catch(e => logExec({ tipo: 'erro', leadId: ev.id, detalhe: `agenda Google (reunião da equipe): ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}` }))
    if (ev.tipo === 'status') return

    let lead = await getLead(ev.id)
    // a equipe devolveu o atendimento à Anna (etiqueta anna-retomar, Dra. 09/11): ela retoma de onde parou
    if (leadTags(lead).some(t => t.toLowerCase() === TAG_RETOMAR)) {
      const r = await retomar(lead)
      if (r.startsWith('retomado')) await continuarDepoisDaRetomada(ev.id)
      return
    }
    // a saudação deu "Erro" no WhatsApp e a equipe pôs a etiqueta nao-entregue: o card vai para a coluna da
    // faixa do formulário e a Anna para de mandar mensagem a esse lead (Dra., 05/11)
    if (lead.pipeline_id === PIPELINES.sdr && leadTags(lead).some(t => t.toLowerCase() === TAG_NAO_ENTREGUE)) {
      await naoEntregue(lead)
      return
    }
    if (ev.tipo === 'add' && CONFIG.autoGateFormLeads && CONFIG.gateTag && ehLeadDeFormularioSE(lead)) {
      // a etiqueta do mês entra junto (o relógio só a poria na volta seguinte, até 5 min depois)
      const mes = CONFIG.etiquetaMesAtiva ? [etiquetaDoMes(new Date())] : []
      await addLeadTags(ev.id, [CONFIG.gateTag, ...mes])
      lead = await getLead(ev.id)
    }
    if (bloqueio(lead) || lead.pipeline_id !== PIPELINES.sdr) return
    if ((await getState(ev.id)).etapa) return
    if (!CRM_MAP.modelos.primeiroContato.botId) {
      // modelo ainda não aprovado: a Anna começa quando o lead escrever (janela de 24h aberta)
      await logExec({ tipo: 'pulou', leadId: ev.id, nome: lead.name, detalhe: 'primeiro contato aguardando o modelo aprovado; a Anna responde quando o lead escrever' })
      return
    }
    // um primeiro contato por lead, mesmo com webhooks repetidos
    if ((await redis.set(k('iniciado', ev.id), '1', { nx: true, ex: 30 * 86400 })) !== 'OK') return
    // quem já fez reunião ou é cliente (outro card do mesmo telefone) não recebe o primeiro contato: vai para a equipe
    const historico = await memoriaNoInicio(lead)
    if (historico) {
      await logExec({ tipo: 'pulou', leadId: ev.id, nome: lead.name, detalhe: historico })
      return
    }
    // lead que volta: a conversa do WhatsApp presa no card antigo é fechada, para a resposta cair neste card
    await soltarConversaAntiga(lead).catch(e => logExec({ tipo: 'erro', leadId: ev.id, nome: lead.name, detalhe: `não deu para fechar a conversa do card antigo: ${(e instanceof Error ? e.message : String(e)).slice(0, 160)}` }))

    // lead de formulário com PRIMEIRO_CONTATO=kommo: a saudação sai do robô do Kommo (abre a conversa); a Anna espera
    if (CONFIG.primeiroContatoKommo && ehLeadDeFormularioSE(lead)) {
      // o modelo começa com "Olá, {primeiro nome}": o campo fica pronto antes do robô (que espera 1 min) disparar
      const nomeSaudacao = primeiroNome(await getMainContactName(lead).catch(() => ''))
      await updateLeadFields(ev.id, [{ field_id: CRM_MAP.campos.primeiroNome, values: [{ value: nomeSaudacao || 'tudo bem' }] }])
      // plantão ligado: o robô (e o modelo) do expediente ou do plantão, pela hora de Brasília
      const daHora = CONFIG.primeiroContatoAnnaDispara ? saudacaoDaHora(new Date()) : null
      await esperarSaudacao(ev.id, Date.now(), daHora?.templateId)
      if (CONFIG.primeiroContatoAnnaDispara) {
        // o card já tem a tag, o nome e a conversa antiga resolvida: agora a saudação sai, sem depender do robô da etapa
        const botId = daHora?.botId ?? CRM_MAP.modelos.primeiroContato.botId
        await runSalesbot(botId, ev.id)
        await logExec({ tipo: 'pulou', leadId: ev.id, nome: lead.name, etapa: 'q1', detalhe: `primeiro contato: robô da saudação (${botId}) disparado pela Anna; conferindo a saída` })
        return
      }
      await logExec({ tipo: 'pulou', leadId: ev.id, nome: lead.name, etapa: 'q1', detalhe: 'primeiro contato: aguardando a saudação do robô do Kommo' })
      return
    }

    const nome = primeiroNome(await getMainContactName(lead).catch(() => ''))
    const agora = Date.now()
    await patchState(ev.id, { etapa: 'q1', inicioEm: agora - 1000 })
    iniciou = true
    const detalhe = await enviarModelo(ev.id, 'primeiroContato', { primeiroNome: nome || 'tudo bem' })
    await iniciarRegua(ev.id, 'qualificacao', agora)
    await logExec({ tipo: 'inicio', leadId: ev.id, nome: lead.name, etapa: 'q1', tools: ['primeiro contato (modelo)'], detalhe })
  } catch (e) {
    if (iniciou) await clearState(ev.id)
    await redis.del(k('iniciado', ev.id))
    await logExec({ tipo: 'erro', leadId: ev.id, detalhe: `webhook de lead: ${(e instanceof Error ? e.message : String(e)).slice(0, 300)}` })
  }
}

/** Depois da retomada: se a última mensagem é do lead, a Anna responde considerando todo o histórico; senão, a régua da etapa recomeça. */
async function continuarDepoisDaRetomada(leadId: number): Promise<void> {
  const ultima = (await getHistory(leadId).catch(() => [])).slice(-1)[0]
  if (ultima?.dir === 'in') {
    await processLead(leadId, `retomar-${Date.now()}`)
    return
  }
  const etapa = (await getState(leadId)).etapa
  const regua = etapa ? reguaDaEtapa(etapa) : null
  if (regua) await iniciarRegua(leadId, regua, Date.now())
}

const NOME_COLUNA: Record<number, string> = { [STATUS.acima15]: 'ACIMA DE 15 MIL', [STATUS.de10a15]: '10 A 15 MIL', [STATUS.desqualificado]: 'Desqualificado' }

/** Etiqueta nao-entregue: uma vez por card, move pela faixa do formulário, para a régua e tira o lead da Anna. */
async function naoEntregue(lead: KommoLead): Promise<void> {
  if ((await redis.set(k('nao-entregue', lead.id), '1', { nx: true, ex: 90 * 86400 })) !== 'OK') return
  const faixa = String(fieldValue(lead, CRM_MAP.campos.formSalario) || '')
  const destino = colunaPelaFaixa(faixa)
  await cancelarRegua(lead.id)
  await patchState(lead.id, { etapa: 'humano', finalizado: { motivo: 'mensagem não entregue', em: new Date().toISOString() } })
  // sem a tag de liberação a Anna não retoma o card sozinha (se o lead escrever, a equipe atende)
  if (CONFIG.gateTag && leadTags(lead).some(t => t.toLowerCase() === CONFIG.gateTag)) await removeLeadTags(lead.id, [CONFIG.gateTag])
  if (lead.status_id !== destino) await updateLeadStatus(lead.id, destino, PIPELINES.sdr)
  await addLeadNote(lead.id, `Anna: a mensagem não foi entregue a este número (etiqueta "${TAG_NAO_ENTREGUE}"). Card movido para ${NOME_COLUNA[destino]} pela faixa do formulário ("${faixa || 'sem faixa'}"). A Anna não manda mais mensagens a este lead.`)
  await logExec({ tipo: 'pulou', leadId: lead.id, nome: lead.name, detalhe: `mensagem não entregue: card movido para ${NOME_COLUNA[destino]} pela faixa do formulário` })
}
