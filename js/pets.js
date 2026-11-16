// Pets and collectibles: pets follow you and give a small perk.
// Common and Rare pets are bought in the Shop. Epic and Legendary pets are puzzles: collect every piece
// from mystery crates (found in crates while playing, dropped by bosses, or won in the Draw).
import { G, saveProfile } from './state.js';

export const RARITY = { common: { name: 'Common', col: '#8fb39a' }, rare: { name: 'Rare', col: '#5b9cff' }, epic: { name: 'Epic', col: '#b77ce8' }, legend: { name: 'Legendary', col: '#ffc53d' } };
export const PETS = [
  { id: 'chick', name: 'Sisiw', rarity: 'common', price: 450, perk: 'Coins from crates and creatures +20%' },
  { id: 'bunny', name: 'Bunny', rarity: 'common', price: 550, perk: 'Run 8% faster' },
  { id: 'frog', name: 'Froggy', rarity: 'common', price: 650, perk: 'Pulls in coins near you' },
  { id: 'pup', name: 'Puppy', rarity: 'rare', price: 1300, perk: 'Sniffs out the crate with the key' },
  { id: 'owl', name: 'Owl', rarity: 'rare', price: 1500, perk: '+20 seconds on every stage' },
  { id: 'turtle', name: 'Shell Turtle', rarity: 'epic', pieces: 6, perk: 'Blocks one hit every stage' },
  { id: 'fox', name: 'Ember Fox', rarity: 'epic', pieces: 6, perk: 'Start every stage with +1 flame' },
  { id: 'dragon', name: 'Mini Dragon', rarity: 'legend', pieces: 9, perk: 'Start every stage with +1 bomb and +1 flame' },
  { id: 'phoenix', name: 'Phoenix', rarity: 'legend', pieces: 9, perk: 'Once per game, rise again instead of game over' }
];
export const petById = id => PETS.find(p => p.id === id);
export const DRAW = { one: 120, ten: 1080 };

// ---------- profile data ----------
export const pet = () => (G.profile && G.profile.pet) || null;
export const hasPerk = id => pet() === id;
export const owns = id => !!G.profile && G.profile.pets.includes(id);
export const piecesOf = id => (G.profile && G.profile.pieces[id]) || [];

// ---------- mystery crates ----------
export function foundCrate() { if (!G.profile) return; G.profile.pending = Math.min(99, (G.profile.pending || 0) + 1); saveProfile(); }

function unlock(id) { const p = G.profile; if (!p.pets.includes(id)) p.pets.push(id); if (!p.pet) p.pet = id; }
// give one missing piece of an Epic or Legendary pet; returns what happened
function givePiece(rarity) {
  const p = G.profile;
  let pool = PETS.filter(x => x.pieces && (!rarity || x.rarity === rarity) && !p.pets.includes(x.id));
  if (!pool.length) pool = PETS.filter(x => x.pieces && !p.pets.includes(x.id));
  if (!pool.length) { p.coins += 60; return { kind: 'coins', amt: 60, why: 'All puzzle pets complete!' }; }
  const x = pool[Math.floor(Math.random() * pool.length)], have = p.pieces[x.id] || (p.pieces[x.id] = []);
  const missing = [...Array(x.pieces).keys()].filter(i => !have.includes(i)), idx = missing[Math.floor(Math.random() * missing.length)];
  have.push(idx);
  const done = have.length >= x.pieces;
  if (done) unlock(x.id);
  return { kind: 'piece', pet: x.id, idx, have: have.length, need: x.pieces, done };
}
function givePet(rarity) {
  const p = G.profile, pool = PETS.filter(x => x.rarity === rarity), x = pool[Math.floor(Math.random() * pool.length)];
  if (p.pets.includes(x.id)) { const amt = Math.round(x.price / 3); p.coins += amt; return { kind: 'dupe', pet: x.id, amt }; }
  unlock(x.id); return { kind: 'pet', pet: x.id };
}
// a crate found while playing: always a puzzle piece (Epic 70%, Legendary 30%)
export function openFoundCrate() {
  const p = G.profile; if (!p || p.pending <= 0) return null;
  p.pending--;
  const r = givePiece(Math.random() < 0.3 ? 'legend' : 'epic');
  saveProfile(); return r;
}
// the Draw: pieces, shop pets, or a coin jackpot
function drawOne(forceLegend) {
  if (forceLegend) return givePiece('legend');
  const q = Math.random();
  if (q < 0.5) return givePiece('epic');
  if (q < 0.65) return givePiece('legend');
  if (q < 0.85) return givePet('common');
  if (q < 0.95) return givePet('rare');
  G.profile.coins += 300; return { kind: 'coins', amt: 300, why: 'Jackpot!' };
}
export function buyDraw(n) {
  const p = G.profile, cost = n === 10 ? DRAW.ten : DRAW.one;
  if (!p || p.coins < cost) return null;
  p.coins -= cost;
  const out = [], isLegend = r => r.kind === 'piece' && petById(r.pet).rarity === 'legend';
  for (let i = 0; i < n; i++) out.push(drawOne(n === 10 && i === 9 && !out.some(isLegend)));   // 10x always has a Legendary piece
  saveProfile(); return out;
}
export function buyPet(id) {
  const p = G.profile, x = petById(id);
  if (!p || !x || !x.price || p.pets.includes(id) || p.coins < x.price) return false;
  p.coins -= x.price; unlock(id); p.pet = id; saveProfile(); return true;
}
export function equipPet(id) { const p = G.profile; if (!p) return; p.pet = id && p.pets.includes(id) ? (p.pet === id ? null : id) : null; saveProfile(); }

