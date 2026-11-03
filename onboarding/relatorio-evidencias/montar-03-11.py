# Monta relatorio-03-11.html: relatório complementar (29/10 a 03/11/2026), resposta aos 7 pontos da Dra. de 29/10.
# Dados: diário da Anna e registros de envio do Kommo (plano-homologacao-29-10.md, "Resultados registrados").
# Uso: python3 montar-03-11.py  →  depois: NODE_PATH=$(npm root -g) node gerar-pdf.cjs relatorio-03-11.html "../Relatório complementar - 03-11.pdf"
import html
e = html.escape

def tag(s):
    return {'ok': '<span class="tag ok">comprovado</span>', 'ativacao': '<span class="tag parcial">na entrada em produção</span>',
            'pend': '<span class="tag pend">pendente</span>'}[s]

PONTOS = [
    ('1. Primeira mensagem para lead novo', 'ok',
     'Em 30/10, às 10:29, a saudação chegou a um número que não tinha nenhum registro no Kommo, e o lead seguiu a qualificação (seção 2.1). '
     'Em 03/11, a própria Anna passou a disparar a saudação, só depois de o card estar pronto (seção 3). '
     'Se a saudação não sair em 30 minutos, a Anna avisa a equipe com uma nota no card. Isso foi comprovado em 29/10, às 17:50.'),
    ('2. Régua de follow-ups completa, sem duplicidade', 'ok',
     'Follow 1 a 4 no número (11), com os intervalos reais (seção 2.2). O Follow 2 saiu duplicado em 28/10, antes da correção. Depois dela, o Follow 3, o Follow 4 e os três follow-ups da oferta de horário saíram uma vez cada.'),
    ('3. Pós-reunião: reunião cancelada ou não realizada', 'ok',
     'Antes de enviar, a Anna confere a agenda e a etapa do card. Os três casos foram testados (seção 2.3).'),
    ('4. Reteste das correções', 'ok',
     '"Débito em conta" sem valor: a Anna perguntou o valor e não registrou zero (30/10, 10:33). Duplicidade: nenhum envio repetido depois da correção (pontos 2 e 3).'),
    ('5. Robôs antigos', 'ativacao',
     'A revisão foi concluída e nenhum robô foi alterado até agora. Na entrada em produção, os robôs antigos serão desligados e as automações passam a rodar na Anna. Isso será testado com um card de teste antes da produção (seção 4).'),
    ('6. Demais regras do processo comercial', 'ok',
     'Renda acima de 15 mil e até 15 mil, memória dos atendimentos anteriores, lead que já fez reunião e follow-up da oferta sem resposta: todos testados (seção 2). '
     'A proteção dos cards do Closer foi testada em 23/10: um robô antigo moveu o card para o SDR, e a Anna o devolveu ao Closer às 15:10. '
     'O treinamento com as conversas de setembro e outubro está pendente (seção 6).'),
    ('7. Homologação', 'pend',
     'Os testes estão concluídos. Faltam os itens da seção 6.'),
]
pontos = ''.join(f"<tr><td><b>{e(t)}</b><br><span class='pequeno'>{e(d)}</span></td><td style='width:22%'>{tag(s)}</td></tr>" for t, s, d in PONTOS)

CAB = "<tr><th>Quando</th><th>Quem</th><th>O que aconteceu</th><th>Saída registrada no WhatsApp</th></tr>"
def linhas(L):
    return ''.join(f"<tr><td style='white-space:nowrap'>{a}</td><td>{e(b)}</td><td>{c}</td><td>{e(d)}</td></tr>" for a, b, c, d in L)

