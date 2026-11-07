// Building stages, starting and ending runs, and saving / restoring a run in progress.
import { T, C, R, D4, FLOOR, WALL, CRATE, ROCK, START_LIVES, ENEMY } from './config.js';
import { G, store, saveProfile, world, stageNo, isBoss } from './state.js';
import { theme, makeSprites, paintBg } from './art.js';
import { initMotes } from './fx.js';
import { makeEnemy } from './enemies.js';
import { sfx, stopMusic } from './audio.js';
import { hud, showOverlay, enter } from './ui.js';

const rnd = n => Math.floor(Math.random() * n);
const BASE_SPEED = 160;

export const newPlayer = () => ({ x: T * 1.5, y: T * 1.5, speed: BASE_SPEED, max: 1, range: 2, inv: 0, fx: 0, fy: 1, axis: 'x', moving: false, key: false, remote: false, curse: null });

// every open tile must be reachable from the start corner
function allReachable(grid) {
  let open = 0;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (grid[r][c] !== WALL && grid[r][c] !== ROCK) open++;
  const seen = new Set([C + 1]), q = [[1, 1]];
  for (const [qc, qr] of q) for (const [a, b] of D4) {
    const nc = qc + a, nr = qr + b, k = nr * C + nc;
    if (grid[nr][nc] !== WALL && grid[nr][nc] !== ROCK && !seen.has(k)) { seen.add(k); q.push([nc, nr]); }
  }
  return seen.size === open;
}

function makeGrid(L) {
  const grid = [], crates = [];
  const density = 0.4 + Math.min(L * 0.006, 0.12);
  for (let r = 0; r < R; r++) {
    grid[r] = [];
    for (let c = 0; c < C; c++) {
      if (r === 0 || c === 0 || r === R - 1 || c === C - 1 || (c % 2 === 0 && r % 2 === 0)) grid[r][c] = WALL;
      else if (c + r > 3 && Math.random() < density) { grid[r][c] = CRATE; crates.push([c, r]); }
      else grid[r][c] = FLOOR;
    }
  }
  // indestructible rocks: each is only kept if every open tile stays reachable
  let rocks = Math.min(3 + Math.floor(L * 0.5), 12), tries = 0;
  while (rocks > 0 && tries++ < 80) {
    const c = 1 + rnd(C - 2), r = 1 + rnd(R - 2);
    if (grid[r][c] === WALL || grid[r][c] === ROCK || c + r <= 4) continue;
    const before = grid[r][c];
    grid[r][c] = ROCK;
    if (allReachable(grid)) rocks--; else grid[r][c] = before;
  }
  return { grid, crates: crates.filter(([c, r]) => grid[r][c] === CRATE) };
}

export function build() {
  const L = G.level - 1;   // how many stages you have already cleared
  makeSprites(theme());
  // a stage needs at least a door crate, a key crate and a few more; a very unlucky roll is simply re-rolled
  let made;
  for (let i = 0; i < 20; i++) { made = makeGrid(L); if (made.crates.length >= 8) break; }
  const { grid, crates: live } = made;
  G.grid = grid;

  const [dc, dr] = live.splice(rnd(live.length), 1)[0];
  G.door = { c: dc, r: dr, shown: false };
  const [kc, kr] = live.splice(rnd(live.length), 1)[0];
  G.keyPos = { c: kc, r: kr };

  // each stage hides a few guaranteed power-ups in crates (plus random extras)
  const want = ['bomb', 'range', 'speed', 'bomb'];
  if (stageNo() >= 2) want.push('remote');
  if (isBoss()) want.push('life');
  if (Math.random() < Math.min(0.9, 0.4 + L * 0.02)) want.push('skull');
  if (L >= 10) want.push('skull');
  G.drops = {};
  for (const t of want) {
    if (!live.length) break;
    const [c, r] = live.splice(rnd(live.length), 1)[0];
    G.drops[r * C + c] = t;
  }

  G.spikes = [];
  for (let n = Math.min(Math.floor((L - 1) * 0.5), 8), g2 = 0; n > 0 && g2++ < 200;) {
    const c = 1 + rnd(C - 2), r = 1 + rnd(R - 2);
    if (grid[r][c] === FLOOR && c + r > 5 && !G.spikes.some(s => s.c === c && s.r === r)) { G.spikes.push({ c, r, ph: Math.random() * 3.2 }); n--; }
  }
  G.bombs = []; G.flames = []; G.items = []; G.enemies = []; G.particles = [];
  G.timeLeft = Math.max(isBoss() ? 170 : 130, (isBoss() ? 270 : 210) - L * 3);

  const pool = ['balloon'];
  if (G.level >= 3) pool.push('blob');
  if (G.level >= 5) pool.push('bat');
  if (G.level >= 7) pool.push('ghost');
  if (G.level >= 9) pool.push('knight');
  const list = [];
  if (isBoss()) {
    list.push('boss');
    for (let i = 0; i < Math.min(1 + Math.floor(L / 3), 5); i++) list.push(pool[i % pool.length]);
  } else {
    for (let i = 0; i < Math.min(3 + Math.floor(L * 0.4), 12); i++) list.push(pool[rnd(pool.length)]);
  }
  for (const type of list) {
    for (let g = 0; g < 200; g++) {
      const c = 1 + rnd(C - 2), r = 1 + rnd(R - 2);
      if (grid[r][c] === FLOOR && c + r > 8 && !G.enemies.some(e => e.c === c && e.r === r)) { G.enemies.push(makeEnemy(type, c, r, L)); break; }
    }
  }
  paintBg(); initMotes();
  spawn();
}

export function spawn() { const P = G.P; P.x = P.y = T * 1.5; P.inv = 2; P.curse = null; P.axis = 'x'; }

