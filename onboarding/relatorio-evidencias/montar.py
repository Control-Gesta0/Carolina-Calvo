# Monta relatorio.html: relatório de evidências dos testes internos (29/10/2026).
# Dados: diário da Anna e registros de envio do Kommo dos cards de teste 28932022 (11) e 29046218 (41).
# Uso: python3 montar.py  →  depois: NODE_PATH=$(npm root -g) node gerar-pdf.cjs relatorio.html "../Relatório de testes - 29-10.pdf"
import html
e = html.escape

def tag(s):
    return {'ok': '<span class="tag ok">comprovado</span>', 'parcial': '<span class="tag parcial">comprovado em parte</span>',
            'andamento': '<span class="tag pend">em andamento</span>'}[s]

PONTOS = [
    ('1. Envio e entrega da 1ª mensagem a um lead novo, sem conversa anterior', 'andamento',
     'A correção está pronta do lado da Anna: no lead de formulário, a saudação passa a sair por um robô do próprio Kommo, com o modelo aprovado pela Meta, já com o seu texto novo, e a Anna confere que ela saiu. Falta o modelo "Anna - Primeiro contato v2" ser aprovado pela Meta e o robô de saudação ser ligado no Kommo. O teste com um número que nunca falou com o escritório vai como complemento deste relatório.'),
    ('2. Início automático da qualificação quando o lead responde', 'ok',
     'Teste do número (41) em 26/10: o lead respondeu e a Anna seguiu o roteiro sozinha até o agendamento, sem ninguém da equipe (seção 2).'),
    ('3. Régua de follow-ups com tempos reais, inclusive fora da janela de 24 horas', 'parcial',
     'Teste do número (11), sem encurtar nenhum intervalo. Follow 1 em 27/10 às 07:00 (dentro da janela). Follow 2 em 28/10 às 07:00, cerca de 36 horas depois da última mensagem do lead, ou seja, fora da janela, com o modelo aprovado. O Follow 3 (30/10) e o Follow 4 (02/11) vão como complemento.'),
    ('4. Situação de cada envio: programada, tentativa, enviada e entrega confirmada', 'ok',
     'Cada mensagem aparece na seção 2 com a hora programada, a hora em que o Kommo registrou a saída pelo seu WhatsApp e a prova de entrega (selo "Entregue/Lida" no Kommo ou print do celular). Quando o registro de saída não aparece, a Anna anota no card que nada chegou ao lead.'),
    ('5. Nenhuma alteração na integração oficial e nenhuma credencial nova na Meta', 'ok',
     'Nada foi alterado na integração do WhatsApp nem na sua conta Meta. A única conexão nova é a do Google Agenda, que a senhora autorizou em 26/10.'),
]
pontos = ''.join(f"<tr><td><b>{e(t)}</b><br><span class='pequeno'>{e(d)}</span></td><td style='width:24%'>{tag(s)}</td></tr>" for t, s, d in PONTOS)

