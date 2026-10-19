// Monta google-narrado.js a partir de google.js + narração (narracao-google.json) e das durações dos áudios.
// Uso: node montar-narrado.cjs <duracoes.json> <saida-cenas.js> <saida-linha-do-tempo.json>
const fs = require('fs');
const [durFile, outJs, outTl] = process.argv.slice(2);
global.window = {};
require('./google.js');
const N = require('./narracao-google.json');
const D = JSON.parse(fs.readFileSync(durFile, 'utf8'));
const cenas = window.SC_DATA.scenes.map(s => JSON.parse(JSON.stringify(s)));
const troca = (t) => t.replace(/Guilherme/g, 'Eduardo').replace('Tutorial 1 de 2 · Dra. Carolina Calvo', 'Passo a passo · Dra. Carolina Calvo').replace('Leva cerca de 10 minutos.', 'Leva cerca de 15 minutos.');
for (const s of cenas) { s.html = troca(s.html); (s.captions || []).forEach(c => { c.text = troca(c.text) }) }
const intro = cenas.findIndex(s => s.id === 'intro');
cenas.splice(intro + 1, 0, {
  id: 'antes', kind: 'card', dur: 10,
  html: `<img class="logo" src="logo.png">
    <div class="kicker">Antes de começar</div>
    <h1>Três cuidados</h1>
    <ul><li data-n="1">Faça no <b>computador</b>, não no celular.</li>
    <li data-n="2">Entre com a <b>conta do Google da sua agenda</b> (onde ficam as reuniões).</li>
    <li data-n="3">Deixe aberto o <b>bloco de notas</b> (ou o WhatsApp com você mesma) para colar os códigos.</li></ul>
    <div class="warn">Leva uns 15 minutos. Pause o vídeo sempre que precisar.</div>`,
  captions: [{ at: 0, text: 'Computador, conta Google da agenda e um bloco de notas aberto.' }],
});
const GAP = 0.6, FIM = 1.4;
const linha = []; let inicioCena = 0;
for (const s of cenas) {
  const caps = s.captions && s.captions.length ? s.captions : [{ at: 0, text: '' }];
  const segs = N[s.id] || [];
  if (segs.length !== caps.length) throw new Error(`cena ${s.id}: ${segs.length} falas para ${caps.length} legendas`);
  const b = caps.map(c => c.at).concat([s.dur]);
  const novos = []; let t = 0.5;
  for (let i = 0; i < caps.length; i++) {
    const len = D[`${s.id}_${i}`];
    const velho = b[i + 1] - b[i];
    const novo = Math.max(len + GAP, velho);
    novos.push({ ini: t, len: novo, velhoIni: b[i], velho });
    linha.push({ arquivo: `${s.id}_${i}.wav`, em: +(inicioCena + t).toFixed(2) });
    t += novo;
  }
  const mapa = (x) => {
    const i = Math.max(0, novos.findIndex((n, j) => x < (novos[j + 1] ? novos[j + 1].velhoIni : Infinity)));
    const n = novos[i];
    return +(n.ini + (x - n.velhoIni) * (n.len / n.velho)).toFixed(2);
  };
  (s.actions || []).forEach(a => { a.at = mapa(a.at); if (a.to !== undefined) a.to = mapa(a.to) });
  caps.forEach((c, i) => { c.at = +novos[i].ini.toFixed(2) });
  s.dur = +(t + FIM).toFixed(2);
  inicioCena += s.dur;
}
fs.writeFileSync(outJs, `// Gerado por montar-narrado.cjs: google.js com narração e tempos ajustados à fala.\nwindow.SC_DATA = ${JSON.stringify({ scenes: cenas })};\n`);
fs.writeFileSync(outTl, JSON.stringify({ total: +inicioCena.toFixed(2), falas: linha }, null, 1));
console.log('duração total', inicioCena.toFixed(1), 's ·', cenas.length, 'cenas');
