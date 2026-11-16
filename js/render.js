// Drawing one frame of the board.
import { T, C, W, HT, LETHAL, CRATE, ROCK } from './config.js';
import { G } from './state.js';
import { ctx, view } from './view.js';
import { S, board, skinArt, curSkin, drawHero, drawIcon, DEFAULT_LOOK } from './art.js';
import { zone, bossName } from './worlds.js';

const BOSS_LOOK = { garden: ['#3f9a4a', '#a5e67b'], sand: ['#c9a25a', '#ffe0a0'], ice: ['#4f9fd8', '#e8f8ff'], lava: ['#d9453d', '#ffd166'], current: ['#8a4a9a', '#ffb3e6'], storm: ['#46506e', '#ffe066'], neon: ['#c04fd0', '#4fe0ff'] };
const ARROW = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function drawZone(time) {   // special floor under everything else
  const Z = G.zone; if (!Z) return;
  for (const k in Z.tiles) {
    const c = k % C, r = Math.floor(k / C), x = c * T, y = r * T;
    if (Z.id === 'sand') {
      ctx.fillStyle = 'rgba(150,105,45,.55)'; ctx.fillRect(x + 1, y + 1, T - 2, T - 2);
      ctx.fillStyle = 'rgba(90,60,20,.45)';
      for (let i = 0; i < 4; i++) { const a = time / 900 + i * 1.57 + c; ctx.beginPath(); ctx.ellipse(x + T / 2 + Math.cos(a) * 9, y + T / 2 + Math.sin(a) * 9, 3, 1.6, a, 0, 6.3); ctx.fill(); }
    } else if (Z.id === 'ice') {
      ctx.fillStyle = 'rgba(235,250,255,.62)'; ctx.fillRect(x + 1, y + 1, T - 2, T - 2);
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 8, y + 26); ctx.lineTo(x + 20, y + 12); ctx.moveTo(x + 22, y + 30); ctx.lineTo(x + 30, y + 21); ctx.stroke();
    } else if (Z.id === 'current') {
      const [a, b] = ARROW[Z.tiles[k] - 1], off = ((time / 18) % T) - T / 2;
      ctx.fillStyle = 'rgba(120,220,255,.28)'; ctx.fillRect(x + 1, y + 1, T - 2, T - 2);
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, T, T); ctx.clip();
      ctx.translate(x + T / 2 + a * off, y + T / 2 + b * off); ctx.rotate(Math.atan2(b, a));
      ctx.strokeStyle = 'rgba(230,250,255,.75)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-5, -7); ctx.lineTo(3, 0); ctx.lineTo(-5, 7); ctx.stroke();
      ctx.restore();
    }
  }
  for (const v of Z.vents) {
    const x = v.c * T + T / 2, y = v.r * T + T / 2, ph = (G.clock + v.ph) % 4.5, warn = ph > 2.4 && ph < 3.4 ? (ph - 2.4) : 0;
    ctx.fillStyle = '#2a1210'; ctx.beginPath(); ctx.arc(x, y, 13, 0, 6.3); ctx.fill();
    ctx.strokeStyle = `rgba(255,${120 + warn * 80},40,${0.35 + warn * 0.65})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - 9, y - 4); ctx.lineTo(x - 2, y + 2); ctx.lineTo(x + 3, y - 6); ctx.lineTo(x + 9, y + 3); ctx.stroke();
    if (warn) { ctx.globalAlpha = warn * (0.6 + Math.sin(time / 50) * 0.3); ctx.fillStyle = '#ff6a2a'; ctx.beginPath(); ctx.arc(x, y, 8 + warn * 8, 0, 6.3); ctx.fill(); ctx.globalAlpha = 1; }
  }
  Z.pads.forEach((p, i) => {
    const col = i ? '#4fe0ff' : '#ff4fd8';
    for (const [c, r] of [p.a, p.b]) {
      const x = c * T + T / 2, y = r * T + T / 2, s = 1 + Math.sin(time / 200 + i) * 0.1;
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.ellipse(x, y + 4, 15 * s, 8 * s, 0, 0, 6.3); ctx.stroke();
      ctx.globalAlpha = 0.35; ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y + 4, 11 * s, 5 * s, 0, 0, 6.3); ctx.fill(); ctx.globalAlpha = 1;
    }
  });
}
function drawMarks(time) {   // warnings: something is about to hit this tile
  const Z = G.zone; if (!Z) return;
  for (const m of Z.marks) {
    const x = m.c * T, y = m.r * T, k = 1 - m.t / m.t0, col = m.kind === 'bolt' ? '255,240,120' : m.kind === 'fire' ? '255,110,40' : '255,60,80';
    const tiles = m.kind === 'fire' ? [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] : [[0, 0]];
    for (const [a, b] of tiles) {
      const tx = x + a * T, ty = y + b * T;
      if (!G.grid[m.r + b] || G.grid[m.r + b][m.c + a] === 1 || G.grid[m.r + b][m.c + a] === 3) continue;
      ctx.fillStyle = `rgba(${col},${0.15 + k * 0.35 + Math.sin(time / 60) * 0.08})`; ctx.fillRect(tx + 2, ty + 2, T - 4, T - 4);
      ctx.strokeStyle = `rgba(${col},.9)`; ctx.lineWidth = 2; ctx.strokeRect(tx + 3, ty + 3, T - 6, T - 6);
    }
    if (m.kind === 'bolt') { ctx.strokeStyle = `rgba(255,255,255,${k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + T / 2, y + T / 2 - 40 * (1 - k)); ctx.lineTo(x + T / 2 - 6, y + T / 2); ctx.lineTo(x + T / 2 + 4, y + T / 2); ctx.lineTo(x + T / 2 - 2, y + T - 4); ctx.stroke(); }
  }
}
function drawBossBar() {
  const b = G.enemies.find(e => e.boss); if (!b) return;
  const max = b.hpMax || b.hp, w = 150;
  ctx.fillStyle = 'rgba(10,12,28,.8)'; ctx.fillRect(W - w - 12, HT - 34, w + 4, 24);
  ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#ffd166'; ctx.fillText(bossName(), W - w - 6, HT - 24);
  for (let i = 0; i < max; i++) { ctx.fillStyle = i < b.hp ? '#ff4d6d' : 'rgba(255,255,255,.18)'; ctx.fillRect(W - w - 6 + i * ((w - 8) / max), HT - 19, (w - 8) / max - 2, 6); }
}

