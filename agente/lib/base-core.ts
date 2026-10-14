import { TEXTOS_PADRAO, type TextoId } from './anna/textos'
import { checkReply } from './guards'
import { REGRAS_CLIENTE } from './regras'

/**
 * BASE DE DADOS da Anna (núcleo puro): os textos que ela usa e que a equipe da
 * Dra. Carolina pode pedir para mudar pela Central (aba Ensinar). Sem env, sem
 * Redis: testado em `npm test`.
 *
 * Dois lugares de origem:
 *  - código: os textos do roteiro (lib/anna/textos.ts → TEXTOS_PADRAO).
 *  - prompt: o bloco marcado em prompts/anna.md com <!-- base:fatos -->…<!-- /base -->
 *    (o que a Anna pode responder). Os marcadores nunca chegam ao modelo e, sem
 *    edição, o prompt renderizado é BYTE A BYTE o de antes dos marcadores.
 * Informações novas pedidas pela equipe viram a seção "Informações cadastradas".
 *
 * Toda edição passa por validarTexto() (trava em código) e pelo exame antes de valer.
 */

interface Meta { id: string; grupo: string; titulo: string; ajuda: string; exige?: string[]; semPergunta?: boolean; comPergunta?: boolean }

export const ITENS = [
  { id: 'pergunta1', grupo: 'roteiro', titulo: '1ª pergunta (quando o lead escreve primeiro)', ajuda: 'A apresentação da Anna e as três opções. {saudacao} vira "Olá, Maria." ou "Olá." quando o nome do WhatsApp não parece nome. Lead de formulário recebe o modelo aprovado pela Meta, que não muda por aqui.' },
  { id: 'pergunta2', grupo: 'roteiro', titulo: '2ª pergunta (renda e descontos)', ajuda: 'Enviada quando o lead escolhe a opção 1, 2 ou 3.', comPergunta: true },
  { id: 'mensagem3', grupo: 'roteiro', titulo: '3ª mensagem (com o desconto em conta)', ajuda: 'Quando o lead informa quanto o banco desconta da conta. {desconto} vira o valor, por exemplo "R$ 2.000".', exige: ['{desconto}'], comPergunta: true },
  { id: 'mensagem3_sem_desconto', grupo: 'roteiro', titulo: '3ª mensagem (sem desconto em conta)', ajuda: 'Quando o banco não desconta nada da conta corrente.', comPergunta: true },
  { id: 'mensagem4', grupo: 'roteiro', titulo: '4ª mensagem (encaminhamento para a Dra.)', ajuda: 'Renda bruta de R$ 10 mil ou mais. Depois dela vem a pausa de 30 minutos.', semPergunta: true },
  { id: 'mensagem5', grupo: 'roteiro', titulo: '5ª mensagem (primeiro horário)', ajuda: 'Sai 30 minutos depois da 4ª, com o primeiro horário livre da agenda. {quando} vira "HOJE às 15:00", "AMANHÃ às 11:30" ou "na quinta-feira (15/10) às 15:00".', exige: ['{quando}'], comPergunta: true },
  { id: 'nova_oferta', grupo: 'agenda', titulo: 'Nova oferta de horário', ajuda: 'Depois que o lead diz se prefere manhã ou tarde. {quando} é o novo horário.', exige: ['{quando}'], comPergunta: true },
  { id: 'horario_ocupado', grupo: 'agenda', titulo: 'Horário que acabou de ser ocupado', ajuda: 'Quando o lead aceita, mas o horário foi preenchido entre a oferta e o "sim". {quando} é o próximo horário.', exige: ['{quando}'], comPergunta: true },
  { id: 'manha_ou_tarde', grupo: 'agenda', titulo: 'Pergunta de manhã ou tarde', ajuda: 'Quando o lead não pode no horário oferecido (regra da Dra.).', comPergunta: true },
  { id: 'agendado', grupo: 'agenda', titulo: 'Confirmação da reunião', ajuda: 'Depois do "sim": a reunião já está na agenda da Dra. {quando} vira "Segunda-feira, 12/10, às 15:00" e {link} o link do Google Meet.', exige: ['{quando}', '{link}'], semPergunta: true },
  { id: 'sem_reuniao', grupo: 'paradas', titulo: 'Renda abaixo de R$ 10 mil', ajuda: 'A Anna não marca reunião: registra o caso para a equipe e para de responder.', semPergunta: true },
  { id: 'passa_humano', grupo: 'paradas', titulo: 'Passagem para a equipe', ajuda: 'Pediu uma pessoa, perguntou se é robô, já é cliente, quer remarcar ou o assunto é de outra área.', semPergunta: true },
  { id: 'sem_agenda', grupo: 'paradas', titulo: 'Sem horário na agenda', ajuda: 'Google Agenda fora do ar ou sem horário livre nos próximos dias: a equipe confirma o horário.', semPergunta: true },
  { id: 'desistiu', grupo: 'paradas', titulo: 'Lead que não quer continuar', ajuda: 'O card vai para "Não quer continuar".', semPergunta: true },
  { id: 'possui_advogado', grupo: 'paradas', titulo: 'Lead que já tem advogado no caso', ajuda: 'Resposta pronta da Dra. (ética da OAB). Depois dela a equipe assume.', semPergunta: true },
  { id: 'pendente_q1', grupo: 'retomadas', titulo: 'Retomada da 1ª pergunta', ajuda: 'Quando o lead faz uma pergunta no meio do roteiro, a Anna responde e emenda esta pergunta para voltar ao ponto.', comPergunta: true },
  { id: 'pendente_q2', grupo: 'retomadas', titulo: 'Retomada da 2ª pergunta', ajuda: 'Emendada depois de uma resposta livre enquanto faltam os valores de renda.', comPergunta: true },
  { id: 'pendente_q3', grupo: 'retomadas', titulo: 'Retomada da 3ª mensagem', ajuda: 'Emendada depois de uma resposta livre na 3ª mensagem.', comPergunta: true },
  { id: 'pendente_preferencia', grupo: 'retomadas', titulo: 'Retomada de manhã ou tarde', ajuda: 'Emendada depois de uma resposta livre enquanto a Anna espera o período.', comPergunta: true },
  { id: 'fatos', grupo: 'fatos', titulo: 'O que a Anna pode responder', ajuda: 'Os fatos do escritório que ela usa, com as palavras dela e em no máximo 2 frases, quando o lead pergunta algo fora do roteiro (reunião, endereço, presencial, OAB). Estratégia e honorários ficam para a reunião.' },
] as const satisfies readonly Meta[]

