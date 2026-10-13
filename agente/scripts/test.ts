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
  eq('webhook de lead', parseLeadWebhook({ 'leads[status][0][id]': '9', 'leads[status][0][status_id]': '75538167', 'leads[status][0][pipeline_id]': '9809931', 'leads[add][0][id]': '8' }).map(e => [e.tipo, e.id, e.statusId]), [['add', 8, 0], ['status', 9, 75538167]])
  eq('renderiza variável do card', renderizar('Olá, {{lead.cf.805158}}. Link: {{lead.cf.805162}}', { 805158: 'Maria', 805162: 'https://meet.google.com/x' }), 'Olá, Maria. Link: https://meet.google.com/x')
  eq('primeiro nome', primeiroNome('MARIA DOLORES DA SILVA'), 'Maria')
  eq('nome que não é nome', primeiroNome('Facebook №4431198800481061'), '')

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

  console.log(`\n${falhas ? `❌ ${falhas} de ${total} falharam` : `✅ ${total}/${total} passaram`}`)
  process.exit(falhas ? 1 : 0)
}
main().catch(e => { console.error(e); process.exit(1) })
