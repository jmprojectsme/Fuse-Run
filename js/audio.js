// Sound effects and music, all synthesised with the Web Audio API (no sound files to download).
import { G, settings } from './state.js';
import { world, isBoss } from './state.js';

let actx = null, sfxBus = null, musicBus = null, noiseBuf = null;

// The audio context can only start after the player touches or presses something.
export function ready() {
  try {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      actx = new AC();
      const comp = actx.createDynamicsCompressor();   // keeps loud chain explosions from clipping
      comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.2;
      const master = actx.createGain(); master.gain.value = 0.9; master.connect(comp); comp.connect(actx.destination);
      sfxBus = actx.createGain(); sfxBus.connect(master);
      musicBus = actx.createGain(); musicBus.connect(master);
      const len = actx.sampleRate;                    // one second of white noise, reused by every noise effect
      noiseBuf = actx.createBuffer(1, len, actx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (actx.state === 'suspended') actx.resume().catch(() => {});
    return true;
  } catch (e) { return false; }
}

const on = isMusic => (isMusic ? settings.music : settings.sound) && ready() && actx.state !== 'closed';

export function tone(freq, dur, type = 'square', vol = 0.05, slideTo = null, delay = 0, isMusic = false) {
  if (!on(isMusic)) return;
  const t = actx.currentTime + Math.max(0, delay), o = actx.createOscillator(), g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(isMusic ? musicBus : sfxBus);
  o.start(t); o.stop(t + dur + 0.02);
}
export function noise(dur, vol, from, to, type = 'lowpass', delay = 0, isMusic = false) {
  if (!on(isMusic)) return;
  const t = actx.currentTime + Math.max(0, delay), src = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
  src.buffer = noiseBuf; src.loop = true; f.type = type;
  f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(Math.max(to, 20), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(isMusic ? musicBus : sfxBus);
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
}
const jingle = (notes, gap, type = 'square', vol = 0.06) =>
  notes.forEach((n, i) => tone(n, gap * 1.6, type, vol, null, i * gap));

const BOOM = {   // every bomb skin adds its own flavour on top of the shared blast
  classic: () => {},
  star: () => { tone(1500, 0.18, 'square', 0.04, 400, 0.02); tone(2200, 0.14, 'triangle', 0.03, 900, 0.05); },
  pumpkin: () => { tone(110, 0.5, 'sawtooth', 0.06, 55, 0.02); tone(165, 0.4, 'square', 0.03, 82, 0.05); },
  ice: () => { noise(0.35, 0.12, 9000, 4000, 'highpass'); [2600, 3300, 3900].forEach((f, i) => tone(f, 0.12, 'sine', 0.035, null, 0.04 + i * 0.05)); },
  candy: () => [880, 1175, 1568, 2093].forEach((f, i) => tone(f, 0.1, 'triangle', 0.04, null, 0.03 + i * 0.04)),
  gold: () => { [1319, 1760, 2349].forEach((f, i) => tone(f, 0.22, 'sine', 0.045, null, 0.02 + i * 0.05)); tone(660, 0.3, 'triangle', 0.03); }
};

let lastTick = 0;
export const sfx = {
  tick: () => { const now = performance.now(); if (now - lastTick > 60) { lastTick = now; tone(1800, 0.025, 'square', 0.025); } },
  click: () => tone(900, 0.03, 'square', 0.03),
  place: () => { tone(260, 0.07, 'triangle', 0.09, 130); noise(0.12, 0.05, 5000, 1500, 'highpass', 0.02); },
  boom: id => {
    noise(0.04, 0.22, 7000, 2000, 'highpass');              // crack
    tone(150, 0.38, 'sine', 0.3, 32);                       // thump
    noise(0.6, 0.34, 3200, 70);                             // body
    noise(0.9, 0.16, 900, 60, 'lowpass', 0.05);             // rumble tail
    tone(60, 0.5, 'triangle', 0.12, 28, 0.02);
    (BOOM[id] || BOOM.classic)();
  },
  pickup: () => { jingle([660, 880, 1175, 1568], 0.055, 'triangle', 0.07); tone(1320, 0.25, 'sine', 0.025, null, 0.2); },
  key: () => { jingle([784, 1047, 1319, 1568], 0.07, 'triangle', 0.08); jingle([392, 523], 0.07, 'sine', 0.05); },
  curse: () => { tone(300, 0.6, 'sawtooth', 0.07, 70); tone(310, 0.6, 'sawtooth', 0.05, 66); noise(0.4, 0.08, 1200, 200); },
  coin: () => { tone(1319, 0.06, 'square', 0.04); tone(1760, 0.16, 'square', 0.04, null, 0.06); tone(2637, 0.12, 'sine', 0.02, null, 0.09); },
  det: () => { tone(500, 0.12, 'square', 0.06, 900); tone(120, 0.1, 'sine', 0.1, 60); },
  kill: () => { tone(520, 0.16, 'square', 0.05, 140); noise(0.12, 0.07, 2500, 300); },
  hit: () => { tone(300, 0.1, 'square', 0.06, 650); noise(0.05, 0.06, 4000, 1000, 'highpass'); },
  die: () => { tone(440, 0.7, 'sawtooth', 0.08, 50); tone(220, 0.7, 'square', 0.04, 40, 0.05); noise(0.5, 0.12, 1500, 100); },
  intro: () => jingle([392, 523, 659, 784], 0.1, 'triangle', 0.07),
  clear: () => { jingle([523, 659, 784, 1047, 784, 1047, 1319], 0.09, 'square', 0.05); jingle([262, 330, 392, 523], 0.18, 'triangle', 0.06); },
  over: () => jingle([392, 330, 262, 196], 0.22, 'triangle', 0.09)
};

// ---------- music ----------
// Notes are booked a little ahead on the audio clock, so the beat stays steady even when the
// phone is busy (a plain setInterval drifts and stutters).
const bass = [110, 0, 110, 165, 131, 0, 131, 196, 110, 0, 110, 165, 98, 0, 147, 131];
const lead = [440, 0, 523, 0, 659, 523, 0, 440, 392, 0, 494, 0, 587, 494, 0, 392];
const AHEAD = 0.12;   // seconds booked in advance
let musicTimer = null, step = 0, nextAt = 0, stepLen = 0.175;

function bookStep(i, at) {
  const d = at - actx.currentTime, k = isBoss() ? 0.75 : 1;
  if (bass[i]) tone(bass[i] * k, 0.16, 'triangle', 0.07, null, d, true);
  if (i % 4 === 0) tone(110, 0.1, 'sine', 0.12, 40, d, true);                       // kick
  if (i % 2 === 1) noise(0.03, 0.025, 7000, 7000, 'highpass', d, true);              // hi-hat
  if (lead[i]) tone(lead[i], 0.1, 'square', 0.016, null, d, true);
}
function musicPump() {
  if (!actx || !settings.music || G.state !== 'play') return;
  if (nextAt < actx.currentTime) nextAt = actx.currentTime + 0.03;   // fell behind (tab was hidden): restart cleanly
  while (nextAt < actx.currentTime + AHEAD) { bookStep(step % 16, nextAt); step++; nextAt += stepLen; }
}
export function startMusic() {
  stopMusic();
  if (!ready()) return;
  step = 0; nextAt = actx.currentTime + 0.05;
  stepLen = Math.max(105, 175 - world() * 14) / 1000;
  musicTimer = setInterval(musicPump, 25);
  musicPump();
}
export function stopMusic() { clearInterval(musicTimer); musicTimer = null; }