export type ItemId = (typeof ITENS)[number]['id']
export type Textos = Record<ItemId, string>

/** Informação nova que a equipe pediu para a Anna saber (vira uma seção no fim do prompt). */
export interface Extra { id: string; titulo: string; texto: string }

export const ehExtraId = (id: string) => /^extra_[a-z0-9]{4,16}$/.test(id)

export const GRUPOS: Record<string, string> = {
  roteiro: 'Roteiro da Dra. (as mensagens na ordem da conversa)',
  agenda: 'Agendamento',
  paradas: 'Quando a Anna para e a equipe assume',
  retomadas: 'Retomadas (depois de uma dúvida do lead)',
  fatos: 'O que ela sabe responder',
}

export const ehItem = (id: string): id is ItemId => ITENS.some(i => i.id === id)
const meta = (id: ItemId): Meta => ITENS.find(i => i.id === id)!

const BLOCO = /<!-- base:([a-z_]+) -->(\n?)([\s\S]*?)(\n?)<!-- \/base -->/g

/** Os textos padrão: os do código + o bloco do prompt. */
export function textosPadrao(template: string): Textos {
  const out: Partial<Textos> = { ...(TEXTOS_PADRAO as Record<TextoId, string>) }
  for (const m of template.matchAll(BLOCO)) {
    const id = m[1]
    if (!ehItem(id)) throw new Error(`marcador desconhecido no prompt: base:${id}`)
    out[id] = m[3]
  }
  const faltam = ITENS.filter(i => out[i.id] === undefined).map(i => i.id)
  if (faltam.length) throw new Error(`itens sem texto padrão: ${faltam.join(', ')}`)
  return out as Textos
}

