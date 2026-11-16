// Creatures: how they are made, how they see danger, and how they choose where to go.
import { T, C, R, D4, LETHAL, WALL, ROCK, CRATE, ENEMY } from './config.js';
import { G } from './state.js';

export function makeEnemy(type, c, r, L) {
  const s = ENEMY[type], boss = type === 'boss';
  return {
    type, boss, c, r, tc: c, tr: r, dc: 0, dr: 0, x: c * T + T / 2, y: r * T + T / 2,
    hp: boss ? s.hp + Math.floor(L / 6) : s.hp, hurt: 0, rad: boss ? 22 : 14,
    speed: s.speed * (1 + Math.min(L * 0.03, 0.8)),
    smart: Math.min(0.95, s.smart + L * 0.012),
    sight: s.sight + Math.floor(L / 6),
    dodge: Math.min(0.95, s.dodge + L * 0.008)
  };
}

const inside = (c, r) => c >= 0 && r >= 0 && c < C && r < R;
export const free = (e, c, r) =>
  inside(c, r) && (!G.grid[r][c] || (e.type === 'ghost' && G.grid[r][c] === CRATE)) && !G.bombs.some(b => b.c === c && b.r === r);

// tiles that are burning now, or about to be hit by a bomb blast
export function calcDanger() {
  const { flames, bombs, grid } = G;
  if (!flames.length && !bombs.length) { if (G.danger.size) G.danger = new Set(); return; }
  const danger = new Set();
  for (const f of flames) if (f.t > LETHAL) danger.add(f.r * C + f.c);
  for (const b of bombs) {
    if (!(b.remote || b.t < 1.6)) continue;
    danger.add(b.r * C + b.c);
    for (const [dc, dr] of D4) for (let i = 1; i <= b.range; i++) {
      const c = b.c + dc * i, r = b.r + dr * i;
      if (!inside(c, r) || grid[r][c] === WALL || grid[r][c] === ROCK) break;
      danger.add(r * C + c);
      if (grid[r][c] === CRATE) break;
    }
  }
  G.danger = danger;
}

// breadth-first search: first step towards the nearest tile that satisfies goal()
function route(e, goal, maxLen) {
  const danger = G.danger, key = (c, r) => r * C + c, start = key(e.c, e.r), prev = { [start]: -1 }, dist = { [start]: 0 }, q = [[e.c, e.r]];
  for (const [c, r] of q) {
    if (dist[key(c, r)] >= maxLen) continue;
    for (const [dc, dr] of D4) {
      const nc = c + dc, nr = r + dr, k = key(nc, nr);
      if (k in prev || !free(e, nc, nr)) continue;
      if (danger.has(k) && !danger.has(start)) continue;   // never path through a blast zone unless already trapped in one
      prev[k] = key(c, r); dist[k] = dist[key(c, r)] + 1;
      if (goal(nc, nr)) { let s = k; while (prev[s] !== start) s = prev[s]; return [s % C, Math.floor(s / C)]; }
      q.push([nc, nr]);
    }
  }
  return null;
}

function pickDir(e) {
  const P = G.P, danger = G.danger, pc = Math.floor(P.x / T), pr = Math.floor(P.y / T);
  let step = null;
  if (danger.has(e.r * C + e.c) && Math.random() < e.dodge) step = route(e, (c, r) => !danger.has(r * C + c), 12);   // run from bombs
  else if (G.state === 'play' && Math.random() < e.smart) step = route(e, (c, r) => c === pc && r === pr, e.sight);   // hunt the player
  if (!step) {
    let dirs = D4.filter(([dc, dr]) => free(e, e.c + dc, e.r + dr));
    const safe = dirs.filter(([dc, dr]) => !danger.has((e.r + dr) * C + e.c + dc));
    if (safe.length && Math.random() < e.dodge) dirs = safe;
    if (!dirs.length) return;
    const straight = dirs.find(([dc, dr]) => dc === e.dc && dr === e.dr);
    const [dc, dr] = straight && Math.random() < (e.type === 'bat' ? 0.3 : 0.7) ? straight : dirs[Math.floor(Math.random() * dirs.length)];
    step = [e.c + dc, e.r + dr];
  }
  e.dc = Math.sign(step[0] - e.c); e.dr = Math.sign(step[1] - e.r); e.tc = step[0]; e.tr = step[1];
}

// glide towards the target tile; pick a new one on arrival
export function moveEnemy(e, dt) {
  const tx = e.tc * T + T / 2, ty = e.tr * T + T / 2;
  const dist = Math.hypot(tx - e.x, ty - e.y), st = e.speed * dt;
  if (dist <= st) { e.x = tx; e.y = ty; e.c = e.tc; e.r = e.tr; pickDir(e); }
  else { e.x += (tx - e.x) / dist * st; e.y += (ty - e.y) / dist * st; }
}
