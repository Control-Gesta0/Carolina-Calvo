import { brl, dataHora, MOTIVO_ROTULO } from './format'
import type { ExecutionData, LiveData } from './types'

/**
 * Briefing e "Pergunte à Central": interpretação calculada em código, zero
 * tokens. Sem as duas fontes, nenhuma conclusão é inventada.
 */

export type SignalTone = 'calm' | 'attention' | 'critical' | 'opportunity' | 'learning'

export interface DecisionCard { id: string; tone: SignalTone; title: string; evidence: string; impact: string; action: string; href: string }
/** `ritmo` completa os quatro números da Visão geral (não repete nenhum deles). */
export interface ExecutiveBriefing { ritmo: string; decisions: DecisionCard[] }

const plural = (n: number, s: string, p: string) => (n === 1 ? s : p)
const DIA = 86400_000

export function buildBriefing(live: LiveData | null, data: ExecutionData | null): ExecutiveBriefing {
  if (!live || !data) {
    return { ritmo: 'Reunindo o Kommo e o diário. Nenhuma conclusão aparece antes das duas fontes responderem.', decisions: [] }
  }
  const decisions: DecisionCard[] = []
  const erros = data.saude24h.erros
  const agora = Date.now()
  const passagens24h = data.passagens.filter(p => agora - Date.parse(p.ts) <= DIA)

  if (!live.saude.crmOk) {
    decisions.push({
      id: 'crm', tone: 'critical', title: 'O Kommo precisa de conferência',
      evidence: live.saude.problemas[0] || 'A leitura do Kommo falhou.',
      impact: 'Campo, etapa ou modelo que mudou no Kommo faz a Anna gravar no lugar errado ou deixar de enviar.',
      action: 'Ver detalhes', href: '/configuracoes',
    })
  }
  if (erros > 0) {
    decisions.push({
      id: 'erros', tone: erros >= 3 ? 'critical' : 'attention',
      title: `${erros} ${plural(erros, 'execução pede', 'execuções pedem')} investigação`,
      evidence: `${erros} ${plural(erros, 'erro apareceu', 'erros apareceram')} no diário nas últimas 24 horas.`,
      impact: 'Pode haver lead esperando resposta.', action: 'Abrir o histórico', href: '/operacao?aba=historico',
    })
  }
  // urgente: pediu para remarcar (reunião que pode estar perto) ou a Anna não achou horário (lead esperando)
  const urgentes = passagens24h.filter(p => p.urgente)
  if (urgentes.length) {
    const remarcar = urgentes.filter(p => p.motivo === 'remarcar').length
    const semAgenda = urgentes.length - remarcar
    decisions.push({
      id: 'urgentes', tone: 'critical',
      title: `${urgentes.length} ${plural(urgentes.length, 'lead espera', 'leads esperam')} a equipe para acertar o horário`,
      evidence: `${urgentes.map(p => p.nome).slice(0, 3).join(', ')}${urgentes.length > 3 ? ` e mais ${urgentes.length - 3}` : ''}. ` + [
        remarcar ? `${remarcar} ${plural(remarcar, 'pediu', 'pediram')} para remarcar` : '',
        semAgenda ? `${semAgenda} ${plural(semAgenda, 'ficou', 'ficaram')} sem horário livre na agenda da Dra.` : '',
      ].filter(Boolean).join(', ') + '.',
      impact: 'Reunião marcada pode estar perto, e quem pediu horário esfria rápido. A tarefa para a Dra. tem prazo de 60 minutos.',
      action: 'Ver passagens', href: '/operacao?aba=passagens',
    })
  }
  const outras = passagens24h.filter(p => !p.urgente)
  if (outras.length) {
    const porMotivo = new Map<string, number>()
    for (const p of outras) porMotivo.set(p.rotulo, (porMotivo.get(p.rotulo) || 0) + 1)
    decisions.push({
      id: 'passagens', tone: 'attention',
      title: `${outras.length} ${plural(outras.length, 'lead passou', 'leads passaram')} para a equipe nas últimas 24 horas`,
      evidence: [...porMotivo.entries()].sort((a, b) => b[1] - a[1]).map(([r, n]) => `${r}: ${n}`).join(' · '),
      impact: 'Cada um tem a tag atendimento-humano e uma tarefa para a Dra. com o resumo e os valores que o lead informou.',
      action: 'Ver passagens', href: '/operacao?aba=passagens',
    })
  }
  const reunioes24h = data.agendamentos.filter(a => agora - Date.parse(a.ts) <= DIA)
  if (reunioes24h.length) {
    decisions.push({
      id: 'reunioes', tone: 'opportunity',
      title: `${reunioes24h.length} ${plural(reunioes24h.length, 'reunião marcada', 'reuniões marcadas')} pela Anna nas últimas 24 horas`,
      evidence: reunioes24h.slice(0, 3).map(a => a.nome).join(', ') + (reunioes24h.length > 3 ? ` e mais ${reunioes24h.length - 3}` : '') + '.',
      impact: 'Todas já estão na agenda da Dra. com link do Meet, e o card está em Closer › REUNIÃO AGENDADA.',
      action: 'Ver reuniões', href: '/operacao?aba=reunioes',
    })
  }
  const parados = live.funil.filter(f => f.parados > 0).sort((a, b) => b.parados - a.parados)[0]
  if (parados) {
    decisions.push({
      id: 'parados', tone: 'opportunity',
      title: `${parados.parados} ${plural(parados.parados, 'lead parado', 'leads parados')} em ${parados.label}`,
      evidence: `Sem nenhuma atualização no card há 7 dias ou mais${parados.valor ? `, somando ${brl(parados.valor, 0)} em valor aberto na etapa` : ''}.`,
      impact: 'É onde o funil está perdendo ritmo.', action: 'Ver no funil', href: '/operacao?aba=funil',
    })
  }
  if (!data.financeiro.execucoesComCusto) {
    decisions.push({
      id: 'ledger', tone: 'learning', title: 'Custo ainda não medido',
      evidence: 'Nenhuma execução com consumo de tokens registrado apareceu no diário.',
      impact: 'A próxima conversa real inaugura o custo por resposta.', action: 'Entender os custos', href: '/resultados',
    })
  }

  return {
    ritmo: live.respostaMedianaSegundos
      ? `Tempo mediano de ${Math.round(live.respostaMedianaSegundos)}s por resposta, contando a espera que junta mensagens seguidas do lead.`
      : 'Ainda sem resposta medida nas últimas 24 horas.',
    decisions: decisions.slice(0, 4),
  }
}

