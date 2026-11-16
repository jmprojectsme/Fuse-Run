// World mechanics and world bosses: every zone plays differently.
//  1 Green Garden  - no hazard (learn the game)          boss: Thornking spawns sprouts
//  2 Dune Ruins    - quicksand slows everyone down        boss: Sand Wyrm burrows and pops up elsewhere
//  3 Frost Cavern  - ice: you keep sliding when you let go boss: Frost Golem freezes nearby bomb fuses
//  4 Magma Forge   - lava vents erupt on a rhythm          boss: Magma Lord throws fireballs at you
//  5 Coral Reef    - currents push you along               boss: Kraken slams a whole row or column
//  6 Storm Peak    - lightning strikes marked tiles        boss: Thunderbird blinks around and calls lightning
//  7 Neon Night    - teleport pads link far corners        boss: Glitch makes shadow clones
import { T, C, R, D4, FLOOR, WALL, ROCK, CRATE } from './config.js';
import { G, world, stageNo, isBoss } from './state.js';
import { tone, noise } from './audio.js';
import { burst, puff } from './fx.js';
import { say } from './ui.js';
import { makeEnemy, free } from './enemies.js';

const rnd = n => Math.floor(Math.random() * n);
const K = (c, r) => r * C + c;
export const ZONES = [
  { id: 'garden', hint: '', boss: 'Thornking', bossHint: 'It grows sprouts. Clear them fast.' },
  { id: 'sand', hint: 'Quicksand slows you down', boss: 'Sand Wyrm', bossHint: 'It burrows and pops up somewhere else. Watch for the ring.' },
  { id: 'ice', hint: 'Ice: you keep sliding when you let go', boss: 'Frost Golem', bossHint: 'Its frost pulse freezes bomb fuses nearby.' },
  { id: 'lava', hint: 'Lava vents erupt on a rhythm. Watch the glow', boss: 'Magma Lord', bossHint: 'It throws fireballs at you. Move off the red mark!' },
  { id: 'current', hint: 'Currents push you along the arrows', boss: 'Kraken', bossHint: 'It slams a whole row or column. Step out of the red line!' },
  { id: 'storm', hint: 'Lightning strikes the marked tiles', boss: 'Thunderbird', bossHint: 'It blinks around the board and calls lightning.' },
  { id: 'neon', hint: 'Teleport pads link far corners', boss: 'Glitch', bossHint: 'It makes shadow clones. They fade after a while.' }
];
export const zone = () => ZONES[world() % ZONES.length];

