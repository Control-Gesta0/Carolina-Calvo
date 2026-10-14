'use client'

import { AlertTriangle, CheckCircle2, Database, Server, Tags, Webhook } from 'lucide-react'
import RefreshButton from '@/components/RefreshButton'
import { PageIntro, SectionTitle } from '@/components/ProductUI'
import { dataHora, tempoRelativo } from '@/lib/format'
import { useExecutions, useLive } from '@/lib/hooks'
import type { LiveData } from '@/lib/types'

/** Os dois webhooks que o Kommo chama no agente. */
const WEBHOOK: Record<string, { titulo: string; ajuda: string }> = {
  inbound: { titulo: 'Mensagens do WhatsApp', ajuda: 'O Kommo avisa a Anna a cada mensagem que chega no WhatsApp oficial.' },
  lead: { titulo: 'Leads novos do formulário', ajuda: 'O Kommo avisa quando entra lead do formulário, para o modelo "Anna - Primeiro contato".' },
}

export default function Configuracoes() {
  const { data: live, erro: liveErro, carregando } = useLive()
  const { data: exec, erro: execErro } = useExecutions()
  const crmOk = !!live && live.saude.crmOk && !liveErro

  return (
    <div className="space-y-8">
      <PageIntro eyebrow="SISTEMA" title="Conexões da" accent="Anna." description="Se o agente e o Kommo estão respondendo, se os avisos do Kommo estão chegando e quem ela atende. Somente leitura." action={<RefreshButton />} />

      <section>
        <div className="grid md:grid-cols-3 gap-3">
          <Linha icon={Server} titulo="Agente (diário de execuções)" ok={!!exec && !execErro && !exec.saude24h.erros} carregando={!exec && !execErro}
            texto={execErro || (exec ? `${exec.saude24h.erros ? `${exec.saude24h.erros} erro(s) em ${exec.saude24h.total} execuções nas últimas 24h` : `sem erro nas últimas 24h (${exec.saude24h.total} execuções)`} · ${exec.cobertura.registros} no diário · modelo ${exec.modelo}` : 'verificando…')} />
          <Linha icon={Database} titulo="CRM (Kommo)" ok={crmOk} carregando={carregando}
            texto={liveErro || (live ? (live.saude.crmOk ? `Mapa conferido com a conta: funis ${live.pipeline.nome}, campos da Anna, tags e modelos batem · ${live.leads.abertas} leads abertos` : `${live.saude.problemas.length} ponto(s) para conferir no Kommo`) : 'verificando…')} />
          <Linha icon={Tags} titulo="Quem a Anna atende" ok neutro carregando={!live}
            texto={live ? regraGate(live.regras) : 'verificando…'} />
        </div>
      </section>

      {live && live.saude.problemas.length > 0 && (
        <section className="panel p-5 md:p-6">
          <SectionTitle eyebrow="DIVERGÊNCIAS NO KOMMO" title="O que conferir no Kommo." description="Campo, etapa, tag ou modelo que mudou no Kommo faz a Anna gravar no lugar errado ou deixar de enviar. Peça a conferência para a Control Gestão." />
          <ul className="space-y-2">
            {live.saude.problemas.map(p => <li key={p} className="text-[12.5px] text-warning flex gap-2"><AlertTriangle size={14} className="shrink-0 mt-0.5" />{p}</li>)}
          </ul>
        </section>
      )}

      {live?.webhooks && (
        <section>
          <SectionTitle eyebrow="AVISOS DO KOMMO" title="O Kommo está entregando?" description="O último aviso de cada webhook e quantos chegaram nos últimos 7 dias. Sem aviso não há resposta da Anna." />
          <div className="grid md:grid-cols-2 gap-3">
            {Object.entries(live.webhooks).map(([rota, w]) => <WebhookLinha key={rota} rota={rota} w={w} />)}
          </div>
        </section>
      )}

      {live && (
        <section className="panel p-5 md:p-6">
          <SectionTitle eyebrow="AGENDA E FOLLOW-UP" title="Quando a Anna age sozinha." />
          <p className="text-[12.5px] text-body-mid leading-relaxed">{primeiraMaiuscula(live.regras.expediente)}.</p>
          <p className="text-[11.5px] text-body-faint leading-relaxed mt-2">Fora disso o follow-up espera as 7h do dia seguinte. Mudança de horário, de régua ou de modelo é pedido para a Control Gestão.</p>
        </section>
      )}
    </div>
  )
}

const primeiraMaiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

function regraGate(r: LiveData['regras']) {
  if (r.modoGate === 'desligada') return 'Desligada: a Anna não responde ninguém.'
  const base = r.modoGate === 'todos' ? 'Todos os leads' : `Só leads com a tag "${r.gateTag}"`
  return `${base}, exceto quem tem "${r.humanTag}" ou a tag "cliente". Na passagem, "${r.gateTag}" sai e "${r.humanTag}" entra. Se alguém da equipe escrever pelo Kommo, ela fica 6 horas sem responder aquele lead.`
}

function WebhookLinha({ rota, w }: { rota: string; w: NonNullable<LiveData['webhooks']>[string] }) {
  const meta = WEBHOOK[rota] || { titulo: rota, ajuda: '' }
  const ok = !!w.ultimo
  return (
    <div className="panel p-5 flex items-start gap-4">
      <span className="metric-icon text-cyan bg-cyan/[0.07] border-cyan/20 shrink-0"><Webhook size={15} /></span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium text-ink">{meta.titulo}</span>
          {ok ? <CheckCircle2 size={13} className="text-success" /> : <AlertTriangle size={13} className="text-warning" />}
          <span className="font-mono text-[9.5px] text-body-faint ml-auto">{w.recebidos7d.toLocaleString('pt-BR')} em 7 dias</span>
        </div>
        <p className="text-[11.5px] text-body-muted leading-relaxed mt-1">{meta.ajuda}</p>
        <p className={`text-[12px] leading-relaxed mt-2 break-words ${ok ? 'text-body-mid' : 'text-warning'}`}>
          {w.ultimo ? `Último aviso ${tempoRelativo(w.ultimo.em)} (${dataHora(w.ultimo.em)}): ${w.ultimo.resultado}` : 'Nenhum aviso nos últimos 7 dias.'}
        </p>
      </div>
    </div>
  )
}

function Linha({ icon: Icon, titulo, texto, ok, neutro, carregando }: { icon: typeof Server; titulo: string; texto: string; ok: boolean; neutro?: boolean; carregando?: boolean }) {
  const cor = carregando ? 'text-body-muted' : neutro ? 'text-body-muted' : ok ? 'text-success' : 'text-warning'
  return (
    <div className="panel p-5 flex items-start gap-4">
      <span className="metric-icon text-cyan bg-cyan/[0.07] border-cyan/20 shrink-0"><Icon size={15} /></span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-ink">{titulo}</span>
          {!carregando && !neutro && (ok ? <CheckCircle2 size={13} className={cor} /> : <AlertTriangle size={13} className={cor} />)}
        </div>
        <p className={`text-[12px] leading-relaxed mt-1 break-words ${ok || neutro ? 'text-body-mid' : cor}`}>{texto}</p>
      </div>
    </div>
  )
}
