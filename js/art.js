// Everything that is drawn: pre-rendered tiles, bomb skins, the hero, item icons.
import { T, C, R, W, HT, WALL, THEMES } from './config.js';
import { G, bombSkinId, world } from './state.js';
import { mk, onRescale } from './view.js';

export const theme = () => THEMES[world() % THEMES.length];

// ---------- bomb skins: bomb look + blast colours ----------
const orb = (g, c0, c1, c2) => {
  const gr = g.createRadialGradient(15, 17, 2, 20, 24, 15); gr.addColorStop(0, c0); gr.addColorStop(0.4, c1); gr.addColorStop(1, c2);
  g.fillStyle = gr; g.beginPath(); g.arc(20, 24, 14, 0, 6.3); g.fill();
};
const shine = g => { g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(14, 18, 4, 2.6, -0.6, 0, 6.3); g.fill(); };
const fuse = (g, col, cap) => {
  if (cap) { g.fillStyle = cap; g.fillRect(17, 8, 6, 5); }
  g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(20, 8); g.quadraticCurveTo(24, 2, 29, 4); g.stroke();
};
export const SKINS = {
  classic: { flame: ['#ff5d3a', '#ffb84d', '#fff3b0'], glow: ['255,214,130', '255,140,60'], spark: ['#ffb84d', '#ff5d3a'], smoke: '70,72,86',
    draw: g => { orb(g, '#5f698c', '#262b49', '#0d1024'); shine(g); fuse(g, '#caa46a', '#8a8fb0'); } },
  star: { flame: ['#ffb300', '#ffe066', '#fffbe0'], glow: ['255,230,120', '255,190,40'], spark: ['#ffe066', '#ffffff'], smoke: '90,80,110',
    draw: g => {
      orb(g, '#7a5ad0', '#3b2a8a', '#150d3d'); g.fillStyle = '#ffd54a'; g.beginPath();
      for (let i = 0; i < 10; i++) { const a = -1.5708 + i * 0.6283, r = i % 2 ? 3.2 : 7.5; g[i ? 'lineTo' : 'moveTo'](20 + Math.cos(a) * r, 25 + Math.sin(a) * r); }
      g.closePath(); g.fill(); shine(g); fuse(g, '#ffd54a', '#9a8fd0');
    } },
  pumpkin: { flame: ['#ff6f1a', '#9be56b', '#f4ffd0'], glow: ['190,255,140', '255,120,30'], spark: ['#9be56b', '#ff8a1c'], smoke: '60,90,50',
    draw: g => {
      orb(g, '#ffc36a', '#ff8a1c', '#a8450a'); g.strokeStyle = 'rgba(110,45,0,.4)'; g.lineWidth = 2;
      g.beginPath(); g.ellipse(20, 24, 6, 13.5, 0, 0, 6.3); g.stroke(); g.beginPath(); g.ellipse(20, 24, 11, 13.5, 0, 0, 6.3); g.stroke();
      shine(g); g.fillStyle = '#4d8a2a'; g.fillRect(18, 7, 5, 7); fuse(g, '#caa46a', null);
    } },
  ice: { flame: ['#3f9bff', '#a6e0ff', '#ffffff'], glow: ['190,230,255', '60,150,255'], spark: ['#a6e0ff', '#ffffff'], smoke: '200,225,250',
    draw: g => {
      orb(g, '#eaf8ff', '#8fd0ff', '#3a7fc0'); g.strokeStyle = 'rgba(255,255,255,.65)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(11, 19); g.lineTo(20, 25); g.lineTo(29, 17); g.moveTo(20, 25); g.lineTo(20, 38); g.stroke();
      shine(g); fuse(g, '#bfe9ff', '#7fb0e0');
    } },
  candy: { flame: ['#ff4fa8', '#ffa6e0', '#fff0fa'], glow: ['255,200,240', '255,80,170'], spark: ['#ff7ac8', '#7ad6ff', '#ffe066'], smoke: '255,190,230',
    draw: g => {
      orb(g, '#ffd0ec', '#ff7ac8', '#c0307f');
      g.save(); g.beginPath(); g.arc(20, 24, 14, 0, 6.3); g.clip();
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 4; g.beginPath();
      for (let k = -2; k <= 3; k++) { g.moveTo(6 + k * 11, 10); g.lineTo(18 + k * 11, 40); }
      g.stroke(); g.restore(); shine(g); fuse(g, '#ff4f4f', '#ffffff');
    } },
  gold: { flame: ['#e0a81c', '#ffe27a', '#fffbe0'], glow: ['255,240,160', '230,170,20'], spark: ['#ffe27a', '#ffffff'], smoke: '120,100,50',
    draw: g => { orb(g, '#fff6b0', '#f2b81c', '#8a5a00'); shine(g); fuse(g, '#fff3a0', '#c99a1a'); } }
};
const skinCache = {};
export function skinArt(id) {
  id = id || bombSkinId();
  if (!SKINS[id]) id = 'classic';
  if (!skinCache[id]) {
    const sk = SKINS[id];
    skinCache[id] = {
      spr: mk(sk.draw, 40, 40),
      fl: mk(g => {
        const gr = g.createRadialGradient(20, 20, 1, 20, 20, 22);
        gr.addColorStop(0, sk.flame[2]); gr.addColorStop(0.42, sk.flame[1]); gr.addColorStop(1, sk.flame[0]);
        g.fillStyle = gr; g.beginPath(); g.moveTo(12, 1); g.arcTo(39, 1, 39, 39, 11); g.arcTo(39, 39, 1, 39, 11); g.arcTo(1, 39, 1, 1, 11); g.arcTo(1, 1, 39, 1, 11); g.closePath(); g.fill();
        g.globalAlpha = 0.4; g.fillStyle = sk.flame[2]; g.beginPath(); g.arc(20, 20, 9, 0, 6.3); g.fill(); g.globalAlpha = 1;
        g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(6, 21); g.quadraticCurveTo(20, 12, 34, 21); g.stroke();
      }, 40, 40),
      glow: mk(g => {
        const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, `rgba(${sk.glow[0]},.95)`); gr.addColorStop(0.4, `rgba(${sk.glow[1]},.4)`); gr.addColorStop(1, `rgba(${sk.glow[1]},0)`);
        g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      }, 64, 64)
    };
  }
  return skinCache[id];
}
export const curSkin = () => SKINS[bombSkinId()] || SKINS.classic;
export function drawSkinCard(g, id) {
  g.save(); g.translate(36, 38); g.scale(1.6, 1.6); g.drawImage(skinArt(id).spr, -20, -26, 40, 40); g.restore();
  SKINS[id].flame.forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(24 + i * 12, 74, 4, 0, 6.3); g.fill(); });
}