# (data/hora, quem, mensagem, programada, registro de saída no WhatsApp (Kommo), prova de entrega)
L11 = [
    ('26/10 18:43:43', 'lead', '"Oi"', '', '', ''),
    ('26/10 18:43:48', 'Anna', '1ª pergunta (modelo aprovado "Anna - Primeiro contato")', 'resposta imediata', '18:43:48', 'Kommo: "Entregue" (anexo A)'),
    ('27/10 07:00', 'Anna', 'Follow 1 (modelo aprovado "Follow 1")', '27/10 07:00', '07:00:09', 'print do celular (anexo B)'),
    ('27/10 08:15', 'equipe', '3 mensagens digitadas no Kommo sobre o texto da 1ª pergunta', '', '08:15:28 a 08:15:50', 'a Anna saiu do atendimento (regra correta); régua restaurada às 08:30 só para este teste'),
    ('28/10 07:00', 'Anna', 'Follow 2 (modelo aprovado "Follow 2"), <b>fora da janela de 24 h</b>', '28/10 07:00', '07:00:04 (e 07:00:14, duplicado: ver seção 4)', 'print do celular (anexo B)'),
    ('30/10 07:00', 'Anna', 'Follow 3 (modelo aprovado "Follow up 3")', '30/10 07:00', 'complemento', 'complemento'),
    ('02/11 07:00', 'Anna', 'Follow 4 (modelo aprovado "Follow up 4")', '02/11 07:00', 'complemento', 'complemento'),
]
L41 = [
    ('26/10 19:23:59', 'lead', '"Oi" (número que nunca tinha falado com o escritório)', '', '', ''),
    ('26/10 19:25:20', 'Anna', '1ª pergunta (modelo aprovado)', 'ao liberar o card de teste', '19:25:20', 'Kommo: "Lida" (anexo C)'),
    ('26/10 19:26:30', 'Anna', 'lead respondeu "2" → 2ª pergunta (os três valores)', 'resposta imediata', '19:26:30', 'Kommo: "Lida"'),
    ('26/10 19:27:02', 'Anna', 'lead informou só a renda (R$ 20.000) → card movido para SDR › ACIMA DE 15 MIL; pediu só o que faltava', 'resposta imediata', '19:27:02', 'Kommo: "Lida"'),
    ('26/10 19:27:32', 'Anna', 'lead: "Líquido uns 16, débito em conta" → mensagem do alívio (ver seção 4)', 'resposta imediata', '19:27:32', 'Kommo: "Lida" (anexo C)'),
    ('26/10 19:28:00', 'Anna', 'lead concordou → encaminhamento para a Dra. e nota com o resumo no card', 'resposta imediata', '19:28:00', 'Kommo: "Lida"'),
    ('26/10 20:00:07', 'Anna', 'oferta de horário: "AMANHÃ às 15:00", 30 minutos reais depois', '19:58', '20:00:07', 'Kommo (anexo D)'),
    ('26/10 22:07:59', 'Anna', 'lead aceitou → confirmação com o link do Google Meet; reunião criada na sua agenda; card em Closer › Reunião agendada', 'resposta imediata', '22:07:59', 'Kommo (anexo D)'),
    ('27/10 13:02 · 14:01 · 14:46', 'robô do escritório', 'lembretes de 2 h, 1 h e 15 min antes, a partir do campo "Reunião" preenchido pela Anna', 'pelas automações do escritório', '13:02:00 · 14:01:49 · 14:46:49', 'print do celular (anexo E)'),
    ('27/10 14:51', '—', 'reunião de teste apagada da sua agenda, como avisado', '', '', ''),
    ('28/10 14:00:06', 'Anna', 'pós-reunião, 23 h depois da reunião: "Ontem você esteve em reunião com a Dra. Carolina Calvo…"', '28/10 14:00', '14:00:06', 'registro do Kommo'),
]
def linhas(L):
    return ''.join(f"<tr><td style='white-space:nowrap'>{a}</td><td>{e(b)}</td><td>{c}</td><td>{e(d)}</td><td>{e(f)}</td><td>{e(g)}</td></tr>" for a, b, c, d, f, g in L)
CAB = "<tr><th>Quando</th><th>Quem</th><th>Mensagem</th><th>Programada</th><th>Saída registrada no WhatsApp</th><th>Entrega</th></tr>"

FALHAS = [
    ('26/10', '"débito em conta", sem dizer o valor, foi entendido como desconto zero, e saiu a versão "sem desconto" da mensagem do alívio.',
     'O desconto só é considerado zero quando o lead diz que não tem desconto. Sem valor, a Anna pergunta.'),
    ('28/10', 'O Follow 2 do número (11) saiu duas vezes (07:00:04 e 07:00:14). Causa: a restauração manual do teste depois da interrupção de 27/10 deixou duas tarefas iguais na fila.',
     'Cada etapa da régua agora sai uma única vez, mesmo com tarefa repetida na fila. A duplicata do Follow 3 foi removida.'),
    ('26/10', 'Ao terminar a autorização da agenda, a página mostrava erro, apesar de o acesso estar correto.',
     'A conferência final passou a usar só as permissões da Anna. A agenda foi testada logo em seguida.'),
    ('27/10', 'Mensagens enviadas pelos robôs antigos do Kommo (os lembretes) contam, para a Anna, como "a equipe escreveu", e ela sai do atendimento daquele card.',
     'Sem efeito no Closer, onde a Anna não conversa. Os robôs antigos que mandam mensagem a leads do SDR serão revistos na ativação.'),
]
falhas = ''.join(f"<tr><td style='white-space:nowrap'>{d}</td><td>{e(o)}</td><td>{e(c)}</td></tr>" for d, o, c in FALHAS)