// ---------- building the hazards for a stage ----------
const floorTiles = (pred) => {
  const out = [];
  for (let r = 1; r < R - 1; r++) for (let c = 1; c < C - 1; c++) if (G.grid[r][c] !== WALL && G.grid[r][c] !== ROCK && c + r > 4 && (!pred || pred(c, r))) out.push([c, r]);
  return out;
};
function patches(n, size) {   // grow a few blobs of special floor
  const tiles = {}, all = floorTiles();
  for (let i = 0; i < n && all.length; i++) {
    let [c, r] = all[rnd(all.length)];
    for (let j = 0; j < size; j++) {
      tiles[K(c, r)] = 1;
      const opts = D4.map(([a, b]) => [c + a, r + b]).filter(([x, y]) => G.grid[y] && G.grid[y][x] !== undefined && G.grid[y][x] !== WALL && G.grid[y][x] !== ROCK && x + y > 4);
      if (!opts.length) break;
      [c, r] = opts[rnd(opts.length)];
    }
  }
  return tiles;
}
export function buildZone() {
  const z = zone(), st = stageNo(), Z = { id: z.id, tiles: {}, vents: [], pads: [], marks: [], storm: 3 };
  if (z.id === 'sand') Z.tiles = patches(3 + st, 6);
  else if (z.id === 'ice') Z.tiles = patches(3 + st, 9);
  else if (z.id === 'lava') {
    const fl = floorTiles((c, r) => G.grid[r][c] === FLOOR && c + r > 6);
    for (let i = 0; i < 2 + st * 2 && fl.length; i++) { const [c, r] = fl.splice(rnd(fl.length), 1)[0]; Z.vents.push({ c, r, ph: Math.random() * 4.5 }); }
  } else if (z.id === 'current') {
    // a few straight streams: each tile stores its push direction 0..3 (index into D4)
    for (let i = 0; i < 2 + st; i++) {
      const horiz = Math.random() < 0.5, d = horiz ? rnd(2) : 2 + rnd(2), [a, b] = D4[d];
      const line = 1 + 2 * rnd(Math.floor(((horiz ? R : C) - 2) / 2));   // odd lanes are open corridors
      for (let k = 1; k < (horiz ? C : R) - 1; k++) {
        const c = horiz ? k : line, r = horiz ? line : k;
        if (G.grid[r][c] !== WALL && G.grid[r][c] !== ROCK && c + r > 4) Z.tiles[K(c, r)] = d + 1;
      }
    }
  } else if (z.id === 'neon') {
    const fl = floorTiles((c, r) => G.grid[r][c] === FLOOR);
    for (let i = 0; i < 2 && fl.length > 4; i++) {
      const a = fl.splice(rnd(fl.length), 1)[0];
      fl.sort((p, q) => Math.hypot(q[0] - a[0], q[1] - a[1]) - Math.hypot(p[0] - a[0], p[1] - a[1]));   // farthest first
      const b = fl.splice(rnd(Math.min(3, fl.length)), 1)[0];
      Z.pads.push({ a, b });
    }
  }
  G.zone = Z;
}
export function fixZone(z) {   // a saved zone comes from storage: keep only sane pieces
  if (!z || typeof z !== 'object' || !ZONES.some(x => x.id === z.id)) return null;
  const ok = t => Array.isArray(t) && t.length === 2 && t.every(Number.isInteger);
  return { id: z.id, tiles: z.tiles && typeof z.tiles === 'object' ? z.tiles : {}, storm: typeof z.storm === 'number' ? z.storm : 3,
    vents: Array.isArray(z.vents) ? z.vents.filter(v => v && Number.isInteger(v.c) && Number.isInteger(v.r) && typeof v.ph === 'number') : [],
    pads: Array.isArray(z.pads) ? z.pads.filter(p => p && ok(p.a) && ok(p.b)) : [],
    marks: [] };
}

export const tileAt = (c, r) => (G.zone && G.zone.tiles[K(c, r)]) || 0;
// how fast something moves on this tile
export const zoneSpeed = (c, r) => (G.zone && G.zone.id === 'sand' && tileAt(c, r) ? 0.55 : 1);
export const onIce = (c, r) => !!(G.zone && G.zone.id === 'ice' && tileAt(c, r));
export const currentAt = (c, r) => (G.zone && G.zone.id === 'current' && tileAt(c, r) ? D4[tileAt(c, r) - 1] : null);

// ---------- marked tiles that burst into flame (lightning, fireballs, kraken slams) ----------
function mark(c, r, t, kind) {
  if (!G.grid[r] || G.grid[r][c] === WALL || G.grid[r][c] === ROCK) return;
  G.zone.marks.push({ c, r, t, t0: t, kind });
}
function burn(c, r) {
  if (!G.grid[r] || G.grid[r][c] === WALL || G.grid[r][c] === ROCK || G.grid[r][c] === CRATE) return;
  G.flames.push({ c, r, t: 0.5, kind: 'arm', rot: rnd(4) * 1.5708 });
}
const pc = () => Math.floor(G.P.x / T), pr = () => Math.floor(G.P.y / T);
function strikeNear(spread) {
  for (let g = 0; g < 30; g++) {
    const c = pc() + rnd(spread * 2 + 1) - spread, r = pr() + rnd(spread * 2 + 1) - spread;
    if (G.grid[r] && G.grid[r][c] === FLOOR && !G.zone.marks.some(m => m.c === c && m.r === r)) { mark(c, r, 1.3, 'bolt'); tone(1200, 0.08, 'square', 0.025); return; }
  }
}