export interface MoneySignal { id: string; stage: string; count: number; value: number; tone: SignalTone; title: string; samples: LiveData['funil'][number]['amostras'] }

export function buildMoneyRadar(live: LiveData | null): MoneySignal[] {
  if (!live) return []
  return live.funil
    .filter(s => s.parados > 0)
    .map((s, i) => ({
      id: `money-${i}`, stage: s.label, count: s.parados, value: s.valor,
      // no Closer o lead já falou com a Dra. ou tem reunião: parado lá custa mais caro
      tone: (/^Closer/i.test(s.label) ? 'critical' : 'opportunity') as SignalTone,
      title: `${s.parados} ${plural(s.parados, 'parado', 'parados')} em ${s.label}`,
      samples: s.amostras,
    }))
    .sort((a, b) => (b.value || b.count) - (a.value || a.count))
    .slice(0, 6)
}

export interface CentralAnswer { answer: string; evidence: string[]; href?: string; label?: string }

export function answerCentral(raw: string, live: LiveData | null, data: ExecutionData | null): CentralAnswer {
  const q = raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (!live || !data) return { answer: 'Ainda estou carregando o Kommo e o diário.', evidence: ['Espere as fontes responderem e pergunte de novo.'] }
  const sete = data.marcos.seteDias
  const trinta = data.marcos.trintaDias

  if (/custo|gast|token|investimento|quanto custa/.test(q)) {
    const f = data.financeiro
    return {
      answer: f.execucoesComCusto
        ? `Nos últimos 30 dias o modelo custou ${brl(f.trintaDias)}; em média ${brl(f.medioPorExecucao, 3)} por execução.`
        : 'Ainda não há execução com custo registrado.',
      evidence: [`${f.execucoesComCusto} execuções com custo`, `${f.execucoesSemCusto} registros sem custo (antigos ou com erro)`, f.observacao],
      href: '/resultados', label: 'Abrir resultados',
    }
  }
  if (/erro|falha|quebrou|saude|kommo|webhook/.test(q)) {
    return {
      answer: data.saude24h.erros ? `Encontrei ${data.saude24h.erros} erro(s) nas últimas 24 horas.` : 'Nenhuma falha no diário nas últimas 24 horas.',
      evidence: [`${data.saude24h.total} execuções analisadas`, live.saude.crmOk ? 'Kommo conferido sem divergência' : `Kommo: ${live.saude.problemas[0]}`],
      href: '/operacao?aba=historico', label: 'Abrir o histórico',
    }
  }
  if (/remarc|urgente|sem horario|agenda cheia|sem agenda/.test(q)) {
    const urg = data.passagens.filter(p => p.urgente).slice(0, 5)
    return {
      answer: urg.length
        ? `${urg.length} passagem(ns) urgente(s) recente(s): pediram para remarcar ou a Anna não achou horário na agenda da Dra.`
        : 'Nenhuma passagem urgente registrada no diário.',
      evidence: urg.length ? urg.map(p => `${p.nome}: ${p.rotulo} (${dataHora(p.ts)})`) : ['Urgente é quem pediu para remarcar ou ficou sem horário na agenda.'],
      href: '/operacao?aba=passagens', label: 'Ver passagens',
    }
  }
  if (/agend|reuni|marc|meet/.test(q)) {
    const ult = data.agendamentos.slice(0, 3)
    return {
      answer: `A Anna marcou ${data.marcos.hoje.agendados} reunião(ões) hoje, ${sete.agendados} nos últimos 7 dias e ${trinta.agendados} em 30 dias.`,
      evidence: [
        `${trinta.acima10k} lead(s) com renda de R$ 10 mil ou mais em 30 dias`,
        ...(ult.length ? ult.map(a => `${a.nome}, marcada em ${dataHora(a.ts)}`) : ['Nenhuma reunião marcada pela Anna no diário']),
      ],
      href: '/operacao?aba=reunioes', label: 'Ver reuniões',
    }
  }
  if (/abaixo|10 ?mil|10k|renda|salario|ganha/.test(q)) {
    return {
      answer: `Em 30 dias, ${trinta.rendaInformada} lead(s) informaram a renda bruta: ${trinta.acima10k} com R$ 10 mil ou mais e ${trinta.abaixo10k} abaixo de R$ 10 mil.`,
      evidence: [
        'Abaixo de R$ 10 mil a Anna não marca reunião: põe a tag "ANNA renda abaixo 10k" e cria uma tarefa para a Dra.',
        `Nos últimos 7 dias: ${sete.acima10k} com R$ 10 mil ou mais, ${sete.abaixo10k} abaixo`,
      ],
      href: '/resultados#conversao', label: 'Abrir a qualificação',
    }
  }
  if (/quem esta|com a equipe|agora|atendendo|conversando/.test(q)) {
    const comEquipe = live.conversas.filter(c => c.estado === 'humano')
    return {
      answer: `Nas últimas 24 horas: ${live.grupos.iaAtendendo} lead(s) com a Anna, ${live.grupos.comHumano} com a equipe e ${live.grupos.foraDaIA} fora da IA.`,
      evidence: comEquipe.length ? comEquipe.slice(0, 5).map(c => `${c.nome}: com a equipe há ${c.minutosAtras < 60 ? `${c.minutosAtras} min` : `${Math.round(c.minutosAtras / 60)}h`}`) : ['Ninguém passou para a equipe nas últimas 24 horas'],
      href: '/operacao', label: 'Abrir operação',
    }
  }
  if (/passag|passou|passaram|equipe|humano|pessoa|robo|advogado|cliente|outra area/.test(q)) {
    const mot = data.motivos.seteDias
    return {
      answer: `Nos últimos 7 dias a Anna passou ${sete.passagens} lead(s) para a equipe e marcou ${sete.agendados} reunião(ões).`,
      evidence: mot.length ? mot.map(m => `${MOTIVO_ROTULO[m.motivo] || m.rotulo}: ${m.n}`) : ['Nenhuma passagem nos últimos 7 dias'],
      href: '/operacao?aba=passagens', label: 'Ver passagens',
    }
  }
  if (/follow|lembrete|sem resposta|sumiu/.test(q)) {
    return {
      answer: `Nos últimos 7 dias, ${sete.followups} lead(s) receberam follow-up ou lembrete da Anna (${trinta.followups} em 30 dias).`,
      evidence: [
        'Follow-up só sai das 7h às 20h, com os modelos aprovados pela Meta',
        'Qualquer resposta do lead ou mensagem da equipe cancela a régua',
      ],
      href: '/operacao?aba=historico', label: 'Abrir o histórico',
    }
  }
  if (/funil|parad|lead|coluna|perdid|ganh/.test(q)) {
    const radar = buildMoneyRadar(live)
    return {
      answer: `No Kommo: ${live.leads.abertas} lead(s) abertos no SDR e no Closer; nos últimos 30 dias, ${live.leads.ganhas} ganho(s) e ${live.leads.perdidas} perdido(s).`,
      evidence: radar.length ? radar.slice(0, 3).map(r => `${r.stage}: ${r.count} parado(s) há 7 dias ou mais`) : ['Nenhum lead parado pelo critério de 7 dias'],
      href: '/operacao?aba=funil', label: 'Abrir o funil',
    }
  }
  return {
    answer: `Nas últimas 24h: ${live.conversas24h} lead(s) atendidos, ${data.saude24h.erros} erro(s)${live.respostaMedianaSegundos ? ` e tempo mediano de ${Math.round(live.respostaMedianaSegundos)}s por resposta` : ''}.`,
    evidence: ['Resposta calculada com os seus dados, sem consumir tokens', 'Pergunte sobre reuniões, passagens, renda abaixo de 10 mil, quem está com a equipe, follow-up, custo ou erros.'],
  }
}
