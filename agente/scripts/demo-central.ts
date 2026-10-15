// npx tsx scripts/demo-central.ts: gera ../central/lib/demo-data.json com dados FICTÍCIOS
// (nomes inventados, nenhum lead real), montados pelas mesmas funções que o agente usa
// em /api/central, /api/base e /api/teste. Só serve para a Central com CENTRAL_DEMO=1.
//
// O agente exige estas variáveis ao carregar (lib/config.ts). Aqui todas são falsas:
// o script não fala com Kommo, OpenAI nem Redis.
for (const [key, val] of Object.entries({
  KOMMO_DOMAIN: 'https://demo.kommo.invalid', KOMMO_TOKEN: 'x', KOMMO_ACCOUNT_ID: '1', OPENAI_API_KEY: 'x',
  UPSTASH_REDIS_REST_URL: 'https://x.upstash.io', UPSTASH_REDIS_REST_TOKEN: 'x', WEBHOOK_SECRET: 'x',
})) process.env[key] ||= val

import { writeFileSync } from 'fs'
import path from 'path'
import type { ExecEntry } from '../lib/execlog'

/** Link do lead na demonstração: domínio reservado (.invalid), nunca abre um lead real. */
const DOMINIO_DEMO = 'https://demo.kommo.invalid'
const MODELO = 'gpt-5.4-mini-2026-03-17'
const USD_BRL = 5.4