// ---------- every frame ----------
export function zoneTick(dt) {
  const Z = G.zone; if (!Z) return;
  // lava vents: glow for a second, then erupt for half a second (they are real flames: they chain bombs too)
  for (const v of Z.vents) {
    const before = (G.clock - dt + v.ph) % 4.5, now = (G.clock + v.ph) % 4.5;
    if (before < 3.4 && now >= 3.4) { burn(v.c, v.r); D4.forEach(([a, b]) => { if (stageNo() >= 2 && G.grid[v.r + b][v.c + a] === FLOOR) burn(v.c + a, v.r + b); }); puff(v.c * T + T / 2, v.r * T + T / 2, '120,40,20'); noise(0.3, 0.06, 900, 150); }
  }
  // storm: lightning keeps striking near you
  if (Z.id === 'storm' && G.state === 'play') {
    Z.storm -= dt;
    if (Z.storm <= 0) { Z.storm = Math.max(2.2, 5 - stageNo() * 0.8) + Math.random(); strikeNear(3); }
  }
  // marks count down, then burst
  for (const m of Z.marks) {
    m.t -= dt;
    if (m.t <= 0) {
      m.done = true; burn(m.c, m.r);
      if (m.kind === 'fire') D4.forEach(([a, b]) => burn(m.c + a, m.r + b));
      if (m.kind === 'bolt') { G.flash = 0.6; G.shake = Math.min(1, G.shake + 0.4); burst(m.c * T + T / 2, m.r * T + T / 2, '#e8f0ff', 12); }
    }
  }
  if (Z.marks.some(m => m.done)) {
    const kinds = new Set(Z.marks.filter(m => m.done).map(m => m.kind));
    if (kinds.has('bolt')) { noise(0.45, 0.16, 7000, 300, 'highpass'); tone(90, 0.4, 'sawtooth', 0.07, 40); }
    if (kinds.has('fire') || kinds.has('slam')) { noise(0.35, 0.12, 1500, 100); tone(70, 0.3, 'sine', 0.12, 40); }
    Z.marks = Z.marks.filter(m => !m.done);
  }
  // teleport pads (player only)
  const P = G.P, c = pc(), r = pr();
  if (Z.pads.length) {
    const on = Z.pads.flatMap(p => [[p.a, p.b], [p.b, p.a]]).find(([a]) => a[0] === c && a[1] === r);
    if (!on) P.tpLock = null;
    else if (P.tpLock !== K(c, r)) {
      const [, to] = on; burst(P.x, P.y, '#ff4fd8', 14);
      P.x = to[0] * T + T / 2; P.y = to[1] * T + T / 2; P.tpLock = K(to[0], to[1]);
      burst(P.x, P.y, '#4fe0ff', 14); tone(400, 0.18, 'sine', 0.06, 1600); tone(1600, 0.18, 'sine', 0.04, 400, 0.08);
    }
  }
}
// hazards about to go off count as danger, so creatures try to stay away from them
export function zoneDanger() {
  const Z = G.zone; if (!Z || (!Z.marks.length && !Z.vents.length)) return;
  const d = new Set(G.danger);
  for (const m of Z.marks) { d.add(K(m.c, m.r)); if (m.kind === 'fire') D4.forEach(([a, b]) => d.add(K(m.c + a, m.r + b))); }
  for (const v of Z.vents) if ((G.clock + v.ph) % 4.5 > 2.6) d.add(K(v.c, v.r));
  G.danger = d;
}

