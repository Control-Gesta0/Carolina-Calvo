export function brl(valor: number, casas = 2) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: casas, maximumFractionDigits: casas })
}

export function dataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function tempoRelativo(iso: string) {
  const delta = new Date(iso).getTime() - Date.now()
  const min = Math.round(Math.abs(delta) / 60000)
  const txt = min < 60 ? `${min} min` : min < 1440 ? `${Math.round(min / 60)}h` : `${Math.round(min / 1440)}d`
  return delta < 0 ? `há ${txt}` : `em ${txt}`
}

export function pct(parte: number, todo: number) {
  return todo ? `${Math.round((parte / todo) * 100)}%` : '—'
}

/** Rótulos dos motivos de passagem (os mesmos MOTIVOS do agente, lib/central-data.ts). */
export const MOTIVO_ROTULO: Record<string, string> = {
  perguntou_robo: 'Perguntou se é robô',
  pediu_humano: 'Pediu uma pessoa',
  tem_advogado: 'Já tem advogado no caso',
  ja_e_cliente: 'Já é cliente',
  quer_contratar: 'Quer contratar',
  outro_assunto: 'Assunto de outra área',
  remarcar: 'Pediu para remarcar',
  sem_agenda: 'Sem horário na agenda',
  abaixo_pediu_reuniao: 'Renda até 15 mil pediu reunião',
  outro: 'Outro motivo',
}

/** Motivos que a equipe precisa ver logo (urgente no agente). */
export const MOTIVO_URGENTE = new Set(['remarcar', 'sem_agenda'])

/** Faixa da renda bruta informada pelo lead. */
export const PERFIL_ROTULO: Record<string, string> = {
  acima_15k: 'RENDA ACIMA DE 15 MIL',
  ate_15k: 'RENDA ATÉ 15 MIL',
}

/** Etapa do roteiro da Anna (state.etapa no agente). */
export const ETAPA_ROTULO: Record<string, string> = {
  q1: '1ª pergunta (o que quer saber)',
  q2: '2ª pergunta (renda e descontos)',
  q3: '3ª mensagem (desconto em conta)',
  analise: 'Pausa de 30 min (com a Dra.)',
  oferta: 'Oferta de horário',
  preferencia: 'Manhã ou tarde',
  agendado: 'Reunião marcada',
  sem_reuniao: 'Renda até 15 mil',
  humano: 'Com a equipe',
}
