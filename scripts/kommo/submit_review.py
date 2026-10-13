"""Tenta vincular os modelos à conta WABA e enviar para revisão. Em 13/10/2026 a API respondeu 200 mas ignorou o vínculo e não criou revisão: o envio precisa ser feito pela tela do Kommo."""
import json, urllib.request, urllib.error, pathlib, sys
HERE = pathlib.Path(__file__).parent
TOKEN = (HERE / '.token').read_text().strip()
BASE = 'https://advogadacarolinacalvo.kommo.com/api/v4'
WABA_ID = '2343930862777873'  # mesma conta WABA dos 34 modelos já aprovados (fonte 48825)
IDS = [51584, 51586, 51588, 51590, 51592, 51594, 51596, 51598, 51600, 51602, 51604, 51606]

def api(method, path, body=None):
    req = urllib.request.Request(BASE + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read(); return r.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:800]

st, res = api('PATCH', '/chats/templates', [{'id': i, 'waba_selected_waba_ids': [WABA_ID]} for i in IDS])
print('PATCH vínculo WABA ->', st, res if st >= 400 else '')
if st >= 400: sys.exit(1)
out = {}
for i in IDS:
    st, res = api('POST', f'/chats/templates/{i}/review')
    out[i] = (st, res.get('_embedded', {}).get('reviews') if isinstance(res, dict) else res)
    print(i, st, out[i][1])
(HERE / 'review_result.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))
