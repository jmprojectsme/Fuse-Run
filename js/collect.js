// The crate-opening screen: after a game (mystery crates you found) or after a Draw in the Shop.
import { G } from './state.js';
import { sfx } from './audio.js';
import { $, hud } from './ui.js';
import { menu, showSec } from './menu.js';
import { newGame } from './level.js';
import { PETS, RARITY, petById, openFoundCrate, drawPet, drawPuzzle, drawCrate } from './pets.js';

let mode = 'menu', list = [], showing = null, raf = 0, shakeAt = 0, busy = false, confetti = [];
// list items: { res: null | result, shake: 0 }

export function openCrates(from, results) {
  mode = from;   // 'over' (after a game), 'menu' (main menu), 'draw' (Shop draw)
  list = results ? results.map(r => ({ res: r, pre: true })) : Array.from({ length: Math.min(G.profile.pending, 20) }, () => ({ res: null }));
  showing = null; busy = false; confetti = [];
  menu.classList.remove('hidden'); showSec('m-crates');
  $('crTitle').textContent = from === 'draw' ? (list.length === 10 ? 'Draw x10' : 'Draw') : 'Mystery crates';
  paint();
  if (!raf) raf = requestAnimationFrame(tick);
}

const label = r => {
  if (!r) return '';
  const x = r.pet && petById(r.pet);
  if (r.kind === 'piece') return r.done ? `NEW PET! ${x.name}` : `${x.name} piece ${r.have}/${r.need}`;
  if (r.kind === 'pet') return `New pet: ${x.name}!`;
  if (r.kind === 'dupe') return `${x.name} again: +${r.amt} coins`;
  return `+${r.amt} coins${r.why ? ' · ' + r.why : ''}`;
};
function paint() {
  const grid = $('crGrid'); grid.textContent = '';
  list.forEach((it, i) => {
    const b = document.createElement('button'), c = document.createElement('canvas');
    b.type = 'button'; b.className = 'crate' + (it.res ? ' open' : '') + (it.res && it.res.pet ? ' r-' + petById(it.res.pet).rarity : '');
    c.width = 64; c.height = 64; c.dataset.i = i; b.appendChild(c);
    b.addEventListener('click', () => (it.res && it.shown ? show(it) : open(i)));
    grid.appendChild(b);
  });
  const left = list.filter(it => !it.shown).length;
  $('crSub').textContent = left ? `Tap a crate to open it${list.length > 1 ? ` (${left} left)` : ''}` : 'All opened!';
  $('crAll').style.display = left > 1 ? '' : 'none';
  $('crDone').textContent = left ? 'Later' : mode === 'over' ? 'Play again' : mode === 'draw' ? 'Back to Shop' : 'Done';
  $('crDone').style.display = left && mode === 'draw' ? 'none' : '';   // draws are already paid: open them all
  $('crMenu').style.display = mode === 'over' && !left ? '' : 'none';
}
function open(i) {
  const it = list[i]; if (busy || it.shown) return;
  busy = true; it.shake = performance.now(); sfx.tick();
  setTimeout(() => {
    if (!it.res) it.res = openFoundCrate() || { kind: 'coins', amt: 0 };
    it.shown = true; busy = false; it.shake = 0;
    const r = it.res, big = r.done || r.kind === 'pet';
    if (big) { sfx.clear(); burstConfetti(); } else if (r.kind === 'piece') sfx.key(); else sfx.coin();
    show(it); paint(); hud();
  }, 650);
}
function openAll() {
  let n = 0;
  list.forEach(it => {
    if (it.shown) return;
    if (!it.res) it.res = openFoundCrate() || { kind: 'coins', amt: 0 };
    it.shown = true; n++;
  });
  if (!n) return;
  const best = list.find(it => it.res.done || it.res.kind === 'pet') || list.find(it => it.res.kind === 'piece') || list[0];
  if (best.res.done || best.res.kind === 'pet') { sfx.clear(); burstConfetti(); } else sfx.key();
  show(best); paint(); hud();
}
function show(it) { showing = it; $('crShow').classList.remove('hidden'); $('crText').innerHTML = esc(label(it.res)) + (it.res.pet ? `<br><small>${esc(petById(it.res.pet).perk)}</small>` : ''); }
const esc = s => String(s).replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
function burstConfetti() { for (let i = 0; i < 60; i++) confetti.push({ x: 100, y: 90, vx: (Math.random() - 0.5) * 7, vy: -Math.random() * 6 - 1, c: ['#ffd166', '#ff4fa8', '#5ee6c1', '#7fb0ff', '#ff8a1c'][i % 5], t: 1.6 }); }