/** Só os textos do roteiro (o que lib/anna/textos.ts usa), para comTextos(). */
export const textosDoRoteiro = (t: Textos): Record<TextoId, string> =>
  Object.fromEntries(Object.keys(TEXTOS_PADRAO).map(id => [id, t[id as ItemId]])) as Record<TextoId, string>

/** Seção com as informações acrescentadas pela equipe (só existe se houver alguma). */
export function secaoExtras(extras: Extra[]): string {
  if (!extras.length) return ''
  return [
    '',
    '',
    '## Informações cadastradas pela equipe da Dra. Carolina',
    'Use quando o lead perguntar sobre isto. Responda com as suas palavras, em no máximo 2 frases e sem pergunta, sem inventar além do que está aqui. Estratégia e honorários continuam sendo assunto da reunião com a Dra.',
    ...extras.map(e => `\n**${e.titulo}**\n${e.texto}`),
  ].join('\n')
}

/** Prompt final: o bloco marcado vira o texto vigente (ou o padrão), sem os marcadores; extras no fim. */
export function renderPrompt(template: string, textos: Partial<Textos> = {}, extras: Extra[] = []): string {
  const corpo = template.replace(BLOCO, (_t, id: string, _nl1: string, padrao: string) => {
    if (!ehItem(id)) throw new Error(`marcador desconhecido no prompt: base:${id}`)
    return textos[id] ?? padrao
  })
  return extras.length ? corpo.replace(/\s*$/, '') + secaoExtras(extras) + '\n' : corpo
}

/** Vigente = padrão + o que foi publicado por cima (só ids conhecidos). */
export function mesclar(padrao: Textos, ...camadas: Array<Partial<Record<string, string>> | undefined | null>): Textos {
  const out = { ...padrao }
  for (const c of camadas) for (const [id, v] of Object.entries(c || {})) if (ehItem(id) && typeof v === 'string') out[id] = v
  return out
}

const MAX = 2500
/** regras do texto que o lead lê; "fatos" e informações acrescentadas são instrução para a Anna, não mensagem */
const SO_MENSAGEM = new Set(['pediu documento', 'prometeu resultado', 'falou de honorários'])

