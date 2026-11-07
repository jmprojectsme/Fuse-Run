// Everything that changes while the game runs lives in G, so every module sees the same values.
import { DAILY } from './config.js';

export const G = {
  state: 'title',          // title | intro | play | paused | clear | over
  resumeTo: 'play',        // what 'paused' goes back to
  runActive: false,
  level: 1, score: 0, lives: 3, timeLeft: 180, introT: 0, clock: 0,
  grid: null, bombs: [], flames: [], items: [], enemies: [], spikes: [], particles: [], motes: [],
  door: { c: 0, r: 0, shown: false }, keyPos: { c: 0, r: 0 }, drops: {},
  P: null,                 // the player
  danger: new Set(),       // tiles that are burning or about to be
  shake: 0, flash: 0, boomed: false,
  toast: { text: '', t: 0 },
  profile: null
};

export const keys = { up: false, down: false, left: false, right: false };
export const clearDirs = () => { keys.up = keys.down = keys.left = keys.right = false; };

// ---------- local storage (never throws: private mode or full storage just means no saving) ----------
export const store = {
  get(k, d) { try { const v = localStorage.getItem('fuserun:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('fuserun:' + k, JSON.stringify(v)); } catch (e) { /* storage off */ } }
};

export const settings = Object.assign({ sound: true, music: true, controls: 'dpad', flip: false }, store.get('settings', {}));
export const saveSettings = () => store.set('settings', settings);

// ---------- profile ----------
const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : d);
export function fixProfile(p) {
  if (!p || typeof p !== 'object') return null;
  p.name = typeof p.name === 'string' && p.name.trim() ? p.name.slice(0, 12) : 'Player';
  p.coins = num(p.coins); p.played = num(p.played); p.stages = num(p.stages);
  p.games = num(p.games); p.bestScore = num(p.bestScore); p.bestLevel = num(p.bestLevel);
  p.owned = Array.isArray(p.owned) ? p.owned.filter(x => typeof x === 'string') : [];
  p.color = typeof p.color === 'string' && /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : '#3b6fe0';
  p.look = Object.assign({ style: 'classic', hat: 'none', face: 'none', bomb: 'classic' }, p.look);
  p.daily = p.daily && typeof p.daily === 'object' ? p.daily : { last: '', streak: 0 };
  return p;
}
G.profile = fixProfile(store.get('profile', null));
export const saveProfile = () => { if (G.profile) store.set('profile', G.profile); };

export function earn(n, bonus) {   // bonus = daily reward: it doesn't count towards your per-stage average
  const p = G.profile;
  if (!p) return;
  p.coins += n; if (!bonus) p.played += n;
  saveProfile();
}
export const perStage = () => (G.profile && G.profile.stages >= 3 ? Math.max(30, Math.round(G.profile.played / G.profile.stages)) : 75);
export const bombSkinId = () => (G.profile && G.profile.look && G.profile.look.bomb) || 'classic';

// ---------- daily reward: 7-day streak ----------
const dayStr = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayStr = () => dayStr(new Date());
const yesterdayStr = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayStr(d); };
export function dailyInfo() {
  const dl = (G.profile && G.profile.daily) || { last: '', streak: 0 };
  const today = todayStr();
  // a saved date in the future means the phone's clock was moved back: don't hand out a second reward
  const claimed = dl.last === today || dl.last > today;
  const streak = claimed ? Math.max(1, dl.streak) : (dl.last === yesterdayStr() ? dl.streak + 1 : 1);   // day number of today's reward
  return { claimed, streak, idx: (streak - 1) % 7, reward: DAILY[(streak - 1) % 7] };
}
export function claimDaily() {
  const d = dailyInfo();
  if (!G.profile || d.claimed) return false;
  G.profile.daily = { last: todayStr(), streak: d.streak };
  earn(d.reward, true);
  return true;
}

// ---------- stage helpers ----------
export const world = () => Math.floor((G.level - 1) / 3);
export const stageNo = () => (G.level - 1) % 3 + 1;
export const isBoss = () => stageNo() === 3;
export const stageText = lv => `${Math.floor((lv - 1) / 3) + 1}-${(lv - 1) % 3 + 1}`;