async function main() {
  const { buildConversas, buildExecutionData, buildFunil } = await import('../lib/central-data')
  const { listarConversas, turnosDoContato } = await import('../lib/conversas-reais')
  const { GRUPOS, ITENS, textosPadrao, validarTexto } = await import('../lib/base-core')
  const { promptTemplate } = await import('../lib/anna/interprete')
  const { TEXTOS, TEXTOS_PADRAO } = await import('../lib/anna/textos')
  const { proximoSlot, quandoExtenso, quandoOferta, primeiraMaiuscula } = await import('../lib/anna/agenda')
  const { STATUS, PIPELINES, CRM_MAP } = await import('../lib/crm-map')

  const NOW = Date.now()
  const at = (m: number) => new Date(NOW - m * 60_000).toISOString()
  const u = (i: number, o: number) => ({ input: i, cached: Math.round(i * 0.7), output: o, calls: 1 })
  const custo = (i: number, o: number) => Math.round(((i * 0.3 * 0.75 + i * 0.7 * 0.075 + o * 4.5) / 1e6) * 1e6) / 1e6

  const NOMES = ['Marta Ribeiro', 'João Pedro Lima', 'Carlos Henrique Souza', 'Ana Paula Mendes', 'Renata Lima', 'Felipe Costa',
    'Bruno Alves', 'Juliana Rocha', 'Patrícia Gomes', 'Ricardo Nunes', 'Sandra Moreira', 'Eduardo Pires', 'Luciana Barros',
    'Márcio Teixeira', 'Cláudia Fernandes', 'Roberto Campos', 'Vânia Duarte', 'Sérgio Matos']
  const primeiro = (nome: string) => nome.split(' ')[0]
  const meet = (n: number) => `https://meet.google.com/dem-${String(1000 + n).slice(-4)}-xyz`
  const reservados = new Set<string>()

  /** Um passo do roteiro: o que o diário grava. `depois` = minutos depois do passo anterior. */
  type Passo = Omit<ExecEntry, 'at' | 'leadId' | 'nome'> & { depois: number; llm?: boolean }
  type Roteiro = (ctx: { nome: string; n: number; quando: () => { oferta: string; extenso: string; chave: string } }) => Passo[]

  const q1 = (nome: string): Passo => ({ tipo: 'inicio', etapa: 'q1', turnoLead: 'Boa tarde, vi o anúncio sobre os descontos do banco', respostaIA: TEXTOS.pergunta1(primeiro(nome)), tools: ['abriu: pergunta 1'], depois: 0 })
  const opcao = (n: 1 | 2 | 3, lead: string): Passo => ({ tipo: 'resposta', etapa: 'q2', turnoLead: lead, respostaIA: TEXTOS.pergunta2, tools: [`opção ${n}: pergunta 2`, 'intenção: responde_etapa'], depois: 3, llm: true })
  const renda = (lead: string, bruta: number, desconto: number): Passo => ({
    tipo: 'resposta', etapa: 'q3', turnoLead: lead, respostaIA: TEXTOS.mensagem3(desconto), tools: ['q2 completa: mensagem 3', 'intenção: responde_etapa'],
    perfil: bruta >= 10_000 ? 'acima_15k' : 'ate_15k', depois: 6, llm: true,
  })

  const ROTEIROS: Roteiro[] = [
    // renda acima de 10 mil: 4ª mensagem, pausa, 5ª com horário, aceitou
    ({ nome, n, quando }) => {
      const q = quando()
      return [
        q1(nome),
        opcao(3, 'quero as duas'),
        renda('ganho 12 mil bruto, líquido 3.800 e o banco tira 2 mil da conta', 12_000, 2000),
        { tipo: 'resposta', etapa: 'analise', perfil: 'acima_15k', turnoLead: 'concordo, seria um alívio enorme', respostaIA: TEXTOS.mensagem4, tools: ['mensagem 4: pausa de 30 min', 'intenção: responde_etapa'], depois: 4, llm: true },
        { tipo: 'job', etapa: 'oferta', perfil: 'acima_15k', respostaIA: TEXTOS.mensagem5(q.oferta), tools: [`ofereceu ${q.chave}`], depois: 30 },
        { tipo: 'agendou', etapa: 'agendado', perfil: 'acima_15k', turnoLead: 'pode sim, agenda pra mim', respostaIA: TEXTOS.agendado(primeiraMaiuscula(q.extenso), meet(n)), tools: [`agendou ${q.chave}`, 'intenção: aceita_horario'], depois: 9, llm: true },
      ]
    },
    // renda abaixo de 10 mil: registrado para a equipe, sem reunião
    ({ nome }) => [
      q1(nome),
      opcao(1, '1'),
      renda('meu bruto é 7.500, cai 2.100 líquido e o banco desconta 1.200 da conta', 7500, 1200),
      { tipo: 'resposta', etapa: 'sem_reuniao', perfil: 'ate_15k', turnoLead: 'sim, concordo', respostaIA: TEXTOS.semReuniao, tools: ['renda até 15 mil: tag, card na coluna da renda', 'intenção: responde_etapa'], depois: 5, llm: true },
    ],
    // perguntou se é robô
    ({ nome }) => [
      q1(nome),
      { tipo: 'humano', etapa: 'humano', porta: 'perguntou_robo', turnoLead: 'isso aqui é robô respondendo?', respostaIA: TEXTOS.passaHumano, tools: ['passou para humano: perguntou se é robô'], depois: 2 },
    ],
    // não pode no horário: manhã ou tarde, nova oferta, aceitou
    ({ nome, n, quando }) => {
      const q1o = quando()
      const q2o = quando()
      return [
        q1(nome),
        opcao(2, 'a 2, reestruturar'),
        renda('bruto 15.800, líquido 4.200 e na conta o banco tira 2.500', 15_800, 2500),
        { tipo: 'resposta', etapa: 'analise', perfil: 'acima_15k', turnoLead: 'concordo', respostaIA: TEXTOS.mensagem4, tools: ['mensagem 4: pausa de 30 min', 'intenção: responde_etapa'], depois: 3, llm: true },
        { tipo: 'job', etapa: 'oferta', perfil: 'acima_15k', respostaIA: TEXTOS.mensagem5(q1o.oferta), tools: [`ofereceu ${q1o.chave}`], depois: 30 },
        { tipo: 'resposta', etapa: 'preferencia', perfil: 'acima_15k', turnoLead: 'nesse horário estou no plantão', respostaIA: TEXTOS.manhaOuTarde, tools: ['não pode no horário: perguntou manhã ou tarde', 'intenção: recusa_horario'], depois: 12, llm: true },
        { tipo: 'resposta', etapa: 'oferta', perfil: 'acima_15k', turnoLead: 'de manhã é melhor', respostaIA: TEXTOS.novaOferta(q2o.oferta), tools: [`ofereceu ${q2o.chave}`, 'intenção: escolhe_periodo'], depois: 4, llm: true },
        { tipo: 'agendou', etapa: 'agendado', perfil: 'acima_15k', turnoLead: 'fechado', respostaIA: TEXTOS.agendado(primeiraMaiuscula(q2o.extenso), meet(n)), tools: [`agendou ${q2o.chave}`, 'intenção: aceita_horario'], depois: 6, llm: true },
      ]
    },
    // já tem advogado
    ({ nome }) => [
      q1(nome),
      opcao(1, 'quero suspender os descontos'),
      { tipo: 'humano', etapa: 'humano', porta: 'tem_advogado', turnoLead: 'eu já tenho advogado nesse processo contra o banco', respostaIA: TEXTOS.possuiAdvogado, tools: ['passou para humano: já tem advogado no caso', 'intenção: tem_advogado'], depois: 8, llm: true },
    ],
    // reunião marcada, depois pediu para remarcar (urgente)
    ({ nome, n, quando }) => {
      const q = quando()
      return [
        q1(nome),
        opcao(3, '3'),
        renda('12.500 bruto, 5 mil líquido, 1.800 descontados na conta', 12_500, 1800),
        { tipo: 'resposta', etapa: 'analise', perfil: 'acima_15k', turnoLead: 'concordo', respostaIA: TEXTOS.mensagem4, tools: ['mensagem 4: pausa de 30 min', 'intenção: responde_etapa'], depois: 2, llm: true },
        { tipo: 'job', etapa: 'oferta', perfil: 'acima_15k', respostaIA: TEXTOS.mensagem5(q.oferta), tools: [`ofereceu ${q.chave}`], depois: 30 },
        { tipo: 'agendou', etapa: 'agendado', perfil: 'acima_15k', turnoLead: 'pode', respostaIA: TEXTOS.agendado(primeiraMaiuscula(q.extenso), meet(n)), tools: [`agendou ${q.chave}`, 'intenção: aceita_horario'], depois: 7, llm: true },
        { tipo: 'humano', etapa: 'humano', porta: 'remarcar', perfil: 'acima_15k', turnoLead: 'surgiu um imprevisto, preciso remarcar a reunião', respostaIA: TEXTOS.passaHumano, tools: ['passou para humano: pediu para remarcar', 'intenção: remarcar'], depois: 180, llm: true },
      ]
    },
    // dúvida no meio do roteiro: responde e volta para a pergunta
    ({ nome }) => [
      q1(nome),
      { tipo: 'resposta', etapa: 'q1', turnoLead: 'antes, quanto custa a consulta com a doutora?', respostaIA: `A primeira reunião é on-line, pelo Google Meet, e não é cobrada.\n\n${TEXTOS_PADRAO.pendente_q1}`, tools: ['respondeu fora do roteiro (pergunta)', 'intenção: pergunta'], depois: 2, llm: true },
      opcao(3, 'as duas'),
      { tipo: 'resposta', etapa: 'q2', turnoLead: 'meu salário bruto é 9.500', respostaIA: 'Obrigada. Falta só quanto você recebe líquido e quanto o banco desconta da sua conta corrente por mês. Pode me informar?', tools: ['q2 incompleta (faltam 2)', 'intenção: responde_etapa'], perfil: 'ate_15k', depois: 10, llm: true },
    ],
    // desistiu
    ({ nome }) => [
      q1(nome),
      { tipo: 'resposta', etapa: 'humano', turnoLead: 'não tenho mais interesse, obrigado', respostaIA: TEXTOS.desistiu, tools: ['lead desistiu: movido para Não quer continuar', 'intenção: desiste'], depois: 40, llm: true },
    ],
    // pediu para falar com a Dra.
    ({ nome }) => [
      q1(nome),
      opcao(2, 'reestruturar'),
      { tipo: 'humano', etapa: 'humano', porta: 'pediu_humano', turnoLead: 'quero falar direto com a doutora, por favor', respostaIA: TEXTOS.passaHumano, tools: ['passou para humano: pediu atendimento humano', 'intenção: pede_humano'], depois: 5, llm: true },
    ],
    // agenda sem horário (urgente)
    ({ nome }) => [
      q1(nome),
      opcao(3, 'as duas opções'),
      renda('bruto 18 mil, líquido 6 mil, o banco desconta 3 mil da conta', 18_000, 3000),
      { tipo: 'resposta', etapa: 'analise', perfil: 'acima_15k', turnoLead: 'com certeza', respostaIA: TEXTOS.mensagem4, tools: ['mensagem 4: pausa de 30 min', 'intenção: responde_etapa'], depois: 3, llm: true },
      { tipo: 'humano', etapa: 'humano', porta: 'sem_agenda', perfil: 'acima_15k', respostaIA: TEXTOS.semAgenda, tools: ['passou para humano: sem horário livre nos próximos dias'], depois: 30 },
    ],
    // assunto de outra área
    ({ nome }) => [
      q1(nome),
      { tipo: 'humano', etapa: 'humano', porta: 'outro_assunto', turnoLead: 'na verdade é sobre ICMS atrasado da minha empresa', respostaIA: TEXTOS.passaHumano, tools: ['passou para humano: assunto de outra área', 'intenção: outro_assunto'], depois: 3, llm: true },
    ],
    // parou de responder: follow-up de qualificação
    ({ nome }) => [
      q1(nome),
      opcao(1, 'opção 1'),
      { tipo: 'followup', tools: ['régua qualificacao: enviado FOLLOW 1 (Follow 1)'], depois: 120 },
      { tipo: 'followup', tools: ['régua qualificacao: enviado FOLLOW 2 (Follow 2)'], depois: 21 * 60 },
    ],
  ]

  const entries: ExecEntry[] = []
  let c = 0
  for (let dia = 13; dia >= 0; dia--) {
    const porDia = dia === 0 ? 5 : 2 + (dia % 3)
    for (let j = 0; j < porDia; j++) {
      const leadId = 900_100 + c
      const nome = NOMES[c % NOMES.length]
      let t = dia * 1440 + 70 + j * 110 + (c % 7) * 9
      if (dia === 0) t = 400 - j * 70
      const inicio = new Date(NOW - t * 60_000)
      const quando = () => {
        const slot = proximoSlot({ agora: inicio, ocupados: [], reservados, mesmoDia: false })!
        reservados.add(slot.chave)
        return { oferta: quandoOferta(slot.inicio, inicio), extenso: quandoExtenso(slot.inicio), chave: slot.chave }
      }
      const passos = ROTEIROS[(c + j) % ROTEIROS.length]({ nome, n: c, quando })
      // formulário: parte dos leads recebe o modelo aprovado na entrada, no lugar da 1ª pergunta
      if (c % 5 === 2) {
        passos.shift()
        entries.push({ at: at(t + 45), leadId, nome, tipo: 'inicio', etapa: 'q1', tools: ['primeiro contato (modelo)'], detalhe: 'modelo "Anna - Primeiro contato" enviado pelo Salesbot' })
      }
      for (const p of passos) {
        t -= p.depois
        if (t < 1) break
        const { depois: _d, llm, ...resto } = p
        const i = 4200 + ((c * 37) % 1600)
        const o = 90 + ((c * 13) % 120)
        entries.push({
          ...resto, at: at(t), leadId, nome,
          ms: llm ? 8_500 + ((c * 911) % 4200) : 900 + ((c * 71) % 600),
          ...(llm ? { usage: u(i, o), custoUsd: custo(i, o) } : {}),
          detalhe: resto.detalhe || resto.respostaIA?.slice(0, 160) || resto.tools?.[0] || '',
        })
      }
      c++
    }
  }
  entries.push({ at: at(190), leadId: 900_901, nome: 'Rafael Souza', tipo: 'pulou', detalhe: 'a equipe falou pelo Kommo nas últimas 6h: a Anna não atropela' })
  entries.push({ at: at(260), leadId: 900_902, nome: 'Gustavo Pires', tipo: 'pulou', detalhe: 'tag "atendimento-humano"' })
  entries.push({ at: at(3000), leadId: 900_903, nome: 'Helena Prado', tipo: 'erro', ms: 4100, detalhe: 'Kommo 429: limite de requisições (o próximo aviso responde)' })
  entries.push({ at: at(9000), leadId: 900_904, nome: 'Lead de teste', tipo: 'reset', detalhe: 'reset de teste' })
  entries.sort((a, b) => b.at.localeCompare(a.at))

  const execucoes = buildExecutionData(entries, USD_BRL, MODELO, NOW, DOMINIO_DEMO)

  // Funil (Kommo): etapas reais do SDR e do Closer, leads inventados
  const ETAPAS: Array<[number, string, string, boolean]> = [
    [STATUS.contatoInicial, 'CONTATO INICIAL', 'SDR', false],
    [STATUS.ate5, 'ATÉ 5 MIL', 'SDR', true],
    [STATUS.de5a10, '5 A 10 MIL', 'SDR', true],
    [STATUS.de10a15, '10 A 15 MIL', 'SDR', true],
    [STATUS.acima15, 'ACIMA DE 15 MIL', 'SDR', true],
    [STATUS.agendarReuniao, 'AGENDAR REUNIÃO', 'SDR', false],
    [STATUS.outrosAssuntos, 'OUTROS ASSUNTOS', 'SDR', false],
    [STATUS.naoQuerContinuar, 'NÃO QUER CONTINUAR', 'SDR', true],
    [STATUS.reuniaoAgendada, 'REUNIÃO AGENDADA', 'Closer', true],
    [STATUS.clienteDecisao, 'CLIENTE DECISÃO', 'Closer', false],
  ]
  const etapas = ETAPAS.map(([id, nome, funil, ia], ordem) => ({ id, nome, funil, ordem: (funil === 'SDR' ? 0 : 100_000) + ordem, ia }))
  const dist = [6, 3, 5, 7, 4, 2, 1, 3, 5, 3]
  const leads: Array<{ id: number; name: string; price: number; status_id: number; pipeline_id: number; updated_at: number; created_at: number; tags: string[] }> = []
  const seg = (dias: number) => Math.floor((NOW - dias * 86400_000) / 1000)
  let k = 0
  dist.forEach((n, e) => {
    for (let x = 0; x < n; x++, k++) {
      const [id, , funil] = ETAPAS[e]
      leads.push({
        id: 901_000 + k, name: NOMES[(k * 5) % NOMES.length], price: funil === 'Closer' ? 6000 : 0, status_id: id,
        pipeline_id: funil === 'SDR' ? PIPELINES.sdr : PIPELINES.closer,
        updated_at: seg(x % 3 === 0 ? 9 + x : 1), created_at: seg(20), tags: x % 3 === 2 ? [] : ['ia'],
      })
    }
  })
  for (let x = 0; x < 3; x++, k++) leads.push({ id: 901_000 + k, name: NOMES[k % NOMES.length], price: 6000, status_id: STATUS.ganho, pipeline_id: PIPELINES.closer, updated_at: seg(4), created_at: seg(25), tags: [] })
  for (let x = 0; x < 5; x++, k++) leads.push({ id: 901_000 + k, name: NOMES[k % NOMES.length], price: 0, status_id: STATUS.perdido, pipeline_id: PIPELINES.gestao, updated_at: seg(6), created_at: seg(28), tags: ['ia'] })

  const live = {
    geradoEm: new Date(NOW).toISOString(),
    ...buildConversas(execucoes.execucoes, NOW),
    pipeline: { nome: 'SDR e Closer' },
    ...buildFunil(etapas, leads, 'ia', NOW),
    regras: {
      modoGate: 'tag', gateTag: 'ia', humanTag: 'atendimento-humano',
      expediente: 'reuniões de segunda a sexta (tarde 15:00 a 17:30, depois manhã 11:30 a 10:00); follow-ups das 7h às 20h',
    },
    saude: { crmOk: true, problemas: [] as string[] },
    webhooks: {
      inbound: { ultimo: { em: at(26), resultado: 'ok · 1 msg · lead 900160 · in' }, recebidos7d: 214 },
      lead: { ultimo: { em: at(95), resultado: 'ok · 1 evento(s) · add 900171' }, recebidos7d: 38 },
    },
  }

  // Base de dados: os textos padrão de verdade (código + bloco do prompt), com uma versão publicada e um rascunho
  const padrao = textosPadrao(promptTemplate())
  const noAr: Record<string, string> = {
    ...padrao,
    pendente_q2: 'Para eu seguir com a análise, pode me passar a sua renda bruta, o valor líquido e quanto o banco desconta da sua conta corrente?',
  }
  const EXTRA = {
    id: 'extra_demo0001', titulo: 'Como entrar na reunião pelo celular',
    texto: 'Pelo celular, basta tocar no link do Meet na hora da reunião. Se o celular pedir, instale o aplicativo Google Meet. Não precisa criar conta para entrar.',
  }
  const mensagem4Nova = padrao.mensagem4.replace('em alguns minutos', 'em instantes')
  const T = (h: number, s = 0) => new Date(NOW - h * 3600_000 + s * 1000).toISOString()
  const base = {
    versao: 2, publicadoEm: T(72), nota: 'Retomada da 2ª pergunta mais clara', rascunhoEm: T(1),
    grupos: { ...GRUPOS, extras: 'Informações acrescentadas pela equipe' },
    itens: [
      ...ITENS.map(i => ({ id: i.id, grupo: i.grupo as string, titulo: i.titulo, ajuda: i.ajuda, padrao: padrao[i.id], noAr: noAr[i.id], rascunho: null, problemas: [] as string[] })),
      { id: EXTRA.id, grupo: 'extras', titulo: EXTRA.titulo, ajuda: 'Informação nova: entra quando o rascunho for publicado.', padrao: '', noAr: '', rascunho: EXTRA.texto, problemas: validarTexto(EXTRA.id, EXTRA.texto) },
    ],
    alteracoes: [EXTRA.id],
    historico: [
      { versao: 1, publicadoEm: T(144), nota: 'Confirmação da reunião revisada pela Dra.', mudancas: ['agendado'] },
      { versao: 0, publicadoEm: null, nota: null, mudancas: [] as string[] },
    ],
    conversa: [
      { id: 'c1', ts: T(6), papel: 'equipe', origem: 'base', texto: 'Na 4ª mensagem, troca "em alguns minutos" por "em instantes".' },
      { id: 'c2', ts: T(6, 9), papel: 'ia', origem: 'base', destino: 'base', custoUsd: 0.0021,
        texto: 'Troquei "em alguns minutos" por "em instantes" na 4ª mensagem e mantive o resto igual. Está no rascunho: teste e publique com o exame para valer no WhatsApp.',
        mudancas: [{ tipo: 'trocar', id: 'mensagem4', titulo: '4ª mensagem (encaminhamento para a Dra.)', antes: padrao.mensagem4, depois: mensagem4Nova }], desfeita: true },
      { id: 'c3', ts: T(3), papel: 'equipe', origem: 'teste', texto: '',
        correcao: { fonte: 'teste', sessao: 'tdemo0001', mensagemId: 'r5', lead: '', resposta: TEXTOS.manhaOuTarde, comoDeveria: 'Deveria oferecer sábado de manhã, que o lead pediu', porque: 'O lead só pode aos sábados' } },
      { id: 'c4', ts: T(3, 11), papel: 'ia', origem: 'teste', destino: 'control_gestao', custoUsd: 0.0024,
        texto: 'Os dias da agenda da Dra. são regra do roteiro, então não mudei a base. Ficou registrado como pedido para a Control Gestão, que testa e aplica.',
        analise: { comoDeveria: 'Hoje a Dra. atende on-line de segunda a sexta. Vou pedir para alguém da equipe da Dra. Carolina continuar o seu atendimento por aqui.', porque: 'A Anna seguiu a regra da agenda (segunda a sexta). Atender aos sábados muda a regra do roteiro, não um texto da base.' } },
      { id: 'c5', ts: T(2), papel: 'equipe', origem: 'base', texto: 'A Anna pode dizer quanto custa a ação?' },
      { id: 'c6', ts: T(2, 6), papel: 'ia', origem: 'base', destino: 'recusado', custoUsd: 0.0009,
        texto: 'Não mudei nada. A Anna nunca fala de honorários nem do valor da ação: é regra de ética da OAB e decisão do escritório. Esse assunto fica com a Dra. na reunião.' },
      { id: 'c7', ts: T(1), papel: 'equipe', origem: 'base', texto: 'Ensina o que serve deste material sobre a reunião on-line',
        anexos: [{ nome: 'orientacoes-reuniao.pdf', origem: 'arquivo', tipo: 'pdf', caracteres: 1240 }, { nome: 'agenda.xlsx', origem: 'arquivo', tipo: 'xlsx', caracteres: 0, erro: 'formato não aceito (planilha Excel: salve como CSV)' }] },
      { id: 'c8', ts: T(1, 8), papel: 'ia', origem: 'base', destino: 'nova_informacao', custoUsd: 0.0031,
        texto: 'Acrescentei a informação "Como entrar na reunião pelo celular". O resto do PDF já estava nos fatos da Anna. Não consegui ler: "agenda.xlsx": formato não aceito (planilha Excel: salve como CSV). Está no rascunho: teste e publique com o exame para valer no WhatsApp.',
        mudancas: [{ tipo: 'nova', id: EXTRA.id, titulo: EXTRA.titulo, antes: '', depois: EXTRA.texto }] },
    ],
    pedidosControlGestao: 1,
    exame: { id: 'exdemo', status: 'aprovado', inicio: T(72, -120), fim: T(72), nota: 'Retomada da 2ª pergunta mais clara', mudancas: ['pendente_q2'], feitos: 21, total: 21, custoUsd: 0.09, versao: 2, falhas: [] },
  }

  // Laboratório: uma conversa de exemplo até a reunião marcada
  const agoraLab = new Date(NOW - 12 * 60_000)
  const slotLab = proximoSlot({ agora: agoraLab, ocupados: [], reservados: new Set(), mesmoDia: false })!
  const linkLab = `https://meet.google.com/lab-${slotLab.chave.replace(/\D/g, '').slice(-6)}`
  const quandoLab = quandoExtenso(slotLab.inicio)
  const campoData = new Date(slotLab.inicio).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const nota4 = 'Anna encaminhou o caso para a Dra. Carolina. Objetivo: suspender e reestruturar · Renda bruta: R$ 12.000 · Líquido: R$ 3.800 · Desconto em conta: R$ 2.000'
  const h = (id: string, dir: 'in' | 'out', text: string, m: number) => ({ id, dir, text, ts: NOW - m * 60_000 })
  const d = (tools: string[], log: string[], ms: number, custoUsd: number) => ({ tools, log, guard: [] as string[], ms, custoUsd, handoff: false })
  const teste = {
    sessao: {
      id: 'tdemo0001', criadoEm: new Date(NOW - 14 * 60_000).toISOString(), opcoes: { inicio: 'lead_escreve', agenda: 'livre', versao: 'vigente' },
      history: [
        h('l0', 'in', 'boa tarde, vi o anúncio sobre os descontos do banco', 12),
        h('r1', 'out', TEXTOS.pergunta1('Maria'), 12),
        h('l2', 'in', 'quero as duas', 11),
        h('r3', 'out', TEXTOS.pergunta2, 11),
        h('l4', 'in', 'ganho 12 mil bruto, líquido 3.800 e o banco tira 2 mil da conta', 9),
        h('r5', 'out', TEXTOS.mensagem3(2000), 9),
        h('l6', 'in', 'concordo, seria um alívio', 7),
        h('r7', 'out', TEXTOS.mensagem4, 7),
        h('r7_1', 'out', TEXTOS.mensagem5(quandoOferta(slotLab.inicio, agoraLab)), 7),
        h('l9', 'in', 'pode sim', 5),
        h('r10', 'out', TEXTOS.agendado(primeiraMaiuscula(quandoLab), linkLab), 5),
      ],
      mundo: {
        state: { etapa: 'agendado', objetivo: 3, rendaBruta: 12000, rendaLiquida: 3800, descontoConta: 2000, reuniao: { eventId: `lab-${slotLab.chave}`, inicio: slotLab.inicio.toISOString(), link: linkLab, criadaEm: new Date(NOW - 5 * 60_000).toISOString() } },
        coluna: 'Closer › REUNIÃO AGENDADA',
        tags: ['ia', CRM_MAP.tags.agendou],
        notas: [nota4],
        tarefas: [] as string[],
        campos: { objetivo: '3', rendaBruta: '12000', rendaLiquida: '3800', descontoConta: '2000', reuniao: campoData, agendamento: campoData, horarioReuniao: quandoLab, linkMeet: linkLab },
        reguas: ['qualificacao', 'qualificacao', 'qualificacao', 'agendamento'],
        reuniao: { quando: quandoLab, link: linkLab },
      },
      detalhes: {
        r1: d(['abriu: pergunta 1'], ['régua de follow-up "qualificacao" iniciada'], 1100, 0),
        r3: d(['opção 3: pergunta 2', 'intenção: responde_etapa'], ['campo objetivo = 3', 'régua de follow-up "qualificacao" iniciada'], 7900, 0.0019),
        r5: d(['q2 completa: mensagem 3', 'intenção: responde_etapa'], ['campo rendaBruta = 12000', 'campo rendaLiquida = 3800', 'campo descontoConta = 2000', 'card movido para SDR › 10 A 15 MIL', 'régua de follow-up "qualificacao" iniciada'], 9300, 0.0022),
        r7: d(['mensagem 4: pausa de 30 min', 'intenção: responde_etapa', `30 min depois: ofereceu ${slotLab.chave}`], ['régua de follow-up cancelada', `nota no card: ${nota4}`, '5ª mensagem agendada para daqui a 30 min (no teste sai agora)', 'régua de follow-up "agendamento" iniciada'], 8800, 0.0021),
        r10: d([`agendou ${slotLab.chave}`, 'intenção: aceita_horario'], [`evento criado na agenda (simulado): ${slotLab.chave}, Meet ${linkLab}`, 'régua de follow-up cancelada', `campo reuniao = ${campoData}`, `campo agendamento = ${campoData}`, `campo horarioReuniao = ${quandoLab}`, `campo linkMeet = ${linkLab}`, 'card movido para Closer › REUNIÃO AGENDADA', `tag ${CRM_MAP.tags.agendou}`, 'lembretes de 24h, 1h e 15 min agendados'], 10400, 0.0024),
      },
      turnos: 5, custoUsd: 0.0086,
    },
    uso: { mensagens: 5, custoUsd: 0.0086, limite: 300, usdBrl: USD_BRL },
  }

  const conversas = listarConversas(entries, 30)
  const reais = { conversas, turnos: Object.fromEntries(conversas.map(x => [x.contato, turnosDoContato(entries, x.contato)])) }
  const destino = path.join(__dirname, '..', '..', 'central', 'lib', 'demo-data.json')
  writeFileSync(destino, JSON.stringify({ execucoes, live, base, teste, reais }))
  console.log(`demo: ${entries.length} execuções, ${leads.length} leads, ${execucoes.agendamentos.length} reuniões, ${execucoes.passagens.length} passagens → ${path.relative(process.cwd(), destino)}`)
}

main().catch(e => { console.error(e); process.exit(1) })
