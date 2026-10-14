import { asaasConfigurado, emAtrasoDoCliente, lerCliente, listarCobrancas, type Cobranca } from '../asaas'
import { primeiroNome } from '../anna/producao'
import { diaSP } from '../central-data'
import { CONFIG } from '../config'
import { CRM_MAP, type ChaveModelo } from '../crm-map'
import { addLeadTags, removeLeadTags } from '../kommo'
import { enviarModelo } from '../modelos'
import { k, redis } from '../redis'
import { etapaDoDia, PAGO, somarDias, variaveis, type Etapa, type Turno } from './regua'
import { leadDoCliente } from './vinculo'

/**
 * EXECUÇÃO da cobrança: o QStash chama /api/cobranca às 9h (turno manhã) e às
 * 17h (turno tarde). Lê as cobranças do Asaas, decide a mensagem de hoje
 * (regua.ts), acha o card do cliente (vinculo.ts) e dispara o modelo aprovado
 * pelo Salesbot dele. Idempotente: cada cobrança recebe cada mensagem uma vez.
 * Sem COBRANCA_ATIVA=true nada é enviado: o resultado é "simulado".
 */

export type EtapaOuPago = Etapa | 'pago'
export const MODELO_DA_ETAPA: Record<EtapaOuPago, ChaveModelo> = {
  antes: 'cobrancaAntes', dia: 'cobrancaDia', dia17: 'cobranca17h', d1: 'cobrancaD1',
  d5: 'cobrancaD5', d10: 'cobrancaD10', d18: 'cobrancaD18', pago: 'cobrancaPago',
}

export interface ItemCobranca {
  cobranca: string
  cliente: string
  nome: string
  valor: number
  vencimento: string
  etapa: EtapaOuPago
  modelo: string
  leadId?: number
  resultado: 'enviado' | 'simulado' | 'sem card' | 'sem bot' | 'já enviado' | 'fora do teste' | 'limite da rodada' | 'erro'
  detalhe?: string
}

export interface Rodada { em: string; hoje: string; turno: Turno | 'webhook'; ativa: boolean; itens: ItemCobranca[] }

const MAX_ENVIOS = 80
const K_LOG = () => k('cob', 'log')
const K_ENVIADO = (cobranca: string, etapa: EtapaOuPago) => k('cob', 'env', cobranca, etapa)

/** O que entra na rodada: manhã = régua do dia + pagamentos das últimas 24h; tarde = vencendo hoje e não pago. */
async function candidatos(hoje: string, turno: Turno): Promise<Array<{ c: Cobranca; etapa: EtapaOuPago }>> {
  const out: Array<{ c: Cobranca; etapa: EtapaOuPago }> = []
  const vistas = new Set<string>()
  const juntar = (lista: Cobranca[], etapa: (c: Cobranca) => EtapaOuPago | null) => {
    for (const c of lista) {
      const e = etapa(c)
      if (!e || vistas.has(`${c.id}|${e}`)) continue
      vistas.add(`${c.id}|${e}`)
      out.push({ c, etapa: e })
    }
  }
  if (turno === 'tarde') {
    juntar(await listarCobrancas({ status: 'PENDING', 'dueDate[ge]': hoje, 'dueDate[le]': hoje }), c => etapaDoDia(c, hoje, 'tarde'))
    return out
  }
  for (const status of ['PENDING', 'OVERDUE']) {
    juntar(await listarCobrancas({ status, 'dueDate[ge]': somarDias(hoje, -18), 'dueDate[le]': somarDias(hoje, 10) }), c => etapaDoDia(c, hoje, 'manha'))
  }
  for (const status of ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH']) {
    juntar(await listarCobrancas({ status, 'paymentDate[ge]': somarDias(hoje, -1) }), c => (PAGO.has(c.status) ? 'pago' : null))
  }
  return out
}