// ---------- drawing ----------
// every pet is drawn from simple shapes at about 22 px tall, centred on (x, y) = its feet
export function drawPet(g, id, x, y, t, dark) {
  const D = (a, b, r, c) => { g.fillStyle = dark ? '#1b2040' : c; g.beginPath(); g.arc(a, b, r, 0, 6.3); g.fill(); };
  const E = (a, b, rx, ry, c, rot) => { g.fillStyle = dark ? '#1b2040' : c; g.beginPath(); g.ellipse(a, b, rx, ry, rot || 0, 0, 6.3); g.fill(); };
  const P = (pts, c) => { g.fillStyle = dark ? '#1b2040' : c; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); };
  const eyes = (a, b, gap, col) => { if (dark) return; g.fillStyle = col || '#10162a'; g.fillRect(a - gap - 1, b, 2.4, 3); g.fillRect(a + gap - 1, b, 2.4, 3); };
  const bob = Math.sin(t / 160) * 1.2; y += bob;
  if (id === 'chick') { E(x, y - 8, 8, 7.5, '#ffd84a'); D(x, y - 15, 5.5, '#ffd84a'); P([x + 4, y - 15, x + 9, y - 14, x + 4, y - 12], '#ff8a1c'); eyes(x + 1, y - 17, 2); E(x - 7, y - 9, 3, 5, '#f2c034', -0.5); }
  else if (id === 'bunny') { E(x - 3, y - 22, 2.4, 7, '#f4f2fa', -0.15); E(x + 3, y - 22, 2.4, 7, '#f4f2fa', 0.15); E(x - 3, y - 22, 1.1, 5, '#ffb6c8', -0.15); E(x + 3, y - 22, 1.1, 5, '#ffb6c8', 0.15); E(x, y - 8, 8, 7, '#f4f2fa'); D(x, y - 14, 6, '#f4f2fa'); eyes(x, y - 15, 2.4); D(x, y - 12, 1.2, '#ff8aa8'); }
  else if (id === 'frog') { E(x, y - 7, 10, 7, '#5fbf4f'); D(x - 5, y - 13, 3.6, '#5fbf4f'); D(x + 5, y - 13, 3.6, '#5fbf4f'); D(x - 5, y - 13, 2, '#fff'); D(x + 5, y - 13, 2, '#fff'); eyes(x, y - 14, 5); E(x, y - 5, 6, 2, '#a5e67b'); }
  else if (id === 'pup') { E(x, y - 7, 9, 7, '#c98a4a'); D(x, y - 14, 6.5, '#c98a4a'); E(x - 6, y - 14, 2.6, 5, '#7a4d1c', 0.3); E(x + 6, y - 14, 2.6, 5, '#7a4d1c', -0.3); eyes(x, y - 16, 2.4); D(x, y - 12, 1.6, '#10162a'); P([x + 8, y - 8, x + 14, y - 12 + Math.sin(t / 80) * 2, x + 9, y - 6], '#c98a4a'); }
  else if (id === 'owl') { E(x, y - 10, 8, 10, '#8a6a4a'); E(x, y - 7, 5, 6, '#d9c09a'); D(x - 3.5, y - 14, 3.4, '#fff'); D(x + 3.5, y - 14, 3.4, '#fff'); eyes(x, y - 15, 3.5); P([x - 1.5, y - 11, x + 1.5, y - 11, x, y - 8], '#ff8a1c'); P([x - 8, y - 19, x - 4, y - 18, x - 7, y - 23], '#8a6a4a'); P([x + 8, y - 19, x + 4, y - 18, x + 7, y - 23], '#8a6a4a'); }
  else if (id === 'turtle') { E(x, y - 4, 11, 4, '#5fbf4f'); D(x + 10, y - 7, 4, '#5fbf4f'); eyes(x + 11, y - 9, 0.5); E(x, y - 9, 9, 7, '#2f8a5a'); g.strokeStyle = dark ? '#1b2040' : '#7ad6a0'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x - 4, y - 15); g.lineTo(x - 4, y - 4); g.moveTo(x + 4, y - 15); g.lineTo(x + 4, y - 4); g.moveTo(x - 8, y - 9); g.lineTo(x + 8, y - 9); g.stroke(); }
  else if (id === 'fox') { P([x + 6, y - 6, x + 15, y - 12 + Math.sin(t / 90) * 2, x + 9, y - 2], '#ff7a2a'); D(x + 14, y - 11 + Math.sin(t / 90) * 2, 2, '#fff1d0'); E(x, y - 7, 8, 6.5, '#ff7a2a'); D(x, y - 14, 6, '#ff7a2a'); P([x - 6, y - 16, x - 4, y - 24, x - 1, y - 18], '#ff7a2a'); P([x + 6, y - 16, x + 4, y - 24, x + 1, y - 18], '#ff7a2a'); E(x, y - 12, 3.5, 2.6, '#fff1d0'); eyes(x, y - 16, 2.4); if (!dark) { g.globalAlpha = 0.5 + Math.sin(t / 70) * 0.3; D(x + 15, y - 14 + Math.sin(t / 90) * 2, 1.6, '#ffd166'); g.globalAlpha = 1; } }
  else if (id === 'dragon') { const w = Math.sin(t / 90) * 3; P([x - 4, y - 12, x - 15, y - 20 - w, x - 12, y - 10], '#3fae8a'); P([x + 4, y - 12, x + 15, y - 20 - w, x + 12, y - 10], '#3fae8a'); E(x, y - 8, 8, 7, '#4fd0a0'); D(x, y - 15, 6, '#4fd0a0'); P([x - 3, y - 20, x - 2, y - 25, x, y - 20], '#ffd166'); P([x + 3, y - 20, x + 2, y - 25, x, y - 20], '#ffd166'); E(x, y - 6, 4.5, 4, '#c8f5e0'); eyes(x, y - 17, 2.4, '#ff3d3d'); }
  else if (id === 'phoenix') { const w = Math.sin(t / 70) * 4; if (!dark) { g.globalAlpha = 0.35; D(x, y - 11, 12, '#ffb84d'); g.globalAlpha = 1; } P([x - 3, y - 11, x - 16, y - 18 - w, x - 10, y - 6], '#ff5d3a'); P([x + 3, y - 11, x + 16, y - 18 - w, x + 10, y - 6], '#ff5d3a'); E(x, y - 9, 6, 7.5, '#ff8a1c'); D(x, y - 17, 4.6, '#ffb84d'); P([x - 1, y - 21, x, y - 28, x + 2, y - 21], '#ffd166'); P([x - 3, y - 2, x, y + 4, x + 3, y - 2], '#ff5d3a'); eyes(x, y - 18, 1.8); }
}
// a puzzle card: the pet with the missing pieces covered
export function drawPuzzle(g, id, w, h, t, highlight) {
  const x = petById(id), have = piecesOf(id), cols = x.pieces === 9 ? 3 : 2, rows = x.pieces === 9 ? 3 : 3;
  g.clearRect(0, 0, w, h);
  const gr = g.createRadialGradient(w / 2, h * 0.6, 4, w / 2, h * 0.6, w * 0.7); gr.addColorStop(0, 'rgba(255,255,255,.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.save(); g.translate(w / 2, h * 0.78); g.scale(w / 34, w / 34); drawPet(g, id, 0, 0, t, false); g.restore();
  const cw = w / cols, ch = h / rows;
  for (let i = 0; i < x.pieces; i++) {
    const cx = (i % cols) * cw, cy = Math.floor(i / cols) * ch;
    if (!have.includes(i)) { g.fillStyle = '#20264a'; g.fillRect(cx + 1, cy + 1, cw - 2, ch - 2); g.fillStyle = '#4a5390'; g.font = `bold ${Math.round(ch * 0.4)}px monospace`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', cx + cw / 2, cy + ch / 2); }
    else if (i === highlight) { g.strokeStyle = `rgba(255,209,102,${0.6 + Math.sin(t / 90) * 0.4})`; g.lineWidth = 3; g.strokeRect(cx + 2, cy + 2, cw - 4, ch - 4); }
  }
  g.strokeStyle = 'rgba(255,255,255,.15)'; g.lineWidth = 1;
  for (let i = 1; i < cols; i++) { g.beginPath(); g.moveTo(i * cw, 0); g.lineTo(i * cw, h); g.stroke(); }
  for (let i = 1; i < rows; i++) { g.beginPath(); g.moveTo(0, i * ch); g.lineTo(w, i * ch); g.stroke(); }
}
// the mystery crate itself
export function drawCrate(g, x, y, s, t, shake) {
  const k = shake ? Math.sin(t / 25) * shake * 4 : 0;
  g.save(); g.translate(x + k, y); g.rotate(k * 0.03); g.scale(s, s);
  g.fillStyle = '#6a3fa0'; g.fillRect(-16, -14, 32, 28);
  g.fillStyle = '#8f5fd0'; g.fillRect(-16, -14, 32, 8);
  g.fillStyle = '#ffd166'; g.fillRect(-3, -14, 6, 28); g.fillRect(-16, -3, 32, 5);
  g.strokeStyle = '#3a2066'; g.lineWidth = 2; g.strokeRect(-16, -14, 32, 28);
  g.fillStyle = '#fff'; g.font = 'bold 12px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 9, 7);
  g.restore();
}
