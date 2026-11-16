// The rules: moving, bombs and blasts, getting hurt, picking things up, clearing a stage.
import { T, C, H, LETHAL, D4, WALL, CRATE, ROCK, FLOOR, MAX_LIVES } from './config.js';
import { G, keys, earn, bombSkinId, world, stageNo, isBoss } from './state.js';
import { sfx, startMusic, stopMusic, tone, noise } from './audio.js';
import { theme, curSkin } from './art.js';
import { burst, puff, debris } from './fx.js';
import { calcDanger, moveEnemy } from './enemies.js';
import { zoneTick, zoneDanger, zoneSpeed, onIce, currentAt, bossTick } from './worlds.js';
import { spawn, saveRun, gameOver } from './level.js';
import { hud, say, nag, showOverlay, hideOverlay, enter } from './ui.js';
import { hasPerk, foundCrate, pet } from './pets.js';

// ---------- collision & movement ----------
function blocked(x, y, h, isPlayer) {
  const { grid, bombs } = G;
  for (let k = 0; k < 4; k++) {
    const ox = k & 1 ? h : -h, oy = k & 2 ? h : -h;
    const c = Math.floor((x + ox) / T), r = Math.floor((y + oy) / T);
    if (c < 0 || r < 0 || c >= C || r >= grid.length || grid[r][c]) return true;
    for (const b of bombs) if (b.c === c && b.r === r && !(isPlayer && b.pass)) return true;
  }
  return false;
}
function nudge(axis, s) {   // slide round corners: ease towards the middle of the lane
  const P = G.P, v = P[axis], d = (Math.floor(v / T) + 0.5) * T - v;
  if (Math.abs(d) < 1 || Math.abs(d) > H) return;
  const st = Math.sign(d) * Math.min(s, Math.abs(d));
  if (axis === 'y' ? !blocked(P.x, P.y + st, H, true) : !blocked(P.x + st, P.y, H, true)) P[axis] += st;
}
function movePlayer(dt) {
  const P = G.P;
  let dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  const c0 = Math.floor(P.x / T), r0 = Math.floor(P.y / T), ice = onIce(c0, r0);
  let sliding = false;
  if (!ice) P.slide = null;
  else if (!dx && !dy && P.slide) { [dx, dy] = P.slide; sliding = true; }   // on ice you keep going when you let go
  P.moving = !!(dx || dy) && !sliding;
  if (!dx && !dy) return;
  const x0 = P.x, y0 = P.y;
  const total = P.speed * (P.curse && P.curse.type === 'slow' ? 0.5 : 1) * zoneSpeed(c0, r0) * (P.chill > 0 ? 0.5 : 1) * dt, n = Math.ceil(total / 6), s = total / n;   // small sub-steps: no tunnelling, smoother corners
  for (let i = 0; i < n; i++) {
    let mx = dx, my = dy;
    if (mx && my) {   // diagonal input (joystick): use whichever axis is open, keep the current heading if both are
      const canX = !blocked(P.x + mx * s, P.y, H, true), canY = !blocked(P.x, P.y + my * s, H, true);
      if (canX && canY) { if (P.axis === 'y') mx = 0; else my = 0; }
      else if (canX) my = 0; else if (canY) mx = 0; else my = 0;
    }
    P.axis = mx ? 'x' : 'y'; P.fx = mx; P.fy = my;
    if (mx) { if (!blocked(P.x + mx * s, P.y, H, true)) P.x += mx * s; else nudge('y', s); }
    else if (my) { if (!blocked(P.x, P.y + my * s, H, true)) P.y += my * s; else nudge('x', s); }
  }
  if (ice && !sliding) P.slide = [P.fx, P.fy];
  if (sliding && Math.abs(P.x - x0) + Math.abs(P.y - y0) < 0.5) P.slide = null;   // hit something: stop
}
function drift(dir, amt) {   // a current pushes you along its lane
  const P = G.P, [a, b] = dir;
  if (a && !blocked(P.x + a * amt, P.y, H, true)) { P.x += a * amt; nudge('y', amt * 0.5); }
  else if (b && !blocked(P.x, P.y + b * amt, H, true)) { P.y += b * amt; nudge('x', amt * 0.5); }
}

