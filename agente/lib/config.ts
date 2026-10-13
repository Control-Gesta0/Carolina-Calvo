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
  /** relógio (/api/tick): QStash manda Authorization: Bearer <CRON_SECRET> */
  cronSecret: process.env.CRON_SECRET || '',
  debounceSeconds: Number(process.env.DEBOUNCE_SECONDS || 10),

  // Gate: só atende quem tem a tag. Vazio = atende todos (só no fim da rampagem).
  gateTag: (process.env.GATE_TAG || 'anna').toLowerCase(),
  humanTag: (process.env.HUMAN_TAG || 'atendimento-humano').toLowerCase(),
  testLeadIds: list(process.env.TEST_LEAD_IDS).map(Number).filter(Boolean),
  /** true = lead novo de formulário de superendividamento já entra com a tag e recebe o primeiro contato */
  autoGateFormLeads: process.env.AUTO_GATE_FORM_LEADS === 'true',
  /** régua pós-proposta (24h depois de Cliente decisão). Ligar só depois de desligar a automação antiga do Kommo */
  posPropostaAtivo: process.env.POS_PROPOSTA_ATIVO === 'true',

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN || '',
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
  },
}

export const googleConfigurado = () => !!(CONFIG.google.clientId && CONFIG.google.clientSecret && CONFIG.google.refreshToken)
