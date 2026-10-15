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
  const F = await import('../lib/followup')
  const { parseKommoWebhook } = await import('../api/inbound')
  const { parseLeadWebhook } = await import('../api/lead')
  const { renderizar } = await import('../lib/modelos')
  const { primeiroNome } = await import('../lib/anna/producao')
  const { TEXTOS } = await import('../lib/anna/textos')
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
  eq('mesmo dia, agenda vazia → 15:00 de hoje', k(A.proximoSlot({ ...base, agora: seg9, mesmoDia: true })), '2026-10-12T15:00')
  const ocupado = (h1: number, m1: number, h2: number, m2: number) => ({ inicio: A.deBrt(2026, 9, 12, h1, m1).getTime(), fim: A.deBrt(2026, 9, 12, h2, m2).getTime() })
  eq('15:00 e 15:30 ocupados → 16:00 (sequência)', k(A.proximoSlot({ ...base, ocupados: [ocupado(15, 0, 16, 0)], agora: seg9, mesmoDia: true })), '2026-10-12T16:00')
  eq('tarde toda ocupada → 11:30 (manhã do mais tarde)', k(A.proximoSlot({ ...base, ocupados: [ocupado(15, 0, 18, 0)], agora: seg9, mesmoDia: true })), '2026-10-12T11:30')
  eq('tarde e 11:30 ocupados → 11:00', k(A.proximoSlot({ ...base, ocupados: [ocupado(15, 0, 18, 0), ocupado(11, 30, 12, 0)], agora: seg9, mesmoDia: true })), '2026-10-12T11:00')
  eq('sem prioridade → próximo dia útil 15:00', k(A.proximoSlot({ ...base, agora: seg9, mesmoDia: false })), '2026-10-13T15:00')
  eq('17:10 → 17:30 fica em cima, vai para amanhã', k(A.proximoSlot({ ...base, agora: A.deBrt(2026, 9, 12, 17, 10), mesmoDia: true })), '2026-10-13T15:00')
  eq('sexta à noite → segunda', k(A.proximoSlot({ ...base, agora: A.deBrt(2026, 9, 16, 20, 0), mesmoDia: true })), '2026-10-19T15:00')
  eq('reservado para outro lead é pulado', k(A.proximoSlot({ ...base, reservados: new Set(['2026-10-12T15:00']), agora: seg9, mesmoDia: true })), '2026-10-12T15:30')
  eq('prefere manhã, a partir de amanhã → 11:30', k(A.proximoSlot({ ...base, agora: seg9, mesmoDia: true, periodo: 'manha', aPartirDoDia: '2026-10-13' })), '2026-10-13T11:30')
  eq('oferta hoje', A.quandoOferta(A.deBrt(2026, 9, 12, 17, 0), seg9), 'HOJE às 17:00')
  eq('oferta amanhã', A.quandoOferta(A.deBrt(2026, 9, 13, 15, 0), seg9), 'AMANHÃ às 15:00')
  eq('oferta em outro dia', A.quandoOferta(A.deBrt(2026, 9, 15, 15, 30), seg9), 'na quinta-feira (15/10) às 15:30')
  eq('extenso', A.quandoExtenso(A.deBrt(2026, 9, 15, 15, 30)), 'quinta-feira, 15/10, às 15:30')
  eq('próximo dia útil de sexta', A.proximoDiaUtil('2026-10-16'), '2026-10-19')

  console.log('\n— Coluna por renda')
  eq('5.000 → ATÉ 5 MIL', colunaPorRenda(5000), STATUS.ate5)
  eq('9.999 → 5 A 10 MIL', colunaPorRenda(9999), STATUS.de5a10)
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
  eq('agendamento: 2ª etapa = 24h da oferta', h(new Date(F.horaDaEtapa('agendamento', 1, t0, t0 + 2 * 3600_000))), '13/10 10:00')
  eq('agendamento: final = 48h da oferta', h(new Date(F.horaDaEtapa('agendamento', 2, t0, t0 + 24 * 3600_000))), '14/10 10:00')
  eq('FOLLOW 1 de lead que falou às 19h sai às 7h', h(new Date(F.horaDaEtapa('qualificacao', 0, A.deBrt(2026, 9, 12, 19, 0).getTime()))), '13/10 7:00')
  eq('modelos das réguas', ['qualificacao', 'agendamento', 'pos_proposta'].map(r => F.CONFIG_REGUAS.reguas[r as 'qualificacao'].etapas.map((_e, i) => F.modeloDaEtapa(r as 'qualificacao', i))),
    [['follow1', 'follow2', 'follow3', 'follow4'], ['fupHorario', 'se524h', 'fupEncerramento'], ['perguntaReuniao']])

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
  const { extensaoAudio } = await import('../lib/media')
  eq('formato do áudio: pelo tipo, pelo nome ou ogg', [
    extensaoAudio('https://drive-g.kommo.com/download/abc/123', 'audio/ogg'),
    extensaoAudio('https://drive-g.kommo.com/download/abc/voz.m4a?x=1', ''),
    extensaoAudio('https://drive-g.kommo.com/download/abc/123', 'application/octet-stream'),
    extensaoAudio('https://drive-g.kommo.com/download/abc/arquivo.kommo', ''),
  ], ['ogg', 'm4a', 'ogg', 'ogg'])

  console.log('\n— Roteiro da Anna (intérprete simulado)')
  type Leitura = import('../lib/anna/interprete').Leitura
  const L = (p: Partial<Leitura>): Leitura => ({ intencao: 'responde_etapa', opcao: null, renda_bruta: null, renda_liquida: null, desconto_conta: null, periodo: null, data_preferida: null, resposta: null, resumo: 'teste', ...p })

  function mundo(agora: Date, slotsLivres: string[] = []) {
    const w = {
      state: {} as import('../lib/state').LeadState, enviados: [] as string[], campos: {} as Record<number, string | number>, movido: [] as number[],
      tags: [] as string[], humano: [] as string[], tarefas: [] as string[], reguas: [] as string[], msg5: [] as number[], lembretes: 0, eventos: [] as string[],
      leituras: [] as Leitura[], ocupar: new Set<string>(),
    }
    const deps: import('../lib/anna/fluxo').Deps = {
      async interpretar() { const l = w.leituras.shift(); if (!l) throw new Error('sem leitura simulada'); return l },
      async enviar(t) { w.enviados.push(t) },
      async patch(p) { w.state = { ...w.state, ...p }; return w.state },
      async salvarCampos(v) { Object.assign(w.campos, v) },
      async mover(s) { w.movido.push(s) },
      async addTags(t) { w.tags.push(...t) },
      async nota() { /* */ },
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
    const { periodoSoSeDito } = await import('../lib/anna/interprete')
    eq('recusa sem dizer o período: o período deduzido não vale', [
      periodoSoSeDito(L({ intencao: 'recusa_horario', periodo: 'tarde' }), 'oferta', 'nesse horário eu estou trabalhando').periodo,
      periodoSoSeDito(L({ intencao: 'recusa_horario', periodo: 'manha' }), 'oferta', 'hoje não dá, só consigo de manhã').periodo,
      periodoSoSeDito(L({ intencao: 'escolhe_periodo', periodo: 'tarde' }), 'preferencia', 'depois das 16h').periodo,
    ], [null, 'manha', 'tarde'])
  }

  {
    // a redação recebe o texto da Dra. como referência, com os trechos obrigatórios; confirmação e OAB ficam fixos
    const { w, deps } = mundo(seg9)
    const pedidos: Array<{ id: string; obrigatorio: string[] }> = []
    deps.redigir = async r => { pedidos.push({ id: r.id, obrigatorio: r.obrigatorio }); return `[redigido] ${r.referencia}` }
    w.state = { etapa: 'q3', rendaBruta: 12000, rendaLiquida: 3800, descontoConta: 2000 }
    w.leituras.push(L({ intencao: 'responde_etapa' }))
    const r4 = await fluxo.turno(ctx(w, seg9, 'concordo'), deps)
    eq('redação: a 4ª mensagem sai redigida, com a Dra. obrigatória', [r4.enviado?.startsWith('[redigido]'), pedidos[0]], [true, { id: 'mensagem4', obrigatorio: ['Dra. Carolina'] }])
    w.state = { etapa: 'q2' }
    w.leituras.push(L({ intencao: 'tem_advogado' }))
    const rAdv = await fluxo.turno(ctx(w, seg9, 'já tenho advogado'), deps)
    eq('redação: o texto da OAB sai como a Dra. escreveu', [rAdv.enviado, pedidos.length], [TEXTOS.possuiAdvogado, 1])
  }

  {
    const agora = seg9
    const { w, deps } = mundo(agora)
    await fluxo.turno(ctx(w, agora, 'oi'), deps)
    eq('lead escreveu primeiro → pergunta 1 com o nome', w.enviados[0].startsWith('Olá, Maria. Aqui é a Anna'), true)
    w.leituras.push(L({ opcao: 3 }))
    await fluxo.turno(ctx(w, agora, 'as duas'), deps)
    eq('opção 3 → pergunta 2 (texto da Dra.)', w.enviados[1], TEXTOS.pergunta2)
    w.leituras.push(L({ renda_bruta: 16000 }))
    await fluxo.turno(ctx(w, agora, 'ganho 16 mil bruto'), deps)
    eq('renda bruta → coluna ACIMA DE 15 MIL', w.movido, [STATUS.acima15])
    eq('pede só o que falta', w.enviados[2], 'Obrigada. Falta só quanto você recebe líquido e quanto o banco desconta da sua conta corrente por mês. Pode me informar?')
    w.leituras.push(L({ renda_liquida: 4000, desconto_conta: 3500 }))
    await fluxo.turno(ctx(w, agora, 'líquido 4 mil e o banco tira 3.500 da conta'), deps)
    eq('3ª mensagem com o desconto', w.enviados[3], 'Acredito que sem esses R$ 3.500 de descontos em conta corrente, tendo todo o seu salário líquido seria uma grande ajuda para respirar e ter um alívio financeiro, concorda?')
    eq('campos gravados no card', [w.campos[CRM_MAP.campos.rendaBruta], w.campos[CRM_MAP.campos.rendaLiquida], w.campos[CRM_MAP.campos.descontoConta]], [16000, 4000, 3500])
    w.leituras.push(L({}))
    await fluxo.turno(ctx(w, agora, 'concordo'), deps)
    eq('4ª mensagem (texto da Dra.)', w.enviados[4], TEXTOS.mensagem4)
    eq('pausa de 30 min agendada', w.msg5, [agora.getTime() + 30 * 60_000])
    const r5 = await fluxo.quintaMensagem(ctx(w, new Date(agora.getTime() + 30 * 60_000), ''), deps, 'tok')
    eq('5ª mensagem oferece HOJE 15:00 (renda acima de 13,5 mil)', w.enviados[5].endsWith('Ela pode atender você HOJE às 15:00, ON LINE. Posso agendar?'), true)
    eq('5ª mensagem não afirma análise da Dra.', /analisou/.test(w.enviados[5]), false)
    eq('régua de agendamento começa na oferta', w.reguas[w.reguas.length - 1], 'agendamento')
    void r5
    w.leituras.push(L({ intencao: 'aceita_horario' }))
    await fluxo.turno(ctx(w, new Date(agora.getTime() + 40 * 60_000), 'pode sim'), deps)
    eq('evento criado no horário oferecido', w.eventos, ['2026-10-12T15:00'])
    eq('lead vai para Closer › Reunião agendada', w.movido[w.movido.length - 1], STATUS.reuniaoAgendada)
    eq('campos Reunião e Agendamento iguais (lembretes e Cliente decisão do escritório)', [w.campos[CRM_MAP.campos.reuniao], w.campos[CRM_MAP.campos.agendamento]], [Date.UTC(2026, 9, 12, 18) / 1000, Date.UTC(2026, 9, 12, 18) / 1000])
    eq('confirmação com link do Meet', w.enviados[6].includes('https://meet.google.com/abc') && w.enviados[6].startsWith('*Agendado!* Segunda-feira, 12/10, às 15:00'), true)
    eq('lembretes agendados', w.lembretes, 1)
    eq('etapa agendado', w.state.etapa, 'agendado')
  }

  {
    const { w, deps } = mundo(seg9)
    w.state = { etapa: 'q2', objetivo: 1 }
    w.leituras.push(L({ renda_bruta: 8000, renda_liquida: 2500, desconto_conta: 0 }))
    await fluxo.turno(ctx(w, seg9, '8 mil, líquido 2500, não desconta da conta'), deps)
    eq('sem desconto em conta → variante da 3ª mensagem', w.enviados[0], TEXTOS.mensagem3(0))
    w.leituras.push(L({}))
    await fluxo.turno(ctx(w, seg9, 'sim'), deps)
    eq('renda abaixo de 10 mil → sem reunião, registrado para a equipe', [w.state.etapa, w.enviados[1] === TEXTOS.semReuniao, w.tags.includes(CRM_MAP.tags.semReuniao), w.tarefas.length, w.msg5.length], ['sem_reuniao', true, true, 1, 0])
  }

  {
    const { w, deps } = mundo(seg9)
    w.state = { etapa: 'q2' }
    await fluxo.turno(ctx(w, seg9, 'você é robô?'), deps)
    eq('"é robô?" → passa para humano sem negar', [w.enviados[0], w.humano[0], w.state.etapa], [TEXTOS.passaHumano, 'perguntou se é robô', 'humano'])
  }

  {
    const agora = seg9
    const { w, deps } = mundo(agora)
    w.state = { etapa: 'oferta', rendaBruta: 12000, oferta: { chave: '2026-10-13T15:00', inicio: A.deBrt(2026, 9, 13, 15, 0).toISOString(), fim: A.deBrt(2026, 9, 13, 15, 30).toISOString(), em: agora.getTime() } }
    w.leituras.push(L({ intencao: 'recusa_horario' }))
    await fluxo.turno(ctx(w, agora, 'nesse horário não consigo'), deps)
    eq('não pode → pergunta manhã ou tarde', [w.enviados[0], w.state.etapa], [TEXTOS.manhaOuTarde, 'preferencia'])
    w.leituras.push(L({ intencao: 'escolhe_periodo', periodo: 'manha' }))
    await fluxo.turno(ctx(w, agora, 'de manhã'), deps)
    eq('manhã → oferece 11:30 do dia seguinte ao recusado', w.enviados[1], TEXTOS.novaOferta('na quarta-feira (14/10) às 11:30'))
    w.ocupar.add('2026-10-14T11:30')
    w.leituras.push(L({ intencao: 'aceita_horario' }))
    await fluxo.turno(ctx(w, agora, 'ok'), deps)
    eq('horário ocupado na hora do sim → oferece o próximo', w.enviados[2], TEXTOS.horarioOcupado('AMANHÃ às 15:00'))
  }

  {
    const { w, deps } = mundo(seg9)
    w.state = { etapa: 'q1' }
    w.leituras.push(L({ intencao: 'pergunta', resposta: 'A primeira reunião é on-line e não é cobrada. Qual das opções você quer saber: 1, 2 ou 3?' }))
    await fluxo.turno(ctx(w, seg9, 'quanto custa?'), deps)
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
      { at: at(5), tipo: 'agendou', leadId: 1, nome: 'Ana', perfil: 'acima_10k', respostaIA: '*Agendado!* Quarta-feira, 14/10, às 15:00', usage: { input: 1000, cached: 0, output: 100, calls: 1 }, custoUsd: 0.001 },
      { at: at(40), tipo: 'job', leadId: 1, nome: 'Ana', perfil: 'acima_10k' },
      { at: at(70), tipo: 'resposta', leadId: 1, nome: 'Ana', perfil: 'acima_10k' },
      { at: at(10), tipo: 'humano', leadId: 2, nome: 'Bia', porta: 'perguntou_robo', perfil: 'abaixo_10k' },
      { at: at(20), tipo: 'resposta', leadId: 3, nome: 'Caio', perfil: 'abaixo_10k' },
      { at: at(30), tipo: 'followup', leadId: 4, nome: 'Duda' },
      { at: at(50), tipo: 'pulou', leadId: 5, detalhe: 'a equipe falou pelo Kommo' },
      { at: at(60), tipo: 'reset', leadId: 6 },
    ] as unknown as import('../lib/execlog').ExecEntry[]
    const d = C.buildExecutionData(entradas, 5.4, 'gpt-5.4-mini', agora, 'https://x.kommo.com')
    eq('marcos de hoje', d.marcos.hoje, { atendidos: 3, rendaInformada: 3, acima10k: 1, abaixo10k: 2, agendados: 1, passagens: 1, followups: 1 })
    eq('motivo da passagem', d.motivos.hoje, [{ motivo: 'perguntou_robo', rotulo: 'Perguntou se é robô', n: 1 }])
    eq('agendamento com link do lead', [d.agendamentos.length, d.agendamentos[0].link], [1, 'https://x.kommo.com/leads/detail/1'])
    eq('custo em reais', d.financeiro.hoje, 0.0054)
    eq('toda frase de passagem do fluxo tem motivo', ['perguntou se é robô', 'pediu atendimento humano', 'já tem advogado no caso', 'já é cliente', 'assunto de outra área', 'pediu para remarcar', 'agenda indisponível', 'sem horário livre nos próximos dias', 'renda abaixo de 10 mil pediu reunião'].map(C.motivoDaFrase).filter(m => m === 'outro'), [])
    eq('faixa de renda', [C.perfilDaRenda(10000), C.perfilDaRenda(9999), C.perfilDaRenda(null)], ['acima_10k', 'abaixo_10k', undefined])
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

  console.log(`\n${falhas ? `❌ ${falhas} de ${total} falharam` : `✅ ${total}/${total} passaram`}`)
  process.exit(falhas ? 1 : 0)
}
main().catch(e => { console.error(e); process.exit(1) })
