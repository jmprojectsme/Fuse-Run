// The menu screens: main, shop, daily reward, profile, how to play, settings, developer info.
import { VERSION, DEV, CATALOG, SWATCHES } from './config.js';
import { G, settings, saveSettings, saveProfile, fixProfile, perStage, dailyInfo, claimDaily, stageText, clearDirs } from './state.js';
import { DAILY } from './config.js';
import { sfx, ready, startMusic, stopMusic } from './audio.js';
import { skinArt, drawSkinCard, drawHero, drawIcon } from './art.js';
import { newGame, saveRun } from './level.js';
import { hud, $ } from './ui.js';
import { PETS, RARITY, DRAW, petById, drawPet, drawPuzzle, drawCrate, buyPet, equipPet, buyDraw, piecesOf } from './pets.js';
import { openCrates } from './collect.js';

export const menu = $('menu');
const secs = [...menu.querySelectorAll('.msec')], mNew = $('mNew');
let pColor = (G.profile && G.profile.color) || SWATCHES[0], pendingStart = false, pendingGo = '', shopTab = 'style';
let armed = false, armT = 0;

export const menuOpen = () => !menu.classList.contains('hidden');
export const onMainScreen = () => !$('m-main').classList.contains('hidden');

export function paintToggles() {
  $('tSound').textContent = `Sound effects: ${settings.sound ? 'ON' : 'OFF'}`; $('tSound').classList.toggle('off', !settings.sound);
  $('tMusic').textContent = `Music: ${settings.music ? 'ON' : 'OFF'}`; $('tMusic').classList.toggle('off', !settings.music);
  $('tCtrl').textContent = `Controls: ${settings.controls === 'stick' ? 'Joystick' : 'D-pad'}`;
  $('tFlip').textContent = `Touch layout: ${settings.flip ? 'Left-handed' : 'Right-handed'}`;
}
function paintProfile() {
  const sw = $('swatches');
  sw.textContent = '';
  for (const c of SWATCHES) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'sw' + (c === pColor ? ' on' : ''); b.dataset.c = c; b.style.background = c; b.setAttribute('aria-label', 'Suit colour');
    sw.appendChild(b);
  }
  const p = G.profile;
  $('pStats').textContent = p
    ? `Coins ${p.coins} · Games ${p.games} · Best score ${p.bestScore} · Best stage ${p.bestLevel ? stageText(p.bestLevel) : '-'}`
    : 'Create a profile to track your best scores.';
}

export function showSec(id) {
  if ((id === 'm-shop' || id === 'm-daily') && !G.profile) { pendingGo = id; id = 'm-profile'; }
  secs.forEach(s => s.classList.toggle('hidden', s.id !== id));
  if (id === 'm-main') {
    $('who').textContent = G.profile ? `Playing as ${G.profile.name}` : 'No profile yet';
    $('mResume').style.display = G.state === 'paused' || G.state === 'clear' ? '' : 'none';
    armed = false; clearTimeout(armT); mNew.textContent = 'New Game';
    $('mDaily').textContent = G.profile && !dailyInfo().claimed ? 'Daily Reward ●' : 'Daily Reward';
    const n = G.profile ? G.profile.pending : 0;
    $('mCrates').style.display = n ? '' : 'none'; $('mCrates').textContent = `Open mystery crates (${n}) ●`;
  }
  if (id === 'm-profile') { $('pName').value = G.profile ? G.profile.name : ''; pColor = (G.profile && G.profile.color) || pColor; paintProfile(); }
  if (id === 'm-settings') paintToggles();
  if (id === 'm-shop') { renderShop(); startShopAnim(); }
  if (id === 'm-daily') paintDaily();
}
export function openMenu() {
  if (G.state === 'play' || G.state === 'intro') { G.resumeTo = G.state; G.state = 'paused'; stopMusic(); clearDirs(); }
  menu.classList.remove('hidden'); showSec('m-main'); saveRun();
}
export function closeMenu() {
  menu.classList.add('hidden');
  if (G.state === 'paused') { G.state = G.resumeTo; if (G.state === 'play') startMusic(); }
}
export const startNew = () => mNew.click();