// ---------- the pet: follows your path, and uses its skill where you can see it ----------
export const petSay = (text, col) => { const pp = G.petPos; if (pp) G.floats.push({ x: pp.x, y: pp.y - 30, text, col: col || '#ffd166', t: 1.4 }); };
function petTick(dt) {
  const P = G.P, id = pet();
  if (!id) return;
  let pp = G.petPos;
  if (!pp) {
    pp = G.petPos = { x: P.x - 20, y: P.y, flip: 1, hop: 0, step: 0, idle: 0, cd: 2, tongue: null, breath: 0, bark: 0, dust: 0 };
    petSay({ chick: 'Coins +20%', bunny: 'Speed +8%', frog: 'Ribbit!', pup: 'Sniff sniff...', owl: '+20 seconds', turtle: 'Shield up!', fox: '+1 flame', dragon: '+1 bomb +1 flame', phoenix: G.phoenixUsed ? 'Resting...' : 'Ready to rise' }[id]);
  }
  if (id === 'bunny' && P.moving && (pp.dust -= dt) <= 0) { pp.dust = 0.12; G.particles.push({ x: P.x - (P.fx || 0) * 10, y: P.y + 12, vx: -(P.fx || 0) * 20, vy: -15, t: 0.35, col: '#e8e2d0', s: 4 }); }
  // breadcrumbs: the pet walks where you walked, so it never cuts through walls
  const tr = G.trail || (G.trail = []), last = tr[tr.length - 1];
  if (!last || Math.hypot(P.x - last.x, P.y - last.y) > 4) { tr.push({ x: P.x, y: P.y }); if (tr.length > 40) tr.shift(); }
  let tx = pp.x, ty = pp.y, acc = 0;
  for (let i = tr.length - 1; i > 0; i--) { acc += Math.hypot(tr[i].x - tr[i - 1].x, tr[i].y - tr[i - 1].y); if (acc >= 26) { tx = tr[i - 1].x; ty = tr[i - 1].y; break; } }
  if (Math.hypot(tx - pp.x, ty - pp.y) > T * 3) { pp.x = tx; pp.y = ty; G.trail = [{ x: P.x, y: P.y }]; }   // respawn / teleport
  const k = Math.min(1, dt * 7), mx = (tx - pp.x) * k, my = (ty - pp.y) * k;
  pp.x += mx; pp.y += my;
  const moved = Math.hypot(mx, my);
  if (Math.abs(mx) > 0.15) pp.flip = mx > 0 ? 1 : -1;
  if (moved > 0.3) { pp.step += moved * 0.28; pp.idle = 0; } else { pp.idle += dt; pp.step += (Math.round(pp.step / Math.PI) * Math.PI - pp.step) * Math.min(1, dt * 10); }
  pp.hop = Math.abs(Math.sin(pp.step)) * (moved > 0.3 ? 5 : 0);
  pp.cd -= dt; pp.bark = Math.max(0, pp.bark - dt); pp.breath = Math.max(0, pp.breath - dt);
  if (pp.tongue) { pp.tongue.t -= dt; if (pp.tongue.t <= 0) pp.tongue = null; }
  const pc = Math.floor(P.x / T), pr = Math.floor(P.y / T);

  if (id === 'frog' && pp.cd <= 0) {   // tongue grabs the nearest coin within 3 tiles
    const coin = G.items.filter(it => it.type === 'coin').map(it => [it, Math.hypot(it.c * T + T / 2 - pp.x, it.r * T + T / 2 - pp.y)]).filter(x => x[1] < T * 3.2).sort((a, b) => a[1] - b[1])[0];
    if (coin) {
      const it = coin[0]; pp.tongue = { x: it.c * T + T / 2, y: it.r * T + T / 2, t: 0.3 }; pp.cd = 1.4;
      G.items = G.items.filter(x => x !== it); pickup(it); tone(900, 0.08, 'sine', 0.05, 300); petSay('+coin', '#a5e67b');
    } else pp.cd = 0.4;
  }
  if (id === 'pup' && pp.cd <= 0) {   // bark and point at the key crate
    pp.cd = 7;
    if (!P.key && G.grid[G.keyPos.r][G.keyPos.c] === CRATE) { pp.bark = 1.6; petSay('Woof! Key there!'); tone(520, 0.08, 'square', 0.05, 380); tone(560, 0.08, 'square', 0.05, 400, 0.14); }
  }
  if (id === 'fox' && pp.cd <= 0) {   // spit an ember at the nearest creature: it is stunned for 2 seconds
    const e = G.enemies.filter(e => !e.boss || true).filter(e => !(e.under > 0)).map(e => [e, Math.hypot(e.x - pp.x, e.y - pp.y)]).filter(x => x[1] < T * 4.5).sort((a, b) => a[1] - b[1])[0];
    if (e) { G.petShots.push({ x: pp.x, y: pp.y - 10, e: e[0], t: 1.2 }); pp.cd = 5; tone(700, 0.15, 'triangle', 0.05, 1400); }
    else pp.cd = 0.5;
  }
  if (id === 'dragon' && pp.cd <= 0) {   // breathe fire ahead: burns the first crate within 2 tiles
    pp.cd = 0.5;
    const dc = P.fx || 0, dr = P.fy || (P.fx ? 0 : 1);
    for (let i = 1; i <= 2; i++) {
      const c = pc + dc * i, r = pr + dr * i, g = G.grid[r] && G.grid[r][c];
      if (g === WALL || g === ROCK || g === undefined) break;
      if (g === CRATE) { pp.breath = 0.6; pp.bdir = [dc, dr]; breakCrate(c, r); for (let j = 0; j < 10; j++) burst(c * T + T / 2, r * T + T / 2, j % 2 ? '#ff8a1c' : '#ffd166', 2); noise(0.3, 0.07, 2000, 300); petSay('Rawr!', '#ff8a1c'); pp.cd = 6; break; }
    }
  }
  // ember shots fly to their target
  for (const s of G.petShots) {
    s.t -= dt; if (s.e.dead) { s.t = 0; continue; }
    const d = Math.hypot(s.e.x - s.x, s.e.y - s.y), v = 260 * dt;
    if (d <= v + 8) { s.t = 0; s.e.chill = Math.max(s.e.chill || 0, 2); burst(s.e.x, s.e.y, '#ff8a1c', 10); petSay('Stunned!', '#ff8a1c'); tone(300, 0.12, 'square', 0.05, 150); }
    else { s.x += (s.e.x - s.x) / d * v; s.y += (s.e.y - s.y) / d * v; if (Math.random() < 0.5) G.particles.push({ x: s.x, y: s.y, vx: 0, vy: -10, t: 0.3, col: '#ffb84d', s: 3 }); }
  }
  G.petShots = G.petShots.filter(s => s.t > 0);
}
function stepFloats(dt) { for (const f of G.floats) { f.t -= dt; f.y -= 22 * dt; } G.floats = G.floats.filter(f => f.t > 0); }

