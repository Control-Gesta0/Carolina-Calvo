// Gera o vídeo quadro a quadro: o motor desenha o segundo t, o Chromium fotografa, o ffmpeg monta.
// Uso: node render.mjs <cenas.js> <saida.mp4> [--preview 1.5,12,30] [--frames <pasta>]
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright'); // global: NODE_PATH=$(npm root -g)
const here = path.dirname(fileURLToPath(import.meta.url));
const [dataFile, outFile, ...rest] = process.argv.slice(2);
const opt = (k) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : undefined; };
const FPS = 24;
const framesDir = opt('--frames') || fs.mkdtempSync('/tmp/frames-');
const preview = opt('--preview');

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 });
await page.goto('file://' + path.join(here, 'engine.html'));
await page.addScriptTag({ path: path.resolve(dataFile) });
await page.evaluate(() => document.fonts.ready);
const total = await page.evaluate(() => window.boot(window.SC_DATA));
console.log(`duração: ${total.toFixed(1)}s`);

if (preview) {
  for (const t of preview.split(',').map(Number)) {
    await page.evaluate((t) => window.render(t), t);
    const f = path.join(framesDir, `preview-${String(t).replace('.', '_')}.png`);
    await page.screenshot({ path: f });
    console.log(f);
  }
  await browser.close();
  process.exit(0);
}

fs.mkdirSync(framesDir, { recursive: true });
const n = Math.ceil(total * FPS);
for (let i = 0; i < n; i++) {
  await page.evaluate((t) => window.render(t), i / FPS);
  await page.screenshot({ path: path.join(framesDir, `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
  if (i % 240 === 0) console.log(`quadro ${i}/${n}`);
}
await browser.close();

execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(framesDir, 'f%05d.jpg'),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outFile]);
console.log(`ok: ${outFile}`);