/** Envia (ou simula) uma mensagem da régua para uma cobrança. */
export async function processar(c: Cobranca, etapa: EtapaOuPago, hoje: string, enviar: boolean): Promise<ItemCobranca> {
  const chave = MODELO_DA_ETAPA[etapa]
  const modelo = CRM_MAP.modelos[chave]
  const cli = await lerCliente(c.customer)
  const item: ItemCobranca = { cobranca: c.id, cliente: c.customer, nome: cli.name, valor: c.value, vencimento: c.dueDate, etapa, modelo: modelo.nome, resultado: 'simulado' }
  const v = await leadDoCliente(cli)
  if (!v) return { ...item, resultado: 'sem card', detalhe: 'nenhum card no Kommo com o telefone do cliente no Asaas' }
  item.leadId = v.leadId
  // cobrança só em card de cliente (Financeiro ou Gestão operacional): nunca num lead do SDR, onde a Anna atende
  if (!v.cliente) return { ...item, resultado: 'sem card', detalhe: `o contato só tem card fora do Financeiro e da Gestão operacional (lead ${v.leadId})` }
  if (!enviar) return item
  if (!modelo.botId) return { ...item, resultado: 'sem bot', detalhe: `falta o Salesbot do modelo "${modelo.nome}"` }
  if (CONFIG.cobrancaTesteLeads.length && !CONFIG.cobrancaTesteLeads.includes(v.leadId)) return { ...item, resultado: 'fora do teste' }
  if ((await redis.set(K_ENVIADO(c.id, etapa), new Date().toISOString(), { nx: true, ex: 120 * 86400 })) !== 'OK') return { ...item, resultado: 'já enviado' }
  try {
    const detalhe = await enviarModelo(v.leadId, chave, { primeiroNome: primeiroNome(cli.name) || 'tudo bem', ...variaveis(c, hoje, etapa) })
    if (etapa === 'd1') await addLeadTags(v.leadId, [CRM_MAP.tags.inadimplente])
    if (etapa === 'pago' && !(await emAtrasoDoCliente(c.customer)).length) await removeLeadTags(v.leadId, [CRM_MAP.tags.inadimplente]).catch(() => undefined)
    return { ...item, resultado: 'enviado', detalhe }
  } catch (e) {
    await redis.del(K_ENVIADO(c.id, etapa))
    return { ...item, resultado: 'erro', detalhe: (e instanceof Error ? e.message : String(e)).slice(0, 300) }
  }
}

export async function rodarCobranca(turno: Turno, o: { simular?: boolean; agora?: Date } = {}): Promise<Rodada> {
  if (!asaasConfigurado()) throw new Error('ASAAS_API_KEY ausente: a cobrança não roda sem a chave do Asaas')
  const agora = o.agora || new Date()
  const hoje = diaSP(agora)
  const enviar = CONFIG.cobrancaAtiva && !o.simular
  const itens: ItemCobranca[] = []
  let enviados = 0
  for (const { c, etapa } of await candidatos(hoje, turno)) {
    if (enviar && enviados >= MAX_ENVIOS) { itens.push({ cobranca: c.id, cliente: c.customer, nome: '', valor: c.value, vencimento: c.dueDate, etapa, modelo: CRM_MAP.modelos[MODELO_DA_ETAPA[etapa]].nome, resultado: 'limite da rodada' }); continue }
    const it = await processar(c, etapa, hoje, enviar).catch(e => ({
      cobranca: c.id, cliente: c.customer, nome: '', valor: c.value, vencimento: c.dueDate, etapa, modelo: CRM_MAP.modelos[MODELO_DA_ETAPA[etapa]].nome,
      resultado: 'erro' as const, detalhe: (e instanceof Error ? e.message : String(e)).slice(0, 300),
    }))
    if (it.resultado === 'enviado') enviados++
    itens.push(it)
  }
  const rodada: Rodada = { em: agora.toISOString(), hoje, turno, ativa: CONFIG.cobrancaAtiva, itens }
  if (!o.simular) {
    await redis.lpush(K_LOG(), rodada)
    await redis.ltrim(K_LOG(), 0, 199)
  }
  return rodada
}

export async function lerRodadas(n = 30): Promise<Rodada[]> {
  return (await redis.lrange<Rodada>(K_LOG(), 0, n - 1)) || []
}

/** Aviso do Asaas de pagamento: confirma na hora, entre 8h e 20h (fora disso a rodada das 9h confirma). */
export async function confirmarPagamento(c: Cobranca, agora = new Date()): Promise<ItemCobranca | null> {
  const hora = Number(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }).format(agora))
  if (!CONFIG.cobrancaAtiva || !PAGO.has(c.status) || hora < 8 || hora >= 20) return null
  const it = await processar(c, 'pago', diaSP(agora), true)
  await redis.lpush(K_LOG(), { em: agora.toISOString(), hoje: diaSP(agora), turno: 'webhook', ativa: true, itens: [it] } satisfies Rodada)
  await redis.ltrim(K_LOG(), 0, 199)
  return it
}
