// The menu screens: main, shop, daily reward, profile, how to play, settings, developer info.
import { VERSION, DEV, CATALOG, SWATCHES } from './config.js';
import { G, settings, saveSettings, saveProfile, fixProfile, perStage, dailyInfo, claimDaily, stageText, clearDirs } from './state.js';
import { DAILY } from './config.js';
import { sfx, ready, startMusic, stopMusic } from './audio.js';
import { skinArt, drawSkinCard, drawHero, drawIcon } from './art.js';
import { newGame, saveRun } from './level.js';
import { hud, $ } from './ui.js';

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
[['bomb', 'Bomb', 'Carry one more bomb at a time'], ['range', 'Flame', 'Bigger blast range'], ['speed', 'Shoe', 'Run faster'], ['life', 'Heart', 'One extra life for this stage (max 5)'], ['remote', 'Remote', 'Detonate your bombs yourself (E or Boom)'], ['key', 'Key', 'Hidden in a crate. Needed to open the exit'], ['skull', 'Skull', 'A curse! Slow legs, endless bombs or long fuses for a few seconds'], ['coin', 'Coin', 'Spend coins in the Shop on characters and accessories']].forEach(([t, n, d]) => {
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
  const pop = 1 + shopPop * 0.14; shopPop = Math.max(0, shopPop - 0.05);
  g.save(); g.translate(W2 / 2, H2 * 0.8 - 45 * pop); g.scale(3 * pop, 3 * pop);
  drawHero(g, 0, 0, p.look, p.color, Math.round(Math.sin(t / 1100)), 1, t, Math.sin(t / 280) * 0.7);
  g.restore();
}
function shopTick(t) {
  if (!menuOpen() || $('m-shop').classList.contains('hidden') || !G.profile) { shopRaf = 0; return; }
  drawShopHero(t); shopRaf = requestAnimationFrame(shopTick);
}
const startShopAnim = () => { if (!shopRaf) shopRaf = requestAnimationFrame(shopTick); };

const tabBtns = [...menu.querySelectorAll('.tabs button')];
function renderShop() {
  const p = fixProfile(G.profile);
  showCoins(); $('shopName').textContent = lookName();
  tabBtns.forEach(b => b.classList.toggle('on', b.dataset.tab === shopTab));
  const grid = $('shopGrid');
  grid.textContent = '';
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
