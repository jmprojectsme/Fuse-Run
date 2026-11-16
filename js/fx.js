// Particles: sparks, smoke, crate debris, and the dust motes drifting over the board.
import { W, HT } from './config.js';
import { G } from './state.js';

const MAXP = 220;

export function burst(x, y, col, n) {
  for (let i = 0; i < n && G.particles.length < MAXP; i++) {
    const a = Math.random() * 6.28, v = 40 + Math.random() * 110;
    G.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, t: 0.5 + Math.random() * 0.4, col, s: 3 + Math.random() * 2 });
  }
}
export function puff(x, y, rgb) {   // soft smoke that rises and fades
  if (G.particles.length > MAXP - 20) return;
  const t = 0.7 + Math.random() * 0.5;
  G.particles.push({ k: 'smoke', x: x + (Math.random() - 0.5) * 10, y, vx: (Math.random() - 0.5) * 24, vy: -(20 + Math.random() * 30), g: -10, t, t0: t, col: `rgb(${rgb})` });
}
export function debris(x, y, cols, n) {   // tumbling chunks of a broken crate
  for (let i = 0; i < n && G.particles.length < MAXP; i++) {
    const a = Math.random() * 6.28, v = 50 + Math.random() * 120;
    G.particles.push({ k: 'chunk', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 90, g: 420, t: 0.6 + Math.random() * 0.4, col: cols[i % cols.length], s: 5 + Math.random() * 4, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 16 });
  }
}

export function initMotes() {
  G.motes = Array.from({ length: 16 }, () => ({ x: Math.random() * W, y: Math.random() * HT, v: 6 + Math.random() * 10, s: 1 + Math.random() * 1.6, p: Math.random() * 6.3 }));
}

// runs every frame, also behind the menu
export function stepFx(dt, time) {
  const ps = G.particles;
  let n = 0;
  for (const p of ps) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g === undefined ? 300 : p.g) * dt;
    if (p.vr) p.rot += p.vr * dt;
    p.t -= dt; if (p.t > 0) ps[n++] = p;
  }
  ps.length = n;
  for (const m of G.motes) { m.y -= m.v * dt; m.x += Math.sin(time / 700 + m.p) * 8 * dt; if (m.y < -4) { m.y = HT + 4; m.x = Math.random() * W; } }
  G.shake = Math.max(0, G.shake - dt * 2.5); G.flash = Math.max(0, G.flash - dt * 3);
}
