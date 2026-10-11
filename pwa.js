/* Installing and updating the app (works together with sw.js). */
(() => {
  const $ = id => document.getElementById(id);
  const upd = $('tUpdate'), inst = $('tInstall');
  let reg = null, waiting = null, deferred = null, reloading = false;
  const standalone = (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

  const label = t => { if (upd) upd.textContent = t; };
  function onWaiting(w) {   // a new version is downloaded and waiting for the player's OK
    waiting = w; label('Update ready - tap to install');
    document.querySelectorAll('[data-go="m-settings"]').forEach(b => { if (!b.textContent.includes('\u25CF')) b.textContent += ' \u25CF'; });
  }

  // ----- service worker + updates -----
  const secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if ('serviceWorker' in navigator && secure) {
    if (upd) { upd.style.display = ''; label('Check for updates'); }
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then(r => {
        reg = r;
        if (r.waiting && navigator.serviceWorker.controller) onWaiting(r.waiting);
        r.addEventListener('updatefound', () => {
          const w = r.installing;
          w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) onWaiting(w); });
        });
        document.addEventListener('visibilitychange', () => { if (!document.hidden) r.update().catch(() => {}); });
      }).catch(() => label('Offline mode unavailable'));
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloading) { reloading = true; location.reload(); } });
    if (upd) upd.addEventListener('click', () => {
      if (waiting) { label('Installing...'); waiting.postMessage('SKIP_WAITING'); return; }   // the game saves your run when the page reloads
      if (!reg) return;
      label('Checking...');
      reg.update().catch(() => {}).then(() => setTimeout(() => {
        if (reg.waiting) onWaiting(reg.waiting);
        else { label('You are up to date'); setTimeout(() => label('Check for updates'), 2500); }
      }, 1500));
    });
  }

  // ----- install button -----
  if (inst && !standalone) {
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; inst.style.display = ''; });
    window.addEventListener('appinstalled', () => { inst.style.display = 'none'; });
    inst.addEventListener('click', async () => {
      if (deferred) { deferred.prompt(); try { await deferred.userChoice; } catch (e) { /* dismissed */ } deferred = null; inst.style.display = 'none'; }
      else inst.textContent = 'Tap Share, then "Add to Home Screen"';
    });
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) { inst.style.display = ''; inst.textContent = 'How to install'; }   // iOS has no install prompt
  }
})();
