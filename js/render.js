// Drawing one frame of the board.
import { T, W, HT, LETHAL, CRATE, ROCK } from './config.js';
import { G } from './state.js';
import { ctx, view } from './view.js';
import { S, board, skinArt, curSkin, drawHero, drawIcon, DEFAULT_LOOK } from './art.js';

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
  } else {   // boss
    disc(x, y, 22, '#d9453d'); disc(x - 8, y - 10, 6, 'rgba(255,255,255,.25)');
    ctx.fillStyle = '#ffd166';
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

  if (G.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${G.flash * 0.3})`; ctx.fillRect(0, 0, W, HT); }
  ctx.fillStyle = 'rgba(255,255,255,.28)';
  for (const m of G.motes) ctx.fillRect(m.x, m.y, m.s, m.s);
  ctx.restore();
  ctx.drawImage(S.vig, 0, 0, W, HT);
}