// ---------- bombs & blasts ----------
export function placeBomb() {
  const P = G.P;
  if (G.state !== 'play' || G.bombs.length >= P.max) return;
  const c = Math.floor(P.x / T), r = Math.floor(P.y / T);
  if (G.bombs.some(b => b.c === c && b.r === r)) return;
  const long = !P.remote && !!P.curse && P.curse.type === 'fuse';
  G.bombs.push({ c, r, t: P.remote ? 14 : long ? 5.5 : 2.2, range: P.range, pass: true, remote: P.remote, long });
  sfx.place();
}
export function detonate() {
  if (G.state !== 'play' || !G.P.remote || !G.bombs.length) return;
  G.bombs.forEach(b => { b.t = 0; }); sfx.det();
}

const addFlame = (c, r, kind) => { const f = { c, r, t: 0.5, kind: kind || 'arm', rot: Math.floor(Math.random() * 4) * 1.5708 }; G.flames.push(f); return f; };

function breakCrate(c, r) {
  const { door, keyPos, drops, items } = G, th = theme(), x = c * T + T / 2, y = r * T + T / 2;
  G.grid[r][c] = FLOOR; G.score += 10;
  debris(x, y, [th.crate, th.crateD], 9); puff(x, y, '150,130,100');
  if (door.c === c && door.r === r) door.shown = true;
  else if (keyPos.c === c && keyPos.r === r) { items.push({ c, r, type: 'key', grace: 0.7 }); say('The key! Grab it'); }
  else if (drops[r * C + c]) items.push({ c, r, type: drops[r * C + c], grace: 0.7 });
  else if (G.profile && Math.random() < 0.025) items.push({ c, r, type: 'piece', grace: 0.7 });   // a mystery crate: a puzzle piece of a rare pet
  else if (Math.random() < Math.max(0.12, 0.22 - (G.level - 1) * 0.004)) {
    const q = Math.random();
    items.push({ c, r, grace: 0.7, type: q < 0.24 ? 'range' : q < 0.48 ? 'bomb' : q < 0.68 ? 'speed' : q < 0.8 ? 'skull' : q < 0.9 ? 'remote' : 'life' });
  } else if (Math.random() < 0.35) items.push({ c, r, type: 'coin', grace: 0 });
}

