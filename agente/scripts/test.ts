/**
 * npm test — tudo que é determinístico, sem rede: travas de texto, detector de
 * "é robô?", motor da agenda, janela e réguas de follow-up, parsers de webhook
 * e o roteiro inteiro da Anna com um intérprete simulado.
 */
process.env.KOMMO_DOMAIN ||= 'https://teste.kommo.com'
process.env.KOMMO_TOKEN ||= 'x'
process.env.KOMMO_ACCOUNT_ID ||= '1'
process.env.OPENAI_API_KEY ||= 'x'
process.env.UPSTASH_REDIS_REST_URL ||= 'https://x.upstash.io'
process.env.UPSTASH_REDIS_REST_TOKEN ||= 'x'
process.env.WEBHOOK_SECRET ||= 'x'

let falhas = 0
let total = 0
function eq(nome: string, got: unknown, want: unknown) {
  total++
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) falhas++
  console.log(`${ok ? '✅' : '❌'} ${nome}${ok ? '' : ` → recebido ${JSON.stringify(got)}, esperado ${JSON.stringify(want)}`}`)
}

async function main() {
  const { checkReply, semTravessao } = await import('../lib/guards')
  const { ehPerguntaRobo } = await import('../lib/anna/interprete')
  const A = await import('../lib/anna/agenda')
  const { colunaPorRenda, STATUS, PIPELINES, CRM_MAP } = await import('../lib/crm-map')
  const CRM = await import('../lib/crm-map')
  const F = await import('../lib/followup')
  const { parseKommoWebhook } = await import('../api/inbound')
  const { parseLeadWebhook } = await import('../api/lead')
  const { renderizar } = await import('../lib/modelos')
  const { primeiroNome } = await import('../lib/anna/producao')
  const { TEXTOS, diaDaOferta } = await import('../lib/anna/textos')
  const fluxo = await import('../lib/anna/fluxo')

  const regras = (t: string) => [...new Set(checkReply(t).map(v => v.regra))]

  console.log('\n— Travas de texto')
  eq('duas perguntas', regras('Qual é a sua renda? E o líquido?'), ['mais de uma pergunta'])
  eq('travessão é violação', regras('A reunião — on-line — é gratuita.'), ['travessão'])
  eq('travessão vira vírgula', semTravessao('A reunião — on-line — é gratuita.'), 'A reunião, on-line, é gratuita.')
  eq('disse que é IA bloqueia', regras('Sou uma assistente virtual do escritório.'), ['disse que é IA'])
  eq('apresentação da Anna passa', regras('Aqui é a Anna, da equipe da Dra. Carolina Calvo.'), [])
  eq('pedir contracheque bloqueia', regras('Me envie o seu contracheque, por favor.'), ['pediu documento'])
  eq('"não precisa enviar contracheque" passa', regras('Não precisa enviar contracheque, basta me informar os valores.'), [])
  eq('"pode enviar o extrato" bloqueia', regras('Pode enviar o extrato da conta?'), ['pediu documento'])
  eq('confirmação "tenha em mãos" passa', regras('Peço que tenha em mãos o seu último contracheque na reunião.'), [])
  eq('valor de honorário bloqueia', regras('Os honorários ficam em R$ 500 de entrada.'), ['falou de honorários'])
  eq('percentual bloqueia', regras('A Dra. cobra 30% do proveito.'), ['falou de honorários'])
  eq('"honorários só na reunião" passa', regras('Os valores de honorários são tratados somente na reunião com a Dra. Carolina.'), [])
  eq('garantia bloqueia', regras('A liminar é garantida.'), ['prometeu resultado'])
  eq('chance de sucesso bloqueia', regras('As chances de sucesso são altas.'), ['prometeu resultado'])
  eq('emoji bloqueia', regras('Combinado 😊'), ['emoji'])
  eq('texto da Dra. (msg 4) passa', regras(TEXTOS.mensagem4), [])
  eq('texto da Dra. (pergunta 2) passa sem travessão', regras(TEXTOS.pergunta2).filter(r => r !== 'mais de uma pergunta'), [])

  console.log('\n— "É robô?"')
  eq('"é robô?"', ehPerguntaRobo('vc é robô?'), true)
  eq('"estou falando com uma IA?"', ehPerguntaRobo('Estou falando com uma IA? é ia?'), true)
  eq('"é mensagem automática?"', ehPerguntaRobo('Isso é mensagem automática?'), true)
  eq('"o desconto é automático?" não é robô', ehPerguntaRobo('o desconto é automático na conta?'), false)
  eq('"quero falar com a Dra." não é robô', ehPerguntaRobo('quero falar com a Dra.'), false)

  console.log('\n— Agenda (horário de Brasília)')
  const seg9 = A.deBrt(2026, 9, 12, 9, 0) // segunda 12/10/2026 09:00
  const base = { ocupados: [] as Array<{ inicio: number; fim: number }>, reservados: new Set<string>() }
  const k = (s: ReturnType<typeof A.proximoSlot>) => s?.chave
  eq('mesmo dia (se liberado), agenda vazia → 11:00 de hoje: manhã primeiro (Dra., 05/11)', k(A.proximoSlot({ ...base, agora: seg9, mesmoDia: true })), '2026-10-12T11:00')
  const ocupado = (h1: number, m1: number, h2: number, m2: number) => ({ inicio: A.deBrt(2026, 9, 12, h1, m1).getTime(), fim: A.deBrt(2026, 9, 12, h2, m2).getTime() })
  eq('manhã, 15:00 e 15:30 ocupados → 16:00 (sequência)', k(A.proximoSlot({ ...base, ocupados: [ocupado(10, 0, 11, 30), ocupado(15, 0, 16, 0)], agora: seg9, mesmoDia: true })), '2026-10-12T16:00')
  eq('tarde toda ocupada → 11:00 (manhã do mais tarde)', k(A.proximoSlot({ ...base, ocupados: [ocupado(15, 0, 18, 0)], agora: seg9, mesmoDia: true })), '2026-10-12T11:00')
  eq('tarde e 11:00 ocupados → 10:30', k(A.proximoSlot({ ...base, ocupados: [ocupado(15, 0, 18, 0), ocupado(11, 0, 11, 30)], agora: seg9, mesmoDia: true })), '2026-10-12T10:30')
  // Dra., 05/11 (2ª mensagem): o mesmo dia primeiro, com 30 min de antecedência
  const segAs = (h: number, m: number) => A.deBrt(2026, 9, 12, h, m)
  eq('lead de madrugada → 11:00 da mesma manhã', k(A.proximoSlot({ ...base, agora: segAs(3, 0), mesmoDia: true })), '2026-10-12T11:00')
  eq('oferta às 9:45 → 11:00 da própria manhã (1 h de antecedência)', k(A.proximoSlot({ ...base, agora: segAs(9, 45), mesmoDia: true })), '2026-10-12T11:00')
  eq('oferta às 10:20 → 11:00 fica a menos de 1 h → 15:00 da própria tarde', k(A.proximoSlot({ ...base, agora: segAs(10, 20), mesmoDia: true })), '2026-10-12T15:00')
  eq('oferta às 12:30 → 15:00 da mesma tarde', k(A.proximoSlot({ ...base, agora: segAs(12, 30), mesmoDia: true })), '2026-10-12T15:00')
  eq('oferta às 18:00 → manhã do próximo dia útil (11:00)', k(A.proximoSlot({ ...base, agora: segAs(18, 0), mesmoDia: true })), '2026-10-13T11:00')
  eq('oferta às 16:45 → nada com 1 h hoje → 11:00 do próximo dia útil', k(A.proximoSlot({ ...base, agora: segAs(16, 45), mesmoDia: true })), '2026-10-13T11:00')
  eq('lead às 10:45 → manhã já passou → 15:00 da própria tarde', k(A.proximoSlot({ ...base, agora: segAs(10, 45), mesmoDia: true })), '2026-10-12T15:00')
  eq('oferta às 14:15 → 15:30 da mesma tarde (exemplo da Dra.: 15:00 fica a menos de 1 h)', k(A.proximoSlot({ ...base, agora: segAs(14, 15), mesmoDia: true })), '2026-10-12T15:30')
  eq('dia útil seguinte → 11:00 (Dra., 05/11)', k(A.proximoSlot({ ...base, agora: seg9, mesmoDia: false })), '2026-10-13T11:00')
  eq('17:10 → 17:30 fica em cima, vai para amanhã', k(A.proximoSlot({ ...base, agora: A.deBrt(2026, 9, 12, 17, 10), mesmoDia: true })), '2026-10-13T11:00')
  eq('sexta à noite → segunda', k(A.proximoSlot({ ...base, agora: A.deBrt(2026, 9, 16, 20, 0), mesmoDia: true })), '2026-10-19T11:00')
  eq('reservado para outro lead é pulado', k(A.proximoSlot({ ...base, reservados: new Set(['2026-10-12T11:00']), agora: seg9, mesmoDia: true })), '2026-10-12T10:30')
  eq('ordem do dia: 11:00, 10:30, 10:00 e depois 15:00 a 17:30 (Dra., 05/11)', A.slotsDoDia('2026-10-13').map(x => x.chave.slice(11)), ['11:00', '10:30', '10:00', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'])
  eq('lead pede dia e hora livres → essa hora (Dra., 05/11)', k(A.proximoSlot({ ...base, agora: seg9, mesmoDia: false, aPartirDoDia: '2026-10-15', horaExata: '16:00', periodo: 'tarde' })), '2026-10-15T16:00')
  eq('hora pedida ocupada → o primeiro horário depois dela nesse dia', k(A.proximoSlot({ ...base, agora: seg9, mesmoDia: false, aPartirDoDia: '2026-10-15', horaExata: '16:00', periodo: 'tarde', reservados: new Set(['2026-10-15T16:00']) })), '2026-10-15T16:30')
  eq('depois das 19h não há horário da Dra. → segue a sequência no dia seguinte', k(A.proximoSlot({ ...base, agora: seg9, mesmoDia: false, aPartirDoDia: '2026-10-15', horaExata: '19:00', periodo: 'tarde' })), '2026-10-16T15:00')
  eq('prefere manhã, a partir de amanhã → 11:00', k(A.proximoSlot({ ...base, agora: seg9, mesmoDia: true, periodo: 'manha', aPartirDoDia: '2026-10-13' })), '2026-10-13T11:00')
  eq('oferta hoje', A.quandoOferta(A.deBrt(2026, 9, 12, 17, 0), seg9), 'HOJE às 17:00')
  eq('oferta amanhã', A.quandoOferta(A.deBrt(2026, 9, 13, 15, 0), seg9), 'AMANHÃ às 15:00')
  eq('oferta em outro dia', A.quandoOferta(A.deBrt(2026, 9, 15, 15, 30), seg9), 'na quinta-feira (15/10) às 15:30')
  eq('extenso', A.quandoExtenso(A.deBrt(2026, 9, 15, 15, 30)), 'quinta-feira, 15/10, às 15:30')
  eq('próximo dia útil de sexta', A.proximoDiaUtil('2026-10-16'), '2026-10-19')

  console.log('\n— Coluna por renda')
  eq('5.000 → DESQUALIFICADO (Dra., 03/11)', colunaPorRenda(5000), STATUS.desqualificado)
  eq('9.999 → DESQUALIFICADO', colunaPorRenda(9999), STATUS.desqualificado)
  eq('10.000 → 10 A 15 MIL', colunaPorRenda(10000), STATUS.de10a15)
  eq('15.000 → 10 A 15 MIL', colunaPorRenda(15000), STATUS.de10a15)
  eq('15.001 → ACIMA DE 15 MIL', colunaPorRenda(15001), STATUS.acima15)

  console.log('\n— Janela 7h–20h e réguas')
  const h = (d: Date) => { const b = A.brt(d); return `${b.dia}/${b.mes + 1} ${b.hora}:${String(b.min).padStart(2, '0')}` }
  eq('21:00 → 7:00 do dia seguinte', h(new Date(F.ajustarJanela(A.deBrt(2026, 9, 12, 21, 0).getTime()))), '13/10 7:00')
  eq('05:30 → 7:00 do mesmo dia', h(new Date(F.ajustarJanela(A.deBrt(2026, 9, 12, 5, 30).getTime()))), '12/10 7:00')
  eq('12:00 fica', h(new Date(F.ajustarJanela(A.deBrt(2026, 9, 12, 12, 0).getTime()))), '12/10 12:00')
  const t0 = A.deBrt(2026, 9, 12, 10, 0).getTime()
  eq('qualificação: FOLLOW 1 = +2h', h(new Date(F.horaDaEtapa('qualificacao', 0, t0))), '12/10 12:00')
  eq('qualificação: FOLLOW 2 = +21h do FOLLOW 1', h(new Date(F.horaDaEtapa('qualificacao', 1, t0, t0 + 2 * 3600_000))), '13/10 9:00')
  eq('qualificação: FOLLOW 3 = +48h', h(new Date(F.horaDaEtapa('qualificacao', 2, t0, A.deBrt(2026, 9, 13, 9, 0).getTime()))), '15/10 9:00')
  eq('qualificação: FINAL = +72h', h(new Date(F.horaDaEtapa('qualificacao', 3, t0, A.deBrt(2026, 9, 15, 9, 0).getTime()))), '18/10 9:00')
  eq('agendamento: 1ª etapa = 1h depois da oferta (Dra., 03/11)', h(new Date(F.horaDaEtapa('agendamento', 0, t0))), '12/10 11:00')
  eq('agendamento: 2ª etapa = 24h da oferta', h(new Date(F.horaDaEtapa('agendamento', 1, t0, t0 + 2 * 3600_000))), '13/10 10:00')
  eq('agendamento: final = 48h da oferta', h(new Date(F.horaDaEtapa('agendamento', 2, t0, t0 + 24 * 3600_000))), '14/10 10:00')
  eq('FOLLOW 1 de lead que falou às 19h sai às 7h', h(new Date(F.horaDaEtapa('qualificacao', 0, A.deBrt(2026, 9, 12, 19, 0).getTime()))), '13/10 7:00')
  eq('modelos das réguas', ['qualificacao', 'agendamento'].map(r => F.CONFIG_REGUAS.reguas[r as 'qualificacao'].etapas.map((_e, i) => F.modeloDaEtapa(r as 'qualificacao', i))),
    [['follow1', 'follow2', 'follow3', 'follow4'], ['fupHorario', 'se524h', 'fupEncerramento']])

  console.log('\n— Parsers e utilitários')
  eq('add_message plano', parseKommoWebhook({ 'account[id]': '33595135', 'message[add][0][id]': 'm1', 'message[add][0][entity_id]': '77', 'message[add][0][text]': 'oi', 'message[add][0][type]': 'incoming' })?.msgs.map(m => [m.leadId, m.text, m.direction]), [[77, 'oi', 'incoming']])
  eq('add_outgoing_message (equipe falando)', parseKommoWebhook({ 'account[id]': '33595135', 'outgoing_message[add][0][id]': 'o1', 'outgoing_message[add][0][entity_id]': '77', 'outgoing_message[add][0][text]': 'Oi, aqui é a Dra.', 'outgoing_message[add][0][type]': 'outgoing' })?.msgs.map(m => [m.leadId, m.direction]), [[77, 'outgoing']])
  eq('webhook de lead', parseLeadWebhook({ 'leads[status][0][id]': '9', 'leads[status][0][status_id]': '75538167', 'leads[status][0][pipeline_id]': '9809931', 'leads[add][0][id]': '8' }).map(e => [e.tipo, e.id, e.statusId]), [['add', 8, 0], ['status', 9, 75538167]])
  eq('renderiza variável do card', renderizar('Olá, {{lead.cf.805158}}. Link: {{lead.cf.805162}}', { 805158: 'Maria', 805162: 'https://meet.google.com/x' }), 'Olá, Maria. Link: https://meet.google.com/x')
  eq('primeiro nome', primeiroNome('MARIA DOLORES DA SILVA'), 'Maria')
  eq('nome que não é nome', primeiroNome('Facebook №4431198800481061'), '')
  const { validarRedacao, falaDeMulher } = await import('../lib/anna/redator')
  const refQ = 'Ela pode atender você AMANHÃ às 15:00, ON LINE. Posso agendar?'
  const lead = [{ id: '1', dir: 'in' as const, text: 'nesse horário eu trabalho', ts: 1 }]
  eq('redação boa passa', validarRedacao({ referencia: refQ, obrigatorio: ['AMANHÃ às 15:00'] }, 'Consigo para amanhã às 15:00, on-line. Posso agendar?'), [])
  eq('redação sem o horário obrigatório não passa', validarRedacao({ referencia: refQ, obrigatorio: ['AMANHÃ às 15:00'] }, 'Consigo outro dia, on-line. Posso agendar?').length > 0, true)
  eq('redação com lista numerada não passa', validarRedacao({ referencia: 'Pode me passar os valores?', obrigatorio: [] }, '1) renda bruta\n2) líquido\nPode me passar?').some(e => e.includes('lista')), true)
  eq('redação com duas perguntas não passa', validarRedacao({ referencia: 'Pode me passar?', obrigatorio: [] }, 'Tudo bem? Pode me passar?').length > 0, true)
  eq('redação que pergunta sem a referência perguntar não passa', validarRedacao({ referencia: 'Vou pedir para a equipe continuar.', obrigatorio: [] }, 'Vou pedir para a equipe continuar, tudo bem?').length > 0, true)
  eq('redação em caixa alta não passa', validarRedacao({ referencia: refQ, obrigatorio: ['AMANHÃ às 15:00'] }, 'A SUSPENSÃO é possível. AMANHÃ às 15:00, on-line. Posso agendar?').some(e => e.includes('caixa alta')), true)
  eq('redação que só copia a abertura depois do lead falar não passa', validarRedacao({ id: 'nova_oferta', referencia: refQ, obrigatorio: ['AMANHÃ às 15:00'], conversa: lead }, 'Ela pode atender você AMANHÃ às 15:00, on-line. Posso agendar?').some(e => e.includes('abertura')), true)
  eq('a Anna fala no feminino', falaDeMulher('Obrigado pelas informações, obrigado mesmo.'), 'Obrigada pelas informações, obrigada mesmo.')
  const { negritoWhatsApp } = await import('../lib/anna/redator')
  const refNegrito = 'A sua *situação é delicada*, vou encaminhar para a Dra. Carolina.'
  eq('negrito do WhatsApp passa', validarRedacao({ referencia: refNegrito, obrigatorio: [] }, 'Entendo. Como a sua *situação é delicada*, vou encaminhar para a Dra. Carolina.'), [])
  eq('negrito aberto sem fechar não passa', validarRedacao({ referencia: refNegrito, obrigatorio: [] }, 'A sua *situação é delicada, vou encaminhar.').some(e => e.includes('negrito')), true)
  eq('referência com negrito exige negrito', validarRedacao({ referencia: refNegrito, obrigatorio: [] }, 'A sua situação é delicada, vou encaminhar para a Dra. Carolina.').some(e => e.includes('negrito')), true)
  eq('horário em negrito na referência continua em negrito', validarRedacao({ referencia: 'Ela pode atender você *AMANHÃ às 15:00*, ON LINE. Posso agendar?', obrigatorio: ['AMANHÃ às 15:00'] }, 'Consigo amanhã às 15:00, on-line. Posso agendar?').some(e => e.includes('negrito')), true)
  eq('negrito markdown vira WhatsApp', negritoWhatsApp('Reunião **amanhã às 15:00**.'), 'Reunião *amanhã às 15:00*.')
  const { extensaoAudio } = await import('../lib/media')
  eq('formato do áudio: pelo tipo, pelo nome ou ogg', [
    extensaoAudio('https://drive-g.kommo.com/download/abc/123', 'audio/ogg'),
    extensaoAudio('https://drive-g.kommo.com/download/abc/voz.m4a?x=1', ''),
    extensaoAudio('https://drive-g.kommo.com/download/abc/123', 'application/octet-stream'),
    extensaoAudio('https://drive-g.kommo.com/download/abc/arquivo.kommo', ''),
  ], ['ogg', 'm4a', 'ogg', 'ogg'])

  console.log('\n— Roteiro da Anna (intérprete simulado)')
  type Leitura = import('../lib/anna/interprete').Leitura
  const L = (p: Partial<Leitura>): Leitura => ({ intencao: 'responde_etapa', opcao: null, renda_bruta: null, renda_liquida: null, desconto_conta: null, periodo: null, data_preferida: null, hora_preferida: null, resposta: null, resumo: 'teste', ...p })

  function mundo(agora: Date, slotsLivres: string[] = []) {
    const w = {
      state: {} as import('../lib/state').LeadState, enviados: [] as string[], campos: {} as Record<number, string | number>, movido: [] as number[],
      tags: [] as string[], humano: [] as string[], tarefas: [] as string[], notas: [] as string[], reguas: [] as string[], msg5: [] as number[], lembretes: 0, eventos: [] as string[],
      leituras: [] as Leitura[], ocupar: new Set<string>(),
    }
    const deps: import('../lib/anna/fluxo').Deps = {
      async interpretar() { const l = w.leituras.shift(); if (!l) throw new Error('sem leitura simulada'); return l },
      async enviar(t) { w.enviados.push(t) },
      async patch(p) { w.state = { ...w.state, ...p }; return w.state },
      async salvarCampos(v) { Object.assign(w.campos, v) },
      async mover(s) { w.movido.push(s) },
      async addTags(t) { w.tags.push(...t) },
      async nota(t: string) { w.notas.push(t) },
      async passarParaHumano(m) { w.humano.push(m); w.reguas.push('cancelada') },
      async tarefa(t) { w.tarefas.push(t) },
      async agendarMsg5(_tok, quando) { w.msg5.push(quando) },
      novoToken: () => 'tok',
      async iniciarRegua(r) { w.reguas.push(r) },
      async cancelarRegua() { w.reguas.push('cancelada') },
      agenda: {
        disponivel: () => true,
        async buscar(o) { return A.proximoSlot({ agora, ocupados: [], reservados: new Set([...w.ocupar]), ...o, mesmoDia: o.mesmoDia }) },
        async reservar() { /* */ },
        async confirmar(slot) { if (w.ocupar.has(slot.chave)) return null; w.eventos.push(slot.chave); return { eventId: `ev-${slot.chave}`, link: 'https://meet.google.com/abc' } },
      },
      async agendarLembretes() { w.lembretes++ },
      async tarefaReuniao(inicio: Date) { (w as unknown as { reuniaoKommo: string }).reuniaoKommo = inicio.toISOString() },
      async encaminharAcaoSdr(p: string) { const x = w as unknown as { acao?: string[]; naFaixa?: boolean }; if (!x.naFaixa) return false; x.acao = [...(x.acao || []), p]; return true },
      async cancelarReuniao(r) { (w as unknown as { canceladas: string[] }).canceladas = [...((w as unknown as { canceladas?: string[] }).canceladas || []), r.eventId] },
    }
    void slotsLivres
    return { w, deps }
  }
  type LS = import('../lib/state').LeadState
  type Ctx = import('../lib/anna/fluxo').Ctx
  function ctx(w: { state: LS }, agora: Date, texto: string): Ctx {
    return { agora, nomeContato: 'Maria Silva', primeiroNome: 'Maria', state: w.state, textoTurno: texto, conversa: [] }
  }

  {
    const { dataDoTexto } = await import('../lib/anna/interprete')
    const ter = new Date('2026-10-13T13:00:00Z'), sex = new Date('2026-10-16T13:00:00Z')
    eq('"amanhã", "hoje não dá" e "hoje" viram data quando o modelo não preenche', [
      dataDoTexto(L({ intencao: 'escolhe_periodo' }), 'oferta', 'só consigo amanhã de manhã', ter).data_preferida,
      dataDoTexto(L({ intencao: 'escolhe_periodo' }), 'oferta', 'hoje não dá, só de manhã', sex).data_preferida,
      dataDoTexto(L({ intencao: 'escolhe_periodo' }), 'preferencia', 'hoje depois das 16h', ter).data_preferida,
      dataDoTexto(L({ intencao: 'escolhe_periodo', data_preferida: '2026-10-15' }), 'oferta', 'amanhã', ter).data_preferida,
      dataDoTexto(L({ intencao: 'responde_etapa' }), 'q2', 'amanhã te mando', ter).data_preferida,
    ], ['2026-10-14', '2026-10-19', '2026-10-13', '2026-10-15', null])
  }

  {
    const { periodoSoSeDito } = await import('../lib/anna/interprete')
    eq('recusa sem dizer o período: o período deduzido não vale', [
      periodoSoSeDito(L({ intencao: 'recusa_horario', periodo: 'tarde' }), 'oferta', 'nesse horário eu estou trabalhando').periodo,
      periodoSoSeDito(L({ intencao: 'recusa_horario', periodo: 'manha' }), 'oferta', 'hoje não dá, só consigo de manhã').periodo,
      periodoSoSeDito(L({ intencao: 'escolhe_periodo', periodo: 'tarde' }), 'preferencia', 'depois das 16h').periodo,
    ], [null, 'manha', 'tarde'])
  }

  {
    // regra da Dra. (15/10): só acima de R$ 15 mil a Anna oferece reunião
    const corte = async (renda: number) => {
      const { w, deps } = mundo(seg9)
      w.state = { etapa: 'q3', rendaBruta: renda, rendaLiquida: 5000, descontoConta: 1000 }
      w.leituras.push(L({ intencao: 'responde_etapa' }))
      await fluxo.turno(ctx(w, seg9, 'concordo'), deps)
      return [w.state.etapa, w.tags.join(',')]
    }
    eq('R$ 15.000 não recebe oferta; R$ 15.001 recebe', [await corte(15000), await corte(15001), await corte(12000)],
      [['sem_reuniao', 'ANNA renda até 15k'], ['analise', ''], ['sem_reuniao', 'ANNA renda até 15k']])
  }

  {
    // o lead voltou depois do horário oferecido: a Anna não repete a data velha, oferece um horário novo
    const { w, deps } = mundo(seg9)
    const velha = new Date(seg9.getTime() - 2 * 86400_000)
    w.state = { etapa: 'oferta', rendaBruta: 18000, oferta: { chave: 'velha', inicio: velha.toISOString(), fim: new Date(velha.getTime() + 1800_000).toISOString(), em: velha.getTime() - 3600_000 } }
    w.leituras.push(L({ intencao: 'outro' }))
    const r = await fluxo.turno(ctx(w, seg9, 'oi, ainda tenho interesse'), deps)
    eq('oferta vencida: oferece um horário novo', [r.acao.startsWith('ofereceu'), w.state.oferta?.chave !== 'velha'], [true, true])
  }

  {
    // réguas (regra da Dra., 15/10): nenhuma move o card no fim; o 1º lembrete do agendamento é o texto exato da equipe
    const { CONFIG_REGUAS } = await import('../lib/followup')
    const R2 = CONFIG_REGUAS.reguas
    eq('réguas terminam sem mover o card', [R2.qualificacao.ao_terminar, R2.agendamento.ao_terminar], [undefined, undefined])
    eq('1h depois da oferta: o texto da equipe, sem mudar uma palavra', R2.agendamento.etapas[0].texto_livre,
      'Ainda não tive sua confirmação sobre o horário que te enviei. Posso reservar esse horário para a sua reunião com a Dra. Carolina?')
  }

  {
    // a redação recebe o texto da Dra. como referência, com os trechos obrigatórios; confirmação e OAB ficam fixos
    const { w, deps } = mundo(seg9)
    const pedidos: Array<{ id: string; obrigatorio: string[] }> = []
    deps.redigir = async r => { pedidos.push({ id: r.id, obrigatorio: r.obrigatorio }); return `[redigido] ${r.referencia}` }
    w.state = { etapa: 'q3', rendaBruta: 18000, rendaLiquida: 6000, descontoConta: 2000 }
    w.leituras.push(L({ intencao: 'responde_etapa' }))
    const r4 = await fluxo.turno(ctx(w, seg9, 'concordo'), deps)
    eq('redação: a 4ª mensagem sai redigida, com a Dra. obrigatória', [r4.enviado?.startsWith('[redigido]'), pedidos[0]], [true, { id: 'mensagem4', obrigatorio: ['Dra. Carolina'] }])
    w.state = { etapa: 'q2' }
    w.leituras.push(L({ intencao: 'tem_advogado' }))
    const rAdv = await fluxo.turno(ctx(w, seg9, 'já tenho advogado'), deps)
    eq('redação: o texto da OAB sai como a Dra. escreveu', [rAdv.enviado, pedidos.length], [TEXTOS.possuiAdvogado, 1])
  }

  {
    // 16/10: a 1ª e a 2ª pergunta saem como a Dra. escreveu, numeradas, mesmo com a redação ligada
    const { w, deps } = mundo(seg9)
    deps.redigir = async r => `[redigido] ${r.referencia}`
    await fluxo.turno(ctx(w, seg9, 'oi'), deps)
    eq('1ª pergunta: texto da Dra. de 28/10, com saudação pela hora e opções numeradas', w.enviados[0],
      'Maria, bom dia!\n\n*Imagine poder respirar financeiramente, com menos descontos comprometendo sua renda todos os meses.*\n\nQual dessas possibilidades faria mais diferença para você hoje?\n\n' +
      '*1️⃣* Buscar judicialmente a *suspensão dos descontos bancários por até 6 meses*.\n\n*2️⃣* Buscar a *reestruturação das dívidas*, com revisão dos juros e condições de pagamento mais favoráveis.\n\n' +
      '*3️⃣ AS DUAS OPÇÕES*, para buscar um alívio financeiro e reorganizar suas dívidas.\n\n*Me responda apenas 1, 2 ou 3*, para verificarmos o que pode ser feito no seu caso.')
    const { saudacao } = await import('../lib/anna/textos')
    eq('saudação pela hora de Brasília', [saudacao('Maria', new Date('2026-10-28T12:00:00Z')), saudacao('Maria', new Date('2026-10-28T18:00:00Z')), saudacao('', new Date('2026-10-28T23:30:00Z'))], ['Maria, bom dia!', 'Maria, boa tarde!', 'Boa noite!'])
    w.leituras.push(L({ intencao: 'responde_etapa' }))
    await fluxo.turno(ctx(w, seg9, 'não sei'), deps)
    eq('resposta sem opção: pede o número', w.enviados[1], 'Pode me responder com o número da opção: 1, 2 ou 3?')
    w.leituras.push(L({ opcao: 1 }))
    await fluxo.turno(ctx(w, seg9, '1'), deps)
    eq('2ª pergunta: numerada, como a Dra. escreveu', [w.enviados[2], w.enviados[2].includes('*1️⃣ RENDA BRUTA:*')], [TEXTOS.pergunta2, true])
  }

  {
    const agora = seg9
    const { w, deps } = mundo(agora)
    await fluxo.turno(ctx(w, agora, 'oi'), deps)
    eq('lead escreveu primeiro → pergunta 1 com o nome', w.enviados[0].startsWith('Maria, bom dia!'), true)
    w.leituras.push(L({ opcao: 3 }))
    await fluxo.turno(ctx(w, agora, 'as duas'), deps)
    eq('opção 3 → pergunta 2 (texto da Dra.)', w.enviados[1], TEXTOS.pergunta2)
    w.leituras.push(L({ renda_bruta: 16000 }))
    await fluxo.turno(ctx(w, agora, 'ganho 16 mil bruto'), deps)
    eq('renda bruta → coluna ACIMA DE 15 MIL', w.movido, [STATUS.acima15])
    eq('pede só o que falta', w.enviados[2], 'Obrigada. Falta só quanto você recebe líquido e quanto o banco desconta da sua conta corrente por mês. Pode me informar?')
    w.leituras.push(L({ renda_liquida: 4000, desconto_conta: 3500 }))
    await fluxo.turno(ctx(w, agora, 'líquido 4 mil e o banco tira 3.500 da conta'), deps)
    eq('3ª mensagem: cheque especial e cartão (Dra., 27/10)', [w.enviados[3], w.state.etapa], [TEXTOS.perguntaLimite, 'limite'])
    eq('campos gravados no card', [w.campos[CRM_MAP.campos.rendaBruta], w.campos[CRM_MAP.campos.rendaLiquida], w.campos[CRM_MAP.campos.descontoConta]], [16000, 4000, 3500])
    w.leituras.push(L({}))
    await fluxo.turno(ctx(w, agora, 'uso o cheque especial sim, e tenho cartão com limite'), deps)
    eq('4ª mensagem (alívio) com o desconto, sem citar o valor (Dra., 28/10)', [w.enviados[4], w.state.limite], [TEXTOS.mensagem3(3500), 'uso o cheque especial sim, e tenho cartão com limite'])
    w.leituras.push(L({}))
    await fluxo.turno(ctx(w, agora, 'concordo'), deps)
    eq('5ª mensagem (texto da Dra.)', w.enviados[5], TEXTOS.mensagem4)
    eq('pausa de 15 min agendada (Dra., 05/11)', w.msg5, [agora.getTime() + 15 * 60_000])
    const r5 = await fluxo.quintaMensagem(ctx(w, new Date(agora.getTime() + 15 * 60_000), ''), deps, 'tok')
    eq('oferta no mesmo dia, 11:00 (texto da Dra. de 03/11, regra de 05/11)', [w.enviados[6].includes('*HOJE às 11:00, ON LINE, para o primeiro atendimento*'), w.enviados[6].includes('*único horário que consegui para hoje*'), w.enviados[6].endsWith('*Posso confirmar para você?*')], [true, true, true])
    eq('dia da oferta: hoje, amanhã e dia da semana', ['HOJE às 15:00', 'AMANHÃ às 11:00', 'na quinta-feira (06/11) às 10:00', 'no sábado (08/11) às 09:00'].map(diaDaOferta), ['para hoje', 'para amanhã', 'para quinta-feira (06/11)', 'para sábado (08/11)'])
    eq('régua de agendamento começa na oferta', w.reguas[w.reguas.length - 1], 'agendamento')
    void r5
    w.leituras.push(L({ intencao: 'aceita_horario' }))
    await fluxo.turno(ctx(w, new Date(agora.getTime() + 40 * 60_000), 'pode sim'), deps)
    eq('evento criado no horário oferecido', w.eventos, ['2026-10-12T11:00'])
    eq('reunião também na agenda do Kommo, no mesmo horário (Dra., 05/11)', (w as unknown as { reuniaoKommo: string }).reuniaoKommo, A.deBrt(2026, 9, 12, 11, 0).toISOString())
    eq('lead vai para Closer › Reunião agendada', w.movido[w.movido.length - 1], STATUS.reuniaoAgendada)
    eq('campos Reunião e Agendamento iguais (lembretes e Cliente decisão do escritório)', [w.campos[CRM_MAP.campos.reuniao], w.campos[CRM_MAP.campos.agendamento]], [Date.UTC(2026, 9, 12, 14) / 1000, Date.UTC(2026, 9, 12, 14) / 1000])
    eq('confirmação com link do Meet', w.enviados[7].includes('https://meet.google.com/abc') && w.enviados[7].startsWith('*Agendado!* *Segunda-feira, 12/10, às 11:00*'), true)
    eq('lembretes agendados', w.lembretes, 1)
    eq('etapa agendado', w.state.etapa, 'agendado')
  }

  {
    const { w, deps } = mundo(seg9)
    w.state = { etapa: 'q2', objetivo: 1 }
    w.leituras.push(L({ renda_bruta: 8000, renda_liquida: 2500, desconto_conta: 0 }))
    await fluxo.turno(ctx(w, seg9, '8 mil, líquido 2500, não desconta da conta'), deps)
    eq('valores completos → pergunta do cheque especial e do cartão', w.enviados[0], TEXTOS.perguntaLimite)
    w.leituras.push(L({}))
    await fluxo.turno(ctx(w, seg9, 'não uso cheque especial, cartão tenho'), deps)
    eq('sem desconto em conta → variante da mensagem do alívio', w.enviados[1], TEXTOS.mensagem3(0))
    w.leituras.push(L({}))
    await fluxo.turno(ctx(w, seg9, 'sim'), deps)
    eq('renda abaixo de 10 mil → sem reunião, só a tag, sem tarefa', [w.state.etapa, w.enviados[2] === TEXTOS.semReuniao, w.tags.includes(CRM_MAP.tags.semReuniao), w.tarefas.length, w.msg5.length], ['sem_reuniao', true, true, 0, 0])
  }

  {
    // Dra., 06/11 (caso Sirlei): o 1º pedido de presencial é respondido; a insistência vai para a equipe
    const { w, deps } = mundo(seg9)
    w.state = { etapa: 'q2', objetivo: 3 }
    w.leituras.push(L({ intencao: 'pede_humano' }))
    await fluxo.turno(ctx(w, seg9, 'Gostaria de agendar pessoalmente, é possível?'), deps)
    eq('1º pedido de presencial → texto da Dra. sobre como funciona, sem valor e sem passar para a equipe', [w.state.etapa, w.humano.length, w.enviados[0] === TEXTOS.comoFunciona, /R\$/.test(w.enviados[0])], ['q2', 0, true, false])
    w.leituras.push(L({ intencao: 'pede_humano' }))
    await fluxo.turno({ ...ctx(w, seg9, 'Não, só aceito presencial'), conversa: [{ dir: 'out', text: TEXTOS.comoFunciona, ts: 0, id: 'x' }] as never }, deps)
    eq('insiste no presencial depois da explicação → equipe', w.humano.length, 1)
  }

  {
    // Dra., 09/11 (caso Nayara): cancelamento, desistência e remarcação de reunião marcada pela Anna
    const reuniao = { eventId: 'ev1', inicio: A.deBrt(2026, 9, 12, 15, 0).toISOString(), link: 'https://meet.google.com/x', criadaEm: '' }
    const marcado = (): LS => ({ etapa: 'agendado', objetivo: 3, rendaBruta: 20000, reuniao })
    type W = { canceladas?: string[] }
    // TESTE A: imprevisto e aceita remarcar
    {
      const { w, deps } = mundo(seg9)
      w.state = marcado()
      w.leituras.push(L({ intencao: 'cancela_reuniao' }))
      await fluxo.turno(ctx(w, seg9, 'Não vou conseguir participar hoje. Tive um imprevisto.'), deps)
      eq('A1 imprevisto: reunião cancelada, card sai de Reunião agendada para AGENDAR (caso Zizi) e oferta de remarcar', [(w as W).canceladas, w.enviados[0].startsWith('Sem problemas, Maria! Imprevistos acontecem'), w.state.etapa, w.movido, w.state.reuniao], [['ev1'], true, 'remarcar_pergunta', [STATUS.agendarReuniao], undefined])
      w.leituras.push(L({ intencao: 'remarcar' }))
      await fluxo.turno(ctx(w, seg9, 'Sim, quero remarcar.'), deps)
      eq('A2 aceitou remarcar → continua em AGENDAR REUNIÃO e pergunta o período', [w.movido[w.movido.length - 1], w.enviados[1], w.state.etapa, w.state.remarcacao], [STATUS.agendarReuniao, TEXTOS.manhaOuTarde, 'preferencia', true])
      w.leituras.push(L({ intencao: 'escolhe_periodo', periodo: 'tarde' }))
      await fluxo.turno(ctx(w, seg9, 'à tarde'), deps)
      eq('A3 período → um horário do próximo dia útil à tarde', w.enviados[2], TEXTOS.novaOferta('AMANHÃ às 15:00'))
      w.leituras.push(L({ intencao: 'aceita_horario' }))
      await fluxo.turno(ctx(w, seg9, 'pode ser'), deps)
      eq('A4 confirmou → nova reunião e Reunião agendada', [w.eventos, w.movido[w.movido.length - 1], w.state.etapa, w.state.remarcacao], [['2026-10-13T15:00'], STATUS.reuniaoAgendada, 'agendado', undefined])
    }
    // TESTE B: quer remarcar, horário depois
    {
      const { w, deps } = mundo(seg9)
      w.state = marcado()
      w.leituras.push(L({ intencao: 'remarcar' }))
      await fluxo.turno(ctx(w, seg9, 'Quero remarcar, depois vejo o horário.'), deps)
      eq('B quer remarcar sem horário → cancela, AGENDAR REUNIÃO, nenhuma reunião nova', [(w as W).canceladas, w.movido, w.eventos, w.enviados[0].startsWith('Combinado, Maria! Quando puder')], [['ev1'], [STATUS.agendarReuniao], [], true])
    }
    // TESTE C: não quer continuar
    {
      const { w, deps } = mundo(seg9)
      w.state = marcado()
      w.leituras.push(L({ intencao: 'desiste' }))
      await fluxo.turno(ctx(w, seg9, 'Pode cancelar. Não quero continuar.'), deps)
      eq('C1 desiste → cancela, card na coluna da renda (não AGENDAR) e uma única tentativa (texto da Dra.)', [(w as W).canceladas, w.enviados[0].startsWith('Entendo, Maria, e respeito sua decisão.'), w.state.etapa, w.movido], [['ev1'], true, 'desistencia_pergunta', [STATUS.acima15]])
      w.leituras.push(L({ intencao: 'desiste' }))
      await fluxo.turno(ctx(w, seg9, 'Não, prefiro não continuar mesmo'), deps)
      eq('C2 mantém → respeita, Não quer continuar, sem AGENDAR e sem nova oferta', [w.enviados[1], w.movido, w.state.etapa, w.eventos], [TEXTOS.desistiu, [STATUS.acima15, STATUS.naoQuerContinuar], 'humano', []])
    }
    // TESTE D: depois entra em contato
    {
      const { w, deps } = mundo(seg9)
      w.state = marcado()
      w.leituras.push(L({ intencao: 'cancela_reuniao' }))
      await fluxo.turno(ctx(w, seg9, 'Pode cancelar. Depois eu procuro vocês.'), deps)
      eq('D depois → cancela, uma mensagem de encerramento, card na coluna da renda, sem AGENDAR', [(w as W).canceladas, w.enviados.length, w.enviados[0].startsWith('Combinado, Maria! Vou deixar seu atendimento disponível'), w.movido, w.state.etapa], [['ev1'], 1, true, [STATUS.acima15], 'humano'])
    }
    // TESTE E: dia e período
    {
      const { w, deps } = mundo(seg9)
      w.state = marcado()
      w.leituras.push(L({ intencao: 'remarcar', periodo: 'tarde', data_preferida: '2026-10-13' }))
      await fluxo.turno(ctx(w, seg9, 'Não posso hoje. Amanhã à tarde consigo.'), deps)
      eq('E dia e período → cancela, AGENDAR e oferece amanhã à tarde', [(w as W).canceladas, w.movido, w.enviados[0], w.state.etapa], [['ev1'], [STATUS.agendarReuniao], TEXTOS.novaOferta('AMANHÃ às 15:00'), 'oferta'])
      w.leituras.push(L({ intencao: 'aceita_horario' }))
      await fluxo.turno(ctx(w, seg9, 'pode'), deps)
      eq('E confirmou → Reunião agendada', [w.eventos, w.movido[w.movido.length - 1]], [['2026-10-13T15:00'], STATUS.reuniaoAgendada])
    }
    // sem motivo → pergunta o motivo; motivo → oferece remarcar
    {
      const { w, deps } = mundo(seg9)
      w.state = marcado()
      w.leituras.push(L({ intencao: 'cancela_reuniao' }))
      await fluxo.turno(ctx(w, seg9, 'Não vou poder participar.'), deps)
      eq('sem motivo → pergunta o motivo (texto da Dra.)', [w.enviados[0].startsWith('Entendo, Maria! Sem problemas.'), w.state.etapa], [true, 'cancelou_motivo'])
      w.leituras.push(L({ intencao: 'outro' }))
      await fluxo.turno(ctx(w, seg9, 'Surgiu uma reunião no trabalho'), deps)
      eq('respondeu o motivo → oferece remarcar', [w.enviados[1].startsWith('Sem problemas, Maria!'), w.state.etapa], [true, 'remarcar_pergunta'])
    }
    // revisão de 09/11: confirmação com o mesmo horário não cancela; "Não, tive um compromisso" é motivo; sem renda → ACIMA DE 15 MIL
    {
      const { w, deps } = mundo(seg9)
      w.state = marcado()
      w.leituras.push(L({ intencao: 'escolhe_periodo', periodo: 'tarde', data_preferida: '2026-10-12', hora_preferida: '15:00' }))
      await fluxo.turno(ctx(w, seg9, 'Confirmado, hoje às 15h estarei lá'), deps)
      eq('confirmação com o mesmo dia e hora da reunião → não cancela nada', [(w as W).canceladas, w.movido, w.enviados.length, w.state.etapa], [undefined, [], 0, 'agendado'])
      const m2 = mundo(seg9)
      m2.w.state = { ...marcado(), etapa: 'cancelou_motivo', reuniao: undefined, remarcacao: true }
      m2.w.leituras.push(L({ intencao: 'outro' }))
      await fluxo.turno(ctx(m2.w, seg9, 'Não, tive um compromisso no trabalho'), m2.deps)
      eq('"Não, tive um compromisso" ao perguntar o motivo → oferece remarcar (não é desistência)', [m2.w.enviados[0].startsWith('Sem problemas, Maria!'), m2.w.state.etapa], [true, 'remarcar_pergunta'])
      const m3 = mundo(seg9)
      m3.w.state = { ...marcado(), rendaBruta: undefined }
      m3.w.leituras.push(L({ intencao: 'desiste' }))
      await fluxo.turno(ctx(m3.w, seg9, 'Pode cancelar, não quero mais'), m3.deps)
      eq('desistência sem renda registrada → card sai de Reunião agendada para ACIMA DE 15 MIL', m3.w.movido, [STATUS.acima15])
    }
    // Dra., 09/11: AÇÃO SDR
    {
      type WA = { acao?: string[]; naFaixa?: boolean }
      eq('passagens que pedem providência → AÇÃO SDR; as definitivas não', ['pediu atendimento humano', 'perguntou se é robô', 'sem horário livre nos próximos dias', 'recusou 2 horários oferecidos', 'já tem advogado no caso', 'assunto de outra área', 'já é cliente'].map(m => !!fluxo.providenciaDaPassagem(m)), [true, true, true, true, false, false, false])
      const { w, deps } = mundo(seg9); (w as WA).naFaixa = true
      w.state = { etapa: 'q2', objetivo: 3 }
      w.leituras.push(L({ intencao: 'pede_humano' }))
      await fluxo.turno(ctx(w, seg9, 'quero falar com uma pessoa'), deps)
      eq('pediu pessoa (faixa de 10 mil ou mais) → AÇÃO SDR, sem a passagem comum', [(w as WA).acao?.length, w.humano.length, w.state.etapa, w.state.etapaAntes], [1, 0, 'humano', 'q2'])
      const m2 = mundo(seg9)
      m2.w.state = { etapa: 'q2', objetivo: 3 }
      m2.w.leituras.push(L({ intencao: 'pede_humano' }))
      await fluxo.turno(ctx(m2.w, seg9, 'quero falar com uma pessoa'), m2.deps)
      eq('mesmo pedido, lead abaixo de 10 mil → passagem comum', [(m2.w as WA).acao, m2.w.humano.length], [undefined, 1])
      // documento lido com segurança: confirma a renda antes de classificar; desconto do contracheque não vira desconto em conta
      const m3 = mundo(seg9); (m3.w as WA).naFaixa = true
      m3.w.state = { etapa: 'q2', objetivo: 3 }
      m3.w.leituras.push(L({ intencao: 'responde_etapa', renda_bruta: 18000, renda_liquida: 9000, desconto_conta: 4500 }))
      await fluxo.turno(ctx(m3.w, seg9, '[imagem do lead]: Contracheque do GDF. Salário bruto R$ 18.000,00, líquido R$ 9.000,00, descontos consignados R$ 4.500,00.'), m3.deps)
      eq('documento lido → pede confirmação da renda, sem mover o card nem gravar desconto em conta', [m3.w.enviados[0], m3.w.movido, m3.w.state.docPendente, m3.w.campos[CRM_MAP.campos.descontoConta]], [TEXTOS.docConfirma('R$ 18.000 e o líquido de R$ 9.000'), [], { rendaBruta: 18000, rendaLiquida: 9000 }, undefined])
      m3.w.leituras.push(L({ intencao: 'responde_etapa' }))
      await fluxo.turno(ctx(m3.w, seg9, 'sim, confere'), m3.deps)
      eq('confirmou → grava bruto e líquido, coluna ACIMA DE 15 MIL e pergunta o desconto em conta à parte', [m3.w.campos[CRM_MAP.campos.rendaBruta], m3.w.campos[CRM_MAP.campos.rendaLiquida], m3.w.movido, m3.w.enviados[1].includes('conta corrente')], [18000, 9000, [STATUS.acima15], true])
      // não confirmou o documento (a IA ainda relê os valores do histórico) → pede por escrito, sem usar os do documento
      const m6 = mundo(seg9); (m6.w as WA).naFaixa = true
      m6.w.state = { etapa: 'q2', objetivo: 3, docPendente: { rendaBruta: 18000, rendaLiquida: 9000 } }
      m6.w.leituras.push(L({ intencao: 'responde_etapa', renda_bruta: 18000, renda_liquida: 9000 }))
      await fluxo.turno(ctx(m6.w, seg9, 'não, está errado'), m6.deps)
      eq('"não, está errado" → não grava os valores do documento e pede por escrito', [m6.w.campos[CRM_MAP.campos.rendaBruta], m6.w.movido, m6.w.enviados[0].startsWith('Sem problemas.')], [undefined, [], true])
      const m7 = mundo(seg9); (m7.w as WA).naFaixa = true
      m7.w.state = { etapa: 'q2', objetivo: 3 }
      m7.w.leituras.push(L({ intencao: 'responde_etapa' }))
      await fluxo.turno(ctx(m7.w, seg9, '[imagem do lead]: Foto de um contracheque desfocada; valores ilegíveis.'), m7.deps)
      eq('"valores ilegíveis" (plural) → AÇÃO SDR', [(m7.w as WA).acao?.length, m7.w.enviados[0]], [1, TEXTOS.docEquipe])
      // documento ilegível → AÇÃO SDR
      const m4 = mundo(seg9); (m4.w as WA).naFaixa = true
      m4.w.state = { etapa: 'q2', objetivo: 3 }
      m4.w.leituras.push(L({ intencao: 'responde_etapa' }))
      await fluxo.turno(ctx(m4.w, seg9, '[imagem recebido, mas não consegui abrir]'), m4.deps)
      eq('documento que não abriu → AÇÃO SDR com aviso ao lead', [(m4.w as WA).acao?.[0]?.startsWith('o lead enviou um documento'), m4.w.enviados[0], m4.w.state.etapa], [true, TEXTOS.docEquipe, 'humano'])
      // valores contraditórios digitados → AÇÃO SDR
      const m5 = mundo(seg9); (m5.w as WA).naFaixa = true
      m5.w.state = { etapa: 'q2', objetivo: 3 }
      m5.w.leituras.push(L({ intencao: 'responde_etapa', renda_bruta: 9000, renda_liquida: 12000 }))
      await fluxo.turno(ctx(m5.w, seg9, 'bruto 9 mil e líquido 12 mil'), m5.deps)
      eq('líquido maior que o bruto → AÇÃO SDR, sem gravar os valores', [(m5.w as WA).acao?.[0]?.startsWith('valores contraditórios'), m5.w.enviados[0], m5.w.campos[CRM_MAP.campos.rendaBruta]], [true, TEXTOS.valoresEquipe, undefined])
    }
    // Dra., 09/11: honorários e faixa do formulário no 1º follow-up
    eq('pergunta de honorários é reconhecida; outras não', ['Quanto vocês cobram?', 'qual o valor dos honorários?', 'quanto custa o processo?', 'Quanto vou pagar pela ação?', 'O primeiro atendimento é sempre pago?', 'Qual o valor do desconto que vocês conseguem tirar?', 'ganho 20 mil'].map(t => fluxo.RX_HONORARIOS.test(t)), [true, true, true, true, false, false, false])
    {
      const { w, deps } = mundo(seg9)
      w.state = { etapa: 'q2', objetivo: 3 }
      w.leituras.push(L({ intencao: 'pergunta', resposta: 'Os honorários são tratados na reunião.' }))
      await fluxo.turno(ctx(w, seg9, 'Antes de passar os valores, quanto vocês cobram?'), deps)
      eq('honorários na qualificação → texto da Dra., sem valor', [w.enviados[0] === TEXTOS.honorarios, w.enviados[0].startsWith('Compreendemos sua preocupação com os honorários!'), /R\$/.test(w.enviados[0]), w.state.etapa], [true, true, false, 'q2'])
    }
    eq('faixa do formulário no 1º follow-up: 10 a 15 e acima de 15 vão para a coluna; o resto, AGUARDANDO', ['de_10_a_15_mil', 'acima_de_15_mil', 'Superior a 15 mil', 'de_5_a_10_mil', 'até_5_mil', 'De 7 a 15 mil', ''].map(CRM.colunaDoPrimeiroFollow),
      [STATUS.de10a15, STATUS.acima15, STATUS.acima15, STATUS.aguardandoQualificacao, STATUS.aguardandoQualificacao, STATUS.aguardandoQualificacao, STATUS.aguardandoQualificacao])
    // mensagem que não é sobre a reunião: a Anna não responde (Closer é da equipe)
    {
      const { w, deps } = mundo(seg9)
      w.state = marcado()
      w.leituras.push(L({ intencao: 'outro', resposta: 'Por nada!' }))
      await fluxo.turno(ctx(w, seg9, 'obrigada!'), deps)
      eq('reunião marcada + "obrigada" → nada muda, nada é enviado', [w.enviados.length, (w as W).canceladas, w.state.etapa], [0, undefined, 'agendado'])
    }
    // pausa e retomada (caso Adriana)
    const P = await import('../lib/pausa')
    eq('retomada volta para a etapa de antes da passagem', [P.etapaDeVolta({ etapa: 'q2' }), P.etapaDeVolta({ etapa: 'humano', etapaAntes: 'q2' }), P.etapaDeVolta({ etapa: 'humano' }), P.etapaDeVolta({})], ['q2', 'q2', undefined, undefined])
  }

  {
    // Dra., 06/11 (caso Eva Lima): lead recorrente
    const PENDENTE_Q2 = (await import('../lib/anna/interprete')).PENDENTE.q2({})
    const M = await import('../lib/memoria')
    const agoraMs = new Date('2026-11-06T15:00:00-03:00').getTime()
    const card = (diasAtras: number) => ({ id: 1, criado: Math.floor((agoraMs - diasAtras * 86400_000) / 1000), situacao: 'atendimento sem reunião' })
    eq('recorrente: card anterior de outro dia, sem reunião', [
      M.ehRecorrente({ cards: [card(10)], valores: null, bloqueio: null }, agoraMs),
      M.ehRecorrente({ cards: [card(0.1)], valores: null, bloqueio: null }, agoraMs),
      M.ehRecorrente({ cards: [card(10)], valores: null, bloqueio: 'já fez reunião com a Dra. (card 1, outubro)' }, agoraMs),
      M.ehRecorrente({ cards: [], valores: null, bloqueio: null }, agoraMs),
    ], [true, false, false, false])
    eq('mensagem do recorrente: texto da Dra., sem valores antigos', [TEXTOS.recorrente('Eva').startsWith('Olá, Eva! Tudo bem?'), TEXTOS.recorrente().startsWith('Olá! Tudo bem?'), /R\$/.test(TEXTOS.recorrente('Eva')), TEXTOS.recorrente('Eva').includes('*De lá para cá, sua situação financeira melhorou, piorou ou continua igual?*')], [true, true, false, true])
    const { w, deps } = mundo(seg9)
    w.state = { etapa: 'q2', objetivo: 3, recorrenteEnviado: true, recorrentePendente: true }
    w.leituras.push(L({ intencao: 'responde_etapa' }))
    await fluxo.turno({ ...ctx(w, seg9, 'piorou bastante'), primeiroNome: 'Eva' }, deps)
    eq('recorrente responde "piorou" → retoma e pede os valores que faltam', [w.enviados[0].startsWith('Entendi, Eva. Então é importante avaliarmos sua situação atual'), w.enviados[0].endsWith(PENDENTE_Q2), w.state.recorrentePendente], [true, true, false])
    const m2 = mundo(seg9)
    m2.w.state = { etapa: 'q2', objetivo: 3, recorrenteEnviado: true, recorrentePendente: true }
    m2.w.leituras.push(L({ renda_bruta: 18000, renda_liquida: 6000, desconto_conta: 3000 }))
    await fluxo.turno(ctx(m2.w, seg9, 'piorou: bruto 18 mil, líquido 6 mil e o banco tira 3 mil'), m2.deps)
    eq('recorrente já manda os valores → segue o roteiro (pergunta do cheque especial)', m2.w.enviados[0], TEXTOS.perguntaLimite)
  }

  {
    // Dra., 06/11 (caso Tathiana): renda de 10 a 15 mil não é desqualificado; encerramento provisório + tarefa
    const { w, deps } = mundo(seg9)
    w.state = { etapa: 'q3', objetivo: 3, rendaBruta: 12000, rendaLiquida: 5000, descontoConta: 1500 }
    w.leituras.push(L({ intencao: 'responde_etapa' }))
    await fluxo.turno({ ...ctx(w, seg9, 'sim'), primeiroNome: 'Tathiana' }, deps)
    eq('10 a 15 mil → mensagem de encaminhamento da Dra., com o nome', w.enviados[0].startsWith('Entendi, Tathiana. Obrigada pelas informações!\n\nVou encaminhar sua situação para a nossa equipe responsável.'), true)
    eq('10 a 15 mil → tarefa para a equipe avaliar, sem oferta, aguardando avaliação', [w.tarefas.length, w.msg5.length, w.state.etapa, w.state.aguardaAvaliacao], [1, 0, 'sem_reuniao', true])
    eq('sem nome → "Entendi. Obrigada pelas informações!"', TEXTOS.encaminha1015().startsWith('Entendi. Obrigada pelas informações!'), true)
    w.leituras.push(L({ intencao: 'pergunta', resposta: 'Sua situação já foi encaminhada para a avaliação da equipe, e retornaremos por aqui assim que tivermos uma posição.' }))
    await fluxo.turno(ctx(w, seg9, 'Vocês vão conseguir assumir meu caso? O banco está descontando tudo'), deps)
    eq('lead pergunta se vão assumir → responde sem prometer e anota no card', [w.enviados[1].includes('encaminhada para a avaliação'), w.notas.some(n => n.includes('aguarda a avaliação'))], [true, true])
  }

  {
    const { w, deps } = mundo(seg9)
    w.state = { etapa: 'q2' }
    await fluxo.turno(ctx(w, seg9, 'você é robô?'), deps)
    eq('"é robô?" → passa para humano sem negar', [w.enviados[0], w.humano[0], w.state.etapa], [TEXTOS.passaHumano, 'perguntou se é robô', 'humano'])
  }

  {
    // Dra., 05/11: recusas, preferência do lead e a diferença entre oferta (1 h) e confirmação (30 min)
    const of = (h: number, m: number, dia = 12) => ({ chave: `2026-10-${dia}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, inicio: A.deBrt(2026, 9, dia, h, m).toISOString(), fim: A.deBrt(2026, 9, dia, h, m + 30).toISOString(), em: seg9.getTime() })
    {
      const { w, deps } = mundo(seg9)
      w.state = { etapa: 'oferta', rendaBruta: 20000, oferta: of(11, 0) }
      w.leituras.push(L({ intencao: 'recusa_horario' }))
      await fluxo.turno(ctx(w, seg9, 'nesse horário não consigo'), deps)
      eq('1ª recusa das 11:00 → uma alternativa no outro período do mesmo dia (15:00)', w.enviados[0], TEXTOS.novaOferta('HOJE às 15:00'))
      w.leituras.push(L({ intencao: 'recusa_horario' }))
      await fluxo.turno(ctx(w, seg9, 'também não dá'), deps)
      eq('2ª recusa → pergunta o período, com o texto da Dra.', [w.enviados[1], w.state.etapa], ['Para facilitar seu agendamento, qual período costuma ser melhor para você: manhã ou tarde?', 'preferencia'])
      w.leituras.push(L({ intencao: 'escolhe_periodo', periodo: 'manha' }))
      await fluxo.turno(ctx(w, seg9, 'de manhã'), deps)
      eq('manhã → próximo horário da manhã, sem repetir o recusado (10:30)', w.enviados[2], TEXTOS.novaOferta('HOJE às 10:30'))
      w.leituras.push(L({ intencao: 'recusa_horario' }))
      await fluxo.turno(ctx(w, seg9, 'não posso'), deps)
      eq('recusou de novo → não insiste: a equipe assume', [w.state.etapa, w.humano.length > 0], ['humano', true])
    }
    {
      const { w, deps } = mundo(seg9)
      w.state = { etapa: 'oferta', rendaBruta: 20000, oferta: of(11, 0) }
      w.leituras.push(L({ intencao: 'escolhe_periodo', periodo: 'manha', data_preferida: '2026-10-13' }))
      await fluxo.turno(ctx(w, seg9, 'só consigo amanhã de manhã'), deps)
      eq('"só consigo amanhã de manhã" → manhã de amanhã, sem insistir na tarde de hoje', w.enviados[0], TEXTOS.novaOferta('AMANHÃ às 11:00'))
    }
    {
      const { w, deps } = mundo(seg9)
      w.state = { etapa: 'oferta', rendaBruta: 20000, oferta: of(11, 0) }
      w.leituras.push(L({ intencao: 'escolhe_periodo', periodo: 'tarde', data_preferida: '2026-10-15', hora_preferida: '16:00' }))
      await fluxo.turno(ctx(w, seg9, 'quinta-feira às 16h seria melhor'), deps)
      eq('"quinta às 16h" → exatamente quinta às 16:00', w.enviados[0], TEXTOS.novaOferta('na quinta-feira (15/10) às 16:00'))
    }
    {
      const { w, deps } = mundo(seg9)
      w.state = { etapa: 'oferta', rendaBruta: 20000, oferta: of(11, 0) }
      w.leituras.push(L({ intencao: 'escolhe_periodo', periodo: 'tarde', data_preferida: '2026-10-12', hora_preferida: '16:00' }))
      await fluxo.turno(ctx(w, seg9, 'hoje só consigo depois das 16h'), deps)
      eq('"hoje só depois das 16h" → hoje às 16:00', w.enviados[0], TEXTOS.novaOferta('HOJE às 16:00'))
    }
    {
      const as = (h: number, m: number) => A.deBrt(2026, 9, 12, h, m)
      const { w, deps } = mundo(as(14, 10))
      w.state = { etapa: 'oferta', rendaBruta: 20000, oferta: of(15, 0) }
      w.leituras.push(L({ intencao: 'aceita_horario' }))
      await fluxo.turno(ctx(w, as(14, 10), 'pode sim'), deps)
      eq('oferta das 15:00 aceita às 14:10 (faltam 50 min) → confirma', [w.eventos, w.state.etapa], [['2026-10-12T15:00'], 'agendado'])
      const m2 = mundo(as(14, 45))
      m2.w.state = { etapa: 'oferta', rendaBruta: 20000, oferta: of(15, 0) }
      m2.w.leituras.push(L({ intencao: 'aceita_horario' }))
      await fluxo.turno(ctx(m2.w, as(14, 45), 'pode sim'), m2.deps)
      eq('aceita às 14:45 (faltam 15 min) → não confirma, oferece outro com 1 h (16:00)', [m2.w.eventos.length, m2.w.enviados[0]], [0, TEXTOS.novaOferta('HOJE às 16:00')])
    }
    {
      const { w, deps } = mundo(seg9)
      w.state = { etapa: 'oferta', rendaBruta: 20000, oferta: of(11, 0) }
      w.ocupar.add('2026-10-12T11:00')
      w.leituras.push(L({ intencao: 'aceita_horario' }))
      await fluxo.turno(ctx(w, seg9, 'ok'), deps)
      eq('horário ocupado na hora do sim → oferece o próximo', w.enviados[0], TEXTOS.horarioOcupado('HOJE às 10:30'))
    }
    {
      // Sirlei, 05/11: oferta das 11h, "tenho consulta às 10:30" → ofereceu 10:30; "deixa 11 mesmo, pode agendar às 11"
      const { w, deps } = mundo(seg9)
      w.state = { etapa: 'oferta', rendaBruta: 20000, oferta: of(10, 30), recusados: ['2026-10-12T11:00'] }
      w.leituras.push(L({ intencao: 'aceita_horario', hora_preferida: '11:00' }))
      await fluxo.turno(ctx(w, seg9, 'Deixa 11 mesmo. Pode agendar às 11 horas'), deps)
      eq('aceitou com outra hora → marca a hora que o lead disse (11:00), não a oferecida', [w.eventos, w.state.etapa], [['2026-10-12T11:00'], 'agendado'])
      const m2 = mundo(seg9)
      m2.w.state = { etapa: 'oferta', rendaBruta: 20000, oferta: of(10, 30) }
      m2.w.ocupar.add('2026-10-12T11:00')
      m2.w.leituras.push(L({ intencao: 'aceita_horario', hora_preferida: '11:00' }))
      await fluxo.turno(ctx(m2.w, seg9, 'pode ser às 11?'), m2.deps)
      eq('hora pedida ocupada → não marca, oferece a mais próxima depois dela', [m2.w.eventos.length, m2.w.enviados[0]], [0, TEXTOS.novaOferta('HOJE às 15:00')])
      const m3 = mundo(seg9)
      m3.w.state = { etapa: 'oferta', rendaBruta: 20000, oferta: of(10, 30) }
      m3.w.leituras.push(L({ intencao: 'aceita_horario', hora_preferida: '10:30' }))
      await fluxo.turno(ctx(m3.w, seg9, 'pode ser às 10:30'), m3.deps)
      eq('aceita repetindo a mesma hora → marca a oferecida', m3.w.eventos, ['2026-10-12T10:30'])
    }
  }

  {
    const { w, deps } = mundo(seg9)
    w.state = { etapa: 'q1' }
    w.leituras.push(L({ intencao: 'pergunta', resposta: 'A primeira reunião é on-line e dura 30 minutos. Qual das opções você quer saber: 1, 2 ou 3?' }))
    await fluxo.turno(ctx(w, seg9, 'como é a reunião?'), deps)
    eq('pergunta fora do roteiro → resposta livre e régua recomeça', [w.enviados[0].startsWith('A primeira reunião'), w.reguas[0], w.state.etapa], [true, 'qualificacao', 'q1'])
    w.leituras.push(L({ intencao: 'tem_advogado' }))
    await fluxo.turno(ctx(w, seg9, 'já tenho advogado no processo'), deps)
    eq('tem advogado → texto da Dra. e passa para humano', [w.enviados[1], w.humano[0]], [TEXTOS.possuiAdvogado, 'já tem advogado no caso'])
  }

  {
    const { w, deps } = mundo(seg9)
    w.state = { etapa: 'q1' }
    w.leituras.push(L({ intencao: 'desiste' }))
    await fluxo.turno(ctx(w, seg9, 'não tenho interesse'), deps)
    eq('desistiu → Não quer continuar', [w.enviados[0], w.movido[0], w.state.etapa], [TEXTOS.desistiu, STATUS.naoQuerContinuar, 'humano'])
  }
  void PIPELINES

  console.log('\n— Base editável da Central (painel v5)')
  {
    const B = await import('../lib/base-core')
    const { promptTemplate, prompt } = await import('../lib/anna/interprete')
    const { comTextos, TEXTOS_PADRAO } = await import('../lib/anna/textos')
    const tpl = promptTemplate()
    const padrao = B.textosPadrao(tpl)
    eq('todo item da base tem texto padrão', B.ITENS.filter(i => !padrao[i.id]).map(i => i.id), [])
    eq('os textos padrão passam nas travas da base', B.ITENS.map(i => [i.id, B.validarTexto(i.id, padrao[i.id])]).filter(([, p]) => (p as string[]).length), [])
    eq('marcadores nunca chegam ao modelo', /<!--/.test(B.renderPrompt(tpl)), false)
    eq('sem edição o prompt é o arquivo sem os marcadores', B.renderPrompt(tpl), tpl.replace('<!-- base:fatos -->\n', '').replace('\n<!-- /base -->', ''))
    eq('prompt() usa o render padrão', prompt(), B.renderPrompt(tpl))
    eq('fatos editados entram no prompt', B.renderPrompt(tpl, { fatos: '- Fato novo.' }).includes('- Fato novo.\n\n## Como escrever'), true)
    eq('informação acrescentada vira seção no fim', B.renderPrompt(tpl, {}, [{ id: 'extra_abcd1234', titulo: 'Sábados', texto: 'O escritório não abre aos sábados.' }]).trimEnd().endsWith('**Sábados**\nO escritório não abre aos sábados.'), true)
    eq('textos do roteiro = os do código', Object.keys(B.textosDoRoteiro(padrao)).sort(), Object.keys(TEXTOS_PADRAO).sort())
    eq('comTextos troca o texto só dentro da execução', [comTextos({ mensagem4: 'Novo texto.' }, () => TEXTOS.mensagem4), TEXTOS.mensagem4 === TEXTOS_PADRAO.mensagem4], ['Novo texto.', true])
    eq('variável preenchida no texto editado', comTextos({ nova_oferta: 'Que tal {quando}?' }, () => TEXTOS.novaOferta('AMANHÃ às 15:00')), 'Que tal AMANHÃ às 15:00?')
    eq('retomada editada vale na pergunta pendente', await comTextos({ pendente_q1: 'Qual opção: 1, 2 ou 3?' }, async () => (await import('../lib/anna/interprete')).PENDENTE.q1({})), 'Qual opção: 1, 2 ou 3?')
    const erros = (id: string, t: string) => B.validarTexto(id, t).length > 0
    eq('trava: oferta sem {quando}', erros('mensagem5', 'Ela pode atender você amanhã. Posso agendar?'), true)
    eq('trava: variável que não existe', erros('agendado', '*Agendado!* {quando} com {nome}. Link: {link}'), true)
    eq('trava: pergunta depois da passagem', erros('passa_humano', 'Vou chamar a equipe, tudo bem?'), true)
    eq('trava: emoji', erros('desistiu', 'Tudo bem 🙂'), true)
    eq('trava: dizer que é IA', erros('pergunta2', 'Sou uma assistente virtual. Qual é a sua renda?'), true)
    eq('trava: honorários com valor', erros('fatos', '- Os honorários são de R$ 3.000.'), false)
    eq('trava: honorários com valor em mensagem', erros('mensagem4', 'Os honorários ficam em R$ 3.000, combinado.'), true)
    eq('trava: travessão', erros('mensagem4', 'A Dra. analisa — e volto a falar com você.'), true)
    eq('a confirmação pode citar contracheque em mãos', B.validarTexto('agendado', padrao.agendado), [])
    eq('troca exata: trecho único', B.aplicarTroca('em alguns minutos', 'alguns', 'poucos').texto, 'em poucos minutos')
    eq('troca exata: trecho repetido é recusado', !!B.aplicarTroca('a a', 'a', 'b').erro, true)
  }

  console.log('\n— Painel: diário → números (zero tokens)')
  {
    const C = await import('../lib/central-data')
    const agora = Date.parse('2026-10-14T15:00:00Z')
    const at = (min: number) => new Date(agora - min * 60_000).toISOString()
    const entradas = [
      { at: at(5), tipo: 'agendou', leadId: 1, nome: 'Ana', perfil: 'acima_15k', respostaIA: '*Agendado!* Quarta-feira, 14/10, às 15:00', usage: { input: 1000, cached: 0, output: 100, calls: 1 }, custoUsd: 0.001 },
      { at: at(40), tipo: 'job', leadId: 1, nome: 'Ana', perfil: 'acima_15k' },
      { at: at(70), tipo: 'resposta', leadId: 1, nome: 'Ana', perfil: 'acima_15k' },
      { at: at(10), tipo: 'humano', leadId: 2, nome: 'Bia', porta: 'perguntou_robo', perfil: 'ate_15k' },
      { at: at(20), tipo: 'resposta', leadId: 3, nome: 'Caio', perfil: 'ate_15k' },
      { at: at(30), tipo: 'followup', leadId: 4, nome: 'Duda' },
      { at: at(50), tipo: 'pulou', leadId: 5, detalhe: 'a equipe falou pelo Kommo' },
      { at: at(60), tipo: 'reset', leadId: 6 },
    ] as unknown as import('../lib/execlog').ExecEntry[]
    const d = C.buildExecutionData(entradas, 5.4, 'gpt-5.4-mini', agora, 'https://x.kommo.com')
    eq('marcos de hoje', d.marcos.hoje, { atendidos: 3, rendaInformada: 3, acima15k: 1, ate15k: 2, agendados: 1, passagens: 1, followups: 1 })
    eq('motivo da passagem', d.motivos.hoje, [{ motivo: 'perguntou_robo', rotulo: 'Perguntou se é robô', n: 1 }])
    eq('agendamento com link do lead', [d.agendamentos.length, d.agendamentos[0].link], [1, 'https://x.kommo.com/leads/detail/1'])
    eq('custo em reais', d.financeiro.hoje, 0.0054)
    eq('toda frase de passagem do fluxo tem motivo', ['perguntou se é robô', 'pediu atendimento humano', 'já tem advogado no caso', 'já é cliente', 'assunto de outra área', 'pediu para remarcar', 'agenda indisponível', 'sem horário livre nos próximos dias', 'renda abaixo de 10 mil pediu reunião'].map(C.motivoDaFrase).filter(m => m === 'outro'), [])
    eq('faixa de renda (acima de 15 mil oferece reunião)', [C.perfilDaRenda(15001), C.perfilDaRenda(15000), C.perfilDaRenda(null)], ['acima_15k', 'ate_15k', undefined])
    const conv = C.buildConversas(d.execucoes, agora)
    eq('estado das conversas (reset de teste conta como com a Anna)', conv.grupos, { iaAtendendo: 4, comHumano: 2, foraDaIA: 0 })
    const R = await import('../lib/conversas-reais')
    const reais = R.listarConversas([{ at: at(5), tipo: 'humano', leadId: 2, nome: 'Bia', porta: 'perguntou_robo', turnoLead: 'é robô?', respostaIA: 'Vou pedir para alguém da equipe.' }] as unknown as import('../lib/execlog').ExecEntry[])
    eq('conversa real para corrigir', [reais[0].contato, reais[0].passou], ['2', 'perguntou_robo'])
  }

  console.log('\n— Cobrança (Asaas): calendário, régua e vínculo')
  {
    const R = await import('../lib/cobranca/regua')
    const { escolherLead } = await import('../lib/cobranca/vinculo')
    eq('Páscoa 2026 e 2027', [R.pascoa(2026), R.pascoa(2027)], ['2026-04-05', '2027-03-28'])
    eq('feriados móveis 2026 (Carnaval, Sexta Santa, Corpus Christi)', ['2026-02-16', '2026-02-17', '2026-04-03', '2026-06-04'].every(d => R.feriados(2026).has(d)), true)
    eq('dia útil: Finados, sábado e 30/11 (DF) não contam', [R.diaUtil('2026-11-02'), R.diaUtil('2026-11-07'), R.diaUtil('2026-11-30'), R.diaUtil('2026-11-03')], [false, false, false, true])
    eq('4º dia útil', [R.quartoDiaUtil(2026, 10), R.quartoDiaUtil(2026, 11), R.quartoDiaUtil(2026, 12)], ['2026-10-06', '2026-11-06', '2026-12-04'])
    eq('antes do vencimento dia 07 = 4º dia útil', R.diaDoAntes('2026-11-07'), '2026-11-06')
    eq('janeiro: 4º dia útil cai no dia 07 → último dia útil antes', R.diaDoAntes('2027-01-07'), '2027-01-06')
    eq('outro vencimento: 4 dias antes', R.diaDoAntes('2026-11-15'), '2026-11-11')
    const p = (dueDate: string, status = 'PENDING') => ({ dueDate, status })
    eq('régua de manhã', [
      R.etapaDoDia(p('2026-11-07'), '2026-11-06', 'manha'), R.etapaDoDia(p('2026-11-07'), '2026-11-07', 'manha'),
      R.etapaDoDia(p('2026-11-07', 'OVERDUE'), '2026-11-08', 'manha'), R.etapaDoDia(p('2026-11-07', 'OVERDUE'), '2026-11-12', 'manha'),
      R.etapaDoDia(p('2026-11-07', 'OVERDUE'), '2026-11-17', 'manha'), R.etapaDoDia(p('2026-11-07', 'OVERDUE'), '2026-11-25', 'manha'),
      R.etapaDoDia(p('2026-11-07', 'OVERDUE'), '2026-11-09', 'manha'), R.etapaDoDia(p('2026-11-07'), '2026-11-05', 'manha'),
    ], ['antes', 'dia', 'd1', 'd5', 'd10', 'd18', null, null])
    eq('régua das 17h só no vencimento e não pago', [R.etapaDoDia(p('2026-11-07'), '2026-11-07', 'tarde'), R.etapaDoDia(p('2026-11-07', 'RECEIVED'), '2026-11-07', 'tarde'), R.etapaDoDia(p('2026-11-07', 'OVERDUE'), '2026-11-08', 'tarde')], ['dia17', null, null])
    eq('pago não recebe cobrança', R.etapaDoDia(p('2026-11-07', 'RECEIVED'), '2026-11-08', 'manha'), null)
    eq('variáveis do D+18 (prazo = envio + 2 dias)', R.variaveis({ dueDate: '2026-11-07', invoiceUrl: 'https://www.asaas.com/i/x' }, '2026-11-25', 'd18'), { vencimento: '07/11/2026', linkPagamento: 'https://www.asaas.com/i/x', diasAtraso: '18', prazoLimite: '27/11/2026' })
    eq('variáveis do D+1 sem dias nem prazo', R.variaveis({ dueDate: '2026-11-07', bankSlipUrl: 'https://b' }, '2026-11-08', 'd1'), { vencimento: '07/11/2026', linkPagamento: 'https://b' })
    eq('telefone do Asaas casa com o do Kommo', ['+5561999998888', '61999998888', '(61) 9999-8888', '+556132467013', '123'].map(R.chaveTelefone), ['6199998888', '6199998888', '6199998888', '6132467013', null])
    eq('card do cliente: Gestão operacional antes do Financeiro e do SDR', escolherLead([
      { id: 1, pipeline_id: PIPELINES.sdr, status_id: 1, updated_at: 900 },
      { id: 2, pipeline_id: PIPELINES.financeiro, status_id: 1, updated_at: 500 },
      { id: 3, pipeline_id: PIPELINES.gestao, status_id: 142, updated_at: 100 },
    ])?.id, 3)
    eq('card perdido perde para o aberto', escolherLead([
      { id: 4, pipeline_id: PIPELINES.gestao, status_id: 143, updated_at: 900 },
      { id: 5, pipeline_id: PIPELINES.gestao, status_id: 1, updated_at: 100 },
    ])?.id, 5)
  }

  {
    // Caso Erika (Dra., 22/10): Closer protegido, intenção de contratar, sem requalificação
    const C = await import('../lib/closer')
    const { foraDaQualificacao } = await import('../lib/agent')
    const ev = (por: number, de: [number, number], para: [number, number]) => ({ id: 'e', created_at: 0, created_by: por, entity_id: 1,
      value_before: [{ lead_status: { pipeline_id: de[0], id: de[1] } }], value_after: [{ lead_status: { pipeline_id: para[0], id: para[1] } }] })
    eq('robô tirando card do Closer para o SDR é detectado (e pessoa da equipe não)', [
      C.origemCloser(ev(0, [PIPELINES.closer, STATUS.clienteDecisao], [PIPELINES.sdr, STATUS.de5a10])),
      C.origemCloser(ev(12068987, [PIPELINES.closer, STATUS.clienteDecisao], [PIPELINES.sdr, STATUS.de5a10])),
      C.origemCloser(ev(0, [PIPELINES.sdr, STATUS.contatoInicial], [PIPELINES.sdr, STATUS.de5a10])),
    ], [STATUS.clienteDecisao, null, null])
    eq('Cliente decisão + "quero fechar o contrato" → Retorno imediato com tarefa de contratar',
      C.destinoDaResposta(STATUS.clienteDecisao, 'Doutora, pensei melhor e quero fechar o contrato.'),
      { statusId: STATUS.retornoImediato, tarefa: 'Lead deseja contratar — retorno imediato' })
    eq('Cliente decisão + qualquer resposta → Retorno imediato com tarefa',
      C.destinoDaResposta(STATUS.clienteDecisao, 'Boa tarde'), { statusId: STATUS.retornoImediato, tarefa: 'Lead respondeu em Cliente decisão — retorno imediato' })
    eq('Reunião agendada + "ok" → volta para Reunião agendada, sem tarefa',
      C.destinoDaResposta(STATUS.reuniaoAgendada, 'Ok combinado'), { statusId: STATUS.reuniaoAgendada, tarefa: null })
    eq('intenção de contratar nas frases reais', ['Ontem conversei com a doutora vou fechar com ela para iniciar meu processo', 'quero contratar', 'Boa tarde', 'Ok'].map(C.querContratar), [true, true, false, false])
    const card = (pipeline_id: number, tags: string[] = ['ia']) => ({ id: 1, pipeline_id, status_id: 1, _embedded: { tags: tags.map((name, i) => ({ id: i, name })) } })
    eq('a Anna não conversa no Closer nem com quem já fez reunião', [
      !!foraDaQualificacao(card(PIPELINES.closer)), !!foraDaQualificacao(card(PIPELINES.sdr, ['ia', 'JÁ FEZ REUNIÃO'])), foraDaQualificacao(card(PIPELINES.sdr)),
    ], [true, true, null])
    const { w, deps } = mundo(seg9)
    w.state = { etapa: 'q1' }
    w.leituras.push(L({ intencao: 'quer_contratar', resumo: 'conversou com a Dra. e quer fechar' }))
    const r = await fluxo.turno(ctx(w, seg9, 'Ontem conversei com a doutora vou fechar com ela para iniciar meu processo'), deps)
    eq('quer contratar: sem mensagem, Closer › Retorno imediato e passagem prioritária', [r.enviado, w.enviados.length, w.movido, w.humano[0], w.state.etapa],
      [undefined, 0, [STATUS.retornoImediato], 'Lead deseja contratar — retorno imediato', 'humano'])
  }

  {
    // Ajuste 4: etiqueta de mês nas entradas por formulário (regra da Dra., 15/10/2026)
    const M = await import('../lib/etiqueta-mes')
    const ts = (iso: string) => Date.parse(iso) / 1000
    const card = (id: number, quando: string, fonte: string | null, tags: string[] = [], campos: number[] = []) => ({
      id, pipeline_id: PIPELINES.sdr, status_id: 1, created_at: ts(quando),
      custom_fields_values: campos.map(field_id => ({ field_id })),
      _embedded: { tags: tags.map((name, i) => ({ id: i + 1, name })), source: fonte ? { id: 1, name: fonte } : null },
    })
    const FORM = 'Geral - Formulário Remarketing - 01/09/2026'
    eq('etiqueta de mês: lê os formatos que já existem na conta',
      ['OUT 26', 'Outubro 24', 'MAIO25', 'Set/26', 'ABRIL 26', 'março 2026', 'Nov 24', 'REMARKETING SE', 'MARKETING 25', 'ACIMA DE 30', 'fb1720507809227614'].map(M.mesDaEtiqueta),
      ['2026-10', '2024-10', '2025-05', '2026-09', '2026-04', '2026-03', '2024-11', null, null, null, null])
    eq('etiqueta de mês: formato da Dra., no horário de Brasília',
      [new Date('2026-10-31T23:30:00-03:00'), new Date('2027-04-02T10:00:00-03:00'), new Date('2027-05-02T10:00:00-03:00'), new Date('2027-01-01T00:10:00-03:00')].map(M.etiquetaDoMes),
      ['OUT 26', 'ABRIL 27', 'MAIO 27', 'JAN 27'])
    eq('entrada por formulário: pela origem do card ou pelas respostas do formulário',
      [card(1, '2026-10-15T10:00:00-03:00', FORM), card(2, '2026-10-15T10:00:00-03:00', 'Carolina Calvo Advocacia'), card(3, '2026-10-15T10:00:00-03:00', '556131424636'), card(4, '2026-10-15T10:00:00-03:00', null, [], [CRM_MAP.campos.formSalario])].map(M.ehEntradaDeFormulario),
      [true, false, false, true])
    eq('campanha em jan, fev e set: o card novo acumula JAN 26 + FEV 26 + SET 26', M.etiquetasDoCard(
      card(30, '2026-09-10T10:00:00-03:00', FORM, ['REMARKETING SE']),
      [card(10, '2026-01-10T10:00:00-03:00', FORM, ['JAN 26']), card(20, '2026-02-10T10:00:00-03:00', FORM, ['FEV 26', 'REMARKETING SE'])]),
      ['SET 26', 'JAN 26', 'FEV 26'])
    eq('volta espontânea pelo WhatsApp: sem etiqueta nova, só reúne as anteriores', M.etiquetasDoCard(
      card(31, '2026-10-10T10:00:00-03:00', '556131424636'),
      [card(11, '2026-01-10T10:00:00-03:00', FORM, ['JAN 26', 'Cliente'])]),
      ['JAN 26'])
    eq('lead novo pelo WhatsApp, sem card anterior: nenhuma etiqueta de mês', M.etiquetasDoCard(card(32, '2026-10-10T10:00:00-03:00', 'Carolina Calvo Advocacia'), []), [])
    eq('dois formulários no mesmo mês: uma etiqueta só', M.etiquetasDoCard(
      card(33, '2026-10-20T10:00:00-03:00', FORM),
      [card(12, '2026-10-02T10:00:00-03:00', FORM, ['OUT 26'])]),
      ['OUT 26'])
    eq('etiqueta do mês já posta à mão (outra grafia): não duplica', M.etiquetasDoCard(
      card(34, '2026-09-20T10:00:00-03:00', FORM, ['Set 26']),
      [card(13, '2026-09-02T10:00:00-03:00', FORM, ['SETEMBRO 26'])]),
      [])
    eq('card criado depois deste não entra na conta', M.etiquetasDoCard(
      card(35, '2026-09-20T10:00:00-03:00', FORM),
      [card(14, '2026-10-02T10:00:00-03:00', FORM, ['OUT 26'])]),
      ['SET 26'])
  }

  console.log('\n— 1ª mensagem pela API oficial do WhatsApp (quem nunca falou com o escritório)')
  {
    const W = await import('../lib/whatsapp')
    eq('telefone do card no formato da Meta', ['+55 (61) 99999-1234', '61999991234', '6133331234', '5561999991234', '999991234', ''].map(W.numeroMeta),
      ['5561999991234', '5561999991234', '556133331234', '5561999991234', null, null])
    const kommo = 'Olá, {{lead.cf.805158}}. Aqui é a Anna, da equipe da Dra. Carolina Calvo.\n\nÉ só me responder com o número.\n'
    const meta = 'Olá, {{1}}. Aqui é a Anna, da equipe da Dra. Carolina Calvo.\n\nÉ só me responder com o número.'
    eq('modelo do Kommo casa com o da Meta e acha a variável', W.casarModelo(kommo, meta), { 1: '{{lead.cf.805158}}' })
    eq('texto diferente não casa', W.casarModelo(kommo, 'Olá, {{1}}. Aqui é a Anna.'), null)
    eq('duas variáveis na ordem', W.casarModelo('Vence em {{lead.cf.805166}}: {{lead.cf.805164}}', 'Vence em {{1}}: {{2}}'), { 1: '{{lead.cf.805166}}', 2: '{{lead.cf.805164}}' })
    eq('modelo sem variável', W.casarModelo('Bom dia !', 'Bom dia !'), {})
  }

  console.log('\n— Mensagem não entregue: coluna pela faixa do formulário (Dra., 05/11)')
  eq('faixas do formulário → coluna', ['acima_de_15_mil', 'de_10_a_15_mil', 'de_5_a_10_mil', 'Superior a 15 mil', 'De 7 a 15 mil', '', 'até 5 mil'].map(CRM.colunaPelaFaixa),
    [STATUS.acima15, STATUS.de10a15, STATUS.desqualificado, STATUS.acima15, STATUS.desqualificado, STATUS.desqualificado, STATUS.desqualificado])

  console.log('\n— Cancelamento com o atendimento na equipe (Dra., 09/11)')
  {
    const C = await import('../lib/cancelamento-equipe')
    eq('pedidos claros (exemplos da Dra.) → claro', ['Quero cancelar minha reunião.', 'Pode desmarcar.', 'Não vou participar.', 'Não vou poder participar da reunião de amanhã', 'Pode cancelar, não quero mais a reunião'].map(C.classificarCancelamento), ['claro', 'claro', 'claro', 'claro', 'claro'])
    eq('ambíguos (exemplos da Dra.) → ambíguo, não cancela', ['Acho que não vou conseguir.', 'Talvez precise desmarcar.', 'E se eu não puder comparecer?', 'Será que dá para cancelar?'].map(C.classificarCancelamento), ['ambiguo', 'ambiguo', 'ambiguo', 'ambiguo'])
    eq('não é sobre cancelar a reunião → nada', ['Quero cancelar o empréstimo consignado', 'Obrigada, até amanhã', 'Pode confirmar o link?', 'Vou participar sim'].map(C.classificarCancelamento), [null, null, null, null])
  }

  console.log('\n— Reunião marcada pela equipe no Kommo → agenda Google (09/11)')
  {
    const R = await import('../lib/reuniao-equipe')
    const agoraMs = new Date('2026-11-09T14:00:00-03:00').getTime()
    const s = (iso: string) => Math.floor(new Date(iso).getTime() / 1000)
    const d = (reuniao: number | null, sincronizado: { eventId: string; inicio: number } | null, reuniaoDaAnna: number | null) => R.decidir({ reuniao, agoraMs, sincronizado, reuniaoDaAnna })
    const amanha15 = s('2026-11-10T15:00:00-03:00'), amanha16 = s('2026-11-10T16:00:00-03:00')
    eq('equipe marca → cria; mesmo horário → nada; remarca → move; apaga a data → apaga', [
      d(amanha15, null, null), d(amanha15, { eventId: 'e', inicio: amanha15 }, null), d(amanha16, { eventId: 'e', inicio: amanha15 }, null), d(null, { eventId: 'e', inicio: amanha15 }, null),
    ], ['criar', 'nada', 'mover', 'apagar'])
    eq('reunião da Anna → nada; equipe remarca a da Anna → apaga a dela e cria; data passada → nada', [
      d(amanha15, null, amanha15), d(amanha16, null, amanha15), d(s('2026-11-09T10:00:00-03:00'), null, null), d(null, null, null),
    ], ['nada', 'remarcou-da-anna', 'nada', 'nada'])
    eq('equipe apaga a data de uma reunião da Anna → apaga o evento dela', d(null, null, amanha15), 'apagar')
  }

  console.log('\n— Tarefas da Anna como "Dia todo" no calendário (09/11)')
  {
    const K = await import('../lib/kommo')
    eq('fim do dia em Brasília (23:59), inclusive à noite depois das 21h', [
      new Date(K.fimDoDiaBrt(new Date('2026-11-09T14:10:00-03:00').getTime()) * 1000).toISOString(),
      new Date(K.fimDoDiaBrt(new Date('2026-11-09T22:30:00-03:00').getTime()) * 1000).toISOString(),
    ], ['2026-11-10T02:59:00.000Z', '2026-11-10T02:59:00.000Z'])
  }

  console.log('\n— Robô do Kommo x equipe (06/11)')
  {
    const K = await import('../lib/kommo')
    eq('lembrete da reunião do Kommo é robô; texto da equipe não', [
      K.ehMensagemDeRoboKommo('Olá, Sirlei Si Morais\n\nEste é um lembrete da *sua reunião agendada* com a Dra. Carolina Calvo.'),
      K.ehMensagemDeRoboKommo('Oi Zacheu, a Dra. teve um imprevisto, podemos remarcar para 14:30?'),
    ], [true, false])
  }

  console.log('\n— Tempo de resposta (Dra., 06/11)')
  {
    const B = await import('../lib/buffer')
    eq('qualificação: de 60 a 90 s', [B.esperaDaResposta('q2', 0), B.esperaDaResposta('q1', 1), B.esperaDaResposta(undefined, 0.5)], [60_000, 90_000, 75_000])
    eq('oferta e confirmação: buffer curto (10 s)', [B.esperaDaResposta('oferta', 0.9), B.esperaDaResposta('preferencia', 0.9), B.esperaDaResposta('agendado', 0.9)], [10_000, 10_000, 10_000])
  }

  console.log('\n— Pós-reunião (23h depois, resposta → Retorno imediato)')
  {
    const P = await import('../lib/pos-reuniao')
    const reuniao = Math.floor(new Date('2026-10-20T15:00:00-03:00').getTime() / 1000)
    eq('follow-up 23h depois da reunião das 15h: 14h do dia seguinte', new Date(P.horaDoFollowup(reuniao)).toISOString(), '2026-10-21T17:00:00.000Z')
    const noite = Math.floor(new Date('2026-10-20T21:30:00-03:00').getTime() / 1000)
    eq('reunião às 21h30: 20h30 do dia seguinte cai fora da janela, sai às 7h', new Date(P.horaDoFollowup(noite)).toISOString(), '2026-10-22T10:00:00.000Z')
    const depois = reuniao * 1000 + 3600_000
    const closer = (status: number) => ({ pipeline_id: PIPELINES.closer, status_id: status })
    eq('resposta em Cliente decisão → Retorno imediato', P.destinoPosReuniao(closer(STATUS.clienteDecisao), reuniao, 'ok, obrigada', depois),
      { statusId: STATUS.retornoImediato, tarefa: 'Lead respondeu em Cliente decisão — retorno imediato' })
    eq('resposta depois da reunião, ainda em Reunião agendada → Retorno imediato', P.destinoPosReuniao(closer(STATUS.reuniaoAgendada), reuniao, 'gostei muito', depois)?.tarefa,
      'Lead respondeu depois da reunião — retorno imediato')
    eq('quer contratar depois da reunião → tarefa de contratar', P.destinoPosReuniao(closer(STATUS.reuniaoAgendada), reuniao, 'Doutora, quero fechar o contrato', depois)?.tarefa,
      'Lead deseja contratar — retorno imediato')
    eq('antes da reunião: não mexe', P.destinoPosReuniao(closer(STATUS.reuniaoAgendada), reuniao, 'confirmado', reuniao * 1000 - 3600_000), null)
    eq('fora do Closer: não mexe', P.destinoPosReuniao({ pipeline_id: PIPELINES.sdr, status_id: STATUS.de5a10 }, reuniao, 'oi', depois), null)
    eq('na hora da reunião (Sirlei, "Nossa"): não mexe', P.destinoPosReuniao(closer(STATUS.reuniaoAgendada), reuniao, 'Nossa', reuniao * 1000 + 25_000), null)
    const t = (iso: string) => new Date(iso).getTime()
    eq('follow-up atrasado no mesmo dia, antes das 20h: ainda sai', P.aindaNoDia(t('2026-11-06T10:00:00-03:00'), t('2026-11-06T13:30:00-03:00')), true)
    eq('follow-up atrasado depois das 20h: não sai', P.aindaNoDia(t('2026-11-06T10:00:00-03:00'), t('2026-11-06T20:10:00-03:00')), false)
    eq('follow-up de outro dia: não sai', P.aindaNoDia(t('2026-11-05T10:00:00-03:00'), t('2026-11-06T09:00:00-03:00')), false)
    eq('durante a reunião (Zacheu, remarcando): não mexe', P.destinoPosReuniao(closer(STATUS.reuniaoAgendada), reuniao, 'Podemos sim. As 14:30', reuniao * 1000 + 29 * 60_000), null)
  }

  {
    const P = await import('../lib/pos-reuniao')
    const r = Math.floor(new Date('2026-10-27T15:00:00-03:00').getTime() / 1000)
    eq('pós-reunião só sai se a reunião continua na agenda', [
      P.reuniaoNaAgenda([{ inicio: r * 1000, fim: r * 1000 + 1800_000 }], r),
      P.reuniaoNaAgenda([], r),
      P.reuniaoNaAgenda([{ inicio: r * 1000 + 3600_000, fim: r * 1000 + 5400_000 }], r),
    ], [true, false, false])
  }

  console.log('\n— Memória dos atendimentos (cards do mesmo telefone)')
  {
    const M = await import('../lib/memoria')
    const agora = new Date('2026-10-23T12:00:00-03:00')
    const c = (id: number, iso: string, pipeline: number, status: number, tags: string[] = [], valores: Record<number, number> = {}) => ({
      id, pipeline_id: pipeline, status_id: status, created_at: Math.floor(new Date(iso).getTime() / 1000),
      custom_fields_values: Object.entries(valores).map(([f, v]) => ({ field_id: Number(f), values: [{ value: v }] })),
      _embedded: { tags: tags.map((name, i) => ({ id: i + 1, name })) },
    })
    const comValores = c(10, '2026-09-12T10:00:00-03:00', PIPELINES.sdr, STATUS.acima15, [], { [CRM_MAP.campos.rendaBruta]: 18000, [CRM_MAP.campos.rendaLiquida]: 9000, [CRM_MAP.campos.descontoConta]: 2500 })
    const m1 = M.montarMemoria(99, [c(99, '2026-10-22T10:00:00-03:00', PIPELINES.sdr, STATUS.contatoInicial), comValores], agora)
    eq('memória: valores do atendimento de setembro, sem bloqueio', [m1.valores, m1.bloqueio], [{ quando: 'setembro', rendaBruta: 18000, rendaLiquida: 9000, descontoConta: 2500 }, null])
    eq('memória: só cita o que está registrado', [M.valoresTexto(m1.valores!), M.valoresTexto({ quando: 'x', rendaBruta: 12000 })],
      ['renda bruta de R$ 18.000, líquido de R$ 9.000 e desconto em conta de R$ 2.500', 'renda bruta de R$ 12.000'])
    eq('memória: quem já fez reunião não é qualificado de novo', M.montarMemoria(99, [c(11, '2026-08-01T10:00:00-03:00', PIPELINES.sdr, STATUS.perdido, ['JÁ FEZ REUNIÃO'])], agora).bloqueio?.startsWith('já fez reunião'), true)
    eq('memória: card no Closer bloqueia com frase completa', M.montarMemoria(99, [c(14, '2026-10-01T10:00:00-03:00', PIPELINES.closer, STATUS.clienteDecisao)], agora).bloqueio?.startsWith('está no Closer (pós-reunião)'), true)
    eq('memória: cliente (Gestão operacional) também não', M.montarMemoria(99, [c(12, '2025-03-01T10:00:00-03:00', PIPELINES.gestao, 107743695)], agora).bloqueio?.startsWith('já é cliente'), true)
    eq('memória: atendimento antigo sem reunião não bloqueia e sem valor não vira memória', [M.montarMemoria(99, [c(13, '2025-11-01T10:00:00-03:00', PIPELINES.sdr, STATUS.perdido)], agora).bloqueio, M.montarMemoria(99, [c(13, '2025-11-01T10:00:00-03:00', PIPELINES.sdr, STATUS.perdido)], agora).valores], [null, null])
    eq('memória: mês de outro ano leva o ano', M.mesExtenso(Math.floor(new Date('2025-11-01T10:00:00-03:00').getTime() / 1000), agora), 'novembro de 2025')
    eq('memória: lê igual, mudou ou não dá para saber', ['continua igual', 'está a mesma coisa', 'não mudou nada', 'piorou bastante', 'melhorou um pouco', 'aumentou o desconto', 'oi'].map(M.leituraMemoria),
      ['igual', 'igual', 'igual', 'mudou', 'mudou', 'mudou', null])

    // no roteiro: opção escolhida → confirmação da memória → "igual" reaproveita os valores e segue para a 3ª mensagem
    const { w, deps } = mundo(seg9)
    deps.memoria = async () => ({ quando: 'setembro', rendaBruta: 18000, rendaLiquida: 9000, descontoConta: 2500 })
    w.state = { etapa: 'q1' }
    w.leituras.push(L({ opcao: 1 }))
    await fluxo.turno(ctx(w, seg9, '1'), deps)
    eq('memória: no lugar da 2ª pergunta, confirma a situação', w.enviados[0],
      'Ótimo! Vi aqui que você já falou com a gente em setembro e, naquela ocasião, informou renda bruta de R$ 18.000, líquido de R$ 9.000 e desconto em conta de R$ 2.500.\n\nDe lá para cá, a sua situação *melhorou, piorou ou continua igual*?')
    w.leituras.push(L({ intencao: 'responde_etapa' }))
    await fluxo.turno(ctx(w, seg9, 'continua igual'), deps)
    eq('memória: "igual" reaproveita os valores, move pela renda e segue para o cheque especial e o cartão',
      [w.state.etapa, w.state.rendaBruta, w.campos[CRM_MAP.campos.descontoConta], w.movido, w.enviados[1]],
      ['limite', 18000, 2500, [STATUS.acima15], TEXTOS.perguntaLimite])
    const b = mundo(seg9)
    b.deps.memoria = deps.memoria
    b.w.state = { etapa: 'q1' }
    b.w.leituras.push(L({ opcao: 2 }), L({ intencao: 'responde_etapa' }))
    await fluxo.turno(ctx(b.w, seg9, '2'), b.deps)
    await fluxo.turno(ctx(b.w, seg9, 'piorou, agora desconta mais'), b.deps)
    eq('memória: "piorou" pede os valores de hoje (2ª pergunta)', [b.w.state.etapa, b.w.state.rendaBruta, b.w.enviados[1]], ['q2', undefined, TEXTOS.pergunta2.replace(/^Ótimo!/, 'Entendi.')])
    const d = mundo(seg9)
    d.deps.memoria = deps.memoria
    d.w.state = { etapa: 'q1' }
    d.w.leituras.push(L({ opcao: 3 }), L({ renda_bruta: 20000, renda_liquida: 8000, desconto_conta: 3000 }))
    await fluxo.turno(ctx(d.w, seg9, '3'), d.deps)
    await fluxo.turno(ctx(d.w, seg9, 'mudou: bruta 20 mil, líquido 8 mil e o banco tira 3 mil'), d.deps)
    eq('memória: valores novos ditos na resposta valem', [d.w.state.etapa, d.w.state.rendaBruta, d.w.state.descontoConta], ['limite', 20000, 3000])
    const sem = mundo(seg9)
    sem.w.state = { etapa: 'q1' }
    sem.w.leituras.push(L({ opcao: 1 }))
    await fluxo.turno(ctx(sem.w, seg9, '1'), sem.deps)
    eq('sem memória: a 2ª pergunta de sempre', sem.w.enviados[0], TEXTOS.pergunta2)
  }

  {
    const { semDescontoSoSeDito } = await import('../lib/anna/interprete')
    eq('"débito em conta" sem valor não vira desconto zero', [
      semDescontoSoSeDito(L({ desconto_conta: 0 }), 'Líquido uns 16, débito em conta').desconto_conta,
      semDescontoSoSeDito(L({ desconto_conta: 0 }), 'não tenho desconto na conta').desconto_conta,
      semDescontoSoSeDito(L({ desconto_conta: 0 }), 'desconto em conta: 0').desconto_conta,
      semDescontoSoSeDito(L({ desconto_conta: 1500 }), 'débito em conta de 1500').desconto_conta,
    ], [null, 0, 0, 1500])
  }

  {
    eq('"mando na segunda" é reconhecido (Miranda, 06/11)', ['Mandarei todas as informações na segunda-feira, pq conseguirei coleta-lãs de melhor forma.', 'te passo semana que vem', 'no fim de semana eu vejo'].map(fluxo.vaiMandarDepois), [true, true, true])
    eq('"vou ver e depois envio" é reconhecido', ['vou ver e depois te envio', 'preciso olhar o contracheque', 'não sei de cabeça, te mando mais tarde', 'ganho 12 mil', 'quanto custa?', 'e depois da reunião, quanto custa?'].map(fluxo.vaiMandarDepois), [true, true, true, false, false, false])
    const { w, deps } = mundo(seg9)
    w.state = { etapa: 'q2', objetivo: 1 }
    w.leituras.push(L({ intencao: 'outro' }))
    await fluxo.turno(ctx(w, seg9, 'vou ver no contracheque e depois te mando'), deps)
    eq('vai mandar depois → mensagem da Dra., continua na 2ª pergunta e a régua recomeça', [w.enviados[0], w.state.etapa, w.reguas[w.reguas.length - 1]], [TEXTOS.aguardoValores, 'q2', 'qualificacao'])
    eq('"combinado", "ok" e "tá bom" são só confirmação', ['Combinado', 'ok!', 'tá bom', 'Combinado, obrigado', 'combinado, ganho 12 mil'].map(t => fluxo.RX_OK.test(t)), [true, true, true, true, false])
    const m2 = mundo(seg9)
    m2.w.state = { etapa: 'q2', objetivo: 1 }
    m2.w.leituras.push(L({ intencao: 'outro' }))
    const c2 = ctx(m2.w, seg9, 'Combinado')
    c2.conversa = [{ id: 'a', dir: 'out', text: TEXTOS.aguardoValores, ts: seg9.getTime() - 60_000 }, { id: 'b', dir: 'in', text: 'Combinado', ts: seg9.getTime() }]
    await fluxo.turno(c2, m2.deps)
    eq('depois do "aguardo", um "combinado" não gera mensagem e segue na 2ª pergunta', [m2.w.enviados.length, m2.w.state.etapa], [0, 'q2'])
    const m3 = mundo(seg9)
    m3.w.state = { etapa: 'q2', objetivo: 3, memoriaPendente: true, memoria: { quando: 'outubro', rendaBruta: 20000, rendaLiquida: 16000, descontoConta: 7000 } }
    m3.w.leituras.push(L({ intencao: 'outro' }))
    await fluxo.turno(ctx(m3.w, seg9, 'Piorou, minha renda mudou'), m3.deps)
    eq('memória: depois de "piorou" a pergunta 2 começa com "Entendi.", não "Ótimo!"', [m3.w.enviados[0]?.startsWith('Entendi.'), m3.w.enviados[0]?.includes('Ótimo')], [true, false])
  }

  console.log('\n— AGUARDANDO QUALIFICAÇÃO (Dra., 05/11)')
  {
    eq('respostas genéricas', ['oi', 'Bom dia!', 'sim', 'tudo bem?', 'quero saber mais sobre o 2', '3'].map(t => fluxo.RX_GENERICO.test(t)), [true, true, true, true, false, false])
    const m = mundo(seg9)
    m.w.state = { etapa: 'q1' }
    m.w.leituras.push(L({ intencao: 'outro' }))
    const c = ctx(m.w, seg9, 'oi')
    c.conversa = [{ id: 'a', dir: 'out', text: 'Muitas pessoas acreditam que precisam continuar suportando esses descontos… *Se ainda tiver interesse, basta responder esta mensagem*.', ts: 1 }, { id: 'b', dir: 'in', text: 'oi', ts: 2 }]
    await fluxo.turno(c, m.deps)
    eq('"oi" depois de um follow-up → reapresenta a 1ª pergunta inteira, sem mudar de coluna', [m.w.enviados[0], m.w.state.etapa, m.w.movido.length], [TEXTOS.pergunta1('Maria', seg9), 'q1', 0])
    eq('coluna nova no mapa', STATUS.aguardandoQualificacao, 113789335)
  }

  console.log('\n— Plantão (Dra., 04/11)')
  {
    const PL = await import('../lib/plantao')
    const brt = (s: string) => new Date(`${s}-03:00`)
    eq('expediente: seg a sex das 9h às 16h59; plantão no resto', [
      '2026-11-04T08:59:00', '2026-11-04T09:00:00', '2026-11-04T16:59:00', '2026-11-04T17:00:00', '2026-11-04T21:59:00', '2026-11-07T10:00:00', '2026-11-08T15:00:00', '2026-11-05T03:00:00',
    ].map(t => PL.emPlantao(brt(t))), [true, false, false, true, true, true, true, true])
    eq('apresentação do plantão e do expediente', [PL.apresentacao(brt('2026-11-04T18:00:00')), PL.apresentacao(brt('2026-11-04T10:00:00'))], [PL.APRESENTACAO.plantao, PL.APRESENTACAO.expediente])
    eq('fora do horário: só entre 22h e 3h59', ['2026-11-04T21:59:00', '2026-11-04T22:00:00', '2026-11-05T03:59:00', '2026-11-05T04:00:00'].map(t => PL.foraDoHorario(brt(t))), [false, true, true, false])
    eq('aviso no fim do atendimento só fora do horário e com o plantão ligado', [PL.comAvisoFora('Fim.', brt('2026-11-04T23:00:00'), true), PL.comAvisoFora('Fim.', brt('2026-11-04T20:00:00'), true), PL.comAvisoFora('Fim.', brt('2026-11-04T23:00:00'), false)], [`Fim.\n\n${PL.AVISO_FORA_DO_HORARIO}`, 'Fim.', 'Fim.'])
    eq('robô de saudação: "bot:modelo"', [PL.lerSaudacao('54700:52500'), PL.lerSaudacao(''), PL.lerSaudacao('54700')], [{ botId: 54700, templateId: 52500 }, null, null])
  }

  console.log('\n— Lead que volta: conversa presa no card antigo')
  {
    const { conversasParaFechar } = await import('../lib/conversa-antiga')
    const conversas = [
      { id: 1, entity_type: 'lead', entity_id: 10, status: 'opened' }, // card antigo do SDR: fecha
      { id: 2, entity_type: 'lead', entity_id: 10, status: 'closed' }, // já fechada
      { id: 3, entity_type: 'lead', entity_id: 99, status: 'opened' }, // o card novo
      { id: 4, entity_type: 'lead', entity_id: 20, status: 'opened' }, // card fora do SDR (cliente): não mexe
    ]
    eq('fecha só a conversa aberta presa em outro card do SDR', conversasParaFechar(conversas, 99, new Set([10])).map(t => t.id), [1])
  }

  console.log('\n— Histórico preservado, oferta da equipe e "só o que foi perguntado" (Dra., 10/11)')
  {
    const { bateComModelo } = await import('../lib/saudacao')
    const modelo = 'Olá, {{lead.cf.805158}}!\n\n*Imagine poder respirar financeiramente, com menos descontos comprometendo sua renda todos os meses.*\n\nQual dessas possibilidades faria mais diferença para você hoje?\n\n*Me responda apenas 1, 2 ou 3*, para verificarmos o que pode ser feito no seu caso.\n'
    eq('saudação entregue com atraso é reconhecida como modelo da Anna (não é a equipe)', [
      bateComModelo('Olá, Gilse!\n\nImagine poder respirar financeiramente, com menos descontos comprometendo sua renda todos os meses.\n\nQual dessas possibilidades faria mais diferença para você hoje?\n\nMe responda apenas 1, 2 ou 3, para verificarmos o que pode ser feito no seu caso.', modelo),
      bateComModelo('Oi Gilse, aqui é a Ana da equipe. Consigo para amanhã às 15h30, pode ser?', modelo),
    ], [true, false])

    const { opcaoNoHistorico, aplicarRecuperacao, etapaPeloQueFoiDito } = await import('../lib/anna/recuperar')
    const M = (dir: 'in' | 'out', text: string, ts: number, id = `x${ts}`) => ({ id, dir, text, ts })
    const saud = M('out', 'Olá, Gilse! ... *Me responda apenas 1, 2 ou 3*', 1, 'saudacao:1')
    eq('opção respondida no histórico (o "3" sem resposta da Gilse)', [
      opcaoNoHistorico([saud, M('in', '3', 2)]),
      opcaoNoHistorico([saud, M('in', 'Opção 2', 2)]),
      opcaoNoHistorico([saud, M('in', 'as duas', 2)]),
      opcaoNoHistorico([saud, M('in', 'tenho 3 empréstimos', 2)]),
      opcaoNoHistorico([M('in', '3', 0), saud]),
    ], [3, 2, 3, null, null])
    eq('etapa pelo que já foi dito', [etapaPeloQueFoiDito({}), etapaPeloQueFoiDito({ objetivo: 3 }), etapaPeloQueFoiDito({ objetivo: 3, rendaBruta: 1, rendaLiquida: 1, descontoConta: 0 }), etapaPeloQueFoiDito({ objetivo: 3, rendaBruta: 1, rendaLiquida: 1, descontoConta: 0, limite: 'não uso' })], ['q1', 'q2', 'limite', 'q3'])

    // TESTE 1 da Dra.: a equipe assume e devolve; a Anna não pergunta de novo o que o lead já respondeu
    const agora = A.deBrt(2026, 10, 10, 14, 0)
    const conversa1 = [saud, M('in', '3', 2), M('in', 'bruta 17.250 líquido 9.800 desconto na conta 2.100', 3), M('out', 'Oi Gilse, aqui é a Carla da equipe, tudo bem?', 4, 'kommo:9')]
    const rec1 = { opcao: 3 as const, renda_bruta: 17250, renda_liquida: 9800, desconto_conta: 2100, limite: null, oferta_equipe: null, oferta_aceita: false }
    const ap1 = aplicarRecuperacao({ etapa: 'q1' }, rec1, conversa1, agora)
    eq('Teste 1: retomada em q1 com opção e valores no histórico → vai direto à pergunta do cheque especial', [ap1.patch.objetivo, ap1.patch.rendaBruta, ap1.patch.etapa, ap1.avancou], [3, 17250, 'limite', true])
    const ap1b = aplicarRecuperacao({ etapa: 'q2', objetivo: 3, rendaBruta: 20000 }, { ...rec1, renda_bruta: 17250 }, conversa1, agora)
    eq('o valor que já está no estado/card vale (o recuperado só preenche o que falta)', [ap1b.patch.rendaBruta, ap1b.patch.rendaLiquida], [undefined, 9800])

    // TESTE 2 da Dra.: oferta manual da equipe + retomada → follow-up 1 h depois, sem outro horário
    const ofertaTs = A.deBrt(2026, 10, 10, 12, 5).getTime()
    const conversa2 = [...conversa1, M('out', 'Gilse, a Dra. consegue te atender hoje às 15:30, on-line. Pode ser?', ofertaTs, 'kommo:10')]
    const rec2 = { ...rec1, oferta_equipe: { data: '2026-11-10', hora: '15:30', mensagem: 4 }, oferta_aceita: false }
    const ap2 = aplicarRecuperacao({ etapa: 'q1' }, rec2, conversa2, agora)
    eq('Teste 2: oferta da equipe reconhecida → etapa oferta com o horário dela, sem requalificar', [ap2.patch.etapa, ap2.patch.oferta?.chave, ap2.ofertaEquipe?.enviadaEm === ofertaTs, ap2.patch.objetivo], ['oferta', '2026-11-10T15:30', true, 3])
    eq('oferta que aponta para mensagem que não é da equipe não vale', aplicarRecuperacao({ etapa: 'q1' }, { ...rec2, oferta_equipe: { data: '2026-11-10', hora: '15:30', mensagem: 2 } }, conversa2, agora).ofertaEquipe, undefined)
    eq('reunião já marcada no card: não é oferta em aberto', aplicarRecuperacao({ etapa: 'q1' }, rec2, conversa2, agora, true).ofertaEquipe, undefined)

    // follow-up da oferta da equipe
    const oferta = { chave: '2026-11-10T15:30', inicio: A.deBrt(2026, 10, 10, 15, 30).toISOString(), fim: A.deBrt(2026, 10, 10, 16, 0).toISOString(), em: ofertaTs }
    const fo = async (st: LS, quando: Date, livre = true, conversa = conversa2) => {
      const { w, deps } = mundo(quando)
      deps.agenda.livre = async () => livre
      w.state = st
      const r = await fluxo.followOfertaEquipe({ ...ctx(w, quando, ''), conversa }, deps, '2026-11-10T15:30')
      return { r, w }
    }
    const base: LS = { etapa: 'oferta', objetivo: 3, rendaBruta: 17250, oferta, ofertaEquipe: { chave: oferta.chave, enviadaEm: ofertaTs } }
    const f1 = await fo(base, A.deBrt(2026, 10, 10, 13, 5))
    eq('1 h depois da oferta: o texto da Dra., uma vez', [f1.w.enviados, f1.w.state.ofertaEquipe?.followEnviado, f1.w.eventos], [['Ainda não tive sua confirmação sobre o horário que te enviei. Posso reservar esse horário para a sua reunião com a Dra. Carolina?'], true, []])
    const f2 = await fo({ ...base, ofertaEquipe: { ...base.ofertaEquipe!, followEnviado: true } }, A.deBrt(2026, 10, 10, 13, 5))
    eq('não repete o follow-up da mesma oferta', f2.w.enviados, [])
    const f3 = await fo(base, A.deBrt(2026, 10, 10, 13, 5), false)
    eq('horário ocupado: oferece outro', [f3.w.enviados[0]?.startsWith('O horário que te enviei não está mais disponível'), f3.w.state.oferta?.chave !== oferta.chave], [true, true])
    const f4 = await fo(base, A.deBrt(2026, 10, 10, 15, 10))
    eq('em cima da hora (menos de 30 min): oferece outro', f4.w.enviados[0]?.startsWith('O horário que te enviei não está mais disponível'), true)
    const f5 = await fo(base, A.deBrt(2026, 10, 10, 13, 5), true, [...conversa2, M('in', 'vou ver com meu marido', ofertaTs + 60_000)])
    eq('o lead respondeu depois da oferta: o follow-up não sai (o turno trata)', f5.w.enviados, [])
    // Dra., 10/11: o lead disse que vê a disponibilidade e responde depois → o follow-up espera esse momento
    const vouVer = M('in', 'vou ver minha disponibilidade e te respondo amanhã', ofertaTs + 10 * 60_000)
    const f6 = await fo(base, A.deBrt(2026, 10, 10, 13, 5), true, [...conversa2, vouVer, M('out', 'Combinado, aguardo!', ofertaTs + 11 * 60_000, 'kommo:11')])
    eq('"te respondo amanhã" depois da oferta: o follow-up não sai agora, volta amanhã às 14h', [f6.w.enviados, f6.r.reagendarPara === A.deBrt(2026, 10, 11, 14, 0).getTime(), f6.w.state.ofertaEquipe?.followEnviado], [[], true, undefined])
    const f7 = await fo(base, A.deBrt(2026, 10, 11, 14, 0), true, [...conversa2, vouVer, M('out', 'Combinado, aguardo!', ofertaTs + 11 * 60_000, 'kommo:11')])
    eq('no momento indicado, sem resposta: segue o previsto (horário vencido → oferece outro)', f7.w.enviados[0]?.startsWith('O horário que te enviei não está mais disponível'), true)
    // o "sim" do lead marca no Google e no Kommo o horário da equipe
    {
      const { w, deps } = mundo(A.deBrt(2026, 10, 10, 13, 10))
      w.state = { ...base }
      w.leituras.push(L({ intencao: 'aceita_horario' }))
      await fluxo.turno(ctx(w, A.deBrt(2026, 10, 10, 13, 10), 'pode sim'), deps)
      eq('confirmação explícita: marca o horário que a equipe ofereceu', [w.eventos, w.state.etapa, w.state.ofertaEquipe], [['2026-11-10T15:30'], 'agendado', undefined])
    }

    // 1ª pergunta: valores antes da opção (Gilse 10/11) e opção que ficou no histórico
    {
      const { w, deps } = mundo(agora)
      w.state = { etapa: 'q1' }
      w.leituras.push(L({ renda_bruta: 17250, renda_liquida: 9800 }))
      await fluxo.turno({ ...ctx(w, agora, 'bruta 17.250 líquido 9.800'), conversa: [M('out', 'Olá! *Me responda apenas 1, 2 ou 3*', 1), M('in', 'bruta 17.250 líquido 9.800', 2)] }, deps)
      eq('valores antes da opção: guarda os valores e pede só a opção', [w.state.rendaBruta, w.state.rendaLiquida, w.state.etapa, w.enviados[0]?.startsWith('Obrigada pelas informações!'), w.movido], [17250, 9800, 'q1', true, [STATUS.acima15]])
      w.leituras.push(L({ opcao: 3 }))
      await fluxo.turno(ctx(w, agora, '3'), deps)
      eq('depois a opção: pede só o que falta (sem a 2ª pergunta inteira)', [w.state.objetivo, w.state.etapa, w.enviados[1]], [3, 'q2', 'Obrigada. Falta só quanto o banco desconta da sua conta corrente por mês. Pode me informar?'])
    }
    {
      const { w, deps } = mundo(agora)
      w.state = { etapa: 'q1' }
      w.leituras.push(L({ renda_bruta: 17250, renda_liquida: 9800, desconto_conta: 2100 }))
      await fluxo.turno({ ...ctx(w, agora, 'bruta 17.250 líquido 9.800 desconto 2.100'), conversa: [saud, M('in', '3', 2), M('out', 'Oi', 3, 'kommo:1'), M('in', 'bruta 17.250 líquido 9.800 desconto 2.100', 4)] }, deps)
      eq('opção que ficou no histórico + valores: vai direto ao cheque especial', [w.state.objetivo, w.state.etapa, w.enviados[0]?.includes('CHEQUE ESPECIAL')], [3, 'limite', true])
    }
    {
      // retomada com tudo recuperado: a próxima pergunta, sem repetir
      const { w, deps } = mundo(agora)
      w.state = { etapa: 'limite', objetivo: 3, rendaBruta: 17250, rendaLiquida: 9800, descontoConta: 2100 }
      await fluxo.continuarDeOndeParou(ctx(w, agora, ''), deps)
      const { w: w2, deps: d2 } = mundo(agora)
      w2.state = { etapa: 'q2', objetivo: 3, rendaBruta: 17250 }
      await fluxo.continuarDeOndeParou(ctx(w2, agora, ''), d2)
      eq('retomada: pergunta só o que falta', [w.enviados[0]?.includes('CHEQUE ESPECIAL'), w2.enviados[0]], [true, 'Obrigada pelas informações! Pode me passar o valor líquido e quanto o banco desconta da sua conta corrente?'])
    }

    // card 29181780: "Envio mais tarde." + "Com quem falo?"
    const ter10 = A.deBrt(2026, 10, 10, 10, 0)
    {
      const { w, deps } = mundo(ter10)
      const bases: number[] = []
      deps.iniciarRegua = async (_r, b) => { bases.push(b) }
      w.state = { etapa: 'q2', objetivo: 3 }
      w.leituras.push(L({ intencao: 'pergunta', resposta: 'Você está falando com a Anna. A primeira reunião é on-line, gratuita e dura 30 minutos.' }))
      await fluxo.turno({ ...ctx(w, ter10, 'Envio mais tarde.\nCom quem falo?'), conversa: [M('in', 'Envio mais tarde.', 1), M('in', 'Com quem falo?', 2)] }, deps)
      eq('TESTE OBRIGATÓRIO "Envio mais tarde." + "Com quem falo?": o texto da Dra.', w.enviados, ['Você está falando com a Anna, da equipe da Dra. Carolina Calvo!\n\n*Para darmos continuidade à avaliação do seu caso, preciso de três informações:*\n\n1️⃣ Sua renda bruta mensal, antes dos descontos.\n2️⃣ Sua renda líquida mensal, depois dos descontos do contracheque.\n3️⃣ Quanto o banco desconta diretamente da sua conta corrente quando o salário é depositado.\n\n*Assim que conseguir reunir esses valores, pode me encaminhar por aqui, tudo bem?*'])
      eq('o 1º follow-up não sai antes de amanhã às 10h', bases[0] + 2 * 3600_000, A.deBrt(2026, 10, 11, 10, 0).getTime())
    }
    {
      const { w, deps } = mundo(ter10)
      w.state = { etapa: 'q1' }
      w.leituras.push(L({ intencao: 'pergunta' }))
      await fluxo.turno(ctx(w, ter10, 'Com quem falo?'), deps)
      eq('"Com quem falo?" sozinho: só a identificação e a pergunta em aberto', w.enviados, ['Você está falando com a Anna, da equipe da Dra. Carolina Calvo! 😊\n\nQual das opções você quer saber: 1, 2 ou 3?'])
    }
    {
      const { w, deps } = mundo(ter10)
      const bases: number[] = []
      deps.iniciarRegua = async (_r, b) => { bases.push(b) }
      w.state = { etapa: 'q2', objetivo: 3 }
      w.leituras.push(L({ intencao: 'pergunta', resposta: 'A análise inicial é gratuita.' }))
      await fluxo.turno(ctx(w, ter10, 'Amanhã te mando. A análise é paga?'), deps)
      eq('vai mandar depois + pergunta: responde só ela e aguarda, sem cobrar os valores', w.enviados, ['A análise inicial é gratuita.\n\nSem problemas! Fico aguardando seu retorno. Assim que conseguir reunir as informações, pode me encaminhar por aqui.'])
      eq('"amanhã": follow-up só amanhã às 14h', bases[0] + 2 * 3600_000, A.deBrt(2026, 10, 11, 14, 0).getTime())
    }
    const { esperaDoLead, listaDoQueFalta } = fluxo
    eq('quando o follow-up pode cobrar', [
      esperaDoLead('quando chegar em casa envio', ter10) === A.deBrt(2026, 10, 11, 10, 0).getTime(),
      esperaDoLead('na sexta te passo', ter10) === A.deBrt(2026, 10, 13, 14, 0).getTime(),
      esperaDoLead('semana que vem', ter10) === A.deBrt(2026, 10, 16, 14, 0).getTime(),
    ], [true, true, true])
    eq('lista só o que falta', listaDoQueFalta({ rendaBruta: 1 }).split('\n').filter(l => /️⃣/.test(l)).length, 2)
    const { semInfoNaoPedida } = await import('../lib/anna/interprete')
    eq('resposta livre: sai a informação da reunião que não foi pedida', [
      semInfoNaoPedida('Você está falando com a Anna. A primeira reunião é on-line, pelo Google Meet, e é gratuita.', 'Com quem falo?'),
      semInfoNaoPedida('Não! Nossa primeira reunião on-line é gratuita. Ela dura cerca de 30 minutos.', 'É paga?'),
      semInfoNaoPedida('A reunião on-line dura aproximadamente 30 minutos.', 'quanto tempo dura?'),
    ], ['Você está falando com a Anna.', 'Não! Nossa primeira reunião on-line é gratuita.', 'A reunião on-line dura aproximadamente 30 minutos.'])
  }

  console.log('\n— Lembrete confere a reunião na agenda')
  {
    const { conferirLembrete } = await import('../lib/google')
    const combinado = '2026-10-27T18:00:00.000Z'
    eq('reunião igual na agenda: o lembrete sai', conferirLembrete(combinado, { status: 'confirmed', inicio: '2026-10-27T15:00:00-03:00' }), 'ok')
    eq('reunião apagada ou cancelada: não sai', [conferirLembrete(combinado, null), conferirLembrete(combinado, { status: 'cancelled', inicio: combinado })], ['apagada', 'apagada'])
    eq('a Dra. moveu a reunião: não sai com o horário velho', conferirLembrete(combinado, { status: 'confirmed', inicio: '2026-10-28T15:00:00-03:00' }), 'mudou')
  }

  console.log('\n— Treino com as conversas de setembro e outubro')
  {
    const { lerConversas } = await import('./treino-conversas')
    const arq = '=== CARD 123 | etapa final: Closer › Cliente decisão | entrada: 14/10/2026\n[LEAD 14/10 10:02] meu cpf é 123.456.789-00, quanto custa?\ncontinua aqui\n[EQUIPE 14/10 10:05] A primeira reunião é on-line.\n\n=== CARD 456 | etapa final: SDR › 5 A 10 MIL | entrada: 15/10/2026\nsem conversa\n'
    eq('exportação: um bloco por card, CPF mascarado, card sem conversa fica de fora', lerConversas(arq),
      [{ card: '123', etapa: 'Closer › Cliente decisão', entrada: '14/10/2026', linhas: ['[LEAD 14/10 10:02] meu cpf é [cpf], quanto custa? continua aqui', '[EQUIPE 14/10 10:05] A primeira reunião é on-line.'] }])
  }

  console.log(`\n${falhas ? `❌ ${falhas} de ${total} falharam` : `✅ ${total}/${total} passaram`}`)
  process.exit(falhas ? 1 : 0)
}
main().catch(e => { console.error(e); process.exit(1) })