# 2.1 número 96486-6458: primeira mensagem, qualificação, oferta sem resposta
L96_A = [
    ('30/10 10:29', 'Anna', 'Saudação (modelo aprovado "Anna - Primeiro contato v2") para um lead de formulário cujo número não tinha nenhum registro no Kommo', '10:29:04'),
    ('30/10 10:32', 'lead', '"3" → pergunta dos três valores', '10:32:49'),
    ('30/10 10:33', 'lead', '"Bruta 20 mil, líquido 16 mil e tenho débito em conta" → a Anna <b>perguntou o valor do desconto</b>, sem registrar zero', '10:33:33'),
    ('30/10 10:33', 'lead', '"Vou olhar no extrato e te mando depois" → mensagem "aguardo"', '10:33:55'),
    ('30/10 10:34', 'lead', '"O desconto em conta é 7 mil" → pergunta do cheque especial e do cartão', '10:34:23'),
    ('30/10 10:34', 'lead', '"Uso o cheque especial e tenho cartão com limite" → mensagem do alívio; a resposta foi anotada no card', '10:34:47'),
    ('30/10 10:35', 'lead', '"Sim" → encaminhamento para a Dra.; card em SDR › ACIMA DE 15 MIL, com bruta R$ 20.000, líquido R$ 16.000 e desconto R$ 7.000', '10:35:13'),
    ('30/10 11:10', 'Anna', 'Oferta de horário (renda acima de 15 mil). O lead não respondeu mais.', '11:10:06'),
    ('30/10 13:15', 'Anna', 'Follow-up de 2 h da oferta: "Ainda não tive sua confirmação sobre o horário…"', '13:15:04'),
    ('31/10 11:15', 'Anna', 'Follow-up de 24 h da oferta', '11:15:05'),
    ('01/11 11:15', 'Anna', 'Follow-up de 48 h, o último. O card ficou na coluna da renda, sem ir para Venda perdida.', '11:15:04'),
]
# 2.1 b) o mesmo número volta por um formulário novo em 03/11
L96_B = [
    ('03/11 09:26', 'Anna', 'Saudação no card novo', '09:26:03'),
    ('03/11 10:01', 'lead', '"3" → <b>memória</b>: "Vi aqui que você já falou com a gente em outubro e, naquela ocasião, informou renda bruta de R$ 20.000, líquido de R$ 16.000 e desconto em conta de R$ 7.000…"', '10:02:05'),
    ('03/11 10:03', 'lead', '"Piorou, minha renda mudou" → pergunta dos três valores', '10:03:31'),
    ('03/11 10:03', 'lead', '"Vou olhar no extrato e te mando depois" → o seu texto novo: "Sem problemas! Aguardo seu retorno… Combinado?"', '10:03:54'),
    ('03/11 10:04', 'lead', '"Combinado" → a Anna <b>não mandou nada</b> e esperou os valores', '—'),
    ('03/11 10:04', 'lead', '"Bruta 12 mil, líquido 9 mil e desconto em conta de 3 mil" → pergunta do cheque especial e do cartão', '10:04:47'),
    ('03/11 10:05', 'lead', '"Uso o cheque especial" → mensagem do alívio', '10:05:15'),
    ('03/11 10:07', 'lead', '"Sim" → <b>renda até 15 mil</b>: sem oferta de reunião, com a tag "ANNA renda até 15k" e o card na coluna da renda', '10:07:10'),
]
# 2.2 régua de qualificação no número (11)
L11 = [
    ('27/10 07:00', 'Anna', 'Follow 1', '07:00:09'),
    ('28/10 07:00', 'Anna', 'Follow 2, fora da janela de 24 h. Saiu duas vezes, antes da correção.', '07:00:04 e 07:00:14'),
    ('30/10 07:05', 'Anna', 'Follow 3, uma vez só (anexo A)', '07:05:06'),
    ('02/11 07:10', 'Anna', 'Follow 4, o último: "Como não tive seu retorno, vou encerrar seu atendimento…"', '07:10:03'),
]
# 2.3 pós-reunião e lead que já fez reunião
POS = [
    ('29/10 16:15', 'Reunião apagada da sua agenda', 'Não enviou. Nota no card: "a reunião não está mais na agenda da Dra."'),
    ('29/10 16:25', 'Reunião mantida na agenda', 'Enviou "Ontem você esteve em reunião…" (saída às 16:25:04).'),
    ('30/10 10:10', 'Cliente que não compareceu (card em Closer › Não compareceu)', 'Não enviou. Nota no card: "o card está em Não compareceu".'),
    ('30/10 10:05', 'Lead que já fez reunião volta por um card novo', 'Nenhuma mensagem. A equipe recebeu tarefa e nota com o histórico do telefone.'),
]
pos = ''.join(f"<tr><td style='white-space:nowrap'>{a}</td><td>{e(b)}</td><td>{e(c)}</td></tr>" for a, b, c in POS)

