import { CONFIG } from './config'
import { CRM_MAP } from './crm-map'
import { adoptToken, currentToken, debounceAndClaim, releaseLock, renewLock } from './buffer'
import { emptyUsage, logExec } from './execlog'
import { alreadyAnswered, getHistory, humanSpokeRecently, lastInbound, markAnswered } from './history'
import { getLead, leadTags, type KommoLead } from './kommo'
import { turno } from './anna/fluxo'
import { depsProducao, montarCtx, type Telemetria } from './anna/producao'
import { clearState, getState } from './state'
import { motivoDaFrase, perfilDaRenda } from './central-data'
import { comTextos } from './anna/textos'
import { baseVigente } from './base'
import { textosDoRoteiro } from './base-core'

/**
 * Núcleo: gate → buffer → roteiro da Anna (código) + intérprete (LLM) → envio.
 * A mensagem do lead JÁ está no histórico quando chega aqui.
 */

const MAX_ROUNDS = 3

/** Por que a Anna não fala com este lead (null = pode falar). */
export function bloqueio(lead: KommoLead): string | null {
  const tags = leadTags(lead).map(t => t.toLowerCase())
  if (tags.includes(CONFIG.humanTag)) return `tag "${CONFIG.humanTag}"`
  if (CONFIG.gateTag && !tags.includes(CONFIG.gateTag)) return `sem a tag "${CONFIG.gateTag}"`
  if (tags.includes(CRM_MAP.tags.cliente)) return 'lead é cliente'
  if (CRM_MAP.pipelinesProibidos.includes(lead.pipeline_id)) return 'funil de clientes/financeiro'
  return null
}

export async function processLead(leadId: number, webhookId: string): Promise<void> {
  const t0 = Date.now()
  let lockOwner: string | undefined
  let nome = ''
  const pular = async (motivo: string, registrar = true) => {
    console.log(`[anna] PULOU lead ${leadId} (${nome}): ${motivo}`)
    if (registrar) await logExec({ tipo: 'pulou', leadId, nome, detalhe: motivo })
  }
  try {
    const lead = await getLead(leadId)
    nome = lead.name || ''
    const b = bloqueio(lead)
    // sem gate: silêncio sem poluir o diário (a conta inteira manda add_message)
    if (b) return pular(b, !b.startsWith('sem a tag'))
    if (await humanSpokeRecently(leadId)) return pular('a equipe falou pelo Kommo nas últimas 6h: a Anna não atropela')

    const st0 = await getState(leadId)
    if (st0.etapa === 'humano' && st0.finalizado) {
      // Tag de gate recolocada num lead finalizado = novo ciclo
      await clearState(leadId)
      console.log(`[anna] lead ${leadId} voltou com a tag de gate: novo ciclo`)
    }

    const claim = await debounceAndClaim(leadId, webhookId)
    if (!claim.proceed) { console.log(`[debounce] lead ${leadId}: ${claim.reason}`); return }
    lockOwner = claim.lockOwner
    let myToken = webhookId

    for (let round = 0; round < MAX_ROUNDS; round++) {
      await renewLock(leadId, lockOwner!)
      const history = await getHistory(leadId)
      const target = lastInbound(history)
      if (!target) return
      if (await alreadyAnswered(leadId, target.id)) return

      const { ctx } = await montarCtx(leadId, lead)
      if (!ctx.textoTurno && ctx.state.etapa) return
      const tel: Telemetria = { usage: emptyUsage(), guard: [] }
      const deps = depsProducao(leadId, lead, tel)

      // Mensagem nova chegou enquanto montávamos? Recomeça com o contexto novo
      const tok = await currentToken(leadId)
      if (tok && tok !== myToken) { myToken = tok; await adoptToken(leadId, myToken); continue }

      // textos do roteiro: o que a equipe publicou pela Central (padrão se nada foi publicado)
      const base = await baseVigente()
      const r = await comTextos(textosDoRoteiro(base.textos), () => turno(ctx, deps))
      await markAnswered(leadId, target.id)
      const depois = await getState(leadId)
      const passou = r.acao.startsWith('passou para humano')
      await logExec({
        tipo: r.acao.startsWith('agendou') ? 'agendou' : passou ? 'humano' : r.acao.startsWith('abriu') ? 'inicio' : 'resposta',
        leadId, nome, etapa: depois.etapa, ms: Date.now() - t0,
        tools: [r.acao, ...(r.leitura ? [`intenção: ${r.leitura.intencao}`] : [])], guard: tel.guard,
        usage: tel.usage.calls ? tel.usage : undefined, detalhe: r.enviado?.slice(0, 160),
        ...(passou ? { porta: motivoDaFrase(r.acao.replace(/^passou para humano:\s*/, '')), detalhe: r.resumo?.slice(0, 600) } : {}),
        perfil: perfilDaRenda(depois.rendaBruta),
        turnoLead: ctx.textoTurno, respostaIA: r.enviado,
      })
      console.log(`[anna] lead ${leadId} em ${Date.now() - t0}ms: ${r.acao}`)
      // Chegou mensagem durante o turno? O webhook dela não pegou o lock: o dono re-checa aqui
      const tok2 = await currentToken(leadId)
      if (tok2 && tok2 !== myToken) { myToken = tok2; await adoptToken(leadId, myToken); continue }
      return
    }
    await pular('MAX_ROUNDS: lead mandando rápido demais, o próximo webhook responde')
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).slice(0, 300)
    console.error(`[anna] ERRO lead ${leadId} após ${Date.now() - t0}ms: ${msg}`, e)
    await logExec({ tipo: 'erro', leadId, nome, ms: Date.now() - t0, detalhe: msg })
  } finally {
    await releaseLock(leadId, lockOwner)
  }
}
