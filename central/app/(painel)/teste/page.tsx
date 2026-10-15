'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bot, CalendarCheck, ChevronDown, ClipboardList, Columns3, FlaskConical, ListChecks, PenLine, RotateCcw, Send, StickyNote, Tags, Timer } from 'lucide-react'
import CorrigirPainel from '@/components/CorrigirPainel'
import { PageIntro, SectionTitle } from '@/components/ProductUI'
import { brl, dataHora, ETAPA_ROTULO } from '@/lib/format'
import type { MsgConversa, TesteOpcoes, TesteSessao, TesteUso } from '@/lib/types'

const SUGESTOES = [
  'quero as duas',
  'ganho 12 mil bruto, líquido 3.800 e o banco tira 2 mil da conta',
  'quanto custa a consulta?',
  'isso é robô?',
  'pode ser amanhã de manhã?',
  'já tenho advogado nesse processo',
]

/** Campos do card (as chaves vêm do CRM_MAP do agente) com o nome que aparece no Kommo. */
const CAMPO: Record<string, string> = {
  primeiroNome: 'IA - Primeiro nome', objetivo: 'IA - Objetivo', rendaBruta: 'IA - Renda bruta', rendaLiquida: 'IA - Renda líquida',
  descontoConta: 'IA - Desconto em conta', horarioReuniao: 'IA - Horário da reunião', linkMeet: 'IA - Link do Meet',
  reuniao: 'Reunião', agendamento: 'Agendamento',
}
const OBJETIVO: Record<string, string> = { '1': '1 · suspender os descontos', '2': '2 · reestruturar as dívidas', '3': '3 · as duas' }
const DINHEIRO = new Set(['rendaBruta', 'rendaLiquida', 'descontoConta'])

function valorCampo(k: string, v: string) {
  if (k === 'objetivo') return OBJETIVO[v] || v
  if (DINHEIRO.has(k) && v.trim() !== '' && !Number.isNaN(Number(v))) return brl(Number(v), Number(v) % 1 ? 2 : 0)
  return v
}

const REGUA: Record<string, string> = {
  qualificacao: 'follow-up de qualificação',
  agendamento: 'follow-up de agendamento',
  pos_proposta: 'follow-up pós-proposta',
  cancelada: 'follow-up cancelado',
}

/** Etapas em que a Anna já cancelou a régua (reunião marcada, renda até 15 mil, passagem ou desistência). */
const FIM_DO_ROTEIRO = new Set(['agendado', 'sem_reuniao', 'humano'])

/** O laboratório registra cada vez que a régua (re)começa: mostra a sequência sem repetição e se ela já foi cancelada. */
function resumoReguas(reguas: string[], etapa?: string) {
  const seq = reguas.filter((r, i) => r !== 'cancelada' && r !== reguas[i - 1])
  const cancelada = reguas.includes('cancelada') || (!!etapa && FIM_DO_ROTEIRO.has(etapa))
  return `${seq.map(r => REGUA[r] || r).join(' → ') || 'nenhum'}${cancelada ? '. Cancelado: o roteiro terminou.' : ''}`
}

const PADRAO: TesteOpcoes = { inicio: 'lead_escreve', agenda: 'livre', versao: 'vigente' }