// ---------- board tiles (pre-rendered once per zone) ----------
export const S = {};
export const board = { bg: null, th: null };
export function makeSprites(th) {
  board.th = th;
  const tile = f => mk(f, T, T);
  const floor = (g, col, v) => {
    g.fillStyle = col; g.fillRect(0, 0, T, T);
    g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(0, 0, T, 2); g.fillRect(0, 0, 2, T);
    g.fillStyle = 'rgba(0,0,0,.09)'; g.fillRect(0, T - 2, T, 2); g.fillRect(T - 2, 0, 2, T);
    g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.ellipse(v === 1 ? 11 : 28, v === 1 ? 12 : 27, 4, 2.5, 0, 0, 6.3); g.fill();
    g.fillStyle = 'rgba(0,0,0,.08)'; g.beginPath(); g.ellipse(v === 1 ? 29 : 10, v === 1 ? 29 : 11, 3, 2, 0, 0, 6.3); g.fill();
  };
  Object.assign(S, {
    fa: tile(g => floor(g, th.a, 1)), fb: tile(g => floor(g, th.b, 2)),
    wall: tile(g => {   // raised block: lit top face + darker front face
      g.fillStyle = th.wall; g.fillRect(0, 0, T, T);
      g.fillStyle = th.wallTop; g.fillRect(0, 0, T, T - 11);
      g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(0, 0, T, 2); g.fillRect(0, 0, 2, T - 11);
      g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(T - 3, 0, 3, T - 11);
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2; g.strokeRect(7, 7, T - 14, T - 25);
      g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, T - 11, T, 11);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(13, T - 11, 1.5, 11); g.fillRect(27, T - 11, 1.5, 11);
      g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(0, T - 2, T, 2);
    }),
    crate: tile(g => {
      g.fillStyle = th.crateD; g.fillRect(1, 1, T - 2, T - 2);
      g.fillStyle = th.crate; g.fillRect(3, 3, T - 6, T - 6);
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(3, 13, T - 6, 2); g.fillRect(3, 25, T - 6, 2);
      g.strokeStyle = th.crateD; g.lineWidth = 3; g.strokeRect(5.5, 5.5, T - 11, T - 11);
      g.beginPath(); g.moveTo(7, 7); g.lineTo(T - 7, T - 7); g.moveTo(T - 7, 7); g.lineTo(7, T - 7); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(3, 3, T - 6, 3);
      g.fillStyle = 'rgba(0,0,0,.24)'; g.fillRect(3, T - 6, T - 6, 3);
      g.fillStyle = '#ece6d4'; [[5, 5], [T - 8, 5], [5, T - 8], [T - 8, T - 8]].forEach(([a, b]) => g.fillRect(a, b, 3, 3));
    }),
    stone: tile(g => {
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(T / 2, T - 7, 15, 5, 0, 0, 6.3); g.fill();
      g.fillStyle = '#5e6684'; g.beginPath(); g.moveTo(6, T - 9); g.lineTo(5, 16); g.lineTo(14, 6); g.lineTo(28, 7); g.lineTo(35, 17); g.lineTo(34, T - 9); g.closePath(); g.fill();
      g.fillStyle = '#8791b3'; g.beginPath(); g.moveTo(8, 17); g.lineTo(14, 8); g.lineTo(27, 9); g.lineTo(23, 17); g.closePath(); g.fill();
      g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.moveTo(34, T - 9); g.lineTo(35, 17); g.lineTo(26, 20); g.lineTo(28, T - 9); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(16, 21); g.lineTo(21, 27); g.lineTo(17, 33); g.stroke();
    }),
    glow: mk(g => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,214,130,.95)'); gr.addColorStop(0.4, 'rgba(255,140,60,.4)'); gr.addColorStop(1, 'rgba(255,100,40,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    }, 64, 64),
    vig: mk(g => {
      const gr = g.createRadialGradient(W / 2, HT / 2, HT * 0.35, W / 2, HT / 2, W * 0.72);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.4)'); g.fillStyle = gr; g.fillRect(0, 0, W, HT);
    }, W, HT)
  });
}