ANEXOS = [
    ('A', 'Número (11): 1ª pergunta com o selo "Entregue" no Kommo (26/10, 18:43)', '../evidencias-testes/11-regua/2026-10-26_18h43_primeiro-contato_kommo-entregue.png'),
    ('B', 'Número (11): Follow 1 (27/10, 07:00), mensagens da equipe (08:15) e Follow 2 duplicado (28/10, 07:00), no celular', '../evidencias-testes/11-regua/2026-10-28_07h00_follow1-follow2-duplicado_whatsapp.png'),
    ('C', 'Número (41): qualificação, parte 1 (26/10, 19:25 a 19:27)', '../evidencias-testes/41-lead-novo/2026-10-26_19h25_qualificacao-parte1_kommo.png'),
    ('C', 'Número (41): qualificação, parte 2 (26/10, 19:27 a 19:28)', '../evidencias-testes/41-lead-novo/2026-10-26_19h27_qualificacao-parte2_kommo.png'),
    ('D', 'Número (41): oferta, aceite e confirmação com o link do Meet; card em Reunião agendada (26/10)', '../evidencias-testes/41-lead-novo/2026-10-26_22h07_agendado-meet_kommo.png'),
    ('E', 'Número (41): lembrete de 2 h (27/10, 13:02)', '../evidencias-testes/41-lead-novo/2026-10-27_13h02_lembrete-2h-robo-escritorio_celular.webp'),
    ('E', 'Número (41): lembretes de 1 h e 15 min (27/10, 14:01 e 14:46)', '../evidencias-testes/41-lead-novo/2026-10-27_14h01-14h46_lembretes-1h-15min-robo-escritorio_celular.webp'),
]
anexos = ''.join(f"<div class='anexo'><div class='leg'><b>Anexo {l}.</b> {e(t)}</div><img src='{p}'></div>" for l, t, p in ANEXOS)

