import OpenAI from 'openai'
import { AGORA, type Cenario } from '../evals/cenarios'
import { PENDENTE, compor, createInterprete, violacoes } from './anna/interprete'
import { comTextos } from './anna/textos'
import { textosDoRoteiro, type Textos } from './base-core'
import { costUsd } from './execlog'
import type { LeadState } from './state'

/**
 * Executor do EXAME do intérprete: a CLI (scripts/evals.ts) e o porteiro da
 * Central (lib/exame.ts) usam este mesmo código. Cada cenário tem checagem em
 * CÓDIGO (intenção, valores extraídos, travas) e, quando há resposta livre,
 * critérios para um juiz cego. Recebe o prompt e os textos candidatos.
 */

export interface ResultadoCenario {
  id: string
  rep: number
  passou: boolean
  intencao: string
  falhasCodigo: string[]
  falhasJuiz: Array<{ criterio: string; porque: string }>
  conversa: Array<{ lead: string; resposta: string }>
}

export interface Opcoes {
  apiKey: string
  model: string
  judgeModel: string
  /** prompt renderizado (fatos e informações da versão candidata); sem ele, o padrão */
  prompt?: string
  /** textos candidatos (retomadas e mensagens da Anna); sem eles, o padrão */
  textos?: Textos
  cenarios: Cenario[]
  reps?: number
  concorrencia?: number
  onProgresso?: (feitos: number, total: number) => Promise<void> | void
}

export async function runEvals(o: Opcoes): Promise<{ resultados: ResultadoCenario[]; custoUsd: number }> {
  const interprete = createInterprete({ apiKey: o.apiKey, model: o.model, ...(o.prompt ? { prompt: () => o.prompt! } : {}) })
  const openai = new OpenAI({ apiKey: o.apiKey })
  const reps = o.reps || 1
  const fila = o.cenarios.flatMap(c => Array.from({ length: reps }, (_, i) => ({ c, rep: i + 1 })))
  const resultados: ResultadoCenario[] = []
  let custo = 0
  let feitos = 0
  const roteiro = o.textos ? textosDoRoteiro(o.textos) : undefined
  const comRoteiro = <T>(fn: () => Promise<T>) => (roteiro ? comTextos(roteiro, fn) : fn())

  async function um({ c, rep }: { c: Cenario; rep: number }): Promise<ResultadoCenario> {
    const state: LeadState = { etapa: c.etapa, ...(c.state || {}) }
    const quando = c.etapa === 'oferta' ? 'HOJE às 15:00' : undefined
    const conversa = c.conversa.map(([dir, text], i) => ({ id: `m${i}`, dir, text, ts: i + 1 }))
    const { leitura, usage, guard, pendente } = await comRoteiro(async () => {
      const pendente = PENDENTE[c.etapa](state, quando)
      const r = await interprete.interpretar({ etapa: c.etapa, pendente, state, conversa, agora: AGORA, nomeContato: 'Maria Silva' })
      return { ...r, pendente }
    })
    custo += costUsd(o.model, usage) || 0
    const falhas: string[] = []
    const { intencaoEm, ...campos } = c.espera
    if (intencaoEm && !intencaoEm.includes(leitura.intencao)) falhas.push(`intenção ${leitura.intencao} (esperado uma de ${intencaoEm.join(', ')})`)
    for (const [kk, v] of Object.entries(campos)) {
      if (JSON.stringify((leitura as unknown as Record<string, unknown>)[kk]) !== JSON.stringify(v)) falhas.push(`${kk} = ${JSON.stringify((leitura as unknown as Record<string, unknown>)[kk])} (esperado ${JSON.stringify(v)})`)
    }
    if (c.comResposta && !leitura.resposta) falhas.push('sem resposta livre')
    const final = leitura.resposta ? compor(leitura.resposta, pendente) : ''
    if (final) {
      const v = violacoes(final)
      if (v.length) falhas.push(`trava: ${v.map(x => x.regra).join(', ')}`)
    }
    if (guard.length) falhas.push(`a trava precisou agir: ${guard.join(' | ')}`)

    const falhasJuiz: ResultadoCenario['falhasJuiz'] = []
    if (c.criterios?.length && leitura.resposta) {
      const r = await openai.chat.completions.create({
        model: o.judgeModel,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Você avalia a resposta de uma atendente de WhatsApp de um escritório de advocacia. Para CADA critério diga se foi atendido. Seja rigoroso e literal. JSON: {"criterios":[{"criterio":"...","ok":true|false,"porque":"..."}]}' },
          { role: 'user', content: `PERGUNTA PENDENTE DO ROTEIRO: ${pendente}\n\nCONVERSA ANTERIOR:\n${c.conversa.map(([d, t]) => `[${d === 'in' ? 'LEAD' : 'ATENDENTE'}]\n${t}\n[fim]`).join('\n')}\n\nMENSAGEM DA ATENDENTE EM AVALIAÇÃO (tudo entre as marcas é uma única mensagem):\n<<<\n${final}\n>>>\n\nCRITÉRIOS:\n${c.criterios.map((x, i) => `${i + 1}. ${x}`).join('\n')}` },
        ],
      })
      const juiz = ((JSON.parse(r.choices[0].message.content || '{"criterios":[]}') as { criterios?: Array<{ criterio: string; ok: boolean; porque: string }> }).criterios) || []
      for (const j of juiz.filter(j => !j.ok)) falhasJuiz.push({ criterio: j.criterio, porque: j.porque })
      if (juiz.length < c.criterios.length) falhasJuiz.push({ criterio: 'juiz não avaliou todos os critérios', porque: `${juiz.length} de ${c.criterios.length}` })
    }
    const lead = c.conversa.filter(([d]) => d === 'in').map(([, t]) => t).join('\n')
    return {
      id: c.id, rep, intencao: leitura.intencao, passou: !falhas.length && !falhasJuiz.length,
      falhasCodigo: falhas, falhasJuiz, conversa: [{ lead, resposta: final || `(sem resposta livre; intenção ${leitura.intencao})` }],
    }
  }

  const n = Math.max(1, o.concorrencia || 1)
  let i = 0
  await Promise.all(Array.from({ length: Math.min(n, fila.length) }, async () => {
    while (i < fila.length) {
      const item = fila[i++]
      resultados.push(await um(item))
      feitos++
      await o.onProgresso?.(feitos, fila.length)
    }
  }))
  const ordem = new Map(fila.map((f, idx) => [`${f.c.id}#${f.rep}`, idx]))
  resultados.sort((a, b) => ordem.get(`${a.id}#${a.rep}`)! - ordem.get(`${b.id}#${b.rep}`)!)
  return { resultados, custoUsd: Math.round(custo * 1e6) / 1e6 }
}