function explode(b) {
  const { flames, grid } = G;
  b.dead = true; G.shake = Math.min(1, G.shake + 0.3); G.flash = 0.5;
  const start = flames.length, sk = curSkin(), rgb = sk.smoke, bx = b.c * T + T / 2, by = b.r * T + T / 2;
  sk.spark.forEach(col => burst(bx, by, col, 7));
  puff(bx, by, rgb); puff(bx, by, rgb);
  addFlame(b.c, b.r, 'center').range = b.range;
  for (const [dc, dr] of D4) {
    let last = null;
    for (let i = 1; i <= b.range; i++) {
      const c = b.c + dc * i, r = b.r + dr * i;
      if (!grid[r] || grid[r][c] === undefined || grid[r][c] === WALL || grid[r][c] === ROCK) break;
      last = addFlame(c, r); last.h = dc !== 0;
      if (i % 2 === 0 || i === b.range) burst(c * T + T / 2, r * T + T / 2, sk.spark[i % sk.spark.length], 2);
      if (grid[r][c] === CRATE) { breakCrate(c, r); break; }
    }
    if (last) last.tip = true;   // the end of each arm gets a bigger glow and a puff of smoke
  }
  flames.slice(start).filter(f => f.tip).forEach(f => puff(f.c * T + T / 2, f.r * T + T / 2, rgb));
  // any bomb touched by this blast goes off at the same moment
  for (let i = start; i < flames.length; i++) for (const o of G.bombs) if (!o.dead && o.c === flames[i].c && o.r === flames[i].r) o.t = 0;
  if (!G.boomed) { G.boomed = true; sfx.boom(bombSkinId()); }   // one boom sound per frame, however many bombs
}

// ---------- getting hurt ----------
function die(timeout) {
  const P = G.P;
  if (!timeout && P.shield) {   // Shell Turtle takes the hit
    P.shield = false; P.inv = 2; G.shake = 0.6; burst(P.x, P.y, '#7ad6a0', 26); burst(P.x, P.y, '#ffffff', 10); say('Shell Turtle blocked the hit!'); petSay('Clang!', '#7ad6a0'); tone(1500, 0.12, 'square', 0.07, 600); tone(2200, 0.3, 'sine', 0.04, null, 0.05); G.petPos && (G.petPos.shell = 4); return;
  }
  G.lives--; G.shake = 1;
  if (G.lives <= 0 && hasPerk('phoenix') && !G.phoenixUsed) {   // Phoenix: once per game, rise again
    G.phoenixUsed = true; G.lives = 3; G.rebirth = 1.6; burst(P.x, P.y, '#ff8a1c', 40); burst(P.x, P.y, '#ffd166', 30); say('Phoenix! You rise again with 3 lives'); sfx.key();
  }
  sfx.die(); burst(G.P.x, G.P.y, '#ffffff', 18);
  if (G.lives <= 0) gameOver();
  else {
    G.bombs = []; spawn();
    if (timeout) G.timeLeft = 60;
  }
  hud();
}
const burning = (c, r) => G.flames.some(f => f.t > LETHAL && f.c === c && f.r === r);