H = f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de testes da Anna</title><style>
@page {{ size: A4; margin: 15mm 14mm 15mm 14mm; }}
body {{ font-family: 'Inter','Segoe UI',Arial,sans-serif; color:#1f2937; font-size:9.6pt; line-height:1.45; }}
h1 {{ font-size:19pt; color:#1e3a5f; margin:5mm 0 2mm; }} h2 {{ font-size:12.5pt; color:#1e3a5f; margin:6mm 0 2mm; border-bottom:2px solid #f05a28; padding-bottom:1mm; }}
h3 {{ font-size:10.2pt; margin:3.5mm 0 1mm; }} .kicker {{ color:#f05a28; font-weight:700; letter-spacing:.08em; font-size:8.3pt; text-transform:uppercase; }}
table {{ width:100%; border-collapse:collapse; margin:2mm 0; font-size:8.2pt; }} th,td {{ border-bottom:1px solid #e5e7eb; padding:1.4mm 1.6mm; text-align:left; vertical-align:top; }}
th {{ background:#f3f4f6; font-weight:600; }} tr {{ page-break-inside:avoid; }}
.tag {{ display:inline-block; padding:.3mm 2mm; border-radius:3mm; font-size:7.6pt; font-weight:600; }}
.tag.ok {{ background:#dcfce7; color:#166534; }} .tag.parcial {{ background:#fef9c3; color:#854d0e; }} .tag.pend {{ background:#e5e7eb; color:#374151; }}
.box {{ background:#f0f7ff; border-left:4px solid #1e3a5f; padding:2.5mm 4mm; margin:3mm 0; }}
ul {{ margin:1mm 0 2mm 5mm; padding-left:3mm; }} li {{ margin:.7mm 0; }} .quebra {{ page-break-before:always; }} .pequeno {{ font-size:8pt; color:#4b5563; }}
.anexo {{ page-break-inside:avoid; margin:4mm 0; }} .anexo img {{ max-width:100%; max-height:205mm; border:1px solid #e5e7eb; display:block; margin:1.5mm auto 0; }} .leg {{ font-size:8.5pt; }}
</style></head><body>
<img src="logo.png" style="height:11mm">
<div class="kicker" style="margin-top:5mm">Relatório de testes internos · 29/10/2026 · Anna</div>
<h1>Evidências dos testes internos</h1>
<p>Dra. Carolina, este relatório traz as evidências dos testes que a senhora pediu, feitos pela nossa equipe entre 23 e 29/10. Usamos dois números de teste da Control Gestão, o (11) e o (41). Os horários vêm do diário da Anna e dos registros de envio do Kommo. As falhas encontradas estão na seção 4, com as correções.</p>
<div class="box"><b>Durante todos os testes:</b>
<ul>
<li>A Anna ficou pausada para os leads reais e só atendeu os números de teste.</li>
<li>Nenhum lead real recebeu mensagem da Anna.</li>
<li>A entrada em produção continua dependendo da sua aprovação expressa.</li>
</ul></div>

<h2>1. Os cinco pontos que a senhora pediu</h2>
<table>{pontos}</table>

<h2>2. Linha do tempo de cada envio</h2>
<h3>Número (11): régua de follow-ups com tempos reais</h3>
<p class="pequeno">O lead escreveu e não respondeu mais. Os follow-ups saíram nos intervalos reais da régua, sempre entre 7 h e 20 h.</p>
<table>{CAB}{linhas(L11)}</table>
<h3>Número (41): qualificação, agendamento, lembretes e pós-reunião</h3>
<p class="pequeno">Número que nunca tinha falado com o escritório. O lead escreveu primeiro; o caso do lead de formulário é o ponto 1, que vai em complemento.</p>
<table>{CAB}{linhas(L41)}</table>

<h2>3. Outros testes</h2>
<table>
<tr><th>Data</th><th>Teste</th><th>Resultado</th></tr>
<tr><td>23/10</td><td>Cobrança pelo Asaas: cobrança real de R$ 5 no cadastro de teste da Control Gestão</td><td>Aviso com o link enviado às 15:45, com saída registrada no WhatsApp. PIX pago às 15:48: o Asaas avisou a Anna e a confirmação de pagamento saiu no mesmo minuto. O cliente real que estava na mesma rodada não recebeu nada. Depois do teste, o envio real voltou a ficar desligado.</td></tr>
<tr><td>23/10</td><td>Pós-reunião: resposta do cliente depois da reunião</td><td>O cliente respondeu às 15:07. O card foi para Closer › Retorno imediato, com tarefa prioritária, e nenhuma mensagem foi enviada a ele.</td></tr>
<tr><td>26/10</td><td>Google Agenda, depois da sua autorização</td><td>A Anna leu os horários ocupados, criou uma reunião de teste com link do Google Meet e a apagou. No teste do (41), o horário oferecido respeitou a sua agenda.</td></tr>
<tr><td>26/10</td><td>Reunião movida ou apagada direto na agenda</td><td>Antes de cada lembrete, a Anna confere a reunião no Google. Se ela foi apagada ou mudou de horário, o lembrete não sai e a equipe recebe uma tarefa.</td></tr>
</table>

<h2>4. Falhas encontradas nos testes e corrigidas</h2>
<table><tr><th>Data</th><th>O que aconteceu</th><th>Correção</th></tr>{falhas}</table>

<h2>5. Ajustes de texto pedidos pela senhora, já aplicados</h2>
<ul>
<li><b>27/10:</b> negrito nos destaques e retirada de "É só me responder com o número".</li>
<li><b>27/10:</b> pergunta nova sobre cheque especial e cartão de crédito, depois dos três valores.</li>
<li><b>27/10:</b> mensagem para quem diz que vai ver os valores e mandar depois ("Ok, aguardo…").</li>
<li><b>28/10:</b> textos novos das mensagens 1 a 5, com a saudação pela hora do dia.</li>
<li><b>Aguardando a sua confirmação:</b> o texto da oferta de horário (recebemos duas versões em 29/10).</li>
</ul>

<h2>6. O que falta até a homologação</h2>
<ul>
<li><b>Ponto 1:</b> o modelo v2 aprovado pela Meta e o robô de saudação no Kommo; depois, o teste com um número que nunca falou com o escritório.</li>
<li><b>Ponto 3:</b> o Follow 3 (30/10) e o Follow 4 (02/11), enviados como complemento.</li>
<li><b>Texto da oferta de horário:</b> a confirmação da versão.</li>
<li><b>Treino com as conversas de setembro e outubro:</b> a exportação das conversas. Depois disso, o resultado vai para a sua aprovação.</li>
<li><b>Memória dos atendimentos anteriores:</b> a aprovação da frase.</li>
</ul>

<div class="quebra"></div>
<h2>Anexos: prints</h2>
{anexos}
<p class="pequeno">Control Gestão · 29/10/2026</p>
</body></html>"""
open('relatorio.html', 'w').write(H)
print('ok')
