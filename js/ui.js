// The HUD above the board, the overlay on top of it, and short toast messages.
import { G, world, stageNo } from './state.js';

export const $ = id => document.getElementById(id);
const el = {
  score: $('score'), lives: $('lives'), level: $('level'), time: $('time'),
  bombs: $('bombs'), range: $('range'), keyv: $('keyv'), coins: $('coinsv'),
  overlay: $('overlay'), title: $('ovTitle'), text: $('ovText'), btn: $('startBtn'), toMenu: $('toMenu'), det: $('detBtn')
};
export const overlay = el.overlay;

export const TOUCH = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
export const enter = v => (TOUCH ? 'Tap to ' : 'Press Enter to ') + v;

export function showOverlay(title, html, btn) {
  el.title.textContent = title;
  el.text.innerHTML = html;            // only ever built from numbers and fixed text, never from the player's name
  el.btn.textContent = btn;
  el.btn.style.display = btn ? '' : 'none';
  el.toMenu.style.display = G.state === 'over' ? '' : 'none';
  el.overlay.classList.remove('hidden');
}
export const hideOverlay = () => el.overlay.classList.add('hidden');

export const say = text => { G.toast.text = text; G.toast.t = 2; };
export const nag = text => { if (G.toast.t <= 0) say(text); };

// only touch the page when a value actually changed
const cache = {};
const put = (node, v) => { if (cache[node.id] !== v) { cache[node.id] = v; node.textContent = v; } };
export function hud() {
  const P = G.P;
  if (!P) return;
  put(el.score, G.score); put(el.lives, '♥ ' + Math.max(G.lives, 0));
  put(el.level, `${world() + 1}-${stageNo()}`); put(el.bombs, P.max); put(el.range, P.range);
  put(el.keyv, P.key ? 'Yes' : 'No'); put(el.coins, G.profile ? G.profile.coins : 0);
  const det = !!P.remote;
  if (cache.det !== det) { cache.det = det; el.det.classList.toggle('on', det); }
  const t = Math.max(0, Math.ceil(G.timeLeft));
  put(el.time, `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`);
}