// ---------- pickups ----------
function pickup(it) {
  const P = G.P;
  if (it.type === 'piece') { foundCrate(); say('Mystery crate! Open it after the game'); sfx.key(); burst(P.x, P.y, '#b77ce8', 16); G.score += 100; return; }
  if (it.type === 'coin') { earn(hasPerk('chick') ? 6 : 5); if (hasPerk('chick')) petSay('+1 \u{1F425}'); sfx.coin(); burst(P.x, P.y, '#ffd166', 6); return; }
  if (it.type === 'skull') {   // a curse: ONE random bad effect for a few seconds (never combined)
    const kinds = ['slow', 'auto', 'fuse'].filter(k => !P.curse || P.curse.type !== k);
    const type = kinds[Math.floor(Math.random() * kinds.length)];
    P.curse = { type, t: 9, max: 9, tick: 0 };
    say({ slow: 'Cursed! Heavy legs...', auto: 'Cursed! Bombs keep dropping!', fuse: 'Cursed! Long fuses' }[type]);
    sfx.curse(); burst(P.x, P.y, '#9b59d0', 14); return;
  }
  if (it.type === 'key') { P.key = true; say('Got the key! Find the exit'); sfx.key(); G.score += 100; return; }
  if (it.type === 'range') P.range = Math.min(P.range + 1, 7);
  else if (it.type === 'bomb') P.max = Math.min(P.max + 1, 5);
  else if (it.type === 'life') {
    if (G.lives < MAX_LIVES) { G.lives++; say('Extra life!'); } else say(`Lives are full (${MAX_LIVES})`);
    burst(P.x, P.y, '#ff4d6d', 12);
  }
  else if (it.type === 'remote') { P.remote = true; say('Remote bomb! Tap Boom (E) to detonate'); }
  else if (it.type === 'speed') P.speed = Math.min(P.speed + 18, 235);
  G.score += 50; sfx.pickup();
}

function clearStage() {
  const bonus = 500 + Math.ceil(G.timeLeft) * 10;
  const gain = Math.round((20 + G.level * 4 + (isBoss() ? 60 : 0)) * (hasPerk('chick') ? 1.2 : 1));
  if (G.profile) G.profile.stages++;
  earn(gain);
  G.state = 'clear'; G.score += bonus; stopMusic(); sfx.clear(); saveRun();
  showOverlay(`Stage ${world() + 1}-${stageNo()} clear`, `Bonus <b>+${bonus}</b><br>Coins <b>+${gain}</b><br>Next stage starts with 3 lives`, enter('continue'));
}