const shadow = (x, y, rx) => {
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.45, 0, 0, 6.3); ctx.fill();
};
const disc = (x, y, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill(); };

function drawEnemy(e, t) {
  const bob = Math.sin(t / 130 + e.x) * 2, x = e.x, y = e.y + bob;
  if (e.hurt && Math.floor(t / 70) % 2) ctx.globalAlpha = 0.45;
  shadow(e.x, e.y + e.rad - 2, e.rad * 0.85);
  if (e.type === 'balloon') {
    disc(x, y - 1, 14, '#ff7aa8'); disc(x - 5, y - 7, 4, 'rgba(255,255,255,.5)');
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 8, y - 4, 6, 8); ctx.fillRect(x + 2, y - 4, 6, 8);
    ctx.fillStyle = '#10162a'; ctx.fillRect(x - 6 + e.dc * 2, y - 1 + e.dr * 2, 3, 4); ctx.fillRect(x + 4 + e.dc * 2, y - 1 + e.dr * 2, 3, 4);
  } else if (e.type === 'blob') {
    const sq = 1 + Math.sin(t / 110) * 0.1;
    ctx.save(); ctx.translate(x, y + 5); ctx.scale(sq, 2 - sq);
    ctx.fillStyle = '#7ad66b'; ctx.beginPath(); ctx.arc(0, -4, 14, Math.PI, 0); ctx.lineTo(14, 8); ctx.lineTo(-14, 8); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#10162a'; ctx.fillRect(x - 7, y - 4, 4, 5); ctx.fillRect(x + 3, y - 4, 4, 5);
  } else if (e.type === 'ghost') {
    ctx.globalAlpha *= 0.82;
    ctx.fillStyle = '#e9ecff';
    ctx.beginPath(); ctx.arc(x, y - 2, 13, Math.PI, 0); ctx.lineTo(x + 13, y + 12);
    for (let i = 3; i >= -3; i--) ctx.lineTo(x + i * 4.3, y + (i % 2 ? 7 : 12));
    ctx.fill();
    ctx.fillStyle = '#6a4bd6'; ctx.fillRect(x - 7, y - 6, 4, 6); ctx.fillRect(x + 3, y - 6, 4, 6);
  } else if (e.type === 'bat') {
    const fl = Math.sin(t / 55) * 7;
    ctx.fillStyle = '#5b3a8a';
    ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x - 18, y - 8 - fl); ctx.lineTo(x - 13, y + 3); ctx.lineTo(x - 8, y + 6); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 4, y); ctx.lineTo(x + 18, y - 8 - fl); ctx.lineTo(x + 13, y + 3); ctx.lineTo(x + 8, y + 6); ctx.fill();
    disc(x, y, 9, '#3d2766'); ctx.fillStyle = '#3d2766'; ctx.fillRect(x - 7, y - 13, 4, 6); ctx.fillRect(x + 3, y - 13, 4, 6);
    ctx.fillStyle = '#ff5a5a'; ctx.fillRect(x - 5, y - 3, 3, 3); ctx.fillRect(x + 2, y - 3, 3, 3);
  } else if (e.type === 'knight') {
    disc(x, y, 14, '#aeb8d0'); disc(x - 5, y - 7, 5, 'rgba(255,255,255,.35)');
    ctx.fillStyle = '#10162a'; ctx.fillRect(x - 9, y - 5, 18, 4);
    ctx.fillStyle = '#e0453b'; ctx.fillRect(x - 2, y - 21, 4, 8);
    ctx.fillStyle = '#7b86a6'; ctx.fillRect(x - 12, y + 3, 24, 8);
  } else if (e.type === 'sprout') {
    disc(x, y + 3, 12, '#5fbf4f'); disc(x - 4, y - 1, 3, 'rgba(255,255,255,.45)');
    ctx.fillStyle = '#2f7a2a'; ctx.beginPath(); ctx.ellipse(x - 6, y - 12, 7, 3, -0.6, 0, 6.3); ctx.fill(); ctx.beginPath(); ctx.ellipse(x + 6, y - 12, 7, 3, 0.6, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#10162a'; ctx.fillRect(x - 5, y + 1, 3, 4); ctx.fillRect(x + 3, y + 1, 3, 4);
  } else if (e.type === 'clone') {
    ctx.globalAlpha *= 0.55 + Math.sin(t / 60) * 0.15;
    disc(x + Math.sin(t / 37) * 2, y, 14, '#c04fd0'); ctx.fillStyle = '#4fe0ff'; ctx.fillRect(x - 12, y - 3 + Math.sin(t / 23) * 3, 24, 2);
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 7, y - 4, 5, 5); ctx.fillRect(x + 2, y - 4, 5, 5);
  } else {   // boss: each world has its own
    if (e.under > 0) {   // Sand Wyrm underground: only a moving mound and the ring where it will come up
      ctx.globalAlpha = 1;
      const ux = e.ux * T + T / 2, uy = e.uy * T + T / 2, k = 1 - e.under / 1.6;
      ctx.strokeStyle = `rgba(255,80,60,${0.5 + Math.sin(t / 60) * 0.3})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ux, uy, 22 - k * 6, 0, 6.3); ctx.stroke();
      ctx.fillStyle = 'rgba(150,105,45,.7)'; ctx.beginPath(); ctx.ellipse(e.x + (ux - e.x) * k, e.y + (uy - e.y) * k + 10, 14, 6, 0, 0, 6.3); ctx.fill();
      return;
    }
    const [body, crown] = BOSS_LOOK[zone().id] || BOSS_LOOK.lava, zid = zone().id;
    if (zid === 'current') { ctx.strokeStyle = body; ctx.lineWidth = 5; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 8, y + 12); ctx.quadraticCurveTo(x + i * 12 + Math.sin(t / 150 + i) * 6, y + 26, x + i * 14, y + 30); ctx.stroke(); } }
    if (zid === 'neon') { ctx.fillStyle = 'rgba(79,224,255,.5)'; ctx.fillRect(x - 24 + Math.sin(t / 41) * 5, y - 4, 48, 4); }
    if (e.wind > 0) { const k = 1 - e.wind / 1.2; ctx.strokeStyle = `rgba(191,233,255,${0.4 + k * 0.5})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x, e.y, 20 + k * T * 3.3, 0, 6.3); ctx.stroke(); ctx.globalAlpha = 0.12 + k * 0.15; disc(e.x, e.y, 20 + k * T * 3.3, '#bfe9ff'); ctx.globalAlpha = 1; }
    if (e.chill > 0) { ctx.globalAlpha = 0.5; disc(x, y, 34, '#bfe9ff'); ctx.globalAlpha = 1; }
    disc(x, y, 22, body); disc(x - 8, y - 10, 6, 'rgba(255,255,255,.25)');
    if (zid === 'lava') { ctx.strokeStyle = `rgba(255,200,60,${0.5 + Math.sin(t / 90) * 0.4})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 14, y + 8); ctx.lineTo(x - 6, y + 2); ctx.lineTo(x + 2, y + 12); ctx.lineTo(x + 12, y + 4); ctx.stroke(); }
    if (zid === 'sand') { ctx.strokeStyle = 'rgba(90,60,20,.5)'; ctx.lineWidth = 2; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(x, y + i * 7, 20, 0.3, 2.8); ctx.stroke(); } }
    ctx.fillStyle = crown;
    ctx.beginPath(); ctx.moveTo(x - 16, y - 14); ctx.lineTo(x - 12, y - 28); ctx.lineTo(x - 6, y - 17);
    ctx.lineTo(x, y - 30); ctx.lineTo(x + 6, y - 17); ctx.lineTo(x + 12, y - 28); ctx.lineTo(x + 16, y - 14); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 13, y - 6, 9, 10); ctx.fillRect(x + 4, y - 6, 9, 10);
    ctx.fillStyle = '#10162a'; ctx.fillRect(x - 10 + e.dc * 2, y - 2, 4, 6); ctx.fillRect(x + 7 + e.dc * 2, y - 2, 4, 6);
    ctx.fillRect(x - 10, y + 10, 20, 3);
  }
  ctx.globalAlpha = 1;
}

function drawPlayer(t) {
  const P = G.P, p = G.profile;
  if (P.inv > 0 && Math.floor(t / 90) % 2) return;
  shadow(P.x, P.y + 13, 12);
  drawHero(ctx, P.x, P.y, (p && p.look) || DEFAULT_LOOK, (p && p.color) || '#3b6fe0', P.fx, P.fy, t, P.moving ? Math.abs(Math.sin(t / 70)) * 2 : Math.sin(t / 280) * 0.7);
  if (P.curse) {
    ctx.strokeStyle = `rgba(155,89,208,${0.5 + Math.sin(t / 90) * 0.25})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(P.x, P.y + 4, 21, -1.57, -1.57 + 6.28 * (P.curse.t / P.curse.max)); ctx.stroke();
    drawIcon(ctx, 'skull', P.x, P.y - 46 + Math.sin(t / 120) * 2);
  }
}

