function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Env var obrigatória ausente: ${name}`)
  return v
}

const list = (v: string | undefined) => (v || '').split(',').map(x => x.trim()).filter(Boolean)

/**
 * Anna · Carolina Calvo Advogados. Variante KOMMO · Desenho A (WhatsApp oficial
 * dentro do Kommo, envio pelo Salesbot). O Kommo não devolve transcript: o
 * histórico é NOSSO (Redis).
 *
 * Google e relógio são opcionais no boot: sem eles a Anna conversa, mas não
 * agenda (passa para a equipe) e não dispara follow-up.
 */
export const CONFIG = {
  clientName: process.env.CLIENT_NAME || 'Carolina Calvo · Anna',

  kommoDomain: required('KOMMO_DOMAIN').replace(/\/+$/, '').replace(/^(?!https?:\/\/)/, 'https://'),
  kommoToken: required('KOMMO_TOKEN'),
  kommoAccountId: required('KOMMO_ACCOUNT_ID'),
  /** Salesbot que envia o texto livre do campo de resposta */
  kommoBotId: Number(process.env.KOMMO_BOT_ID || 0),

  openaiApiKey: required('OPENAI_API_KEY'),
  llmModel: process.env.LLM_MODEL || 'gpt-5.4-mini-2026-03-17',
  visionModel: process.env.VISION_MODEL || 'gpt-5.4-mini-2026-03-17',
  sttModel: process.env.STT_MODEL || 'gpt-4o-mini-transcribe',

  upstashUrl: required('UPSTASH_REDIS_REST_URL'),
  upstashToken: required('UPSTASH_REDIS_REST_TOKEN'),
  redisPrefix: process.env.REDIS_PREFIX || 'anna-cc:',

  webhookSecret: required('WEBHOOK_SECRET'),
  /** a Central (painel) fala com o agente com este segredo; sem ele, só o WEBHOOK_SECRET (Central só da agência) */
  centralSecret: process.env.CENTRAL_SECRET || '',
  /** custo do modelo convertido em reais na Central */
  usdBrl: Number(process.env.COST_USD_BRL || 5.4),
  /** relógio (/api/tick): QStash manda Authorization: Bearer <CRON_SECRET> */
  cronSecret: process.env.CRON_SECRET || '',
  debounceSeconds: Number(process.env.DEBOUNCE_SECONDS || 10),

  // Gate: só atende quem tem a tag. Vazio = atende todos (só no fim da rampagem).
  gateTag: (process.env.GATE_TAG || 'ia').toLowerCase(),
  humanTag: (process.env.HUMAN_TAG || 'atendimento-humano').toLowerCase(),
  testLeadIds: list(process.env.TEST_LEAD_IDS).map(Number).filter(Boolean),
  /** true = lead novo de formulário de superendividamento já entra com a tag e recebe o primeiro contato */
  autoGateFormLeads: process.env.AUTO_GATE_FORM_LEADS === 'true',
  /** follow-up 23h depois da reunião e resposta → Retorno imediato (lib/pos-reuniao.ts).
   *  POS_REUNIAO=true: todas as reuniões · teste: só TEST_LEAD_IDS · sem valor: desligado */
  posReuniao: (process.env.POS_REUNIAO === 'true' ? 'on' : process.env.POS_REUNIAO === 'teste' ? 'teste' : 'off') as 'on' | 'teste' | 'off',
  /** devolve ao Closer o card que um robô antigo moveu para o SDR (lib/closer.ts). Liga por padrão (Dra., 22/10).
   *  PROTEGE_CLOSER=teste: só nos cards de TEST_LEAD_IDS · false: desligado */
  protegeCloser: process.env.PROTEGE_CLOSER !== 'false',
  protegeCloserSoTeste: process.env.PROTEGE_CLOSER === 'teste',
  /** memória dos atendimentos anteriores do mesmo telefone (lib/memoria.ts). MEMORIA=true: todos · teste: só TEST_LEAD_IDS */
  memoria: (process.env.MEMORIA === 'true' ? 'on' : process.env.MEMORIA === 'teste' ? 'teste' : 'off') as 'on' | 'teste' | 'off',
  /** etiqueta de mês nas entradas por formulário (lib/etiqueta-mes). Liga só com a aprovação da Dra. */
  etiquetaMesAtiva: process.env.ETIQUETA_MES_ATIVA === 'true',

  /** Cobrança pelo Asaas (lib/cobranca). Nasce DESLIGADA: sem COBRANCA_ATIVA=true só simula e registra o que sairia. */
  asaas: {
    apiKey: process.env.ASAAS_API_KEY || '',
    url: (process.env.ASAAS_URL || 'https://api.asaas.com/v3').replace(/\/+$/, ''),
    /** o Asaas manda no header asaas-access-token de cada webhook */
    webhookToken: process.env.ASAAS_WEBHOOK_TOKEN || '',
  },
  cobrancaAtiva: process.env.COBRANCA_ATIVA === 'true',
  /** só estes leads recebem cobrança (teste ponta a ponta); vazio = todos os vinculados */
  cobrancaTesteLeads: list(process.env.COBRANCA_TESTE_LEADS).map(Number).filter(Boolean),

  /** WhatsApp Cloud API direto (lib/whatsapp.ts): só para abrir conversa com quem nunca falou com o escritório */
  whatsapp: {
    token: process.env.WHATSAPP_TOKEN || '',
    /** WABA conectada ao Kommo (waba_selected_waba_ids dos modelos) */
    wabaId: process.env.WHATSAPP_WABA_ID || '2343930862777873',
    /** opcional: sem ele, sai do único número da WABA */
    phoneId: process.env.WHATSAPP_PHONE_ID || '',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN || '',
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
  },
}