function novoId() {
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

export default function Teste() {
  const [id, setId] = useState<string | null>(null)
  const [sessao, setSessao] = useState<TesteSessao | null>(null)
  const [uso, setUso] = useState<TesteUso | null>(null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [demo, setDemo] = useState(false)
  const lista = useRef<HTMLDivElement>(null)
  const [corrigindo, setCorrigindo] = useState<string | null>(null)
  const [correcoes, setCorrecoes] = useState<Record<string, MsgConversa>>({})
  const opcoes = sessao?.opcoes || PADRAO

  const aplicar = (d: { sessao?: TesteSessao | null; uso?: TesteUso; error?: string; erro?: string; demo?: boolean }) => {
    if (d.sessao !== undefined) setSessao(d.sessao)
    if (d.uso) setUso(d.uso)
    if (d.demo) setDemo(true)
    setErro(d.erro || d.error || null)
  }

  const recomecar = useCallback(async (sid: string, o: Partial<TesteOpcoes>) => {
    setErro(null)
    const r = await fetch('/api/teste', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessao: sid, acao: 'recomecar', opcoes: o }) })
    aplicar(await r.json())
  }, [])

  // Sessão do laboratório: um id por navegador (fica 6 h no agente)
  useEffect(() => {
    let sid = ''
    try { sid = localStorage.getItem('teste-sessao') || '' } catch { /* modo privado */ }
    if (!/^[\w-]{8,64}$/.test(sid)) { sid = novoId(); try { localStorage.setItem('teste-sessao', sid) } catch { /* idem */ } }
    setId(sid)
    const pedida = new URLSearchParams(window.location.search).get('versao')
    if (pedida === 'rascunho') { recomecar(sid, { versao: 'rascunho' }); window.history.replaceState(null, '', '/teste'); return }
    fetch(`/api/teste?sessao=${sid}`).then(r => r.json()).then(aplicar).catch(e => setErro(String(e)))
  }, [recomecar])

  // rola só a caixa da conversa (a página fica onde está)
  useEffect(() => { const l = lista.current; if (l) l.scrollTop = l.scrollHeight }, [sessao?.history.length, enviando])

  const enviar = async (msg = texto) => {
    const t = msg.trim()
    if (!t || !id || enviando) return
    setEnviando(true)
    setErro(null)
    setTexto('')
    // mostra a mensagem na hora; a resposta substitui a sessão inteira
    setSessao(s => s ? { ...s, history: [...s.history, { id: `tmp${Date.now()}`, dir: 'in', text: t, ts: Date.now() }] } : s)
    try {
      const r = await fetch('/api/teste', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessao: id, texto: t }) })
      const d = await r.json()
      if (!r.ok && !d.sessao) {
        // não entrou: devolve o texto para o campo
        setSessao(s => s ? { ...s, history: s.history.filter(m => !m.id.startsWith('tmp')) } : s)
        setTexto(t)
      }
      aplicar(d)
    } catch (e) {
      setErro(`Não consegui falar com o agente: ${e instanceof Error ? e.message : String(e)}`)
      setTexto(t)
    } finally {
      setEnviando(false)
    }
  }

  const trocar = (o: Partial<TesteOpcoes>) => { if (id) recomecar(id, { ...opcoes, ...o }) }
  const historia = sessao?.history || []
  const mundo = sessao?.mundo
  const fechado = mundo?.state.etapa === 'humano'
  const usdBrl = uso?.usdBrl || 5.4

  return (
    <div className="space-y-8">
      <PageIntro eyebrow="TESTE" title="Converse com a Anna," accent="sem risco." description="Mesmo roteiro, mesmo intérprete e mesmas travas do WhatsApp. Nada vai para o Kommo, para o WhatsApp nem para a agenda da Dra." />

      {demo && <p className="text-[12px] text-warning">Modo demonstração: a conversa abaixo é um exemplo. Para conversar de verdade, a Central precisa do agente.</p>}

      <section className="panel p-4 md:p-5 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Opcao rotulo="Início" valor={opcoes.inicio} onChange={v => trocar({ inicio: v as TesteOpcoes['inicio'] })}
          itens={[['lead_escreve', 'Lead escreve'], ['formulario', 'Formulário']]} />
        <Opcao rotulo="Agenda da Dra." valor={opcoes.agenda} onChange={v => trocar({ agenda: v as TesteOpcoes['agenda'] })}
          itens={[['livre', 'Com horário'], ['cheia', 'Sem horário']]} />
        <Opcao rotulo="Textos" valor={opcoes.versao} onChange={v => trocar({ versao: v as TesteOpcoes['versao'] })}
          itens={[['vigente', 'No ar'], ['rascunho', 'Rascunho']]} />
        <button type="button" onClick={() => id && recomecar(id, opcoes)} className="ml-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-[8px] border border-line-soft text-[12px] text-body-mid hover:text-ink hover-raise">
          <RotateCcw size={13} /> Recomeçar
        </button>
      </section>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
        <section className="panel overflow-hidden flex flex-col min-h-[520px]">
          <div ref={lista} className="flex-1 p-4 md:p-5 space-y-3 overflow-y-auto max-h-[62vh] scroll-thin">
            {!historia.length && (
              <div className="py-8 text-center">
                <FlaskConical size={20} className="text-cyan mx-auto" />
                <p className="text-[13px] text-body-mid mt-3">Escreva como um lead escreveria no WhatsApp, ou comece por um destes:</p>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {SUGESTOES.map(s => (
                    <button key={s} type="button" onClick={() => enviar(s)} disabled={enviando || demo}
                      className="px-3 py-2 rounded-full border border-line-soft text-[11.5px] text-body-mid hover:text-ink hover:border-cyan/25 disabled:opacity-40">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {historia.map(m => {
              const d = sessao?.detalhes[m.id]
              const modelo = m.id === 'r0' && opcoes.inicio === 'formulario'
              return (
                <div key={m.id} className={`flex ${m.dir === 'in' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[86%] md:max-w-[78%] ${m.dir === 'in' ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className={`rounded-[12px] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words ${
                      m.dir === 'in' ? 'bg-cyan/[0.12] border border-cyan/25 text-ink rounded-br-[4px]' : 'surface-alt border border-line-soft text-ink rounded-bl-[4px]'}`}>
                      {m.text}
                    </div>
                    {modelo && <span className="font-mono text-[9px] text-body-faint mt-1">MODELO APROVADO PELA META · ENVIADO NA ENTRADA DO LEAD</span>}
                    {d && (
                      <div className="flex items-start gap-3 flex-wrap">
                        <Detalhes d={d} usdBrl={usdBrl} />
                        {!demo && (
                          <button type="button" onClick={() => setCorrigindo(m.id)} className={`mt-1 inline-flex items-center gap-1 text-[10.5px] font-medium ${correcoes[m.id] ? 'text-success' : 'text-cyan'} hover:underline`}>
                            <PenLine size={11} /> {correcoes[m.id] ? 'corrigida · ver' : 'Corrigir'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {enviando && <div className="text-[11.5px] text-body-muted animate-pulse">A Anna está escrevendo… (pode levar uns 15 segundos)</div>}
          </div>

          <div className="border-t border-line-soft p-3 md:p-4">
            {erro && <p className="text-[12px] text-warning mb-2">{erro}</p>}
            {fechado ? (
              <div className="flex items-center justify-between gap-3 text-[12.5px] text-body-mid">
                <span>A Anna parou aqui. No WhatsApp, daqui em diante quem responde é a equipe.</span>
                <button type="button" onClick={() => id && recomecar(id, opcoes)} className="shrink-0 inline-flex items-center gap-1.5 text-cyan text-[12px]"><RotateCcw size={12} /> Recomeçar</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={1} placeholder="Escreva como o lead…" disabled={demo}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
                  className="campo flex-1 rounded-[10px] px-3.5 py-2.5 text-[13.5px] resize-none min-h-[44px] max-h-40" />
                <button type="button" onClick={() => enviar()} disabled={!texto.trim() || enviando || demo} aria-label="Enviar"
                  className="px-4 rounded-[10px] border border-cyan/30 bg-cyan/[0.12] text-cyan disabled:opacity-30"><Send size={16} /></button>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="panel p-5">
            <SectionTitle eyebrow="NO KOMMO, ISSO FARIA" title="O que mudaria no card." />
            <div className="space-y-4 text-[12.5px]">
              <Linha icon={Columns3} rotulo="Coluna do card" valor={mundo?.coluna || 'SDR › CONTATO INICIAL'} />
              <Linha icon={ListChecks} rotulo="Etapa do roteiro" valor={mundo?.state.etapa ? (ETAPA_ROTULO[mundo.state.etapa] || mundo.state.etapa) : 'Ainda não começou'} />
              <div className="flex items-start gap-3">
                <Tags size={14} className="text-cyan shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-body-muted text-[11px]">Tags</div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {(mundo?.tags || ['ia']).map(t => <span key={t} className="font-mono text-[10px] px-2 py-0.5 rounded border border-line-soft text-ink">{t}</span>)}
                  </div>
                </div>
              </div>
              {mundo && Object.keys(mundo.campos).length > 0 && (
                <div>
                  <div className="text-body-muted text-[11px] mb-1.5">Campos preenchidos</div>
                  <dl className="space-y-1.5">
                    {Object.entries(mundo.campos).filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} className="grid grid-cols-[124px_1fr] gap-2"><dt className="text-body-faint text-[11px]">{CAMPO[k] || k}</dt><dd className="text-ink text-[11.5px] break-words">{valorCampo(k, v)}</dd></div>
                    ))}
                  </dl>
                </div>
              )}
              {mundo?.reuniao && (
                <div className="rounded-[8px] border border-success/30 bg-success/[0.06] p-3">
                  <div className="font-mono text-[9px] tracking-[0.1em] text-success inline-flex items-center gap-1.5"><CalendarCheck size={11} /> REUNIÃO NA AGENDA DA DRA. (SIMULADA)</div>
                  <p className="text-[12px] text-ink mt-1.5 break-words">{/^\d{4}-\d{2}-\d{2}T/.test(mundo.reuniao.quando) ? dataHora(mundo.reuniao.quando) : mundo.reuniao.quando}</p>
                  <p className="text-[11px] text-body-mid mt-0.5 break-all">{mundo.reuniao.link}</p>
                </div>
              )}
              {mundo && mundo.reguas.length > 0 && (
                <Linha icon={Timer} rotulo="Follow-up" valor={resumoReguas(mundo.reguas, mundo.state.etapa)} />
              )}
              {mundo && mundo.tarefas.length > 0 && (
                <Lista icon={ClipboardList} rotulo="Tarefas para a Dra." itens={mundo.tarefas} destaque />
              )}
              {mundo && mundo.notas.length > 0 && (
                <Lista icon={StickyNote} rotulo="Notas no card" itens={mundo.notas} />
              )}
            </div>
          </section>
          <p className="text-[10.5px] text-body-faint leading-relaxed px-1">
            {sessao ? `Esta conversa: ${sessao.turnos} mensagem(ns), ${brl(sessao.custoUsd * usdBrl, 3)} de modelo. ` : ''}
            {uso ? `Laboratório hoje: ${uso.mensagens} de ${uso.limite} mensagens, ${brl(uso.custoUsd * usdBrl, 2)}.` : ''} Fotos e áudios não entram no teste. A pausa de 30 minutos depois da 4ª mensagem é pulada: a 5ª sai na hora.
          </p>
        </aside>
      </div>

      {corrigindo && id && sessao && (() => {
        const i = sessao.history.findIndex(m => m.id === corrigindo)
        if (i < 0) return null
        const ultimaOut = sessao.history.slice(0, i).map(m => m.dir).lastIndexOf('out')
        const cliente = sessao.history.slice(ultimaOut + 1, i).filter(m => m.dir === 'in').map(m => m.text).join('\n')
        return (
          <CorrigirPainel origem="teste" cliente={cliente} resposta={sessao.history[i].text}
            pedido={{ acao: 'corrigir', sessao: sessao.id, mensagem: corrigindo }} resultado={correcoes[corrigindo]}
            onResultado={r => setCorrecoes(c => ({ ...c, [corrigindo]: r }))}
            onFechar={() => setCorrigindo(null)}
            onTestarRascunho={() => { setCorrigindo(null); recomecar(id, { ...opcoes, versao: 'rascunho' }) }} />
        )
      })()}
    </div>
  )
}

function Opcao({ rotulo, valor, itens, onChange }: { rotulo: string; valor: string; itens: Array<[string, string]>; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 min-w-0 max-w-full">
      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-body-muted">{rotulo}</span>
      <div className="segmented max-w-full overflow-x-auto no-scrollbar">
        {itens.map(([v, l]) => <button key={v} type="button" onClick={() => v !== valor && onChange(v)} className={`whitespace-nowrap ${v === valor ? 'active' : ''}`}>{l}</button>)}
      </div>
    </div>
  )
}

function Linha({ icon: Icon, rotulo, valor }: { icon: typeof Bot; rotulo: string; valor: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={14} className="text-cyan shrink-0 mt-0.5" />
      <div className="min-w-0"><div className="text-body-muted text-[11px]">{rotulo}</div><div className="text-ink mt-0.5 break-words">{valor}</div></div>
    </div>
  )
}

function Lista({ icon: Icon, rotulo, itens, destaque }: { icon: typeof Bot; rotulo: string; itens: string[]; destaque?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={14} className="text-cyan shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="text-body-muted text-[11px]">{rotulo}</div>
        <ul className="mt-1.5 space-y-1.5">
          {itens.map((t, i) => (
            <li key={i} className={`rounded-[6px] px-2.5 py-2 text-[11.5px] leading-relaxed whitespace-pre-wrap break-words ${destaque ? 'border border-purple-400/30 bg-purple-400/[0.06] text-ink' : 'surface-alt text-body-mid'}`}>{t}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Detalhes({ d, usdBrl }: { d: TesteSessao['detalhes'][string]; usdBrl: number }) {
  const [aberto, setAberto] = useState(false)
  const resumo = [
    d.tools.length ? [...new Set(d.tools)].join(' · ') : 'sem ação no card',
    `${(d.ms / 1000).toFixed(1)} s`,
    brl(d.custoUsd * usdBrl, 3),
    d.guard.length ? `${d.guard.length} trava(s)` : '',
  ].filter(Boolean).join(' · ')
  return (
    <div className="mt-1 max-w-full">
      <button type="button" onClick={() => setAberto(v => !v)} className="inline-flex items-center gap-1 font-mono text-[9.5px] text-body-faint hover:text-body-mid text-left">
        {resumo} <ChevronDown size={10} className={aberto ? 'rotate-180' : ''} />
      </button>
      {aberto && (
        <div className="mt-1.5 rounded-[8px] border border-line-soft p-3 space-y-1.5 text-[11px] text-body-mid break-words">
          {d.log.map((l, i) => <div key={i}>· {l}</div>)}
          {d.guard.map((g, i) => <div key={`g${i}`} className="text-warning">trava: {g}</div>)}
          {!d.log.length && !d.guard.length && <div>Nada mudou no card nesta resposta.</div>}
        </div>
      )}
    </div>
  )
}