export function draw(time) {
  if (!board.bg || !G.grid) return;
  const K = view.K;
  ctx.setTransform(K, 0, 0, K, 0, 0);
  ctx.save();
  if (G.shake > 0) { const k = G.shake * 6; ctx.translate((Math.random() - 0.5) * k, (Math.random() - 0.5) * k); }
  ctx.drawImage(board.bg, 0, 0, W, HT);
  const grid = G.grid;
  drawZone(time);
  for (let r = 1; r < grid.length - 1; r++) for (let c = 1; c < grid[r].length - 1; c++) {
    const g = grid[r][c];
    if (g === CRATE) ctx.drawImage(S.crate, c * T, r * T, T, T); else if (g === ROCK) ctx.drawImage(S.stone, c * T, r * T, T, T);
  }

  for (const s of G.spikes) {
    const x = s.c * T, y = s.r * T, ph = (G.clock + s.ph) % 3.2, h = ph > 2.5 ? 1 : ph > 2.0 ? 0.3 : 0;
    ctx.fillStyle = h && h < 1 ? 'rgba(200,60,40,.55)' : 'rgba(0,0,0,.35)'; ctx.fillRect(x + 4, y + 4, T - 8, T - 8);
    ctx.fillStyle = '#d7dbe6';
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const sx = x + 9 + i * 11, sy = y + 12 + j * 10, hh = 3 + 8 * h;
      ctx.beginPath(); ctx.moveTo(sx - 4, sy + 4); ctx.lineTo(sx, sy + 4 - hh); ctx.lineTo(sx + 4, sy + 4); ctx.fill();
    }
  }

  const door = G.door, P = G.P;
  if (door.shown) {
    const x = door.c * T, y = door.r * T, open = P.key && !G.enemies.length;
    ctx.fillStyle = open ? '#5ee6c1' : '#3a4a6b';
    ctx.fillRect(x + 5, y + 3, T - 10, T - 6);
    ctx.fillStyle = '#0b0f1f'; ctx.fillRect(x + 11, y + 9, T - 22, T - 12);
    if (open) { ctx.globalAlpha = 0.4 + Math.sin(time / 150) * 0.3; ctx.fillStyle = '#fff'; ctx.fillRect(x + 14, y + 12, T - 28, T - 18); ctx.globalAlpha = 1; }
    else if (!P.key) {
      ctx.fillStyle = '#e0a81c'; ctx.fillRect(x + 13, y + 18, 14, 11);
      ctx.strokeStyle = '#e0a81c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + 20, y + 18, 5, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = '#3a2a05'; ctx.fillRect(x + 19, y + 22, 2, 4);
    }
  }

  for (const it of G.items) {
    const x = it.c * T + T / 2, y = it.r * T + T / 2 + Math.sin(time / 200) * 2;
    shadow(x, y + 13, 10);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.3; ctx.drawImage(S.glow, x - 20, y - 20, 40, 40);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    drawIcon(ctx, it.type, x, y);
  }

  const sk = skinArt(), pal = curSkin().flame;
  for (const b of G.bombs) {
    const x = b.c * T + T / 2, y = b.r * T + T / 2, p = 1 + Math.sin(time / 90) * 0.06;
    shadow(x, y + 14, 13);
    if (b.remote || b.long) {
      ctx.strokeStyle = b.remote ? '#7fd6ff' : '#9be56b'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y + 2, 18 + Math.sin(time / 120) * 1.5, 0, 6.3); ctx.stroke();
    }
    ctx.save(); ctx.translate(x, y + 8); ctx.scale(p, p); ctx.drawImage(sk.spr, -20, -28, 40, 40); ctx.restore();
    if (b.frozen > 0) { ctx.globalAlpha = 0.55; disc(x, y + 2, 17, '#bfe9ff'); ctx.globalAlpha = 1; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y + 2, 17, 0, 6.3); ctx.stroke(); }
    if (b.t < 0.6 && Math.floor(time / 80) % 2) { ctx.globalAlpha = 0.45; disc(x, y + 4, 14, '#ff3d3d'); ctx.globalAlpha = 1; }
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7 + Math.random() * 0.3;
    ctx.drawImage(sk.glow, x - 3, y - 28, 24, 24);   // fuse spark
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }

  for (const f of G.flames) {
    const x = f.c * T, y = f.r * T, age = 0.5 - f.t;
    if (f.t > LETHAL) {
      const s = Math.min(1, age / 0.08), pop = 1 - Math.pow(1 - s, 3);                 // quick ease-out pop-in
      const sc = (0.3 + 0.7 * pop) * (1 + Math.sin(time / 45 + f.c * 2 + f.r) * 0.04);
      ctx.globalAlpha = Math.min(1, (f.t - LETHAL) / 0.07 + 0.35);
      ctx.save(); ctx.translate(x + T / 2, y + T / 2); ctx.rotate(f.rot); ctx.scale(sc, sc); ctx.drawImage(sk.fl, -20, -20, 40, 40); ctx.restore();
      ctx.globalCompositeOperation = 'lighter';
      const gs = f.kind === 'center' ? 96 : f.tip ? 76 : 64;
      ctx.globalAlpha = (f.kind === 'center' ? 0.8 : 0.5) * pop; ctx.drawImage(sk.glow, x + T / 2 - gs / 2, y + T / 2 - gs / 2, gs, gs);
      if (f.kind === 'center') {
        if (age < 0.16) {   // white flash and an expanding shockwave ring
          ctx.globalAlpha = 1 - age / 0.16; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x + T / 2, y + T / 2, 8 + age * 190, 0, 6.3); ctx.fill();
        }
        if (age < 0.22) {
          const k = age / 0.22;
          ctx.globalAlpha = (1 - k) * 0.7; ctx.strokeStyle = pal[1]; ctx.lineWidth = 6 * (1 - k) + 1;
          ctx.beginPath(); ctx.arc(x + T / 2, y + T / 2, 10 + k * ((f.range || 2) * T + 14), 0, 6.3); ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = f.t / LETHAL * 0.7 * (0.8 + 0.2 * Math.sin(time / 60 + f.c));
      ctx.fillStyle = '#5a2418'; ctx.fillRect(x + 8, y + 8, T - 16, T - 16);
      ctx.fillStyle = pal[0]; ctx.fillRect(x + 15, y + 15, T - 30, T - 30);
      ctx.globalAlpha = 1;
    }
  }

  drawMarks(time);
  for (const e of G.enemies) drawEnemy(e, time);
  if (G.state !== 'title') drawPlayer(time);

  for (const p of G.particles) {
    if (p.k === 'smoke') {
      const k = 1 - p.t / p.t0;
      ctx.globalAlpha = Math.max(0, (1 - k) * 0.4); ctx.fillStyle = p.col;
      ctx.beginPath(); ctx.arc(p.x, p.y, 6 + k * 14, 0, 6.3); ctx.fill();
    } else if (p.k === 'chunk') {
      ctx.globalAlpha = Math.min(1, p.t * 2.5); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.col; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.7); ctx.restore();
    } else {
      ctx.globalAlpha = Math.min(1, p.t * 2); ctx.fillStyle = p.col; const s = p.s || 4; ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
  }
  ctx.globalAlpha = 1;

  const toast = G.toast;
  if (toast.t > 0) {
    ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
    const tw = ctx.measureText(toast.text).width + 24;
    ctx.globalAlpha = Math.min(1, toast.t * 2);
    ctx.fillStyle = 'rgba(10,12,28,.88)'; ctx.fillRect(W / 2 - tw / 2, 10, tw, 28);
    ctx.fillStyle = '#ffd166'; ctx.fillText(toast.text, W / 2, 29);
    ctx.globalAlpha = 1;
  }

  if (G.state === 'play' && G.timeLeft < 20 && Math.floor(time / 400) % 2) {
    ctx.strokeStyle = 'rgba(255,90,90,.6)'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, W - 6, HT - 6);
  }

  if (G.state === 'play' || G.state === 'paused') drawBossBar();
  if (G.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${G.flash * 0.3})`; ctx.fillRect(0, 0, W, HT); }
  ctx.fillStyle = 'rgba(255,255,255,.28)';
  for (const m of G.motes) ctx.fillRect(m.x, m.y, m.s, m.s);
  ctx.restore();
  ctx.drawImage(S.vig, 0, 0, W, HT);
}
