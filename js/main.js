// Start-up and the main loop.
import { G, dailyInfo } from './state.js';
import { rescale } from './view.js';
import { newPlayer, build, restoreRun, saveRun } from './level.js';
import { update } from './game.js';
import { draw } from './render.js';
import { stepFx } from './fx.js';
import { openMenu, showSec, paintToggles } from './menu.js';
import { applyControls } from './input.js';

let last = 0, errors = 0;
function frame(time) {
  const dt = Math.min((time - last) / 1000 || 0, 0.05);   // a long pause never becomes one giant step
  last = time;
  try {
    stepFx(dt, time);
    update(dt);
    draw(time);
  } catch (err) {
    // one bad frame must not freeze the game for good: report it, save, and pause safely
    if (errors++ < 5) console.error('Fuse Run frame error', err);
    if (G.state === 'play' || G.state === 'intro') { try { openMenu(); } catch (e) { /* menu unavailable */ } }
  }
  requestAnimationFrame(frame);
}

// leaving the page pauses the game and saves it, so you can pick up where you left off
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (G.state === 'play' || G.state === 'intro') openMenu(); saveRun(); } });
addEventListener('pagehide', saveRun);

// the board behind the menu
G.P = newPlayer();
rescale(true);
build();
restoreRun();   // pick up an unfinished run from last time
paintToggles(); applyControls(); showSec('m-main');
if (G.profile && !dailyInfo().claimed) showSec('m-daily');   // daily reward pops up when you open the game
requestAnimationFrame(frame);
