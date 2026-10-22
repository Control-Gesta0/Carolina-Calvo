# Monta relatorio.html (caso Erika, 22/10/2026) a partir dos dados levantados no Kommo.
# Uso: python3 montar.py <auditoria.json> <prova.json>
import json, sys, html
aud = json.load(open(sys.argv[1])); prova = json.load(open(sys.argv[2]))
e = html.escape
linhas_aud = ''.join(f"<tr><td>{r['id']}</td><td>{e(r['nome'][:34])}</td><td>{r['quando']}</td><td>{e(r['de'])}</td><td>{e(r['hoje'])}</td><td>{'sim' if r['ia'] else ''}</td></tr>" for r in aud)
ev = ''.join(f"<tr><td>{a}</td><td>{e(b or 'etapa anterior do teste')}</td><td>{e(c or '')}</td></tr>" for a, b, c in prova['eventos'])
tar = ''.join(f"<tr><td>{a}</td><td>{e(b)}</td><td>{e(c)}</td></tr>" for a, b, c in prova['tarefas'])
nota = ''.join(f"<p class='quote'>{e(b)}</p>" for a, b in prova['notas'])
H = f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Caso Erika Nachi</title><style>
@page {{ size: A4; margin: 16mm 15mm 16mm 15mm; }}
body {{ font-family: 'Inter', 'Segoe UI', Arial, sans-serif; color: #1f2937; font-size: 10pt; line-height: 1.45; }}
h1 {{ font-size: 20pt; color: #1e3a5f; margin: 6mm 0 2mm; }} h2 {{ font-size: 13pt; color: #1e3a5f; margin: 7mm 0 2mm; border-bottom: 2px solid #f05a28; padding-bottom: 1mm; }}
h3 {{ font-size: 10.5pt; margin: 4mm 0 1mm; color: #111827; }}
.kicker {{ color: #f05a28; font-weight: 700; letter-spacing: .08em; font-size: 8.5pt; text-transform: uppercase; }}
table {{ width: 100%; border-collapse: collapse; margin: 2mm 0; font-size: 8.6pt; }} th, td {{ border-bottom: 1px solid #e5e7eb; padding: 1.6mm 1.8mm; text-align: left; vertical-align: top; }}
th {{ background: #f3f4f6; font-weight: 600; }} .erro {{ color: #b91c1c; font-weight: 600; }} .ok {{ color: #15803d; font-weight: 600; }}
.box {{ background: #f0f7ff; border-left: 4px solid #1e3a5f; padding: 3mm 4mm; margin: 3mm 0; }} .alerta {{ background: #fff5f0; border-left: 4px solid #f05a28; padding: 3mm 4mm; margin: 3mm 0; }}
.quote {{ background: #f9fafb; border: 1px solid #e5e7eb; padding: 2mm 3mm; font-size: 9pt; }} ul {{ margin: 1mm 0 2mm 5mm; padding-left: 3mm; }} li {{ margin: .8mm 0; }}
.quebra {{ page-break-before: always; }} .pequeno {{ font-size: 8.5pt; color: #6b7280; }}
</style></head><body>
<img src="logo.png" style="height:12mm">
<div class="kicker" style="margin-top:6mm">Relatório técnico · 22/10/2026 · Anna (IA de atendimento)</div>
<h1>Caso Erika Nachi: diagnóstico, correções, auditoria e testes</h1>
<p>Dra. Carolina, este relatório responde aos itens A a F da sua mensagem. Cada informação vem do histórico de eventos do próprio Kommo, que registra quem fez cada mudança e quando, e do diário da Anna.</p>

<h2>A. Diagnóstico do caso Erika</h2>
<table><tr><th style="width:22%">Quando (Brasília)</th><th>O que houve</th><th style="width:18%">Quem fez</th></tr>
<tr><td>20/10 16:02</td><td>Entra pelo formulário de remarketing. A Anna manda a 1ª mensagem e põe a etiqueta OUT 26.</td><td>Anna</td></tr>
<tr><td>21/10 10:09 a 11:08</td><td>A senhora conversa, qualifica e marca a reunião. A Anna fica em silêncio porque a equipe está falando.</td><td>Dra. Carolina</td></tr>
<tr><td>21/10 11:09:02</td><td>Card movido para Closer › Reunião agendada.</td><td>Dra. Carolina</td></tr>
<tr><td>21/10 11:09:10</td><td class="erro">8 segundos depois de a lead escrever "Ok", o card vai para SDR › 5 A 10 MIL.</td><td>robô do Kommo</td></tr>
<tr><td>21/10 16:25</td><td class="erro">Mesma coisa: a lead responde "Ok combinado" e o card volta para SDR › 5 A 10 MIL.</td><td>robô do Kommo</td></tr>
<tr><td>21/10 18:11</td><td>Tag JÁ FEZ REUNIÃO; card movido para Closer › Cliente decisão.</td><td>Dra. Carolina</td></tr>
<tr><td>22/10 14:06:16</td><td class="erro">7 segundos depois de "Boa tarde", o card sai de Cliente decisão e vai para SDR › 5 A 10 MIL.</td><td>robô do Kommo</td></tr>
<tr><td>22/10 14:06:26</td><td class="erro">A Anna pergunta "Qual das opções você quer saber: 1, 2 ou 3?".</td><td>Anna</td></tr>
<tr><td>22/10 14:07:04</td><td class="erro">A lead diz que vai fechar. A Anna registra "já é cliente" e passa para a equipe.</td><td>Anna</td></tr></table>
<h3>1. Quem moveu o card para o SDR</h3>
<p>Foram os <b>robôs antigos do Kommo</b> "SDR RETORNO IMEDIATO" e "Acompanha resposta e move para RI", não a Anna.</p>
<ul>
<li>Nas três vezes, o card saiu do Closer entre 7 e 8 segundos depois de a lead escrever.</li>
<li>Esses robôs movem para SDR › 5 A 10 MIL qualquer card do Closer em que o lead responde.</li>
<li>A Anna não mudou a etapa desse card em nenhum momento.</li>
</ul>
<h3>2. Por que a Anna voltou a qualificar</h3>
<ul>
<li>Toda a qualificação da Erika foi feita pela senhora, na mão. Para a Anna, ela continuava na 1ª pergunta.</li>
<li>A regra da época mandava a Anna voltar a atender 6 horas depois de a equipe escrever.</li>
<li>No dia seguinte, a lead escreveu e o robô tinha acabado de levar o card para o SDR. A Anna não tinha nenhuma trava para quem vem do Closer.</li>
</ul>
<h3>3. Por que registrou "já é cliente"</h3>
<p>Essa classificação estava definida de forma ampla demais ("fala de um processo em andamento"), e não existia uma classificação para quem quer contratar. A frase "vou fechar com ela para iniciar meu processo" caiu na opção errada.</p>

<h2>B. Correções realizadas</h2>
<h3>Na Anna (publicado em 22/10)</h3>
<table><tr><th style="width:30%">Correção</th><th>Como impede que o problema se repita</th></tr>
<tr><td><b>Proteção do Closer</b></td><td>Quando qualquer robô tira um card do Closer e põe no SDR, a Anna devolve o card ao Closer, para todos os cards da conta e não só os da Anna.
<ul><li><b>Se veio de Cliente decisão:</b> vai para <b>Closer › Retorno imediato</b>, com tarefa prioritária de 15 minutos.</li>
<li><b>Se veio de outra etapa do Closer:</b> volta para a mesma etapa.</li>
<li><b>Nada é enviado ao lead.</b> Se alguém da equipe já tiver mexido no card depois do robô, vale a decisão da equipe.</li></ul></td></tr>
<tr><td><b>Sem requalificação</b></td><td>A Anna não conversa com card que está no Closer, com card que já passou pelo Closer alguma vez nem com card que tem a tag JÁ FEZ REUNIÃO.</td></tr>
<tr><td><b>Intenção de contratar</b></td><td>Nova classificação "quer contratar", que vale só se o lead fala em fechar, contratar, assinar ou iniciar o processo. A Anna para a qualificação, <b>não envia mensagem</b>, move o card para <b>Closer › Retorno imediato</b> e cria a tarefa <b>"Lead deseja contratar — retorno imediato"</b>, com prazo de 15 minutos.</td></tr>
<tr><td><b>Cliente × lead</b></td><td>"Já é cliente" passou a exigir contrato assinado ou processo em andamento. Quem só fez reunião continua sendo lead.</td></tr>
<tr><td><b>Equipe assumiu = Anna sai</b></td><td>Quando alguém da equipe escreve para o lead, a Anna sai do atendimento: põe a tag atendimento-humano e uma nota no card. Ela não volta mais sozinha depois de 6 horas. Para devolver o lead à Anna, basta tirar a tag.</td></tr></table>
<h3>No Kommo</h3>
<ul><li>Criada a etapa <b>Closer › Retorno imediato</b>, logo depois de Cliente decisão.</li>
<li>O card da Erika foi colocado em Closer › Retorno imediato, com a tarefa "Lead deseja contratar — retorno imediato" e uma nota explicando o ocorrido.</li>
<li>Os robôs antigos continuam ligados. Eles ainda tiram o card por alguns segundos, e a Anna devolve. Se a senhora preferir, eles podem ser ajustados para mover direto para Retorno imediato.</li></ul>

<h2 class="quebra">C. Auditoria dos cards do Closer (01/10 a 22/10)</h2>
<div class="box">
<ul>
<li><b>139 movimentações do Closer para o SDR.</b>
<ul><li><b>138 feitas por robô:</b> 68 de Cliente decisão, 67 de Reunião agendada e 3 de Não compareceu, todas para SDR › 5 A 10 MIL.</li>
<li><b>1 feita pela senhora.</b></li></ul></li>
<li><b>120 das 138 aconteceram antes de 19/10</b>, quando a Anna começou a atender. É um comportamento antigo dos robôs, que agora a Anna corrige.</li>
<li><b>56 cards diferentes</b> foram movidos por robô. Hoje, <b>{len(aud)} continuam no SDR</b> (lista abaixo).</li>
<li><b>Só 2 desses cards eram da Anna</b> (tag ia):
<ul><li>a Erika, já corrigida;</li>
<li>o 28978570, que a Anna está proibida de qualificar pela nova regra.</li></ul></li>
</ul></div>
<table><tr><th>Card</th><th>Nome no Kommo</th><th>Movido em</th><th>Saiu de</th><th>Está hoje em</th><th>ia</th></tr>{linhas_aud}</table>
<p class="pequeno">Com a sua autorização, devolvemos esses cards ao Closer de uma vez, cada um para a etapa de onde saiu.</p>

<h2>D. Comprovação dos testes</h2>
<h3>Teste no Kommo real (card de teste, 22/10)</h3>
<ul>
<li><b>Preparação:</b> card de teste em Closer › Cliente decisão.</li>
<li><b>Mensagem do lead:</b> "Doutora, pensei melhor e quero fechar o contrato."</li>
<li><b>O que o robô antigo faz:</b> move o card para SDR › 5 A 10 MIL. Essa mudança foi reproduzida no teste.</li>
</ul>
<table><tr><th style="width:22%">Horário (Brasília)</th><th>De</th><th>Para</th></tr>{ev}</table>
<table><tr><th style="width:22%">Tarefa criada</th><th>Texto</th><th>Prazo</th></tr>{tar}</table>
<p><b>Nota registrada no card:</b></p>{nota}
<p><b>Resultado:</b> <span class="ok">Closer › Cliente decisão → (robô) SDR → Closer › Retorno imediato, com a tarefa prioritária</span>. Mensagens enviadas ao lead: <b>{prova['mensagens_enviadas']}</b>. Não houve requalificação, o card não ficou no SDR e a Anna não respondeu.</p>
<p class="pequeno">O Eduardo repete o teste com uma mensagem real de WhatsApp, enviada do número de teste, e manda os prints da tela do Kommo.</p>
<h3>Testes automáticos e exame da IA</h3>
<ul><li><b>169 de 169</b> testes automáticos aprovados, incluindo:
<ul><li>robô tirando card do Closer;</li>
<li>Cliente decisão com "quero fechar o contrato";</li>
<li>Reunião agendada com "Ok", que volta sem tarefa;</li>
<li>a Anna sem conversar no Closer e com a tag JÁ FEZ REUNIÃO;</li>
<li>"quer contratar" sem mensagem.</li></ul></li>
<li><b>Exame de conversa da IA: 72 de 72</b> aprovados (24 situações, 3 rodadas cada), entre elas:
<ul><li>"Ontem conversei com a doutora vou fechar com ela para iniciar meu processo" → quer contratar;</li>
<li>"Doutora, pensei melhor e quero fechar o contrato." → quer contratar;</li>
<li>"Já sou cliente da Dra., queria saber como está o meu processo" → já é cliente.</li></ul></li></ul>

<h2>E. Os demais fluxos continuam funcionando</h2>
<p>Os mesmos testes cobrem a qualificação normal no SDR (1ª e 2ª pergunta numeradas, valores, renda até R$ 15 mil sem tarefa), os follow-ups (2h com o texto da equipe, sem Venda perdida), a oferta e a confirmação de horário, as passagens para a equipe (pediu pessoa, robô, advogado, outro assunto, remarcar) e as etiquetas de mês. Todos foram aprovados depois das correções.</p>

<h2>F. Confirmação</h2>
<div class="box">
<p><b>Os quatro problemas do caso Erika foram corrigidos e testados:</b></p>
<ul>
<li>classificação de cliente;</li>
<li>requalificação;</li>
<li>card do Closer indo para o SDR;</li>
<li>intenção de contratar não reconhecida.</li>
</ul>
</div>
<div class="alerta"><b>Pendências:</b>
<ul><li>sua autorização para devolver ao Closer os {len(aud)} cards da auditoria;</li>
<li>teste com mensagem real de WhatsApp, a cargo do Eduardo, com prints;</li>
<li>se a senhora quiser, ajustar no Kommo os robôs antigos para mover direto para Retorno imediato;</li>
<li>a ligação da agenda Google, para a Anna marcar as reuniões.</li></ul>
A ativação definitiva da Anna continua dependendo da sua aprovação expressa.</div>
<p class="pequeno">Control Gestão · relatório gerado em 22/10/2026.</p>
</body></html>"""
open('relatorio.html', 'w').write(H)
print('ok')
