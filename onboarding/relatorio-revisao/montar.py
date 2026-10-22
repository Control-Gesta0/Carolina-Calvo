# Monta relatorio.html da revisão integral (22/10/2026) com os dados auditados no Kommo.
# Uso: python3 montar.py <auditlead.json>
import json, sys, html
e = html.escape
rows = json.load(open(sys.argv[1]))
CINCO = {29004706, 29004738, 29005230, 29007744, 29008530}

def sim(v):
    return '<span class="erro">não</span>' if v is False else ('<span class="ok">sim</span>' if v else '—')

aud = ''.join(
    f"<tr{' class=\"marca\"' if r['lead'] in CINCO else ''}><td>{r['lead']}</td><td>{e(r['contato'])}</td><td>{r['entrada']}</td>"
    f"<td>{r['primeira_tentativa']}</td><td>{sim(r['primeira_saiu'])}</td><td>{r['followups']} / {r['followups_sairam']}</td>"
    f"<td>{r['primeira_saida_real']} ({r['quem_primeiro']})</td><td>{e(r['etapa'])}</td></tr>" for r in rows)
n = len(rows)
fu_sem = sum(1 for r in rows if r['followups'] and not r['primeira_saiu'])
fu_tot = sum(r['followups'] for r in rows); fu_ok = sum(r['followups_sairam'] for r in rows)

def st(s):
    return {'ok': '<span class="tag ok">funcionando e testado</span>', 'parcial': '<span class="tag parcial">implementado, teste incompleto</span>',
            'falha': '<span class="tag falha">não funciona: correção necessária</span>', 'pend': '<span class="tag pend">pendente</span>',
            'dec': '<span class="tag dec">aguarda decisão da Dra.</span>'}[s]

CHECK = [
    ('Atendimento (Anna)', [
        ('Apresentação como Anna, da equipe da Dra.; nunca diz que é IA nem pede documento', 'ok'),
        ('1ª mensagem automática para lead novo de formulário', 'falha'),
        ('Resposta a quem escreve primeiro pelo WhatsApp (conversa aberta)', 'ok'),
        ('1ª pergunta numerada ("Superendividamento") e 2ª pergunta numerada', 'ok'),
        ('Card na coluna da renda assim que o lead informa a renda bruta', 'ok'),
        ('3ª mensagem sem valor; 4ª mensagem com nota do caso no card', 'ok'),
        ('Pausa entre 4ª e 5ª mensagem (30 min de 08/10; a senhora citou 15)', 'dec'),
        ('Oferta só acima de R$ 15 mil; até R$ 15 mil só etiqueta, sem tarefa', 'ok'),
        ('Respostas a dúvidas (preço, endereço, documento, garantia)', 'ok'),
        ('Passagem para a equipe com tarefa (robô, pede pessoa, advogado, outro assunto, remarcar)', 'ok'),
        ('Não qualificar quem está ou passou pelo Closer, ou tem JÁ FEZ REUNIÃO', 'ok'),
        ('"Quer contratar" → Closer › Retorno imediato + tarefa prioritária, sem mensagem', 'ok'),
        ('Treino com conversas de setembro e outubro (objeções)', 'pend'),
        ('Memória de atendimentos anteriores pelo telefone (Ajuste 3)', 'pend'),
    ]),
    ('Agenda e reunião', [
        ('Ligação com a agenda Google da senhora (credenciais)', 'pend'),
        ('Horário único, tarde 15:00–17:30 e manhã 11:00/10:30/10:00', 'parcial'),
        ('Prioridade acima de R$ 20 mil e prazo máximo (dia seguinte)', 'dec'),
        ('Confirmação com link do Meet e card em Reunião agendada', 'parcial'),
        ('Lembretes 24h, 1h e 15 min', 'parcial'),
    ]),
    ('Follow-ups', [
        ('Régua da qualificação (Follow 1 a 4) para lead novo', 'falha'),
        ('2 horas após a oferta com o texto da equipe; demais como estavam', 'parcial'),
        ('Réguas terminam sem Venda perdida; lead que volta é retomado', 'ok'),
        ('Pós-reunião: resposta em Cliente decisão → Retorno imediato + tarefa', 'ok'),
        ('Pós-reunião: follow-up 23 h depois da reunião pela Anna', 'pend'),
    ]),
    ('Kommo', [
        ('Etiqueta de mês nas entradas por formulário (Ajuste 4)', 'ok'),
        ('Robôs antigos que levam cards do Closer ao SDR (correção pela Anna)', 'ok'),
        ('Ajuste dos robôs antigos no próprio Kommo', 'dec'),
        ('Central da Anna (painel, testes, ensinar)', 'ok'),
    ]),
    ('Cobrança (Asaas)', [
        ('Chave de API e webhook de pagamento na conta da senhora', 'ok'),
        ('Régua completa (antes, dia, 17h, D+1, D+5, D+10, D+18, pago) em simulação diária', 'parcial'),
        ('8 modelos da cobrança aprovados pela Meta', 'ok'),
        ('Envio real das mensagens de cobrança', 'falha'),
        ('Decisões: avisos do próprio Asaas, clientes sem telefone, fim de semana', 'dec'),
    ]),
]
chk = ''.join(f"<tr><th colspan=2 class='grupo'>{e(g)}</th></tr>" + ''.join(f"<tr><td>{e(t)}</td><td style='width:34%'>{st(s)}</td></tr>" for t, s in itens) for g, itens in CHECK)