// ---------- bosses ----------
export const bossName = () => zone().boss;
export function bossTick(e, dt) {
  const z = zone().id, L = G.level - 1;
  e.bt = (e.bt === undefined ? 3 : e.bt) - dt;
  if (e.under > 0) {   // Sand Wyrm underground
    e.under -= dt;
    if (e.under <= 0) { e.x = e.ux * T + T / 2; e.y = e.uy * T + T / 2; e.c = e.tc = e.ux; e.r = e.tr = e.uy; burst(e.x, e.y, '#d9b46a', 24); puff(e.x, e.y, '200,170,110'); noise(0.4, 0.1, 800, 100); }
    return;
  }
  if (e.chill > 0) e.chill -= dt;
  if (e.wind > 0) { e.wind -= dt; if (e.wind > 0) return; e.bt = 0; e.wound = true; }   // wind-up finished: attack now
  if (e.bt > 0) return;
  const P = G.P;
  if (z === 'garden') {
    e.bt = Math.max(4.5, 7.5 - L * 0.1);
    if (G.enemies.filter(x => x.type === 'sprout' && !x.dead).length < 3) {
      const spot = D4.map(([a, b]) => [e.c + a, e.r + b]).find(([c, r]) => free(e, c, r));
      if (spot) { G.enemies.push(makeEnemy('sprout', spot[0], spot[1], L)); burst(spot[0] * T + T / 2, spot[1] * T + T / 2, '#7ad66b', 10); tone(500, 0.12, 'triangle', 0.05, 900); }
    }
  } else if (z === 'sand') {
    e.bt = 6.5;
    const spots = floorTiles((c, r) => G.grid[r][c] === FLOOR && Math.hypot(c - pc(), r - pr()) >= 3 && Math.hypot(c - pc(), r - pr()) <= 6 && !G.bombs.some(b => b.c === c && b.r === r));
    if (spots.length) { const [c, r] = spots[rnd(spots.length)]; e.ux = c; e.uy = r; e.under = 1.6; burst(e.x, e.y, '#d9b46a', 18); noise(0.5, 0.08, 600, 80); }
  } else if (z === 'ice') {
    if (!e.wound) { e.wind = 1.2; e.chill = 1.2; tone(600, 1.1, 'sine', 0.04, 1800); return; }   // a growing ring warns you first
    e.wound = false; e.bt = 6; e.chill = 0.8;
    let n = 0;
    for (const b of G.bombs) if (Math.hypot(b.c * T + T / 2 - e.x, b.r * T + T / 2 - e.y) < T * 3.5 && !b.remote) { b.frozen = 2.5; n++; }
    if (Math.hypot(P.x - e.x, P.y - e.y) < T * 2.5) { P.chill = 1.5; }
    burst(e.x, e.y, '#bfe9ff', 26); tone(2000, 0.4, 'sine', 0.05, 500); noise(0.4, 0.06, 9000, 3000, 'highpass');
    if (n) say('Frozen fuses!');
  } else if (z === 'lava') {
    e.bt = Math.max(3, 4.6 - L * 0.05);
    mark(pc(), pr(), 1.3, 'fire'); tone(300, 0.3, 'sawtooth', 0.05, 900);
  } else if (z === 'current') {
    e.bt = 6.5;
    const row = Math.random() < 0.5;
    for (let k = 1; k < (row ? C : R) - 1; k++) mark(row ? k : pc(), row ? pr() : k, 1.7, 'slam');
    tone(110, 0.6, 'sine', 0.08, 60);
  } else if (z === 'storm') {
    e.bt = 5;
    const spots = floorTiles((c, r) => G.grid[r][c] === FLOOR && Math.hypot(c - pc(), r - pr()) >= 4 && !G.bombs.some(b => b.c === c && b.r === r));
    if (spots.length) { burst(e.x, e.y, '#e8f0ff', 18); const [c, r] = spots[rnd(spots.length)]; e.x = c * T + T / 2; e.y = r * T + T / 2; e.c = e.tc = c; e.r = e.tr = r; burst(e.x, e.y, '#e8f0ff', 18); tone(1500, 0.1, 'square', 0.04, 3000); }
    strikeNear(2); strikeNear(2);
  } else if (z === 'neon') {
    e.bt = 8;
    for (let i = 0; i < 2; i++) {
      const spot = D4.map(([a, b]) => [e.c + a, e.r + b]).filter(([c, r]) => free(e, c, r))[i];
      if (spot) { const k = makeEnemy('clone', spot[0], spot[1], L); k.life = 9; G.enemies.push(k); burst(spot[0] * T + T / 2, spot[1] * T + T / 2, '#ff4fd8', 10); }
    }
    tone(800, 0.2, 'square', 0.04, 200); tone(200, 0.2, 'square', 0.04, 800, 0.1);
  }
}