// ---------- one game tick ----------
let saveTimer = 0;
export function update(dt) {
  G.boomed = false;
  if (G.state === 'intro') {
    G.introT -= dt;
    if (G.introT <= 0) { G.state = 'play'; hideOverlay(); startMusic(); }
    return;
  }
  if (G.state !== 'play') return;
  const P = G.P;

  G.timeLeft -= dt;
  if (G.timeLeft <= 0) { die(true); return; }
  P.inv = Math.max(0, P.inv - dt); if (P.chill > 0) P.chill -= dt; if (G.rebirth > 0) G.rebirth -= dt;
  G.clock += dt; G.toast.t = Math.max(0, G.toast.t - dt);
  if (P.curse) {
    P.curse.t -= dt;
    if (P.curse.type === 'auto' && (P.curse.tick -= dt) <= 0) { P.curse.tick = 0.55; placeBomb(); }
    if (P.curse.t <= 0) { P.curse = null; say('The curse wore off'); }
  }
  if ((saveTimer += dt) > 5) { saveTimer = 0; saveRun(); }   // autosave while playing
  movePlayer(dt);
  petTick(dt); stepFloats(dt);
  { const cur = currentAt(Math.floor(P.x / T), Math.floor(P.y / T)); if (cur) drift(cur, 72 * dt); }

  for (const b of G.bombs) {
    if (b.frozen > 0) b.frozen -= dt; else b.t -= dt;
    if (b.t < 0.7 && b.t > 0 && (b.tk = (b.tk === undefined ? 0 : b.tk) - dt) <= 0) { b.tk = 0.1; sfx.tick(); }   // fuse ticks speed up near the end
    if (b.pass && (Math.abs(P.x - (b.c * T + T / 2)) >= T / 2 + H || Math.abs(P.y - (b.r * T + T / 2)) >= T / 2 + H)) b.pass = false;
  }
  for (const f of G.flames) if (f.t > LETHAL) for (const b of G.bombs) if (b.c === f.c && b.r === f.r) b.t = 0;
  // chain reactions are resolved inside this one frame, so linked bombs explode together
  for (let again = true; again;) { again = false; for (const b of G.bombs) if (b.t <= 0 && !b.dead) { explode(b); again = true; } }
  G.bombs = G.bombs.filter(b => !b.dead);
  G.flames.forEach(f => { f.t -= dt; });
  G.flames = G.flames.filter(f => f.t > 0);
  zoneTick(dt);

  const pc = Math.floor(P.x / T), pr = Math.floor(P.y / T);
  calcDanger(); zoneDanger();

  let caught = false;
  for (const e of G.enemies) {
    if (e.dead) continue;
    e.hurt = Math.max(0, e.hurt - dt);
    if (e.chill > 0 && !e.boss) e.chill -= dt;   // stunned by Ember Fox
    if (e.boss) bossTick(e, dt);
    if (e.life !== undefined && (e.life -= dt) <= 0) { e.dead = true; puff(e.x, e.y, '200,80,220'); continue; }   // shadow clones fade away
    if (e.under > 0) continue;   // underground: can't hurt or be hurt
    if (!(e.chill > 0)) moveEnemy(e, dt);
    const ec = Math.floor(e.x / T), er = Math.floor(e.y / T);
    if (!e.hurt && burning(ec, er)) {
      e.hp--;
      if (e.hp <= 0) {
        e.dead = true; G.score += e.boss ? 1000 : 100; burst(e.x, e.y, '#ffd166', e.boss ? 40 : 12); sfx.kill();
        if (e.boss) { earn(50); say('Boss defeated! It dropped a mystery crate'); if (G.profile && G.grid[er][ec] === FLOOR) G.items.push({ c: ec, r: er, type: 'piece', grace: 1 }); }
        else if (Math.random() < 0.45 && G.grid[er][ec] === FLOOR) G.items.push({ c: ec, r: er, type: 'coin', grace: 0 });
      } else { e.hurt = 1.2; sfx.hit(); burst(e.x, e.y, '#ffffff', 8); }
    } else if (P.inv <= 0 && Math.hypot(e.x - P.x, e.y - P.y) < e.rad + 12) { caught = true; break; }
  }
  // remove the defeated before anything else can happen, so nobody is rewarded twice
  G.enemies = G.enemies.filter(e => !e.dead);
  if (caught) { die(false); return; }

  if (P.inv <= 0 && burning(pc, pr)) { die(false); return; }
  for (const s of G.spikes) if (P.inv <= 0 && s.c === pc && s.r === pr && (G.clock + s.ph) % 3.2 > 2.5) { die(false); return; }

  // blasts destroy power-ups lying on the floor (not keys or coins)
  for (const it of G.items) {
    it.grace = Math.max(0, (it.grace || 0) - dt);
    if (!it.grace && it.type !== 'key' && it.type !== 'coin' && it.type !== 'piece' && burning(it.c, it.r)) {
      it.dead = true; burst(it.c * T + T / 2, it.r * T + T / 2, '#8a8fa8', 8);
    }
  }
  G.items = G.items.filter(it => {
    if (it.dead) return false;
    if (it.c !== pc || it.r !== pr) return true;
    pickup(it); return false;
  });

  const door = G.door;
  if (door.shown && door.c === pc && door.r === pr) {
    if (!P.key) nag('Locked! The key is hidden in a crate');
    else if (G.enemies.length) nag('Defeat every creature first');
    else clearStage();
  }
  hud();
}

