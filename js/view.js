// The board is laid out in "game pixels" (600 x 520). The canvas itself is drawn at K times that,
// matched to the real screen, so everything stays sharp on high-resolution phones.
import { W, HT } from './config.js';

export const cv = document.getElementById('game');
export const ctx = cv.getContext('2d', { alpha: false });
export const view = { K: 1 };

const listeners = [];
export const onRescale = f => listeners.push(f);

function wantedK() {
  const shown = cv.getBoundingClientRect().width || W;
  const dpr = window.devicePixelRatio || 1;
  // round to quarter steps so tiny layout changes don't redraw everything; cap the cost on huge screens
  return Math.min(3, Math.max(1, Math.round((shown * dpr) / W * 4) / 4));
}
export function rescale(force) {
  const K = wantedK();
  if (!force && K === view.K && cv.width === Math.round(W * K)) return false;
  view.K = K;
  cv.width = Math.round(W * K); cv.height = Math.round(HT * K);
  listeners.forEach(f => f());
  return true;
}

// an offscreen canvas of w x h game pixels, drawn at the current scale; draw it back with explicit w/h
export function mk(f, w, h) {
  const c = document.createElement('canvas'), K = view.K;
  c.width = Math.ceil(w * K); c.height = Math.ceil(h * K);
  const g = c.getContext('2d'); g.scale(K, K); f(g);
  return c;
}

let rt = 0;
const later = () => { clearTimeout(rt); rt = setTimeout(() => rescale(false), 150); };
addEventListener('resize', later);
addEventListener('orientationchange', later);