H = f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Revisão integral da implantação</title><style>
@page {{ size: A4; margin: 15mm 14mm 15mm 14mm; }}
body {{ font-family: 'Inter','Segoe UI',Arial,sans-serif; color:#1f2937; font-size:9.6pt; line-height:1.45; }}
h1 {{ font-size:19pt; color:#1e3a5f; margin:5mm 0 2mm; }} h2 {{ font-size:12.5pt; color:#1e3a5f; margin:6mm 0 2mm; border-bottom:2px solid #f05a28; padding-bottom:1mm; }}
h3 {{ font-size:10.2pt; margin:3.5mm 0 1mm; }} .kicker {{ color:#f05a28; font-weight:700; letter-spacing:.08em; font-size:8.3pt; text-transform:uppercase; }}
table {{ width:100%; border-collapse:collapse; margin:2mm 0; font-size:8.2pt; }} th,td {{ border-bottom:1px solid #e5e7eb; padding:1.4mm 1.6mm; text-align:left; vertical-align:top; }}
th {{ background:#f3f4f6; font-weight:600; }} th.grupo {{ background:#1e3a5f; color:#fff; }} tr.marca td {{ background:#fff7ed; }}
.erro {{ color:#b91c1c; font-weight:600; }} .ok {{ color:#15803d; font-weight:600; }}
.tag {{ display:inline-block; padding:.3mm 2mm; border-radius:3mm; font-size:7.6pt; font-weight:600; }}
.tag.ok {{ background:#dcfce7; color:#166534; }} .tag.parcial {{ background:#fef9c3; color:#854d0e; }} .tag.falha {{ background:#fee2e2; color:#991b1b; }} .tag.pend {{ background:#e5e7eb; color:#374151; }} .tag.dec {{ background:#dbeafe; color:#1e40af; }}
.box {{ background:#f0f7ff; border-left:4px solid #1e3a5f; padding:2.5mm 4mm; margin:3mm 0; }} .alerta {{ background:#fff5f0; border-left:4px solid #f05a28; padding:2.5mm 4mm; margin:3mm 0; }}
ul {{ margin:1mm 0 2mm 5mm; padding-left:3mm; }} li {{ margin:.7mm 0; }} .quebra {{ page-break-before:always; }} .pequeno {{ font-size:8pt; color:#6b7280; }}
</style></head><body>
<img src="logo.png" style="height:11mm">
<div class="kicker" style="margin-top:5mm">Relatório técnico · 22/10/2026 · Revisão integral da implantação da Anna</div>
<h1>Revisão integral: o que foi pedido, o que funciona, o que falhou e o que falta</h1>
<p>Dra. Carolina, este relatório responde aos itens da sua mensagem, um a um. Os números vêm dos <b>registros efetivos de envio do Kommo</b>, ou seja, as mensagens que de fato saíram pelo WhatsApp, e não das observações lançadas nos cards. Onde a falha foi nossa, está dito com clareza.</p>
<div class="alerta"><b>Situação atual:</b>
<ul>
<li>A Anna está <b>pausada para todos os leads reais desde 22/10, às 15h40</b>. Ela só atua num card de teste da Control Gestão.</li>
<li>Desde então, nenhuma mensagem da Anna saiu para um lead real.</li>
<li>Ela só volta à produção com a sua aprovação expressa.</li>
</ul></div>

<h2>1. O problema central: a 1ª mensagem e os follow-ups não saíram</h2>
<div class="box"><b>Auditoria de 19/10 a 22/10 ({n} leads de formulário que entraram para a Anna):</b>
<ul>
<li><b>1ª mensagem:</b> a Anna tentou mandar para os {n} leads. <b class="erro">Nenhuma saiu pelo WhatsApp.</b></li>
<li><b>Follow-ups:</b> {fu_tot} foram registrados como enviados, mas <b class="erro">só {fu_ok} saíram</b>. Esses 2 eram de leads que já tinham escrito antes.</li>
<li><b>Follow-up registrado sem 1ª mensagem entregue:</b> {fu_sem} leads.</li>
</ul></div>
<h3>Causa técnica</h3>
<ul>
<li><b>Como a Anna envia:</b> pelos robôs de modelo do Kommo, que mandam os modelos aprovados pela Meta.</li>
<li><b>Onde falha:</b> esses robôs só conseguem enviar quando o contato <b>já tem uma conversa aberta no WhatsApp do escritório</b>. O lead que acabou de preencher o formulário nunca conversou com o escritório. O robô "roda", o Kommo aceita o comando, mas <b>nenhuma mensagem é criada</b>.</li>
<li><b>Por que a Anna registrava "enviado":</b> ela tratava o robô ter rodado como envio feito. Por isso os cards mostram "follow-up enviado" sem nada ter saído.</li>
<li><b>Por que não percebemos antes:</b> o teste foi feito num card de teste que já tinha conversa aberta, então lá o envio funcionou. Ontem informamos ao Eduardo que 7 leads tinham recebido a 1ª mensagem, com base nesses registros, e <b>essa informação estava errada</b>.</li>
</ul>
<h3>O que já foi corrigido</h3>
<ul>
<li>A Anna só considera uma mensagem enviada quando o Kommo registra a saída no chat do contato. Ela confere em até 30 segundos.</li>
<li>Se a mensagem não sair, ela registra a falha e põe uma nota no card: "o WhatsApp NÃO registrou o envio; nada chegou ao lead; a equipe precisa fazer o contato".</li>
<li>Nesse caso, o follow-up seguinte não é agendado.</li>
<li>Testado no card de teste: envio confirmado em 9 segundos.</li>
</ul>
<h3>O que falta corrigir antes de qualquer reativação</h3>
<ul>
<li>Configurar os robôs de modelo para <b>iniciar a conversa pelo número de WhatsApp do escritório</b>, também para contatos sem conversa.</li>
<li>Comprovar com um contato que nunca falou com o escritório. A forma segura é um <b>lead de teste do próprio formulário do Meta</b>, que segue exatamente o caminho de um lead real.</li>
</ul>

<h2>2. Respostas sobre os leads com follow-up e sem atendimento inicial</h2>
<table><tr><th>Lead</th><th>Entrou</th><th>1ª mensagem da Anna</th><th>Follow 1</th><th>1º envio real no WhatsApp</th></tr>
<tr><td>Ludmilla Figueiredo</td><td>21/10 18:32</td><td>tentada às 18:32 · <span class="erro">não saiu</span></td><td>22/10 07:00 · <span class="erro">não saiu</span></td><td>22/10 15:22, pela equipe</td></tr>
<tr><td>Dazica Araújo</td><td>21/10 18:35</td><td>tentada às 18:35 · <span class="erro">não saiu</span></td><td>22/10 07:00 · <span class="erro">não saiu</span></td><td>22/10 15:30, pela equipe</td></tr>
<tr><td>Sinomil Soares da Rocha</td><td>21/10 19:40</td><td>tentada às 19:40 · <span class="erro">não saiu</span></td><td>22/10 07:00 · <span class="erro">não saiu</span></td><td>22/10 15:33, pela equipe</td></tr>
<tr><td>Lucia Elias</td><td>22/10 06:16</td><td>tentada às 06:16 · <span class="erro">não saiu</span></td><td>22/10 08:20 · <span class="erro">não saiu</span></td><td>22/10 15:35, pela equipe</td></tr>
<tr><td>Gabriel Martins</td><td>22/10 08:53</td><td>tentada às 08:53 · <span class="erro">não saiu</span></td><td>22/10 10:55 · <span class="erro">não saiu</span></td><td>22/10 15:44, pela equipe</td></tr></table>
<ol>
<li><b>Por que não receberam a 1ª mensagem?</b> Pela causa do item 1. O robô rodou, mas não havia conversa aberta com o contato.</li>
<li><b>"Follow 1 enviado" de qual mensagem?</b> Da 1ª mensagem que a Anna registrou como enviada e que não saiu. O registro estava errado.</li>
<li><b>Foi enviada de fato ou só a automação rodou?</b> Só a automação rodou. Não existe mensagem de saída no WhatsApp nesses horários.</li>
<li><b>Conteúdo:</b>
<ul>
<li>1ª mensagem: o modelo aprovado "Anna - Primeiro contato" ("Olá, [nome]. Aqui é a Anna... 1) suspender... 2) reestruturar... 3) as duas...").</li>
<li>Follow 1: o modelo aprovado "Follow 1" da senhora.</li>
<li>Nenhuma das duas chegou.</li>
</ul></li>
<li><b>Horário e status de entrega:</b> os horários estão na tabela. Status: não enviada, porque não há registro de saída.</li>
<li><b>Falha na integração?</b> Sim, entre o robô de modelo do Kommo e o WhatsApp, para contatos sem conversa aberta. É o item 1.</li>
<li><b>Quantos leads?</b> Todos os {n} leads de formulário de 19/10 a 22/10 (lista completa no item 4).</li>
</ol>
<p><b>Erro ao encaminhar a mensagem da Lucia manualmente:</b> o WhatsApp oficial só aceita iniciar conversa com um <b>modelo aprovado</b>. Uma mensagem de texto livre para quem nunca escreveu é recusada. É a mesma regra que barrou a Anna.</p>

<h2>3. Transferência para atendimento humano</h2>
<ol>
<li><b>A entrada do lead já conta como atendimento da Anna?</b> Na regra de ontem, sim. A tag <i>ia</i> bastava, mesmo sem mensagem entregue. Isso foi corrigido: a nota agora diferencia os dois casos (item 6 abaixo).</li>
<li><b>A tag atendimento-humano é posta automaticamente?</b> Sim, desde 22/10. Ela entra no mesmo segundo em que a equipe envia a primeira mensagem pelo Kommo, para a Anna não falar por cima da equipe.</li>
<li><b>Por que a tag não aparece em alguns cards?</b> Ela só entra quando a equipe escreve <b>depois</b> de a regra existir e com a Anna ativa.
<ul>
<li><b>Gabriel Martins:</b> a mensagem da equipe saiu às 15h44, depois que pausamos a Anna. Por isso não recebeu nem a tag nem a nota.</li>
<li><b>Ludmilla, Dazica, Sinomil e Lucia:</b> a tag está no card.</li>
<li><b>Algum card com a nota e sem a tag:</b> nesse caso, a tag foi retirada à mão depois.</li>
</ul></li>
<li><b>A equipe precisa tirar a tag para a Anna retomar?</b> Sim. A Anna não volta sozinha. Antes ela voltava depois de 6 horas, e foi isso que causou a requalificação da Erika.</li>
<li><b>Como diferenciar atendimento iniciado de lead só atribuído à IA?</b> Desde a correção de hoje:
<ul>
<li>a Anna só considera o atendimento iniciado quando a 1ª mensagem dela foi <b>confirmada no WhatsApp</b> ou quando o lead escreveu;</li>
<li>se a equipe escrever antes disso, a nota passa a ser: "A equipe iniciou o atendimento deste lead antes de a Anna falar com ele. A Anna não vai atuar neste card".</li>
</ul></li>
<li><b>Essa regra atrapalhou o início dos atendimentos ou os follow-ups?</b> Não causou a falha da 1ª mensagem: essa falha vem do item 1 e começou antes da regra. A regra apenas impede follow-ups depois que a equipe assume, como deve ser.</li>
</ol>

<h2>4. Qualificação e movimentação entre SDR e Closer (Erika e demais)</h2>
<p>O relatório específico do caso Erika foi enviado em separado. Resumo:</p>
<ul>
<li><b>Por que virou "cliente":</b> a classificação "já é cliente" estava ampla demais. Agora exige contrato assinado ou processo em andamento.</li>
<li><b>Por que requalificou:</b> a regra das 6 horas e a falta de uma trava para quem vem do Closer. Agora a Anna não conversa com quem está no Closer, com quem já passou por ele ou com quem tem a tag JÁ FEZ REUNIÃO.</li>
<li><b>Quem levou o card ao SDR:</b> os robôs antigos do Kommo, que respondem ao lead que escreve num card do Closer. Foram 138 movimentações desde 01/10, sendo 120 antes da Anna.
<ul><li>Esse risco foi levantado em 08/10. A trava estava prevista no roteiro de ativação, mas <b>esse passo não foi feito antes da ativação. A falha foi nossa.</b></li></ul></li>
<li><b>Correção:</b> card que um robô tirar do Closer volta ao Closer:
<ul><li>de Cliente decisão → <b>Retorno imediato</b>, com tarefa prioritária e <b>sem mensagem</b>;</li>
<li>"quer contratar" → tarefa "Lead deseja contratar — retorno imediato".</li></ul></li>
<li><b>Teste:</b> feito e registrado no Kommo.</li>
<li><b>Ainda no SDR:</b> 39 cards que vieram do Closer por robô. Aguardamos sua autorização para devolvê-los à etapa de origem.</li>
</ul>

<h2>5. Integração com o Asaas</h2>
<ol>
<li><b>O que foi pedido (08/10, com o Guilherme):</b> a régua de cobrança pelo WhatsApp:
<ul>
<li>4º dia útil (ou 4 dias antes);</li>
<li>no dia do vencimento, de manhã e às 17h;</li>
<li>D+1, D+5, D+10 e D+18, com prazo de 48 h;</li>
<li>confirmação de pagamento;</li>
<li>tag "inadimplentes".</li>
</ul></li>
<li><b>O que está pronto:</b>
<ul>
<li>chave de API de produção da sua conta;</li>
<li>webhook "Anna · confirmação de pagamento", ativo e recebendo os avisos de pagamento;</li>
<li>a régua completa programada;</li>
<li>8 modelos aprovados pela Meta e os robôs de envio;</li>
<li><b>simulação diária</b> (9h e 17h) desde 14/10, que registra o que sairia, sem enviar nada.</li>
</ul></li>
<li><b>Por que não está concluída:</b> faltam três decisões do escritório:
<ul>
<li>desligar os avisos do próprio Asaas, para não haver cobrança em dobro;</li>
<li>o que fazer com os 112 clientes sem telefone ou com telefone diferente do Kommo;</li>
<li>se a cobrança sai no fim de semana.</li>
</ul>
Falta também o teste real de R$ 5. <b>E existe agora um impedimento técnico:</b> a cobrança usa os mesmos robôs de modelo do item 1. Para cliente sem conversa aberta no número oficial, ela também não sairia. Isso precisa ser corrigido e testado antes.</li>
<li><b>O que falta, em ordem:</b>
<ol>
<li>corrigir o envio de modelos (item 1);</li>
<li>receber as três decisões;</li>
<li>fazer o teste de R$ 5 com um cliente de teste;</li>
<li>receber a sua aprovação;</li>
<li>ligar.</li>
</ol></li>
<li><b>Demonstração:</b> incluída no plano de testes do item 9.</li>
</ol>

<h2 class="quebra">6. Checklist geral da implantação</h2>
<p class="pequeno">Fontes: reunião de 08/10 com o Guilherme (escopo registrado por escrito naquele dia), suas mensagens de 15 e 16/10, a reunião de 16/10 com o Eduardo e a mensagem de hoje.</p>
<table>{chk}</table>

<h2>7. Automações ativas hoje (22/10, após a pausa)</h2>
<table><tr><th>Automação</th><th>Situação</th><th>Mexe em card real ou manda mensagem?</th></tr>
<tr><td>Anna: atendimento, 1ª mensagem, follow-ups e lembretes</td><td>Pausada (só o card de teste)</td><td>Não</td></tr>
<tr><td>Anna: entrada automática dos leads de formulário</td><td>Desligada</td><td>Não</td></tr>
<tr><td>Anna: etiqueta de mês</td><td>Desligada</td><td>Não</td></tr>
<tr><td>Anna: proteção do Closer</td><td>Só no card de teste</td><td>Não</td></tr>
<tr><td>Cobrança Asaas</td><td>Simulação (9h e 17h)</td><td>Não: só registra o que sairia</td></tr>
<tr><td>Robôs antigos do escritório no Kommo (retorno imediato, lembretes de Reunião agendada, Follow Cliente decisão, mudança 24h após Agendamento)</td><td>Ligados, como antes da Anna</td><td><b>Sim</b>: são automações do escritório, anteriores à Anna</td></tr></table>
<p><b>Mensagens da Anna para leads reais agora: nenhuma.</b> Depois da pausa, 2 follow-ups programados foram barrados pela própria Anna ("parou: lead fora da Anna").</p>

<h2>8. Testes realizados e resultados</h2>
<table><tr><th>Teste</th><th>Resultado</th></tr>
<tr><td>169 testes automáticos das regras (roteiro, R$ 15 mil, follow-ups, agenda, cobrança, etiquetas, Closer, contratar)</td><td class="ok">169 de 169</td></tr>
<tr><td>Exame de conversa da IA: 24 situações × 3 rodadas, incluindo as frases da Erika</td><td class="ok">72 de 72</td></tr>
<tr><td>Card de teste: qualificação completa, renda acima e abaixo de R$ 15 mil (16/10)</td><td class="ok">funcionou</td></tr>
<tr><td>Card de teste: Cliente decisão → robô → Retorno imediato + tarefa, sem mensagem (22/10)</td><td class="ok">funcionou</td></tr>
<tr><td>Card de teste: envio de modelo com confirmação no WhatsApp (22/10)</td><td class="ok">confirmado em 9 s</td></tr>
<tr><td>Etiqueta de mês com leads reais (19 a 22/10)</td><td class="ok">correta nos cards de formulário</td></tr>
<tr><td><b>1ª mensagem para lead novo sem conversa aberta</b></td><td class="erro">falhou em 44 de 44 (item 1)</td></tr>
<tr><td>Agendamento com a agenda Google, lembretes, cobrança real</td><td>não testados: dependem da agenda Google e da correção do item 1</td></tr></table>
<p><b>Ainda sem teste completo:</b> 1ª mensagem e follow-ups para lead novo, agendamento com Meet, lembretes, follow-up de 2 h após a oferta, cobrança real e pós-reunião de 23 h. A memória de atendimentos anteriores ainda não foi construída.</p>

<h2>9. Como testaremos sem usar seus leads reais</h2>
<ul>
<li><b>Lead de teste pelo próprio formulário:</b> o Meta tem uma ferramenta oficial que cria um lead de teste no formulário. Ele entra no Kommo exatamente como um lead real, e usaremos um número da Control Gestão que nunca falou com o escritório. Isso prova o caminho completo: formulário → Kommo → Anna → WhatsApp.</li>
<li><b>Agenda:</b> uma agenda Google de teste da Control Gestão para validar oferta, Meet, confirmação e lembretes. Depois, a sua agenda.</li>
<li><b>Cobrança:</b> um cliente de teste no Asaas com cobrança de R$ 5 e número da Control Gestão.</li>
<li><b>Evidências:</b> cada teste é gravado em vídeo e acompanha o registro do Kommo (horário, envio e etapa).</li>
<li><b>Demonstração completa:</b> ao final, apresentamos à senhora a Anna do formulário ao agendamento, com follow-ups, movimentações e integrações, ao vivo ou gravada.</li>
</ul>

<h2>10. Gravação, pendências e sua aprovação</h2>
<ul>
<li><b>Reunião de sexta-feira (16/10):</b> o Eduardo envia o link da gravação completa (Fathom, 31 min) junto com este relatório. A reunião de 08/10 está registrada por escrito no escopo daquele dia, usado no checklist do item 6.</li>
<li><b>O que corrigimos hoje:</b>
<ul>
<li>proteção do Closer;</li>
<li>não requalificar;</li>
<li>"quer contratar";</li>
<li>"já é cliente";</li>
<li>registro de envio só com confirmação;</li>
<li>nota correta quando a equipe inicia o atendimento.</li>
</ul></li>
<li><b>O que falta antes de pedir sua aprovação:</b>
<ul>
<li>corrigir o envio para contato sem conversa (item 1);</li>
<li>ligar a agenda Google;</li>
<li>receber suas decisões (pausa de 15 ou 30 min, prioridade acima de R$ 20 mil e prazo da agenda, robôs antigos, os 39 cards, Asaas);</li>
<li>fazer os testes do item 9 com evidências;</li>
<li>fazer a demonstração completa.</li>
</ul></li>
</ul>
<div class="box"><b>A Anna não volta a atender leads reais sem a sua aprovação expressa.</b> Reconhecemos que a ativação de 19/10 foi feita antes de comprovarmos o envio da 1ª mensagem para leads novos e antes de ajustar os robôs antigos. Esses dois erros são nossos e foram a origem da maior parte do que a senhora encontrou.</div>
<p class="pequeno">Anexo: auditoria completa dos {n} leads atendidos pela Anna (próxima página).</p>

<h2 class="quebra">Anexo · Auditoria dos leads processados pela Anna (19 a 22/10)</h2>
<p class="pequeno">"Follow-ups" = registrados / que saíram de fato. "1º envio real" = primeira mensagem que saiu de fato no WhatsApp desse contato e quem enviou. Em destaque, os 5 leads citados pela senhora.</p>
<table><tr><th>Card</th><th>Contato</th><th>Entrada</th><th>1ª msg da Anna (tentativa)</th><th>Saiu?</th><th>Follow-ups</th><th>1º envio real</th><th>Etapa hoje</th></tr>{aud}</table>
<p class="pequeno">Control Gestão · 22/10/2026.</p>
</body></html>"""
open('relatorio.html', 'w').write(H)
print('ok')
