"""Cria os campos e os modelos WABA da Anna e da cobrança no Kommo.
Uso: python3 -I templates_anna.py [--fields] [--create] [--review]
Sem flags: só valida e imprime (nada é gravado)."""
import json, re, sys, urllib.request, urllib.error, pathlib

HERE = pathlib.Path(__file__).parent
TOKEN = (HERE / '.token').read_text().strip()
BASE = 'https://advogadacarolinacalvo.kommo.com/api/v4'

def api(method, path, body=None):
    req = urllib.request.Request(BASE + path, method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        sys.exit(f'{method} {path} -> {e.code}: {e.read().decode()[:1500]}')

FIELDS = {  # chave -> (nome no Kommo, exemplo para a Meta)
    'nome':    ('IA - Primeiro nome', 'Maria'),
    'horario': ('IA - Horário da reunião', 'quinta-feira, 09/10, às 15:00'),
    'meet':    ('IA - Link do Meet', 'https://meet.google.com/abc-defg-hij'),
    'link':    ('Cobrança - Link de pagamento', 'https://www.asaas.com/i/abc123xyz'),
    'venc':    ('Cobrança - Vencimento', '07/11/2026'),
    'dias':    ('Cobrança - Dias de atraso', '10'),
    'prazo':   ('Cobrança - Prazo limite', '20/11/2026'),
}

T = [
 ('Anna - Primeiro contato', 'MARKETING',
  "Olá, {nome}. Aqui é a Anna, da equipe da Dra. Carolina Calvo. Recebemos o seu contato sobre os descontos bancários.\n\n"
  "Você quer saber se, no seu caso, é possível:\n\n"
  "1) suspender os descontos bancários e pagamento das dívidas por até 6 meses?\n"
  "2) reestruturar o pagamento das dívidas em condições mais favoráveis e com juros revisados?\n"
  "3) as duas opções acima.\n\n"
  "É só me responder com o número."),
 ('Anna - Lembrete reunião 24h', 'UTILITY',
  "Olá, {nome}. Passando para lembrar da sua reunião on-line com a Dra. Carolina Calvo amanhã, {horario}.\n\n"
  "O link de acesso pelo Google Meet é este: {meet}\n\n"
  "Se precisar remarcar, é só responder esta mensagem."),
 ('Anna - Lembrete reunião 1h', 'UTILITY',
  "Olá, {nome}. A sua reunião on-line com a Dra. Carolina Calvo começa em 1 hora.\n\n"
  "Link de acesso pelo Google Meet: {meet}\n\n"
  "Se tiver algum imprevisto, me avise por aqui."),
 ('Anna - Lembrete reunião 15min', 'UTILITY',
  "Olá, {nome}. Faltam 15 minutos para a sua reunião on-line com a Dra. Carolina Calvo.\n\n"
  "Para entrar, use este link do Google Meet: {meet}\n\n"
  "Até já."),
 ('Cobrança - Antes do vencimento', 'UTILITY',
  "Olá, {nome}. Bom dia.\n\n"
  "Segue o link de pagamento da sua parcela de honorários com vencimento em {venc}:\n\n{link}\n\n"
  "Caso o pagamento já tenha sido efetuado, peço a gentileza de me encaminhar o comprovante.\n\n"
  "Desde já, agradeço."),
 ('Cobrança - Dia do vencimento', 'UTILITY',
  "Bom dia.\n\n"
  "Segue o boleto referente à sua ação.\n\n"
  "Data de vencimento no dia de HOJE.\n\n"
  "Link para pagamento: {link}\n\n"
  "Caso o pagamento já tenha sido efetuado, peço a gentileza de me encaminhar o comprovante.\n\n"
  "Desde já, agradeço."),
 ('Cobrança - Vencimento 17h', 'UTILITY',
  "Até o momento, *não localizamos em nosso sistema o pagamento da sua parcela de honorários com vencimento na data de hoje*.\n\n"
  "Atenção para *não pagar juros ou encargos por atraso*.\n\n"
  "Lembramos que, conforme a *Cláusula 7ª (Subcláusulas 1ª e 5ª)* do seu contrato, o vencimento da parcela de honorários "
  "*não está atrelado ou condicionado ao envio de atualizações ou andamentos processuais*."),
 ('Cobrança - 1 dia de atraso', 'UTILITY',
  "Passando por aqui para lembrar que a sua parcela com vencimento ontem ainda não consta com baixa em nosso sistema financeiro.\n\n"
  "Para facilitar a sua regularização ainda hoje e mantermos o seu contrato 100% em dia, segue O LINK DE PAGAMENTO: {link}\n\n"
  "Por favor, me envie o comprovante por aqui. Se já tiver efetuado o pagamento, por favor desconsidere esta mensagem."),
 ('Cobrança - 5 dias de atraso', 'UTILITY',
  "Olá, tudo bem?\n\n"
  "Constatamos em nosso sistema financeiro que a sua parcela com vencimento em {venc} permanece pendente de quitação, completando hoje 5 dias de atraso.\n\n"
  "Para mantermos a regularidade do seu contrato e evitarmos o encaminhamento do seu débito para as medidas administrativas previstas, disponibilizo abaixo o link de pagamento:\n\n{link}\n\n"
  "Por gentileza, realize o pagamento e nos envie o comprovante por aqui até às 17:00 de hoje para darmos a baixa imediata no sistema.\n\n"
  "Caso tenha ocorrido algum imprevisto financeiro atípico neste mês, me avise por este canal para que possamos avaliar a melhor alternativa para a sua situação.\n\n"
  "Ficamos no aguardo da sua confirmação!"),
 ('Cobrança - 10 dias de atraso', 'UTILITY',
  "Olá, {nome}, como vai?\n\n"
  "Constatamos em nosso sistema financeiro que a sua parcela com vencimento em {venc} continua pendente de quitação, completando hoje {dias} dias de atraso.\n\n"
  "Sobre a condução do seu caso:\n\n"
  "1) Acompanhamento Processual Mantido: o nosso setor jurídico continua acompanhando o seu processo na Justiça, garantindo os seus prazos e a defesa dos seus direitos.\n\n"
  "2) Pausa no Repasse de Informações e Suporte: enquanto durar a pendência financeira, as atualizações processuais, os relatórios de andamento, os agendamentos de reuniões e o suporte por este canal de WhatsApp ficam paralisados até a baixa do pagamento.\n\n"
  "Para regularizar a sua situação hoje e reativar o seu atendimento, segue o link de pagamento:\n\n{link}\n\n"
  "Por gentileza, realize o pagamento e nos envie o comprovante por aqui até às 17:00 de hoje para darmos a baixa imediata no sistema.\n\n"
  "Ficamos no aguardo da sua confirmação!"),
 ('Cobrança - 18 dias de atraso', 'UTILITY',
  "Prezado(a) {nome},\n\n"
  "Verificamos em nosso sistema financeiro que a sua parcela com *vencimento em {venc}* permanece pendente de quitação, *completando hoje {dias} dias de atraso*.\n\n"
  "Como *não tivemos o seu retorno* às nossas tentativas de contato anteriores, reforçamos os termos da condução da sua pasta:\n\n"
  "*1) Acompanhamento Processual Mantido:* O nosso setor jurídico continua monitorando e resguardando a sua ação na Justiça, garantindo a defesa dos seus direitos.\n\n"
  "*2) Atendimento e Atualizações Paralisados:* No entanto, o repasse de informações do processo e o suporte ativo por este canal de WhatsApp seguem oficialmente *paralisados até a regularização do débito*.\n\n"
  "Para evitarmos o encerramento do seu plano facilitado e o encaminhamento do débito para notificação extrajudicial com aplicação das multas contratuais, estipulamos o *prazo limite até {prazo}, às 17:00*, para a quitação da parcela.\n\n"
  "Link para pagamento: {link}\n\n"
  "Ficamos no aguardo."),
 ('Cobrança - Pagamento confirmado', 'UTILITY',
  "Olá, {nome}. Confirmamos o recebimento do pagamento da sua parcela de honorários com vencimento em {venc}.\n\n"
  "Agradecemos. O seu contrato segue em dia."),
]

def validate(name, text):
    keys = re.findall(r'\{(\w+)\}', text)
    meta = re.sub(r'\{(\w+)\}', lambda m: '{{%d}}' % (keys.index(m.group(1)) + 1), text)
    errs = []
    if len(meta) > 1024: errs.append(f'corpo com {len(meta)} caracteres (máx. 1024)')
    if re.match(r'^\s*\{\{', meta): errs.append('começa com variável')
    if re.search(r'\}\}\s*$', meta): errs.append('termina com variável')
    if re.search(r'\}\}\s*\{\{', meta): errs.append('variáveis coladas')
    if '—' in text: errs.append('travessão')
    return keys, len(meta), errs

def main():
    args = set(sys.argv[1:])
    existing = {f['name']: f['id'] for f in api('GET', '/leads/custom_fields?limit=250')['_embedded']['custom_fields']}
    missing = [n for n, _ in FIELDS.values() if n not in existing]
    if missing and '--fields' in args:
        res = api('POST', '/leads/custom_fields', [{'name': n, 'type': 'text'} for n in missing])
        for f in res['_embedded']['custom_fields']: existing[f['name']] = f['id']
        print('campos criados:', missing)
    elif missing:
        print('campos que faltam (rode com --fields):', missing)

    payload, ok = [], True
    for name, cat, text in T:
        keys, n, errs = validate(name, text)
        ok &= not errs
        print(f"{'OK ' if not errs else 'ERRO'} {cat:<9} {n:>4} car. {name} {errs if errs else ''}")
        if all(FIELDS[k][0] in existing for k in keys):
            content = re.sub(r'\{(\w+)\}', lambda m: '{{lead.cf.%d}}' % existing[FIELDS[m.group(1)][0]], text)
            examples = {'{{lead.cf.%d}}' % existing[FIELDS[k][0]]: FIELDS[k][1] for k in dict.fromkeys(keys)}
            payload.append({'name': name, 'content': content, 'type': 'waba', 'waba_category': cat,
                            'waba_language': 'pt_BR', **({'waba_examples': examples} if examples else {})})
    if not ok: sys.exit('corrija os erros antes de criar')

    current = {t['name']: t for t in api('GET', '/chats/templates?limit=250')['_embedded']['chat_templates']}
    if '--create' in args:
        novos = [p for p in payload if p['name'] not in current]
        if novos:
            res = api('POST', '/chats/templates', novos)
            for t in res['_embedded']['chat_templates']: current[t['name']] = t
            print('modelos criados:', [t['name'] for t in res['_embedded']['chat_templates']])
    (HERE / 'templates_payload.json').write_text(json.dumps(payload, ensure_ascii=False, indent=1))

    if '--review' in args:
        out = {}
        for name, _, _ in T:
            t = current.get(name)
            if not t: print('não existe ainda:', name); continue
            r = api('POST', f"/chats/templates/{t['id']}/review")
            out[name] = {'id': t['id'], 'reviews': r.get('_embedded', {}).get('reviews')}
            print('enviado para revisão:', name, out[name]['reviews'])
        (HERE / 'templates_review.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))

main()