// floor + walls never change during a stage, so they are painted once
export function paintBg() {
  const grid = G.grid;
  board.bg = mk(g => {
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) g.drawImage(grid[r][c] === WALL ? S.wall : (c + r) % 2 ? S.fb : S.fa, c * T, r * T, T, T);
    g.fillStyle = 'rgba(0,0,0,.22)';
    for (let r = 0; r < R - 1; r++) for (let c = 0; c < C; c++) if (grid[r][c] === WALL && grid[r + 1][c] !== WALL) g.fillRect(c * T, (r + 1) * T, T, 7);
  }, W, HT);
}

// a sharper screen means every pre-rendered picture has to be redrawn at the new size
onRescale(() => {
  for (const k in skinCache) delete skinCache[k];
  if (board.th) makeSprites(board.th);
  if (G.grid) paintBg();
});

// ---------- the hero: one renderer for the game and the shop previews (base style + hat + face) ----------
export const DEFAULT_LOOK = { style: 'classic', hat: 'none', face: 'none', bomb: 'classic' };
export function drawHero(g, x, y, look, color, fx, fy, t, bob) {
  y -= bob;
  const R_ = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(a, b, w, h); };
  const D_ = (a, b, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(a, b, r, 0, 6.3); g.fill(); };
  const E_ = (a, b, rx, ry, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(a, b, rx, ry, 0, 0, 6.3); g.fill(); };
  const T_ = (p, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); g.fill(); };
  const st = look.style, ex = fx * 2, ey = fy * 2, ink = '#10162a', top = -17, bare = look.hat === 'none';
  R_(x - 8, y + 3, 16, 11, { ninja: '#222a44', robot: '#6d7690', astro: '#e9edf8' }[st] || color);
  R_(x - 8, y + 11, 16, 3, 'rgba(0,0,0,.25)');
  if (st === 'astro') R_(x - 3, y + 5, 6, 5, '#3b6fe0');
  if (st === 'robot') R_(x - 4, y + 5, 8, 4, '#27d3c3');
  if (st === 'ninja') {
    D_(x, y - 4, 13, '#222a44'); R_(x - 10, y - 8, 20, 8, '#ffd7b8'); R_(x - 5 + ex, y - 7 + ey, 3, 5, ink); R_(x + 2 + ex, y - 7 + ey, 3, 5, ink);
    R_(x - 13, y - 11, 26, 3, '#e0453b'); R_(x - 19, y - 10 + Math.sin(t / 90) * 2, 6, 2, '#e0453b'); R_(x - 17, y - 8 + Math.sin(t / 90 + 1) * 2, 5, 2, '#e0453b');
  } else if (st === 'robot') {
    R_(x - 12, y - 17, 24, 21, '#9aa3bf'); R_(x - 12, y - 17, 24, 3, '#c5cce0'); R_(x - 9, y - 11, 18, 8, ink);
    R_(x - 6 + ex, y - 9 + ey, 4, 4, '#27d3c3'); R_(x + 2 + ex, y - 9 + ey, 4, 4, '#27d3c3');
    if (bare) { R_(x - 1, y - 23, 2, 6, '#9aa3bf'); D_(x, y - 24, 3, Math.floor(t / 300) % 2 ? '#ff4d4d' : '#a82a2a'); }
  } else if (st === 'astro') {
    D_(x, y - 4, 13, '#f1f4fb'); E_(x, y - 4, 10, 9, '#2a3f7a'); E_(x - 3, y - 7, 4, 3, 'rgba(255,255,255,.35)');
    R_(x - 5 + ex, y - 6 + ey, 3, 5, '#bfe3ff'); R_(x + 2 + ex, y - 6 + ey, 3, 5, '#bfe3ff');
    if (bare) { R_(x - 1, y - 20, 2, 5, '#f1f4fb'); D_(x, y - 21, 3, '#ffb84d'); }
  } else if (st === 'cat') {
    T_([x - 12, y - 8, x - 11, y - 22, x - 2, y - 14], '#f0b36a'); T_([x + 12, y - 8, x + 11, y - 22, x + 2, y - 14], '#f0b36a');
    T_([x - 10, y - 11, x - 10, y - 18, x - 5, y - 14], '#ffb6c8'); T_([x + 10, y - 11, x + 10, y - 18, x + 5, y - 14], '#ffb6c8');
    D_(x, y - 4, 13, '#f0b36a'); E_(x, y - 1, 8, 6, '#ffe7c4');
    R_(x - 5 + ex, y - 8 + ey, 3, 5, ink); R_(x + 2 + ex, y - 8 + ey, 3, 5, ink); D_(x, y - 1, 1.8, '#e0607e');
    g.strokeStyle = ink; g.lineWidth = 1; g.beginPath();
    g.moveTo(x - 6, y); g.lineTo(x - 13, y - 2); g.moveTo(x - 6, y + 2); g.lineTo(x - 13, y + 3);
    g.moveTo(x + 6, y); g.lineTo(x + 13, y - 2); g.moveTo(x + 6, y + 2); g.lineTo(x + 13, y + 3); g.stroke();
  } else {
    D_(x, y - 4, 13, '#f4f6ff'); E_(x, y - 3, 9, 8, '#ffd7b8'); R_(x - 5 + ex, y - 7 + ey, 3, 6, ink); R_(x + 2 + ex, y - 7 + ey, 3, 6, ink);
    if (bare) { R_(x - 1, y - 19, 2, 7, '#f4f6ff'); D_(x, y - 20, 3.5, '#ff6b81'); }
  }
  const f = look.face;
  if (f === 'shades') { R_(x - 10, y - 8 + ey / 2, 20, 5, ink); R_(x - 8, y - 7 + ey / 2, 3, 1.5, 'rgba(255,255,255,.5)'); }
  else if (f === 'mustache') { E_(x - 3.5, y + 1, 4, 2.2, '#4a2c18'); E_(x + 3.5, y + 1, 4, 2.2, '#4a2c18'); }
  else if (f === 'mask') { R_(x - 11, y - 9, 22, 6, '#e0453b'); R_(x - 6 + ex, y - 8 + ey, 4, 3, '#fff'); R_(x + 2 + ex, y - 8 + ey, 4, 3, '#fff'); }
  else if (f === 'monocle') { g.strokeStyle = '#e0a81c'; g.lineWidth = 1.6; g.beginPath(); g.arc(x + 4 + ex, y - 5 + ey, 4.3, 0, 6.3); g.stroke(); g.beginPath(); g.moveTo(x + 8, y - 3); g.lineTo(x + 10, y + 9); g.stroke(); }
  const h = look.hat;
  if (h === 'cap') { E_(x, y + top + 1, 11, 6, '#e0453b'); R_(x + (fx < 0 ? -15 : 3), y + top + 2, 12, 3, '#a82a2a'); }
  else if (h === 'party') { T_([x - 8, y + top + 3, x + 8, y + top + 3, x, y + top - 15], '#ff7ac8'); R_(x - 5, y + top - 3, 10, 2, '#fff'); D_(x, y + top - 16, 2.6, '#ffd166'); }
  else if (h === 'cowboy') { E_(x, y + top + 3, 17, 4.5, '#8a5a2a'); R_(x - 8, y + top - 7, 16, 10, '#a8703a'); R_(x - 8, y + top - 1, 16, 2.5, '#4a2c18'); }
  else if (h === 'wizard') { E_(x, y + top + 3, 15, 4, '#5a3fa0'); T_([x - 9, y + top + 3, x + 9, y + top + 3, x + 2, y + top - 20], '#6f4fc4'); D_(x - 2, y + top - 5, 1.6, '#ffd166'); D_(x + 2, y + top - 11, 1.3, '#ffd166'); }
  else if (h === 'crown') {
    R_(x - 9, y + top - 3, 18, 6, '#f2b81c'); T_([x - 9, y + top - 3, x - 9, y + top - 10, x - 4, y + top - 3], '#f2b81c');
    T_([x - 3, y + top - 3, x, y + top - 11, x + 3, y + top - 3], '#f2b81c'); T_([x + 9, y + top - 3, x + 9, y + top - 10, x + 4, y + top - 3], '#f2b81c'); D_(x, y + top, 1.7, '#e0453b');
  }
}

