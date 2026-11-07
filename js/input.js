// Keyboard, touch d-pad, joystick and the Bomb / Boom buttons.
import { G, keys, clearDirs, settings, saveSettings } from './state.js';
import { ready } from './audio.js';
import { placeBomb, detonate } from './game.js';
import { newGame, nextLevel } from './level.js';
import { menuOpen, onMainScreen, openMenu, closeMenu, startNew, paintToggles } from './menu.js';
import { $ } from './ui.js';

const keyMap = {
  ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down',
  ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ' ': 'bomb', e: 'det'
};

function confirm() {
  ready();
  if (G.state === 'title') startNew();
  else if (G.state === 'over') newGame();
  else if (G.state === 'clear') nextLevel();
}
function toggleMute() {
  settings.sound = settings.music = !(settings.sound || settings.music);
  saveSettings(); paintToggles();
}

addEventListener('keydown', e => {
  if (menuOpen()) {
    if (e.key === 'Escape' && G.state === 'paused') closeMenu();
    else if (e.key === 'Enter' && G.state === 'title' && onMainScreen()) startNew();
    return;
  }
  if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') return openMenu();
  if (e.key === 'Enter') return confirm();
  if (e.key === 'm' || e.key === 'M') return toggleMute();
  const k = keyMap[e.key] || keyMap[e.key.toLowerCase()];
  if (!k) return;
  e.preventDefault();
  if (k === 'bomb') { if (!e.repeat) placeBomb(); } else if (k === 'det') { if (!e.repeat) detonate(); } else keys[k] = true;
});
addEventListener('keyup', e => {
  const k = keyMap[e.key] || keyMap[e.key.toLowerCase()];
  if (k && k !== 'bomb' && k !== 'det') keys[k] = false;
});
// if the window loses focus mid-press, the key-up never arrives: let go of everything
addEventListener('blur', clearDirs);

$('startBtn').addEventListener('click', confirm);
$('menuBtn').addEventListener('click', e => { openMenu(); e.currentTarget.blur(); });
$('toMenu').addEventListener('click', openMenu);
document.querySelector('.bomb-btn').addEventListener('pointerdown', e => { e.preventDefault(); ready(); placeBomb(); });
$('detBtn').addEventListener('pointerdown', e => { e.preventDefault(); detonate(); });
addEventListener('contextmenu', e => e.preventDefault());

// d-pad works as one touch zone, so you can slide a thumb between directions
const dpad = $('dpad');
function setDir(x, y) {
  const r = dpad.getBoundingClientRect(), dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
  clearDirs();
  if (Math.hypot(dx, dy) < r.width * 0.1) return;
  if (Math.abs(dy) >= Math.abs(dx) * 0.9) keys[dy < 0 ? 'up' : 'down'] = true; else keys[dx < 0 ? 'left' : 'right'] = true;
}
dpad.addEventListener('pointerdown', e => { e.preventDefault(); ready(); dpad.setPointerCapture(e.pointerId); setDir(e.clientX, e.clientY); });
dpad.addEventListener('pointermove', e => { if (dpad.hasPointerCapture(e.pointerId)) setDir(e.clientX, e.clientY); });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => dpad.addEventListener(ev, clearDirs));

// joystick
const pad = document.querySelector('.pad'), stick = $('stick'), knob = $('knob');
export function applyControls() { pad.classList.toggle('use-stick', settings.controls === 'stick'); pad.classList.toggle('flip', !!settings.flip); }
function stickMove(x, y) {
  const r = stick.getBoundingClientRect(), max = r.width * 0.32;
  let dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
  const d = Math.hypot(dx, dy);
  if (d > max) { dx *= max / d; dy *= max / d; }
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
  clearDirs();
  if (Math.hypot(dx, dy) < max * 0.3) return;
  if (dx / max > 0.38) keys.right = true; else if (dx / max < -0.38) keys.left = true;
  if (dy / max > 0.38) keys.down = true; else if (dy / max < -0.38) keys.up = true;
}
const stickRelease = () => { clearDirs(); knob.style.transform = ''; };
stick.addEventListener('pointerdown', e => { e.preventDefault(); ready(); stick.setPointerCapture(e.pointerId); stickMove(e.clientX, e.clientY); });
stick.addEventListener('pointermove', e => { if (stick.hasPointerCapture(e.pointerId)) stickMove(e.clientX, e.clientY); });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => stick.addEventListener(ev, stickRelease));

const saveSet = () => { saveSettings(); paintToggles(); applyControls(); clearDirs(); };
$('tCtrl').addEventListener('click', () => { settings.controls = settings.controls === 'stick' ? 'dpad' : 'stick'; saveSet(); });
$('tFlip').addEventListener('click', () => { settings.flip = !settings.flip; saveSet(); });
