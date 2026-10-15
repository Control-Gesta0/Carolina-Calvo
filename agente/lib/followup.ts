import REGUAS from '../config/follow-ups.json'
import { brt, deBrt } from './anna/agenda'
import { CRM_MAP, type ChaveModelo } from './crm-map'
import { agendarJob, novoToken } from './jobs'
import { k, redis } from './redis'

/**
 * Réguas de follow-up (config/follow-ups.json, medidas no Kommo em 13/10/2026).
 * Uma régua por lead: começar outra substitui a anterior. Qualquer mensagem do
 * lead cancela a régua (o token muda e os jobs pendentes morrem sozinhos).
 */

export type Regua = 'qualificacao' | 'agendamento' | 'pos_proposta'

/** texto_livre: sai exatamente assim (sem redação), dentro da janela de 24h da Meta; fora dela, sai o modelo */
interface EtapaCfg { nome: string; modelo: string; template_id: number; depois_de: string; horas: number; texto_livre?: string }
interface ReguaCfg { etapas: EtapaCfg[]; ao_terminar?: { depois_de_horas: number; pipeline_id: number; status_id: number } }

export const CONFIG_REGUAS = REGUAS as unknown as {
  janela_envio: { inicio: string; fim: string }
  reguas: Record<Regua, ReguaCfg>
}

export interface FuState { regua: Regua; token: string; base: number; proxima: number; ultimoEnvio?: number }

const TTL = 30 * 86400
const H = 3600_000

const [JI, JF] = [CONFIG_REGUAS.janela_envio.inicio, CONFIG_REGUAS.janela_envio.fim].map(h => Number(h.split(':')[0]))

/** Janela de envio 7h–20h (decisão de 13/10): fora dela, sai às 7h seguintes. */
export function ajustarJanela(ts: number): number {
  const b = brt(new Date(ts))
  if (b.hora >= JI && b.hora < JF) return ts
  const base = deBrt(b.ano, b.mes, b.dia, JI, 0).getTime()
  return b.hora < JI ? base : base + 24 * H
}

export function horaDaEtapa(regua: Regua, idx: number, base: number, ultimoEnvio?: number): number {
  const e = CONFIG_REGUAS.reguas[regua].etapas[idx]
  const ref = e.depois_de === 'etapa anterior' && ultimoEnvio ? ultimoEnvio : base
  return ajustarJanela(ref + e.horas * H)
}

export function modeloDaEtapa(regua: Regua, idx: number): ChaveModelo {
  const id = CONFIG_REGUAS.reguas[regua].etapas[idx].template_id
  const chave = (Object.keys(CRM_MAP.modelos) as ChaveModelo[]).find(c => CRM_MAP.modelos[c].templateId === id)
  if (!chave) throw new Error(`régua ${regua}: modelo ${id} não está em CRM_MAP.modelos`)
  return chave
}

export const getFu = (leadId: number) => redis.get<FuState>(k('fu', leadId))

export async function iniciarRegua(leadId: number, regua: Regua, base = Date.now()): Promise<void> {
  const token = novoToken()
  const proxima = horaDaEtapa(regua, 0, base)
  await redis.set(k('fu', leadId), { regua, token, base, proxima } satisfies FuState, { ex: TTL })
  await agendarJob({ tipo: 'fu', leadId, quando: proxima, token, dados: { etapa: 0 } })
}

export async function cancelarRegua(leadId: number): Promise<boolean> {
  return (await redis.del(k('fu', leadId))) === 1
}

/**
 * Executa um job de régua. Devolve o que fez (vai para o diário).
 * `enviar` manda o modelo aprovado; `enviarTexto` manda o texto livre da etapa
 * (ou o modelo, fora da janela de 24h); `encerrar` move o lead (só se a régua
 * tiver ao_terminar: desde 15/10 nenhuma tem, o card fica na coluna da renda).
 */
export async function executarFu(
  job: { tipo: 'fu' | 'encerra'; leadId: number; token: string; dados?: Record<string, unknown> },
  acoes: {
    podeSeguir(regua: Regua): Promise<string | null>
    enviar(modelo: ChaveModelo): Promise<void>
    /** devolve como saiu: 'texto' ou 'modelo' (fora da janela de 24h) */
    enviarTexto(texto: string, modeloForaDaJanela: ChaveModelo): Promise<'texto' | 'modelo'>
    encerrar(pipelineId: number, statusId: number): Promise<void>
  },
): Promise<string> {
  const fu = await getFu(job.leadId)
  if (!fu || fu.token !== job.token) return 'cancelada (o lead respondeu ou a régua foi trocada)'
  const bloqueio = await acoes.podeSeguir(fu.regua)
  if (bloqueio) { await cancelarRegua(job.leadId); return `parou: ${bloqueio}` }
  const cfg = CONFIG_REGUAS.reguas[fu.regua]

  if (job.tipo === 'encerra') {
    if (cfg.ao_terminar) await acoes.encerrar(cfg.ao_terminar.pipeline_id, cfg.ao_terminar.status_id)
    await cancelarRegua(job.leadId)
    return `régua ${fu.regua} encerrada: lead em perdido`
  }

  const idx = Number(job.dados?.etapa ?? 0)
  const etapa = cfg.etapas[idx]
  if (!etapa) return `etapa ${idx} não existe`
  const modelo = modeloDaEtapa(fu.regua, idx)
  const comoSaiu = etapa.texto_livre ? await acoes.enviarTexto(etapa.texto_livre, modelo) : (await acoes.enviar(modelo), 'modelo')
  const agora = Date.now()
  const prox = idx + 1
  if (cfg.etapas[prox]) {
    const quando = horaDaEtapa(fu.regua, prox, fu.base, agora)
    await redis.set(k('fu', job.leadId), { ...fu, ultimoEnvio: agora, proxima: quando } satisfies FuState, { ex: TTL })
    await agendarJob({ tipo: 'fu', leadId: job.leadId, quando, token: fu.token, dados: { etapa: prox } })
  } else if (cfg.ao_terminar) {
    const quando = agora + cfg.ao_terminar.depois_de_horas * H
    await redis.set(k('fu', job.leadId), { ...fu, ultimoEnvio: agora, proxima: quando } satisfies FuState, { ex: TTL })
    await agendarJob({ tipo: 'encerra', leadId: job.leadId, quando, token: fu.token })
  } else {
    await cancelarRegua(job.leadId)
  }
  return `régua ${fu.regua}: enviado ${etapa.nome} (${comoSaiu === 'texto' ? 'texto da equipe' : CRM_MAP.modelos[modelo].nome})`
}