// ---------- item icons (game board, How to Play, shop wallet) ----------
const RING = { bomb: '#b9c4ff', range: '#ffb84d', speed: '#7fb0ff', life: '#ff8fa6', key: '#ffd166', remote: '#7fd6ff', coin: '#ffd166', skull: '#9b59d0' };
export function drawIcon(g, type, x, y) {
  g.fillStyle = '#fff7e6'; g.beginPath(); g.arc(x, y, 13, 0, 6.3); g.fill();
  g.lineWidth = 2.5; g.strokeStyle = RING[type] || '#ffffff'; g.stroke();
  if (type === 'bomb') {
    g.fillStyle = '#1b1f33'; g.beginPath(); g.arc(x - 1, y + 2, 7.5, 0, 6.3); g.fill();
    g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(x - 3.5, y - 0.5, 2, 0, 6.3); g.fill();
    g.strokeStyle = '#8a6a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 3, y - 3); g.quadraticCurveTo(x + 6, y - 8, x + 9, y - 7); g.stroke();
    g.fillStyle = '#ff8a3d'; g.beginPath(); g.arc(x + 9, y - 7, 2.2, 0, 6.3); g.fill();
  } else if (type === 'range') {
    g.fillStyle = '#ff6b3d'; g.beginPath(); g.moveTo(x, y - 10);
    g.bezierCurveTo(x + 9, y - 2, x + 8, y + 9, x, y + 9); g.bezierCurveTo(x - 8, y + 9, x - 9, y, x - 3, y - 5);
    g.bezierCurveTo(x - 3, y - 2, x - 1, y - 3, x, y - 10); g.fill();
    g.fillStyle = '#ffd166'; g.beginPath(); g.moveTo(x, y);
    g.bezierCurveTo(x + 4, y + 3, x + 3, y + 8, x, y + 8); g.bezierCurveTo(x - 4, y + 8, x - 4, y + 3, x, y); g.fill();
  } else if (type === 'speed') {
    g.fillStyle = '#2f6fe0'; g.beginPath(); g.moveTo(x - 9, y + 4); g.lineTo(x - 9, y - 6); g.lineTo(x - 3, y - 6);
    g.quadraticCurveTo(x, y, x + 9, y + 1); g.lineTo(x + 9, y + 4); g.closePath(); g.fill();
    g.fillStyle = '#ffffff'; g.fillRect(x - 10, y + 4, 20, 3.5);
    g.strokeStyle = '#ffffff'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - 6, y - 3); g.lineTo(x - 2, y); g.moveTo(x - 6, y + 0.5); g.lineTo(x - 2, y + 3); g.stroke();
  } else if (type === 'life') {
    g.fillStyle = '#ff3d63'; g.beginPath(); g.moveTo(x, y + 8);
    g.bezierCurveTo(x - 13, y - 1, x - 7, y - 11, x, y - 4); g.bezierCurveTo(x + 7, y - 11, x + 13, y - 1, x, y + 8); g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(x - 4, y - 4, 2, 0, 6.3); g.fill();
  } else if (type === 'skull') {
    g.fillStyle = '#f4f2fa'; g.beginPath(); g.arc(x, y - 2, 7.5, 0, 6.3); g.fill(); g.fillRect(x - 4.5, y + 2, 9, 6);
    g.fillStyle = '#2a1a3a'; g.beginPath(); g.arc(x - 3, y - 2.5, 2.2, 0, 6.3); g.arc(x + 3, y - 2.5, 2.2, 0, 6.3); g.fill();
    g.beginPath(); g.moveTo(x, y + 0.5); g.lineTo(x - 1.4, y + 3); g.lineTo(x + 1.4, y + 3); g.fill();
    g.fillRect(x - 2.3, y + 5, 1, 3); g.fillRect(x + 1.3, y + 5, 1, 3);
  } else if (type === 'coin') {
    g.fillStyle = '#f2b81c'; g.beginPath(); g.arc(x, y, 8, 0, 6.3); g.fill();
    g.strokeStyle = '#b5800f'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 5.2, 0, 6.3); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.65)'; g.fillRect(x - 4, y - 5, 2, 4);
  } else if (type === 'key') {
    g.strokeStyle = '#e0a81c'; g.lineWidth = 3; g.beginPath(); g.arc(x - 4, y - 3, 4.5, 0, 6.3); g.stroke();
    g.fillStyle = '#e0a81c'; g.fillRect(x - 1, y - 1.5, 10, 3); g.fillRect(x + 4, y, 2.5, 5); g.fillRect(x + 8, y, 2.5, 4);
  } else {   // remote
    g.fillStyle = '#3a4466'; g.fillRect(x - 8, y - 1, 16, 9);
    g.fillStyle = '#e0453b'; g.beginPath(); g.arc(x, y + 3.5, 3, 0, 6.3); g.fill();
    g.strokeStyle = '#4aa8ff'; g.lineWidth = 2; g.beginPath(); g.arc(x, y - 3, 4, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    g.beginPath(); g.arc(x, y - 3, 8, Math.PI * 1.2, Math.PI * 1.8); g.stroke();
  }
}