menu.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { pendingStart = false; pendingGo = ''; showSec(b.dataset.go); }));
$('mResume').addEventListener('click', closeMenu);
$('mCrates').addEventListener('click', () => openCrates('menu'));
mNew.addEventListener('click', () => {
  ready();
  if (!G.profile) { pendingStart = true; showSec('m-profile'); return; }
  if ((G.state === 'paused' || G.state === 'clear') && !armed) {   // protect a run in progress: needs a second tap
    armed = true; mNew.textContent = 'Tap again to start over';
    armT = setTimeout(() => { armed = false; mNew.textContent = 'New Game'; }, 3000); return;
  }
  armed = false; clearTimeout(armT); mNew.textContent = 'New Game';
  menu.classList.add('hidden'); newGame();
});
$('swatches').addEventListener('click', e => { const c = e.target.dataset && e.target.dataset.c; if (c) { pColor = c; paintProfile(); } });
function saveProfileForm() {
  const name = $('pName').value.trim().slice(0, 12) || 'Player';
  G.profile = fixProfile(Object.assign({ games: 0, bestScore: 0, bestLevel: 0 }, G.profile, { name, color: pColor }));
  saveProfile(); hud();
  if (pendingStart) { pendingStart = false; menu.classList.add('hidden'); newGame(); }
  else if (pendingGo) { const go = pendingGo; pendingGo = ''; showSec(go); }
  else showSec('m-main');
}
$('pSave').addEventListener('click', saveProfileForm);
$('pName').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); saveProfileForm(); } });
$('tSound').addEventListener('click', () => { settings.sound = !settings.sound; saveSettings(); paintToggles(); ready(); if (settings.sound) sfx.pickup(); });
$('tMusic').addEventListener('click', () => { settings.music = !settings.music; saveSettings(); paintToggles(); });

// static bits filled in once
drawIcon($('coinIcon').getContext('2d'), 'coin', 17, 17);
$('verTag').textContent = `V${VERSION}`; $('verLine').textContent = `Version V${VERSION}`;
$('devName').textContent = DEV.name; $('devVer').textContent = `V${VERSION}`;
$('newVer').textContent = `V${VERSION}`;
[['bomb', 'Bomb', 'Carry one more bomb at a time'], ['range', 'Flame', 'Bigger blast range'], ['speed', 'Shoe', 'Run faster'], ['life', 'Heart', 'One extra life for this stage (max 5)'], ['remote', 'Remote', 'Detonate your bombs yourself (E or Boom)'], ['key', 'Key', 'Hidden in a crate. Needed to open the exit'], ['skull', 'Skull', 'A curse! Slow legs, endless bombs or long fuses for a few seconds'], ['coin', 'Coin', 'Spend coins in the Shop on characters, pets and the Draw'], ['piece', 'Mystery crate', 'Holds a puzzle piece of an Epic or Legendary pet. Open it after the game']].forEach(([t, n, d]) => {
  const li = document.createElement('li'), c = document.createElement('canvas'), sp = document.createElement('span'), b = document.createElement('b');
  c.width = c.height = 34; drawIcon(c.getContext('2d'), t, 17, 17);
  b.textContent = n; sp.append(b, ` — ${d}`);
  li.append(c, sp);
  $('legend').appendChild(li);
});