FALHAS = [
    ('29/10', 'O follow-up pós-reunião saiu para uma reunião que tinha sido apagada da agenda.',
     'A Anna confere a agenda e a etapa do card antes de enviar (seção 2.3).'),
    ('29/10', 'O robô antigo "Follow Cliente decisão" mandou o "Ontem você esteve em reunião" pela segunda vez ao número de teste.',
     'Entra na decisão sobre os robôs antigos (seção 4, item 2).'),
    ('29/10', 'O robô de saudação não enviou a mensagem a quem nunca tinha conversado com o escritório.',
     'Faltava marcar a opção "Forçar mensagem" no robô. Com ela marcada, a saudação saiu em 30/10.'),
    ('03/11', 'O robô de saudação da etapa enviava a mensagem 1 segundo depois de o card entrar, antes de o primeiro nome do lead estar preenchido.',
     'A própria Anna dispara a saudação, depois de preencher o nome. Testado em 03/11, às 11:14.'),
    ('03/11', 'Quando o lead volta com o card antigo ainda aberto, a resposta dele caía no card antigo.',
     'A Anna fecha a conversa do card antigo antes da saudação, e a resposta cai no card novo. Testado em 03/11.'),
    ('03/11', 'A memória disse "novembro" para valores informados em outubro. Depois de "Piorou", a pergunta dos valores começava com "Ótimo!".',
     'O mês agora é o do atendimento anterior. Depois de "piorou", a pergunta começa com "Entendi."'),
    ('03/11', 'No exame automático da Anna, em 1 de 3 rodadas, o "Combinado" depois do "aguardo" foi entendido como aceite de horário.',
     'Regra reforçada. O exame passou a ter os casos destes testes: 30 situações, aprovadas em 5 rodadas cada.'),
]
falhas = ''.join(f"<tr><td style='white-space:nowrap'>{d}</td><td>{e(o)}</td><td>{e(c)}</td></tr>" for d, o, c in FALHAS)

ROBOS = [
    ('SDR RETORNO IMEDIATO', 'Quando o lead responde, leva o card do Closer para SDR › 5 A 10 MIL', 'Desligado. A resposta depois da reunião já vai para Retorno imediato, com tarefa.'),
    ('Follow Cliente decisão', '24 h depois da entrada em Cliente decisão, manda "Pergunta reunião"', 'Desligado. O pós-reunião da Anna substitui.'),
    ('SDR- Alterar etapa plan-Rtrnimed.', 'Quando o lead responde ou abre conversa nova, move o card para 5 A 10 MIL', 'Desligado.'),
    ('Fluxo Superendividamento - Vídeo ("Luíza")', 'Quando um lead encerrado volta a escrever, manda o questionário antigo (12 mensagens)', 'Desligado. A memória da Anna atende quem volta.'),
    ('horário de funcionamento', 'Continua rodando em 166 conversas e manda o aviso de horário quando o lead escreve fora do expediente', 'Conversas encerradas e robô desligado.'),
    ('Robô de saudação da etapa Contato inicial (criado para os testes)', 'Manda a saudação quando o card entra na etapa', 'Desligado. A saudação é disparada pela Anna.'),
]
robos = ''.join(f"<tr><td><b>{i}.</b> {e(n)}</td><td>{e(f)}</td><td>{e(p)}</td></tr>" for i, (n, f, p) in enumerate(ROBOS, 1))