function tick(t) {
  if ($('m-crates').classList.contains('hidden') || menu.classList.contains('hidden')) { raf = 0; return; }
  // the crate grid
  for (const c of $('crGrid').querySelectorAll('canvas')) {
    const it = list[+c.dataset.i], g = c.getContext('2d'); g.clearRect(0, 0, 64, 64);
    if (it.shown) {
      const r = it.res;
      if (r.pet) { g.save(); g.translate(32, 54); g.scale(1.5, 1.5); drawPet(g, r.pet, 0, 0, t); g.restore(); }
      else { g.fillStyle = '#ffd166'; g.font = 'bold 14px monospace'; g.textAlign = 'center'; g.fillText('+' + r.amt, 32, 38); }
    } else drawCrate(g, 32, 36, 1.3, t + +c.dataset.i * 300, it.shake ? Math.min(1, (performance.now() - it.shake) / 400) : 0);
  }
  // the big reveal
  if (showing) {
    const cv = $('crCv'), g = cv.getContext('2d'), r = showing.res, W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H);
    const glow = g.createRadialGradient(W / 2, H * 0.55, 5, W / 2, H * 0.55, W * 0.6), col = r.pet ? RARITY[petById(r.pet).rarity].col : '#ffd166';
    glow.addColorStop(0, col + 'aa'); glow.addColorStop(1, col + '00'); g.fillStyle = glow; g.fillRect(0, 0, W, H);
    g.save(); g.translate(W / 2, H / 2); g.rotate(t / 3000);
    g.fillStyle = 'rgba(255,255,255,.06)'; for (let i = 0; i < 12; i++) { g.rotate(Math.PI / 6); g.beginPath(); g.moveTo(0, 0); g.lineTo(-12, -W); g.lineTo(12, -W); g.fill(); }
    g.restore();
    if (r.kind === 'piece' && !r.done) { const pc = document.createElement('canvas'); pc.width = 130; pc.height = 130; drawPuzzle(pc.getContext('2d'), r.pet, 130, 130, t, r.idx); g.drawImage(pc, W / 2 - 65, H / 2 - 65); }
    else if (r.pet) { g.save(); g.translate(W / 2, H * 0.78); g.scale(4.5, 4.5); drawPet(g, r.pet, 0, 0, t); g.restore(); }
    else { g.fillStyle = '#ffd166'; g.font = 'bold 36px monospace'; g.textAlign = 'center'; g.fillText('+' + r.amt, W / 2, H / 2 + 12); }
    if (r.pet) { g.fillStyle = col; g.font = 'bold 12px monospace'; g.textAlign = 'center'; g.fillText(RARITY[petById(r.pet).rarity].name.toUpperCase(), W / 2, 18); }
    confetti.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.t -= 1 / 60; g.globalAlpha = Math.max(0, Math.min(1, p.t)); g.fillStyle = p.c; g.fillRect(p.x, p.y, 4, 6); });
    g.globalAlpha = 1; confetti = confetti.filter(p => p.t > 0);
  }
  raf = requestAnimationFrame(tick);
}

$('crShow').addEventListener('click', () => { showing = null; $('crShow').classList.add('hidden'); });
$('crAll').addEventListener('click', openAll);
$('crDone').addEventListener('click', () => {
  showing = null; $('crShow').classList.add('hidden');
  if (mode === 'over' && !list.some(it => !it.shown)) { menu.classList.add('hidden'); newGame(); }
  else if (mode === 'over') showSec('m-main');
  else if (mode === 'draw') { showSec('m-shop'); }
  else showSec('m-main');
});
$('crMenu').addEventListener('click', () => { showing = null; $('crShow').classList.add('hidden'); showSec('m-main'); });
export { PETS };