// ---------- shop ----------
const tier = p => (p <= 300 ? 'common' : p <= 700 ? 'rare' : p <= 1300 ? 'epic' : 'legend');
let shownCoins = null, shopRaf = 0, shopPop = 0;
function showCoins() {
  const el = $('shopCoins'), to = G.profile.coins, from = shownCoins === null ? to : shownCoins;
  if (from === to) { shownCoins = to; el.textContent = to; return; }
  const t0 = performance.now();
  const step = now => {
    const k = Math.min(1, (now - t0) / 450);
    shownCoins = Math.round(from + (to - from) * k); el.textContent = shownCoins;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const lookName = () => ['style', 'hat', 'face', 'bomb']
  .map(k => CATALOG[k].find(i => i.id === G.profile.look[k]) || CATALOG[k][0])
  .filter((it, i) => i === 0 || it.price > 0).map(it => it.name).join(' · ');

// big preview: spotlight, pedestal, sparkles; the hero looks around and breathes
function drawShopHero(t) {
  const cvs = $('shopHero'), g = cvs.getContext('2d'), W2 = cvs.width, H2 = cvs.height, p = G.profile;
  g.clearRect(0, 0, W2, H2);
  const gr = g.createRadialGradient(W2 / 2, H2 * 0.8, 4, W2 / 2, H2 * 0.8, 100);
  gr.addColorStop(0, 'rgba(255,255,255,.38)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, W2, H2);
  g.fillStyle = '#0d1126'; g.beginPath(); g.ellipse(W2 / 2, H2 * 0.8, 64, 16, 0, 0, 6.3); g.fill();
  g.strokeStyle = 'rgba(94,230,193,.75)'; g.lineWidth = 3; g.beginPath(); g.ellipse(W2 / 2, H2 * 0.8, 64, 16, 0, 0, 6.3); g.stroke();
  for (let i = 0; i < 8; i++) {
    const a = t / 1400 + i * 0.8, s = 1.5 + (Math.sin(t / 200 + i) + 1) * 1.3;
    g.fillStyle = 'rgba(255,230,160,.85)';
    g.fillRect(W2 / 2 + Math.cos(a) * (72 + (i % 3) * 8) - s / 2, H2 * 0.5 + Math.sin(a * 1.3) * (52 + i * 3) - s / 2, s, s);
  }
  g.drawImage(skinArt(p.look.bomb).spr, W2 / 2 + 40, H2 * 0.8 - 30, 44, 44);
  if (p.pet) { g.save(); g.translate(W2 / 2 - 58, H2 * 0.8 + 4); g.scale(1.8, 1.8); drawPet(g, p.pet, 0, 0, t); g.restore(); }
  const pop = 1 + shopPop * 0.14; shopPop = Math.max(0, shopPop - 0.05);
  g.save(); g.translate(W2 / 2, H2 * 0.8 - 45 * pop); g.scale(3 * pop, 3 * pop);
  drawHero(g, 0, 0, p.look, p.color, Math.round(Math.sin(t / 1100)), 1, t, Math.sin(t / 280) * 0.7);
  g.restore();
}
function shopTick(t) {
  if (!menuOpen() || $('m-shop').classList.contains('hidden') || !G.profile) { shopRaf = 0; return; }
  drawShopHero(t); if (shopTab === 'draw') drawTick(t); shopRaf = requestAnimationFrame(shopTick);
}
const startShopAnim = () => { if (!shopRaf) shopRaf = requestAnimationFrame(shopTick); };

const tabBtns = [...menu.querySelectorAll('.tabs button')];
function renderShop() {
  const p = fixProfile(G.profile);
  showCoins(); $('shopName').textContent = lookName();
  tabBtns.forEach(b => b.classList.toggle('on', b.dataset.tab === shopTab));
  const grid = $('shopGrid');
  grid.textContent = '';
  if (shopTab === 'pet') return renderPets(grid, p);
  if (shopTab === 'draw') return renderDraw(grid, p);
  CATALOG[shopTab].forEach(it => {
    const own = it.price === 0 || p.owned.includes(shopTab + ':' + it.id), eq = p.look[shopTab] === it.id, poor = !own && p.coins < it.price;
    const b = document.createElement('button'), c = document.createElement('canvas');
    b.type = 'button'; b.className = `item r-${tier(it.price)}${eq ? ' eq' : ''}${poor ? ' poor' : ''}`; c.width = 72; c.height = 84;
    const g = c.getContext('2d');
    if (shopTab === 'bomb') drawSkinCard(g, it.id);
    else { g.translate(36, 58); g.scale(1.3, 1.3); drawHero(g, 0, 0, Object.assign({}, p.look, { [shopTab]: it.id }), p.color, 0, 1, 0, 0); }
    b.appendChild(c);
    b.insertAdjacentHTML('beforeend', `${eq ? '<i class="tag">✓</i>' : ''}<span class="nm">${it.name}</span>` +
      (own ? `<span class="own">${eq ? 'Equipped' : 'Owned'}</span>` : `<span class="pricechip">${it.price}</span>` + (poor ? `<span class="bar"><i style="width:${Math.min(100, Math.round(p.coins / it.price * 100))}%"></i></span>` : '')));
    b.addEventListener('click', () => shopTap(it));
    grid.appendChild(b);
  });
}
// ---------- pets tab: buy Common/Rare, complete Epic/Legendary puzzles, equip ----------
function renderPets(grid, p) {
  PETS.forEach(x => {
    const own = p.pets.includes(x.id), eq = p.pet === x.id, poor = !own && x.price && p.coins < x.price;
    const b = document.createElement('button'), c = document.createElement('canvas');
    b.type = 'button'; b.className = `item r-${x.rarity}${eq ? ' eq' : ''}${poor ? ' poor' : ''}`; c.width = 72; c.height = 84;
    const g = c.getContext('2d');
    if (x.pieces && !own) drawPuzzle(g, x.id, 72, 84, 0, -1);
    else { g.translate(36, 70); g.scale(2.2, 2.2); drawPet(g, x.id, 0, 0, 0, false); }
    b.appendChild(c);
    const status = own ? `<span class="own">${eq ? 'Following you' : 'Owned · tap to equip'}</span>`
      : x.price ? `<span class="pricechip">${x.price}</span>` : `<span class="own" style="color:${RARITY[x.rarity].col}">Puzzle ${piecesOf(x.id).length}/${x.pieces}</span>`;
    b.insertAdjacentHTML('beforeend', `${eq ? '<i class="tag">✓</i>' : ''}<span class="nm">${x.name}</span><span class="rar">${RARITY[x.rarity].name}</span>${status}`);
    b.addEventListener('click', () => petTap(x));
    grid.appendChild(b);
  });
}
function petTap(x) {
  const p = G.profile, own = p.pets.includes(x.id), msg = $('shopMsg');
  if (own) { equipPet(x.id); msg.textContent = p.pet === x.id ? `${x.name} follows you: ${x.perk}` : `${x.name} stays home`; sfx.coin(); }
  else if (x.price) {
    if (buyPet(x.id)) { msg.textContent = `${x.name} joined you! ${x.perk}`; sfx.pickup(); shopPop = 1; }
    else { const n = Math.ceil((x.price - p.coins) / perStage()); msg.textContent = `${x.name}: ${x.perk}. Need ${x.price - p.coins} more coins (about ${n} stage${n === 1 ? '' : 's'})`; sfx.hit(); }
  } else msg.textContent = `${x.name}: ${x.perk}. Collect all ${x.pieces} pieces from mystery crates (crates while playing, bosses, or the Draw).`;
  renderShop(); hud();
}
// ---------- draw tab ----------
function renderDraw(grid, p) {
  const box = document.createElement('div'); box.className = 'drawbox';
  const c = document.createElement('canvas'); c.width = 120; c.height = 110; c.id = 'drawCv';
  box.appendChild(c);
  box.insertAdjacentHTML('beforeend', `<div class="row2"><button type="button" id="draw1">Draw 1<br><span class="pricechip">${DRAW.one}</span></button><button type="button" id="draw10">Draw 10<br><span class="pricechip">${DRAW.ten}</span></button></div>
    <p>Each crate gives a puzzle piece (Epic 50%, Legendary 15%), a Common pet (20%), a Rare pet (10%), or a 300-coin jackpot (5%).<br>Draw 10 costs 10% less and always has a Legendary piece. A pet you already own turns into coins.</p>`);
  grid.appendChild(box);
  const go = n => {
    const cost = n === 10 ? DRAW.ten : DRAW.one;
    if (p.coins < cost) { const k = Math.ceil((cost - p.coins) / perStage()); $('shopMsg').textContent = `Need ${cost - p.coins} more coins (about ${k} stage${k === 1 ? '' : 's'} of play)`; sfx.hit(); return; }
    const res = buyDraw(n); $('shopMsg').textContent = ''; hud(); openCrates('draw', res);
  };
  box.querySelector('#draw1').addEventListener('click', () => go(1));
  box.querySelector('#draw10').addEventListener('click', () => go(10));
}
function drawTick(t) {
  const c = $('drawCv'); if (!c || !c.isConnected) return;
  const g = c.getContext('2d'); g.clearRect(0, 0, 120, 110);
  const gr = g.createRadialGradient(60, 60, 4, 60, 60, 60); gr.addColorStop(0, 'rgba(183,124,232,.5)'); gr.addColorStop(1, 'rgba(183,124,232,0)'); g.fillStyle = gr; g.fillRect(0, 0, 120, 110);
  drawCrate(g, 60, 60 + Math.sin(t / 300) * 4, 2.2, t, 0);
}

function shopTap(it) {
  const p = G.profile, key = shopTab + ':' + it.id, own = it.price === 0 || p.owned.includes(key);
  if (!own) {
    if (p.coins < it.price) {
      const n = Math.ceil((it.price - p.coins) / perStage());
      $('shopMsg').textContent = `Need ${it.price - p.coins} more coins (about ${n} stage${n === 1 ? '' : 's'} of play)`; sfx.hit(); return;
    }
    p.coins -= it.price; p.owned.push(key); sfx.pickup(); $('shopMsg').textContent = `Bought ${it.name}!`;
  } else $('shopMsg').textContent = '';
  p.look[shopTab] = it.id; saveProfile(); shopPop = 1; if (own) sfx.coin(); renderShop(); hud();
}
tabBtns.forEach(b => b.addEventListener('click', () => { shopTab = b.dataset.tab; $('shopMsg').textContent = ''; renderShop(); }));

// ---------- daily reward ----------
export function paintDaily() {
  const d = dailyInfo();
  const week = $('dailyWeek');
  week.innerHTML = DAILY.map((v, i) => {
    const done = i < d.idx || (i === d.idx && d.claimed);
    return `<div class="day${done ? ' done' : ''}${i === d.idx && !d.claimed ? ' today' : ''}${i === 6 ? ' big' : ''}"><b>Day ${i + 1}</b><span class="amt">${v}</span>${done ? '<i>✓</i>' : ''}</div>`;
  }).join('');
  $('dClaim').style.display = d.claimed ? 'none' : '';
  $('dClaim').textContent = `Claim +${d.reward} coins`;
  $('dailyMsg').textContent = d.claimed ? `Claimed! Come back tomorrow for ${DAILY[d.idx === 6 ? 0 : d.idx + 1]} coins. Streak: ${d.streak} day${d.streak === 1 ? '' : 's'}` : 'Your reward is ready. Miss a day and the streak starts over.';
}
$('dClaim').addEventListener('click', () => { if (claimDaily()) { sfx.key(); hud(); } paintDaily(); });

menu.addEventListener('click', e => { if (e.target && e.target.closest && e.target.closest('button')) sfx.click(); });