ANEXOS = [
    ('A', 'Número (11): Follow 3 recebido uma vez, 30/10 às 07:05', '../evidencias-testes/11-regua/follow3-30-10-0705.png'),
]
anexos = ''.join(f"<div class='anexo'><div class='leg'><b>Anexo {l}.</b> {e(t)}</div><img src='{p}' style='max-height:60mm'></div>" for l, t, p in ANEXOS)

H = f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório complementar da Anna</title><style>
@page {{ size: A4; margin: 15mm 14mm 15mm 14mm; }}
body {{ font-family: 'Inter','Segoe UI',Arial,sans-serif; color:#1f2937; font-size:9.6pt; line-height:1.45; }}
h1 {{ font-size:19pt; color:#1e3a5f; margin:5mm 0 2mm; }} h2 {{ font-size:12.5pt; color:#1e3a5f; margin:6mm 0 2mm; border-bottom:2px solid #f05a28; padding-bottom:1mm; }}
h3 {{ font-size:10.2pt; margin:3.5mm 0 1mm; }} .kicker {{ color:#f05a28; font-weight:700; letter-spacing:.08em; font-size:8.3pt; text-transform:uppercase; }}
table {{ width:100%; border-collapse:collapse; margin:2mm 0; font-size:8.2pt; }} th,td {{ border-bottom:1px solid #e5e7eb; padding:1.4mm 1.6mm; text-align:left; vertical-align:top; }}
th {{ background:#f3f4f6; font-weight:600; }} tr {{ page-break-inside:avoid; }}
.tag {{ display:inline-block; padding:.3mm 2mm; border-radius:3mm; font-size:7.6pt; font-weight:600; }}
.tag.ok {{ background:#dcfce7; color:#166534; }} .tag.parcial {{ background:#fef9c3; color:#854d0e; }} .tag.pend {{ background:#e5e7eb; color:#374151; }}
.box {{ background:#f0f7ff; border-left:4px solid #1e3a5f; padding:2.5mm 4mm; margin:3mm 0; }}
ul {{ margin:1mm 0 2mm 5mm; padding-left:3mm; }} li {{ margin:.7mm 0; }} .pequeno {{ font-size:8pt; color:#4b5563; }}
.anexo {{ page-break-inside:avoid; margin:4mm 0; }} .anexo img {{ max-width:100%; border:1px solid #e5e7eb; display:block; margin:1.5mm 0 0; }} .leg {{ font-size:8.5pt; }}
</style></head><body>
<img src="logo.png" style="height:11mm">
<div class="kicker" style="margin-top:5mm">Relatório complementar · 03/11/2026 · Anna</div>
<h1>Resposta aos 7 pontos de 29/10</h1>
<p>Dra. Carolina, este relatório complementa o de 29/10 e responde, ponto a ponto, à sua mensagem daquele dia. Os testes foram feitos de 29/10 a 03/11, com números de teste da Control Gestão. Os horários vêm do diário da Anna e dos registros de envio do Kommo.</p>
<div class="box"><b>Durante todos os testes:</b>
<ul>
<li>A Anna ficou pausada para os leads reais e só atendeu os números de teste.</li>
<li>Nenhum robô antigo do Kommo foi alterado.</li>
<li>A entrada em produção continua dependendo da sua aprovação expressa.</li>
</ul></div>

<h2>1. Os 7 pontos</h2>
<table>{pontos}</table>

<h2>2. Linha do tempo dos testes</h2>
<h3>2.1 Número 96486-6458: primeira mensagem, qualificação e oferta sem resposta (30/10 a 01/11)</h3>
<p class="pequeno">O lead entrou como lead de formulário, sem nenhuma conversa anterior com o escritório. Antes do teste, os registros antigos desse número foram excluídos do Kommo.</p>
<table>{CAB}{linhas(L96_A)}</table>
<h3>O mesmo número volta por um formulário novo: memória, "aguardo" e renda até 15 mil (03/11)</h3>
<table>{CAB}{linhas(L96_B)}</table>
<h3>2.2 Número (11): régua de qualificação com os tempos reais</h3>
<p class="pequeno">O lead escreveu em 26/10 e não respondeu mais.</p>
<table>{CAB}{linhas(L11)}</table>
<h3>2.3 Pós-reunião: como a Anna sabe se a reunião aconteceu</h3>
<p>Antes de enviar o "Ontem você esteve em reunião", 23 horas depois, a Anna confere quatro coisas:</p>
<ul>
<li>a data da reunião no card não mudou;</li>
<li>a reunião continua na sua agenda;</li>
<li>o card continua em Reunião agendada ou Cliente decisão;</li>
<li>o cliente ainda não escreveu depois da reunião.</li>
</ul>
<p>Se o cliente faltou, a equipe move o card para "Não compareceu" e a mensagem não sai. A Anna não consegue saber sozinha se o cliente entrou na reunião.</p>
<table><tr><th>Quando</th><th>Caso</th><th>Resultado</th></tr>{pos}</table>

<h2>3. Falhas encontradas nos testes e corrigidas</h2>
<table><tr><th>Data</th><th>O que aconteceu</th><th>Correção</th></tr>{falhas}</table>

<h2>4. Robôs antigos: desligados na entrada em produção</h2>
<p class="pequeno">Na entrada em produção, os robôs antigos do Kommo serão desligados, e as automações passam a rodar na Anna. Antes disso, conferimos que tudo o que eles fazem está coberto pela Anna e testamos com um card de teste. Estes são os que hoje interferem no atendimento:</p>
<table><tr><th>Robô</th><th>O que faz hoje</th><th>Na entrada em produção</th></tr>{robos}</table>

<h2>5. Textos</h2>
<ul>
<li><b>Aplicado em 30/10:</b> o seu texto novo para quem vai mandar os valores depois ("Sem problemas! Aguardo seu retorno… Combinado?").</li>
<li><b>Aplicado em 03/11:</b> o seu texto da oferta de horário ("A Dra. Carolina Calvo analisou seu caso e considerou <i>delicado</i>… <b>Posso confirmar para você?</b>"). O dia e a hora entram sozinhos: "HOJE às 15:00" e "único horário que consegui para hoje", ou "AMANHÃ…" e "para amanhã".</li>
<li><b>Aplicado em 03/11:</b> o lembrete da oferta de horário ("Ainda não tive sua confirmação sobre o horário que te enviei. Posso reservar esse horário para a sua reunião com a Dra. Carolina?") passou a sair <b>1 hora</b> depois da oferta, e não mais 2 horas. Ele sai uma vez só e não sai se o lead já respondeu.</li>
<li><b>Para a sua aprovação:</b> a frase da memória, usada no teste de 03/11: "Ótimo! Vi aqui que você já falou com a gente em outubro e, naquela ocasião, informou renda bruta de R$ 20.000, líquido de R$ 16.000 e desconto em conta de R$ 7.000. De lá para cá, a sua situação melhorou, piorou ou continua igual?"</li>
</ul>

<h2>6. O que falta para a homologação</h2>
<ul>
<li><b>A aprovação da frase da memória</b> (seção 5).</li>
<li><b>Treino com as conversas de setembro e outubro:</b> falta a exportação das conversas. O resultado vai para a sua aprovação antes de entrar na Anna.</li>
</ul>
<p>Com a sua aprovação, desligamos os robôs antigos, testamos com um card de teste e combinamos a data da homologação.</p>

<div style='page-break-inside:avoid'><h2>Anexo</h2>
{anexos}</div>
<p class="pequeno">Control Gestão · 03/11/2026</p>
</body></html>"""
open('relatorio-03-11.html', 'w').write(H)
print('ok')