export function startStage() {
  // power-ups reset every stage; lives were already set by newGame / nextLevel
  Object.assign(G.P, { speed: BASE_SPEED, max: 1, range: 2, remote: false, key: false, curse: null });
  G.clock = 0; G.toast.t = 0;
  build();
  G.state = 'intro'; G.introT = 1.9;
  const stars = Math.min(5, 1 + Math.floor((G.level - 1) / 4));
  showOverlay(`Stage ${world() + 1}-${stageNo()}`, theme().name + '<br><br>Danger ' + '★'.repeat(stars) + '☆'.repeat(5 - stars) + '<br>A key is hidden in a crate' + (isBoss() ? '<br>Boss ahead!' : ''), '');
  sfx.intro();
  hud(); saveRun();
}

export function recordRun() {
  if (!G.runActive) return;
  G.runActive = false;
  const p = G.profile;
  if (!p) return;
  p.games++; p.bestScore = Math.max(p.bestScore, G.score); p.bestLevel = Math.max(p.bestLevel, G.level);
  saveProfile();
}

export function newGame() {
  recordRun(); G.runActive = true;
  G.level = 1; G.score = 0; G.lives = START_LIVES;
  G.P = newPlayer();
  startStage();
}
export function nextLevel() { G.level++; G.lives = START_LIVES; startStage(); }   // every stage starts with 3 lives

export function gameOver() {
  G.state = 'over'; stopMusic(); recordRun(); clearRun();
  setTimeout(sfx.over, 500);
  const p = G.profile;
  showOverlay('Game over', `Final score <b>${G.score}</b><br>Reached stage ${world() + 1}-${stageNo()}` + (p ? `<br>Best score <b>${p.bestScore}</b>` : ''), enter('retry'));
}

// ---------- save & resume ----------
const SAVE_V = 1;
export function saveRun() {
  if (!G.runActive) return;
  const { state, level, score, lives, timeLeft, clock, grid, items, enemies, spikes, door, keyPos, drops, bombs, P } = G;
  if (state === 'play' || state === 'paused' || state === 'intro') store.set('run', { v: SAVE_V, level, score, lives, timeLeft, clock, grid, items, enemies, spikes, door, keyPos, drops, bombs, P });
  else if (state === 'clear') store.set('run', { v: SAVE_V, next: true, level, score });
}
export const clearRun = () => store.set('run', null);

// a saved run comes from storage, which can be old or damaged: check every piece before trusting it
const isNum = v => typeof v === 'number' && isFinite(v);
const isTile = (o, c = 'c', r = 'r') => o && Number.isInteger(o[c]) && Number.isInteger(o[r]) && o[c] > 0 && o[r] > 0 && o[c] < C - 1 && o[r] < R - 1;
const ITEMS = ['bomb', 'range', 'speed', 'life', 'key', 'remote', 'coin', 'skull'];
function validRun(r) {
  if (!r || r.v !== SAVE_V || !Number.isInteger(r.level) || r.level < 1 || !isNum(r.score)) return false;
  if (r.next) return true;
  if (!isNum(r.lives) || r.lives < 1 || !isNum(r.timeLeft)) return false;
  if (!Array.isArray(r.grid) || r.grid.length !== R || !r.grid.every(row => Array.isArray(row) && row.length === C && row.every(v => v === 0 || v === 1 || v === 2 || v === 3))) return false;
  const P = r.P;
  if (!P || !isNum(P.x) || !isNum(P.y) || P.x < T || P.y < T || P.x > (C - 1) * T || P.y > (R - 1) * T) return false;
  return isTile(r.door) && isTile(r.keyPos) && ['items', 'enemies', 'spikes', 'bombs'].every(k => r[k] === undefined || Array.isArray(r[k]));
}
export function restoreRun() {
  const r = store.get('run', null);
  if (!r) return false;
  if (!validRun(r)) { clearRun(); return false; }
  try {
    G.level = r.level; G.score = r.score; G.runActive = true;
    if (r.next) {   // the app was closed right after a stage was cleared
      G.P = newPlayer(); G.lives = START_LIVES;
      G.state = 'clear';
      showOverlay(`Stage ${world() + 1}-${stageNo()} clear`, 'Ready for the next stage', enter('continue'));
    } else {
      G.lives = r.lives; G.timeLeft = r.timeLeft; G.clock = isNum(r.clock) ? r.clock : 0;
      makeSprites(theme());
      G.grid = r.grid; G.door = r.door; G.keyPos = r.keyPos; G.drops = r.drops && typeof r.drops === 'object' ? r.drops : {};
      G.items = (r.items || []).filter(it => isTile(it) && ITEMS.includes(it.type));
      G.enemies = (r.enemies || []).filter(e => e && ENEMY[e.type] && isTile(e) && isTile(e, 'tc', 'tr') && isNum(e.x) && isNum(e.y) && isNum(e.hp) && isNum(e.speed));
      G.spikes = (r.spikes || []).filter(s => isTile(s) && isNum(s.ph));
      G.bombs = (r.bombs || []).filter(b => isTile(b) && isNum(b.t) && isNum(b.range));
      G.flames = []; G.particles = [];
      G.P = Object.assign(newPlayer(), r.P); G.P.inv = Math.max(G.P.inv || 0, 1.5); G.P.moving = false;
      paintBg(); initMotes(); G.state = 'paused'; G.resumeTo = 'play';
    }
    hud(); return true;
  } catch (e) {   // fall back to a fresh board behind the menu
    clearRun(); G.runActive = false; G.state = 'title'; G.level = 1; G.score = 0; G.P = newPlayer(); build();
    return false;
  }
}
