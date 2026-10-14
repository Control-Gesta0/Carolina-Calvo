import type { ExecEntry } from './execlog'

/**
 * Conversas REAIS para correção (Base de dados → Conversas reais), montadas do
 * diário de execuções: o que o lead escreveu e o que a Anna mandou, já
 * com CPF, CNPJ, telefone e e-mail mascarados no momento em que foi gravado.
 * Puro (sem env): testado em npm test.
 */

export interface ConversaResumo {
  contato: string
  nome: string
  ultima: string
  /** respostas da assistente com texto guardado */
  respostas: number
  /** último texto (cliente ou assistente), curto */
  previa: string
  /** motivo da passagem, se passou para a equipe */
  passou?: string
  perfil?: 'acima_10k' | 'abaixo_10k'
}

export interface TurnoReal {
  ts: string
  tipo: 'resposta' | 'inicio' | 'agendou' | 'humano' | 'job'
  cliente: string
  resposta: string
  tools: string[]
  travas: string[]
  motivo?: string
}

const COM_RESPOSTA: Array<ExecEntry['tipo']> = ['resposta', 'inicio', 'agendou', 'humano', 'job']
const tem = (e: ExecEntry) => COM_RESPOSTA.includes(e.tipo) && !!e.respostaIA

export function listarConversas(execs: ExecEntry[], limite = 60): ConversaResumo[] {
  const porContato = new Map<string, ExecEntry[]>()
  for (const e of execs) {
    if (!tem(e)) continue
    const l = porContato.get(String(e.leadId))
    if (l) l.push(e); else porContato.set(String(e.leadId), [e])
  }
  return [...porContato.entries()]
    .map(([contato, l]) => {
      const ordem = [...l].sort((a, b) => b.at.localeCompare(a.at))
      const ult = ordem[0]
      const pass = ordem.find(e => e.tipo === 'humano')
      return {
        contato,
        nome: ult.nome || ordem.find(e => e.nome)?.nome || 'Lead',
        ultima: ult.at,
        respostas: l.length,
        previa: (ult.respostaIA || ult.turnoLead || '').replace(/\s+/g, ' ').slice(0, 140),
        passou: pass?.porta,
        perfil: ordem.find(e => e.perfil)?.perfil,
      }
    })
    .sort((a, b) => b.ultima.localeCompare(a.ultima))
    .slice(0, limite)
}

/** Turnos de um lead, do mais antigo para o mais novo. O texto do lead não se repete em duas respostas seguidas. */
export function turnosDoContato(execs: ExecEntry[], contato: string): TurnoReal[] {
  const l = execs.filter(e => String(e.leadId) === contato && tem(e)).sort((a, b) => a.at.localeCompare(b.at))
  let ultimoCliente = ''
  return l.map(e => {
    const cliente = (e.turnoLead || '').trim()
    const repetido = !!cliente && cliente === ultimoCliente
    if (cliente) ultimoCliente = cliente
    return {
      ts: e.at,
      tipo: e.tipo as TurnoReal['tipo'],
      cliente: repetido ? '' : cliente,
      resposta: e.respostaIA || '',
      tools: (e.tools || []).filter(t => !t.startsWith('trava:')),
      travas: e.guard || [],
      motivo: e.tipo === 'humano' ? e.porta : undefined,
    }
  })
}

/** Contexto da correção: até 6 turnos antes + o que o lead escreveu na resposta marcada. */
export function contextoReal(turnos: TurnoReal[], ts: string): { lead: string; resposta: string; turno: TurnoReal } | null {
  const i = turnos.findIndex(t => t.ts === ts)
  if (i < 0) return null
  const linhas: string[] = []
  for (const t of turnos.slice(Math.max(0, i - 6), i + 1)) {
    if (t.cliente) linhas.push(`LEAD: ${t.cliente}`)
    if (t !== turnos[i]) linhas.push(`ANNA${t.tipo === 'job' ? ' (5ª mensagem, depois da pausa de 30 min)' : ''}: ${t.resposta}`)
  }
  const d = turnos[i]
  linhas.push(`(nessa resposta a Anna fez: ${d.tools.join(', ') || 'nada registrado'}${d.travas.length ? `; travas: ${d.travas.join(' | ')}` : ''})`)
  return { lead: linhas.join('\n').slice(0, 6000), resposta: d.resposta.slice(0, 3000), turno: d }
}