/** Trava em código antes do exame: o que a Anna nunca pode mandar não entra na base. */
export function validarTexto(id: string, texto: string): string[] {
  const extra = ehExtraId(id)
  if (!ehItem(id) && !extra) return ['item desconhecido']
  const t = String(texto ?? '')
  const out: string[] = []
  const max = extra ? 1500 : id === 'fatos' ? 5000 : MAX
  if (!t.trim()) out.push('O texto está vazio.')
  if (t.length > max) out.push(`O texto passou de ${max} caracteres (tem ${t.length}).`)
  if (/<!--|-->|\{\{|^#+ /m.test(t)) out.push('O texto tem marcação de sistema (<!--, -->, {{ ou título com #).')
  const instrucao = extra || id === 'fatos'
  if (!instrucao) {
    const m = meta(id as ItemId)
    for (const v of m.exige || []) if (t.split(v).length - 1 !== 1) out.push(`O texto precisa ter ${v} uma vez (é onde entra o valor certo de cada lead).`)
    const permitidas = new Set(['{saudacao}', '{desconto}', '{quando}', '{link}'].filter(v => (m.exige as string[] | undefined)?.includes(v) || (id === 'pergunta1' && v === '{saudacao}')))
    for (const v of t.match(/\{[a-z_]+\}/g) || []) if (!permitidas.has(v)) out.push(`${v} não existe neste texto (não vai virar nada para o lead).`)
    if (m.semPergunta && /\?/.test(t)) out.push('Este texto não pode ter pergunta: depois dele a Anna para ou a equipe assume.')
    if (m.comPergunta && !/\?/.test(t)) out.push('Este texto precisa terminar em pergunta: é o que leva o lead ao próximo passo.')
  }
  // as travas olham a mensagem como o lead vai ler (variáveis preenchidas com um exemplo)
  const exemplo = t.replace(/\{saudacao\}/g, 'Olá, Maria.').replace(/\{desconto\}/g, 'R$ 2.000').replace(/\{quando\}/g, 'HOJE às 15:00').replace(/\{link\}/g, 'https://meet.google.com/abc-defg-hij')
  for (const v of checkReply(exemplo, REGRAS_CLIENTE)) {
    if (['mais de uma pergunta', 'vazio'].includes(v.regra)) continue
    if (instrucao && SO_MENSAGEM.has(v.regra)) continue
    // a confirmação da Dra. pede para ter os documentos em mãos NA reunião: é texto dela, não pedido de envio
    if (id === 'agendado' && v.regra === 'pediu documento') continue
    const porque: Record<string, string> = {
      'travessão': 'tem travessão (use vírgula, ponto ou dois-pontos)',
      'disse que é IA': 'diz que é IA, robô ou assistente virtual',
      'pediu documento': 'pede para mandar documento',
      'falou de honorários': 'fala de valor de honorários, parcela ou porcentagem',
      'prometeu resultado': 'promete resultado ("garantido", "com certeza vamos")',
      'emoji': 'tem emoji',
    }
    out.push(`O texto ${porque[v.regra] || v.regra}${v.trecho ? `: "${v.trecho}"` : ''}.`)
  }
  if (/espero ter ajudado|fico [àa] disposi[cç][aã]o/i.test(exemplo)) out.push('O texto tem frase de robô ("espero ter ajudado", "fico à disposição").')
  return out
}

export function validarExtra(e: Extra): string[] {
  const out: string[] = []
  if (!ehExtraId(e.id)) out.push('id inválido')
  if (!e.titulo?.trim() || e.titulo.length > 80) out.push('O título precisa ter de 1 a 80 caracteres.')
  if (/[*#<>]/.test(e.titulo || '')) out.push('O título não pode ter *, #, < ou >.')
  return [...out, ...validarTexto(e.id, e.texto)]
}

/**
 * Troca exata feita pela IA: "de" precisa aparecer UMA vez no texto atual.
 * É isso que garante que a IA muda só o trecho pedido (o resto fica idêntico).
 */
export function aplicarTroca(texto: string, de: string, para: string): { texto?: string; erro?: string } {
  if (!de) return { erro: 'trecho "de" vazio' }
  const n = texto.split(de).length - 1
  if (n === 0) return { erro: `o trecho "${de.slice(0, 80)}" não existe no texto atual (copie exatamente, com asteriscos e pontuação)` }
  if (n > 1) return { erro: `o trecho "${de.slice(0, 80)}" aparece ${n} vezes; use um trecho maior, que apareça uma vez só` }
  return { texto: texto.replace(de, () => para) }
}

/** Diferença entre dois conjuntos de textos (ids que mudaram). */
export function mudancas(antes: Textos, depois: Textos): ItemId[] {
  return ITENS.map(i => i.id).filter(id => antes[id] !== depois[id])
}

/**
 * O exame confere se a mensagem enviada trouxe o texto da base (o da versão candidata):
 * pelo menos 60% das palavras com 4 letras ou mais do texto aparecem na mensagem.
 */
export function trouxeTexto(resposta: string, texto: string): boolean {
  const palavras = (s: string) => new Set(s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-z0-9]{4,}/g) || [])
  const alvo = palavras(resposta)
  const base = [...palavras(texto)]
  if (!base.length) return true
  return base.filter(p => alvo.has(p)).length / base.length >= 0.6
}
