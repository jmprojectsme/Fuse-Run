(() => {
  const T = 40, C = 15, R = 13, H = 14;
  const cv = document.getElementById('game');
  const ctx = cv.getContext('2d', { alpha: false });
  cv.width = C * T; cv.height = R * T;

  const $ = id => document.getElementById(id);
  const ui = {
    score: $('score'), lives: $('lives'), level: $('level'), time: $('time'),
    bombs: $('bombs'), range: $('range'), keyv: $('keyv'), coins: $('coinsv'),
    overlay: $('overlay'), title: $('ovTitle'), text: $('ovText'), btn: $('startBtn')
  };
  const menuBtn = $('menuBtn');
  const VERSION = '1.2.0';   // keep in step with VERSION in sw.js when you release an update
  const DEV = { name: 'Your Name' };   // <- put your own name here
  const store = {
    get(k, d) { try { const v = localStorage.getItem('fuserun:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('fuserun:' + k, JSON.stringify(v)); } catch (e) { /* storage off */ } }
  };
  const settings = Object.assign({ sound: true, music: true, controls: 'dpad', flip: false }, store.get('settings', {}));
  let profile = store.get('profile', null), runActive = false, resumeTo = 'play';

  // ---------- shop catalogue & difficulty ----------
  const CATALOG = {
    style: [{ id: 'classic', name: 'Classic', price: 0 }, { id: 'cat', name: 'Cat', price: 600 }, { id: 'ninja', name: 'Ninja', price: 800 }, { id: 'robot', name: 'Robot', price: 1200 }, { id: 'astro', name: 'Astronaut', price: 1800 }],
    hat: [{ id: 'none', name: 'No hat', price: 0 }, { id: 'cap', name: 'Cap', price: 150 }, { id: 'party', name: 'Party', price: 250 }, { id: 'cowboy', name: 'Cowboy', price: 400 }, { id: 'wizard', name: 'Wizard', price: 650 }, { id: 'crown', name: 'Crown', price: 1000 }],
    face: [{ id: 'none', name: 'Plain', price: 0 }, { id: 'shades', name: 'Shades', price: 200 }, { id: 'mustache', name: 'Mustache', price: 300 }, { id: 'mask', name: 'Mask', price: 450 }, { id: 'monocle', name: 'Monocle', price: 700 }],
    bomb: [{ id: 'classic', name: 'Classic', price: 0 }, { id: 'star', name: 'Star', price: 250 }, { id: 'pumpkin', name: 'Pumpkin', price: 400 }, { id: 'ice', name: 'Frost', price: 600 }, { id: 'candy', name: 'Candy', price: 800 }, { id: 'gold', name: 'Golden', price: 1500 }]
  };
  function fixProfile(p) {
    if (!p) return p;
    p.coins = p.coins || 0; p.played = p.played || 0; p.stages = p.stages || 0; p.owned = p.owned || []; p.color = p.color || '#3b6fe0';
    p.look = Object.assign({ style: 'classic', hat: 'none', face: 'none', bomb: 'classic' }, p.look);
    p.daily = p.daily || { last: '', streak: 0 };
    return p;
  }
  fixProfile(profile);
  function earn(n, bonus) {   // bonus = daily reward: it doesn't count towards your per-stage average
    if (!profile) return;
    profile.coins += n; if (!bonus) profile.played = (profile.played || 0) + n;
    store.set('profile', profile);
  }
  const perStage = () => (profile && profile.stages >= 3 ? Math.max(30, Math.round(profile.played / profile.stages)) : 75);

  const TOUCH = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const enter = v => (TOUCH ? 'Tap to ' : 'Press Enter to ') + v;

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
  const SKINS = {
    classic: { flame: ['#ff5d3a', '#ffb84d', '#fff3b0'], glow: ['255,214,130', '255,140,60'], spark: ['#ffb84d', '#ff5d3a'],
      draw: g => { orb(g, '#5f698c', '#262b49', '#0d1024'); shine(g); fuse(g, '#caa46a', '#8a8fb0'); } },
    star: { flame: ['#ffb300', '#ffe066', '#fffbe0'], glow: ['255,230,120', '255,190,40'], spark: ['#ffe066', '#ffffff'],
      draw: g => {
        orb(g, '#7a5ad0', '#3b2a8a', '#150d3d'); g.fillStyle = '#ffd54a'; g.beginPath();
        for (let i = 0; i < 10; i++) { const a = -1.5708 + i * 0.6283, r = i % 2 ? 3.2 : 7.5; g[i ? 'lineTo' : 'moveTo'](20 + Math.cos(a) * r, 25 + Math.sin(a) * r); }
        g.closePath(); g.fill(); shine(g); fuse(g, '#ffd54a', '#9a8fd0');
      } },
    pumpkin: { flame: ['#ff6f1a', '#9be56b', '#f4ffd0'], glow: ['190,255,140', '255,120,30'], spark: ['#9be56b', '#ff8a1c'],
      draw: g => {
        orb(g, '#ffc36a', '#ff8a1c', '#a8450a'); g.strokeStyle = 'rgba(110,45,0,.4)'; g.lineWidth = 2;
        g.beginPath(); g.ellipse(20, 24, 6, 13.5, 0, 0, 6.3); g.stroke(); g.beginPath(); g.ellipse(20, 24, 11, 13.5, 0, 0, 6.3); g.stroke();
        shine(g); g.fillStyle = '#4d8a2a'; g.fillRect(18, 7, 5, 7); fuse(g, '#caa46a', null);
      } },
    ice: { flame: ['#3f9bff', '#a6e0ff', '#ffffff'], glow: ['190,230,255', '60,150,255'], spark: ['#a6e0ff', '#ffffff'],
      draw: g => {
        orb(g, '#eaf8ff', '#8fd0ff', '#3a7fc0'); g.strokeStyle = 'rgba(255,255,255,.65)'; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(11, 19); g.lineTo(20, 25); g.lineTo(29, 17); g.moveTo(20, 25); g.lineTo(20, 38); g.stroke();
        shine(g); fuse(g, '#bfe9ff', '#7fb0e0');
      } },
    candy: { flame: ['#ff4fa8', '#ffa6e0', '#fff0fa'], glow: ['255,200,240', '255,80,170'], spark: ['#ff7ac8', '#7ad6ff', '#ffe066'],
      draw: g => {
        orb(g, '#ffd0ec', '#ff7ac8', '#c0307f');
        g.save(); g.beginPath(); g.arc(20, 24, 14, 0, 6.3); g.clip();
        g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 4; g.beginPath();
        for (let k = -2; k <= 3; k++) { g.moveTo(6 + k * 11, 10); g.lineTo(18 + k * 11, 40); }
        g.stroke(); g.restore(); shine(g); fuse(g, '#ff4f4f', '#ffffff');
      } },
    gold: { flame: ['#e0a81c', '#ffe27a', '#fffbe0'], glow: ['255,240,160', '230,170,20'], spark: ['#ffe27a', '#ffffff'],
      draw: g => { orb(g, '#fff6b0', '#f2b81c', '#8a5a00'); shine(g); fuse(g, '#fff3a0', '#c99a1a'); } }
  };
  const skinCache = {};
  function skinArt(id) {
    id = id || (profile && profile.look && profile.look.bomb) || 'classic';
    if (!SKINS[id]) id = 'classic';
    if (!skinCache[id]) {
      const sk = SKINS[id], mk = (w, h, f) => { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d')); return c; };
      skinCache[id] = {
        spr: mk(40, 40, sk.draw),
        fl: mk(40, 40, g => {
          const gr = g.createRadialGradient(20, 20, 1, 20, 20, 22);
          gr.addColorStop(0, sk.flame[2]); gr.addColorStop(0.42, sk.flame[1]); gr.addColorStop(1, sk.flame[0]);
          g.fillStyle = gr; g.beginPath(); g.moveTo(12, 1); g.arcTo(39, 1, 39, 39, 11); g.arcTo(39, 39, 1, 39, 11); g.arcTo(1, 39, 1, 1, 11); g.arcTo(1, 1, 39, 1, 11); g.closePath(); g.fill();
          g.globalAlpha = 0.4; g.fillStyle = sk.flame[2]; g.beginPath(); g.arc(20, 20, 9, 0, 6.3); g.fill(); g.globalAlpha = 1;
          g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(6, 21); g.quadraticCurveTo(20, 12, 34, 21); g.stroke();
        }),
        glow: mk(64, 64, g => {
          const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
          gr.addColorStop(0, `rgba(${sk.glow[0]},.95)`); gr.addColorStop(0.4, `rgba(${sk.glow[1]},.4)`); gr.addColorStop(1, `rgba(${sk.glow[1]},0)`);
          g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
        })
      };
    }
    return skinCache[id];
  }
  const curSkin = () => SKINS[(profile && profile.look && profile.look.bomb) || 'classic'] || SKINS.classic;
  function drawSkinCard(g, id) {
    g.save(); g.translate(36, 38); g.scale(1.6, 1.6); g.drawImage(skinArt(id).spr, -20, -26); g.restore();
    SKINS[id].flame.forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(24 + i * 12, 74, 4, 0, 6.3); g.fill(); });
  }

  // ---------- daily reward: 7-day streak ----------
  const DAILY = [25, 30, 40, 50, 60, 80, 150];
  const dayStr = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayStr = () => dayStr(new Date());
  const yesterdayStr = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayStr(d); };
  function dailyInfo() {
    const dl = (profile && profile.daily) || { last: '', streak: 0 };
    const claimed = dl.last === todayStr();
    const streak = claimed ? dl.streak : (dl.last === yesterdayStr() ? dl.streak + 1 : 1);   // day number of today's reward
    return { claimed, streak, idx: (streak - 1) % 7, reward: DAILY[(streak - 1) % 7] };
  }
  function claimDaily() {
    const d = dailyInfo();
    if (!profile || d.claimed) return;
    profile.daily = { last: todayStr(), streak: d.streak };
    earn(d.reward, true); sfx.key(); paintDaily();
  }

  const keys = {};
  const keyMap = {
    ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down',
    ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ' ': 'bomb', e: 'det'
  };

  // ---------- stages: 3 per zone, last one is a boss ----------
  const THEMES = [
    { name: 'Green Garden', a: '#3f8f4a', b: '#3a8344', wall: '#566579', wallTop: '#8d9bb0', crate: '#c98a3c', crateD: '#7a4d1c' },
    { name: 'Dune Ruins',   a: '#d9b46a', b: '#cfa75c', wall: '#6e4529', wallTop: '#a8734c', crate: '#6aa3a0', crateD: '#37605e' },
    { name: 'Frost Cavern', a: '#a9d4ea', b: '#9ccae2', wall: '#3a5580', wallTop: '#6b8cbb', crate: '#e8f2f8', crateD: '#7aa0bd' },
    { name: 'Magma Forge',  a: '#5a3330', b: '#512d2a', wall: '#1f161a', wallTop: '#463238', crate: '#b5502f', crateD: '#6e2a16' },
    { name: 'Coral Reef', a: '#2f8fa6', b: '#2a869c', wall: '#8a4a6a', wallTop: '#c2759a', crate: '#f0b34a', crateD: '#9a6a1a' },
    { name: 'Storm Peak', a: '#7f93a8', b: '#7689a0', wall: '#3b4560', wallTop: '#6a7596', crate: '#c9d3e3', crateD: '#76849e' },
    { name: 'Neon Night',   a: '#26264d', b: '#2b2b57', wall: '#0c0c20', wallTop: '#3a3a78', crate: '#c04fd0', crateD: '#6a2475' }
  ];
  const world = () => Math.floor((level - 1) / 3);
  const stageNo = () => (level - 1) % 3 + 1;
  const isBoss = () => stageNo() === 3;
  const theme = () => THEMES[world() % THEMES.length];

  let grid, bombs, flames, items, enemies, door, P, S;
  let bg, motes = [], shake = 0, flash = 0, boomed = false, drops = {}, spikes = [], keyPos = { c: 0, r: 0 }, clock = 0, toast = { text: '', t: 0 };
  let particles = [];
  let level = 1, score = 0, lives = 3, state = 'title', last = 0, timeLeft = 180, introT = 0;

  // ---------- audio ----------
  let actx, master, noiseBuf, musicTimer = null, step = 0, lastTick = 0;
  function ready() {
    try {
      if (!actx) {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        const comp = actx.createDynamicsCompressor();   // keeps loud chain explosions from clipping
        comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.2;
        master = actx.createGain(); master.gain.value = 0.9; master.connect(comp); comp.connect(actx.destination);
        const len = actx.sampleRate;                    // one second of white noise, reused by every noise effect
        noiseBuf = actx.createBuffer(1, len, actx.sampleRate);
        const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (actx.state === 'suspended') actx.resume();
      return true;
    } catch (e) { return false; }
  }
  function tone(freq, dur, type = 'square', vol = 0.05, slideTo = null, delay = 0, isMusic = false) {
    if (!(isMusic ? settings.music : settings.sound) || !ready()) return;
    const t = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur);
  }
  function noise(dur, vol, from, to, type = 'lowpass', delay = 0, isMusic = false) {
    if (!(isMusic ? settings.music : settings.sound) || !ready()) return;
    const t = actx.currentTime + delay, src = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
    src.buffer = noiseBuf; src.loop = true; f.type = type;
    f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(Math.max(to, 20), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t, Math.random() * 0.5); src.stop(t + dur);
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
  const sfx = {
    tick: () => tone(1800, 0.025, 'square', 0.025),
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
  const bass = [110, 0, 110, 165, 131, 0, 131, 196, 110, 0, 110, 165, 98, 0, 147, 131];
  const lead = [440, 0, 523, 0, 659, 523, 0, 440, 392, 0, 494, 0, 587, 494, 0, 392];
  function musicTick() {
    if (!settings.music || state !== 'play') return;
    const i = step % 16, k = isBoss() ? 0.75 : 1;
    if (bass[i]) tone(bass[i] * k, 0.16, 'triangle', 0.07, null, 0, true);
    if (i % 4 === 0) tone(110, 0.1, 'sine', 0.12, 40, 0, true);                       // kick
    if (i % 2 === 1) noise(0.03, 0.025, 7000, 7000, 'highpass', 0, true);              // hi-hat
    if (lead[i]) tone(lead[i], 0.1, 'square', 0.016, null, 0, true);
    step++;
  }
  function startMusic() {
    stopMusic(); step = 0;
    musicTimer = setInterval(musicTick, Math.max(105, 175 - world() * 14));
  }
  function stopMusic() { clearInterval(musicTimer); musicTimer = null; }
  function toggleMute() {
    settings.sound = settings.music = !(settings.sound || settings.music);
    store.set('settings', settings); paintToggles();
  }

  // ---------- sprites (pre-rendered once per zone) ----------
  function makeSprites(th) {
    const mk = (f, w = T, h = T) => { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d')); return c; };
    const floor = (g, col, v) => {
      g.fillStyle = col; g.fillRect(0, 0, T, T);
      g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(0, 0, T, 2); g.fillRect(0, 0, 2, T);
      g.fillStyle = 'rgba(0,0,0,.09)'; g.fillRect(0, T - 2, T, 2); g.fillRect(T - 2, 0, 2, T);
      g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.ellipse(v === 1 ? 11 : 28, v === 1 ? 12 : 27, 4, 2.5, 0, 0, 6.3); g.fill();
      g.fillStyle = 'rgba(0,0,0,.08)'; g.beginPath(); g.ellipse(v === 1 ? 29 : 10, v === 1 ? 29 : 11, 3, 2, 0, 0, 6.3); g.fill();
    };
    S = {
      fa: mk(g => floor(g, th.a, 1)), fb: mk(g => floor(g, th.b, 2)),
      wall: mk(g => {   // raised block: lit top face + darker front face
        g.fillStyle = th.wall; g.fillRect(0, 0, T, T);
        g.fillStyle = th.wallTop; g.fillRect(0, 0, T, T - 11);
        g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(0, 0, T, 2); g.fillRect(0, 0, 2, T - 11);
        g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(T - 3, 0, 3, T - 11);
        g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2; g.strokeRect(7, 7, T - 14, T - 25);
        g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, T - 11, T, 11);
        g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(13, T - 11, 1.5, 11); g.fillRect(27, T - 11, 1.5, 11);
        g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(0, T - 2, T, 2);
      }),
      crate: mk(g => {
        g.fillStyle = th.crateD; g.fillRect(1, 1, T - 2, T - 2);
        g.fillStyle = th.crate; g.fillRect(3, 3, T - 6, T - 6);
        g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(3, 13, T - 6, 2); g.fillRect(3, 25, T - 6, 2);
        g.strokeStyle = th.crateD; g.lineWidth = 3; g.strokeRect(5.5, 5.5, T - 11, T - 11);
        g.beginPath(); g.moveTo(7, 7); g.lineTo(T - 7, T - 7); g.moveTo(T - 7, 7); g.lineTo(7, T - 7); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(3, 3, T - 6, 3);
        g.fillStyle = 'rgba(0,0,0,.24)'; g.fillRect(3, T - 6, T - 6, 3);
        g.fillStyle = '#ece6d4'; [[5, 5], [T - 8, 5], [5, T - 8], [T - 8, T - 8]].forEach(([a, b]) => g.fillRect(a, b, 3, 3));
      }),
      stone: mk(g => {
        g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(T / 2, T - 7, 15, 5, 0, 0, 6.3); g.fill();
        g.fillStyle = '#5e6684'; g.beginPath(); g.moveTo(6, T - 9); g.lineTo(5, 16); g.lineTo(14, 6); g.lineTo(28, 7); g.lineTo(35, 17); g.lineTo(34, T - 9); g.closePath(); g.fill();
        g.fillStyle = '#8791b3'; g.beginPath(); g.moveTo(8, 17); g.lineTo(14, 8); g.lineTo(27, 9); g.lineTo(23, 17); g.closePath(); g.fill();
        g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.moveTo(34, T - 9); g.lineTo(35, 17); g.lineTo(26, 20); g.lineTo(28, T - 9); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(16, 21); g.lineTo(21, 27); g.lineTo(17, 33); g.stroke();
      }),
      bomb: mk(g => {
        const gr = g.createRadialGradient(15, 17, 2, 20, 24, 15); gr.addColorStop(0, '#5f698c'); gr.addColorStop(0.4, '#262b49'); gr.addColorStop(1, '#0d1024');
        g.fillStyle = gr; g.beginPath(); g.arc(20, 24, 14, 0, 6.3); g.fill();
        g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(14, 18, 4, 2.6, -0.6, 0, 6.3); g.fill();
        g.fillStyle = '#8a8fb0'; g.fillRect(17, 8, 6, 5);
        g.strokeStyle = '#caa46a'; g.lineWidth = 2; g.beginPath(); g.moveTo(20, 8); g.quadraticCurveTo(24, 2, 29, 4); g.stroke();
      }),
      glow: mk(g => {
        const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,214,130,.95)'); gr.addColorStop(0.4, 'rgba(255,140,60,.4)'); gr.addColorStop(1, 'rgba(255,100,40,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      }, 64, 64),
      vig: mk(g => {
        const gr = g.createRadialGradient(cv.width / 2, cv.height / 2, cv.height * 0.35, cv.width / 2, cv.height / 2, cv.width * 0.72);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.4)'); g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height);
      }, cv.width, cv.height)
    };
  }

  // floor + walls never change during a stage, so they are painted once
  function paintBg() {
    bg = document.createElement('canvas'); bg.width = cv.width; bg.height = cv.height;
    const g = bg.getContext('2d');
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) g.drawImage(grid[r][c] === 1 ? S.wall : (c + r) % 2 ? S.fb : S.fa, c * T, r * T);
    g.fillStyle = 'rgba(0,0,0,.22)';
    for (let r = 0; r < R - 1; r++) for (let c = 0; c < C; c++) if (grid[r][c] === 1 && grid[r + 1][c] !== 1) g.fillRect(c * T, (r + 1) * T, T, 7);
  }
  function initMotes() { motes = Array.from({ length: 16 }, () => ({ x: Math.random() * cv.width, y: Math.random() * cv.height, v: 6 + Math.random() * 10, s: 1 + Math.random() * 1.6, p: Math.random() * 6.3 })); }

  // ---------- level setup ----------
  function build() {
    const w = world(), th = theme(), L = level - 1;   // L = how many stages you have already cleared
    makeSprites(th);
    grid = [];
    const crates = [];
    const density = 0.4 + Math.min(L * 0.006, 0.12);
    for (let r = 0; r < R; r++) {
      grid[r] = [];
      for (let c = 0; c < C; c++) {
        if (r === 0 || c === 0 || r === R - 1 || c === C - 1 || (c % 2 === 0 && r % 2 === 0)) grid[r][c] = 1;
        else if (c + r > 3 && Math.random() < density) { grid[r][c] = 2; crates.push([c, r]); }
        else grid[r][c] = 0;
      }
    }
    // indestructible rocks: each is only kept if every open tile stays reachable
    const openCount = () => grid.reduce((n, row) => n + row.filter(v => v !== 1 && v !== 3).length, 0);
    let rocks = Math.min(3 + Math.floor(L * 0.5), 12), tries = 0;
    while (rocks > 0 && tries++ < 80) {
      const c = 1 + Math.floor(Math.random() * (C - 2)), r = 1 + Math.floor(Math.random() * (R - 2));
      if (grid[r][c] === 1 || grid[r][c] === 3 || c + r <= 4) continue;
      const before = grid[r][c], total = openCount() - 1;
      grid[r][c] = 3;
      const seen = new Set([C + 1]), q = [[1, 1]];
      for (const [qc, qr] of q) for (const [a, b] of D4) {
        const nc = qc + a, nr = qr + b, k = nr * C + nc;
        if (grid[nr][nc] !== 1 && grid[nr][nc] !== 3 && !seen.has(k)) { seen.add(k); q.push([nc, nr]); }
      }
      if (seen.size === total) rocks--; else grid[r][c] = before;
    }
    const live = crates.filter(([c, r]) => grid[r][c] === 2);
    const [dc, dr] = live[Math.floor(Math.random() * live.length)];
    door = { c: dc, r: dr, shown: false };
    const keyOpts = live.filter(([c, r]) => !(c === dc && r === dr));
    const [kc, kr] = keyOpts[Math.floor(Math.random() * keyOpts.length)];
    keyPos = { c: kc, r: kr };
    // each stage hides a few guaranteed power-ups in crates (plus random extras)
    const pickFrom = keyOpts.filter(([c, r]) => !(c === kc && r === kr));
    const want = ['bomb', 'range', 'speed', 'bomb'];
    if (stageNo() >= 2) want.push('remote');
    if (isBoss()) want.push('life');
    if (Math.random() < Math.min(0.9, 0.4 + L * 0.02)) want.push('skull');
    if (L >= 10) want.push('skull');
    drops = {};
    for (const t of want) {
      if (!pickFrom.length) break;
      const [c, r] = pickFrom.splice(Math.floor(Math.random() * pickFrom.length), 1)[0];
      drops[r * C + c] = t;
    }
    spikes = [];
    for (let n = Math.min(Math.floor((L - 1) * 0.5), 8), g2 = 0; n > 0 && g2++ < 200;) {
      const c = 1 + Math.floor(Math.random() * (C - 2)), r = 1 + Math.floor(Math.random() * (R - 2));
      if (grid[r][c] === 0 && c + r > 5 && !spikes.some(s => s.c === c && s.r === r)) { spikes.push({ c, r, ph: Math.random() * 3.2 }); n--; }
    }
    bombs = []; flames = []; items = []; enemies = []; particles = [];
    timeLeft = Math.max(isBoss() ? 170 : 130, (isBoss() ? 270 : 210) - L * 3);

    const pool = ['balloon'];
    if (level >= 3) pool.push('blob');
    if (level >= 5) pool.push('bat');
    if (level >= 7) pool.push('ghost');
    if (level >= 9) pool.push('knight');
    const list = [];
    if (isBoss()) {
      list.push('boss');
      for (let i = 0; i < Math.min(1 + Math.floor(L / 3), 5); i++) list.push(pool[i % pool.length]);
    } else {
      for (let i = 0; i < Math.min(3 + Math.floor(L * 0.4), 12); i++) list.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    for (const type of list) {
      for (let g = 0; g < 200; g++) {
        const c = 1 + Math.floor(Math.random() * (C - 2)), r = 1 + Math.floor(Math.random() * (R - 2));
        if (grid[r][c] === 0 && c + r > 8 && !enemies.some(e => e.c === c && e.r === r)) {
          const boss = type === 'boss';
          enemies.push({
            type, boss, c, r, tc: c, tr: r, dc: 0, dr: 0, x: c * T + T / 2, y: r * T + T / 2,
            hp: boss ? 3 + Math.floor(L / 6) : type === 'knight' ? 2 : 1, hurt: 0, rad: boss ? 22 : 14,
            speed: (({ balloon: 42, blob: 60, ghost: 38, boss: 58, bat: 78, knight: 34 })[type] * (1 + Math.min(L * 0.03, 0.8))),
            smart: Math.min(0.95, (({ balloon: 0.12, blob: 0.3, ghost: 0.4, boss: 0.55, bat: 0.15, knight: 0.55 })[type] + L * 0.012)),
            sight: ({ balloon: 5, blob: 7, ghost: 8, boss: 10, bat: 6, knight: 8 })[type] + Math.floor(L / 6),
            dodge: Math.min(0.95, ({ balloon: 0.3, blob: 0.5, ghost: 0.65, boss: 0.7, bat: 0.6, knight: 0.3 })[type] + L * 0.008)
          });
          break;
        }
      }
    }
    paintBg(); initMotes();
    spawn();
  }

  function spawn() { P.x = P.y = T * 1.5; P.inv = 2; P.curse = null; P.axis = 'x'; }

  function startStage() {
    Object.assign(P, { speed: 160, max: 1, range: 2, remote: false, key: false });
    clock = 0; toast.t = 0;
    build();
    state = 'intro'; introT = 1.9;
    const th = theme();
    showOverlay(`Stage ${world() + 1}-${stageNo()}`, th.name + '<br><br>Danger ' + '\u2605'.repeat(Math.min(5, 1 + Math.floor((level - 1) / 4))) + '\u2606'.repeat(5 - Math.min(5, 1 + Math.floor((level - 1) / 4))) + '<br>A key is hidden in a crate' + (isBoss() ? '<br>Boss ahead!' : ''), '');
    sfx.intro();
    hud(); saveRun();
  }

  function recordRun() {
    if (!runActive) return;
    runActive = false;
    if (!profile) return;
    profile.games++; profile.bestScore = Math.max(profile.bestScore, score); profile.bestLevel = Math.max(profile.bestLevel, level);
    store.set('profile', profile);
  }
  // ---------- save & resume ----------
  let saveTimer = 0;
  function saveRun() {
    if (!runActive) return;
    if (state === 'play' || state === 'paused' || state === 'intro') store.set('run', { v: 1, level, score, lives, timeLeft, clock, grid, items, enemies, spikes, door, keyPos, drops, bombs, P });
    else if (state === 'clear') store.set('run', { v: 1, next: true, level, score });
  }
  const clearRun = () => store.set('run', null);
  function restoreRun() {
    const r = store.get('run', null);
    if (!r || r.v !== 1) return false;
    try {
      level = r.level; score = r.score; runActive = true;
      if (r.next) {   // the app was closed right after a stage was cleared
        state = 'clear';
        showOverlay(`Stage ${world() + 1}-${stageNo()} clear`, 'Ready for the next stage', enter('continue'));
      } else {
        lives = r.lives; timeLeft = r.timeLeft; clock = r.clock || 0;
        makeSprites(theme());
        grid = r.grid; items = r.items; enemies = r.enemies; spikes = r.spikes; door = r.door; keyPos = r.keyPos; drops = r.drops || {};
        bombs = r.bombs || []; flames = []; particles = [];
        P = Object.assign({ fx: 0, fy: 1, axis: 'x' }, r.P); P.inv = Math.max(P.inv || 0, 1.5); P.moving = false;
        paintBg(); initMotes(); state = 'paused'; resumeTo = 'play';
      }
      hud(); return true;
    } catch (e) { clearRun(); return false; }
  }

  function newGame() {
    recordRun(); runActive = true;
    level = 1; score = 0; lives = 4;
    P = { x: 0, y: 0, speed: 150, max: 1, range: 2, inv: 0, fx: 0, fy: 1, moving: false, key: false, remote: false };
    startStage();
  }
  function nextLevel() { level++; lives = 3; startStage(); }   // lives reset to 3 on every level-up

  function showOverlay(title, text, btn) {
    ui.title.textContent = title;
    ui.text.innerHTML = text;
    ui.btn.textContent = btn;
    ui.btn.style.display = btn ? '' : 'none';
    $('toMenu').style.display = state === 'over' ? '' : 'none';
    ui.overlay.classList.remove('hidden');
  }

  const say = text => { toast.text = text; toast.t = 2; };
  const nag = text => { if (toast.t <= 0) say(text); };

  const hudCache = {};
  const put = (el, v) => { if (hudCache[el.id] !== v) { hudCache[el.id] = v; el.textContent = v; } };
  function hud() {
    put(ui.score, score); put(ui.lives, '\u2665 ' + Math.max(lives, 0));
    put(ui.level, `${world() + 1}-${stageNo()}`); put(ui.bombs, P.max); put(ui.range, P.range);
    put(ui.keyv, P.key ? 'Yes' : 'No'); put(ui.coins, profile ? profile.coins : 0);
    const det = !!P.remote;
    if (hudCache.det !== det) { hudCache.det = det; $('detBtn').classList.toggle('on', det); }
    const t = Math.max(0, Math.ceil(timeLeft));
    put(ui.time, `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`);
  }

  // ---------- collision & movement ----------
  function hit(x, y, h, isPlayer) {
    for (let k = 0; k < 4; k++) {
      const ox = k & 1 ? h : -h, oy = k & 2 ? h : -h;
      const c = Math.floor((x + ox) / T), r = Math.floor((y + oy) / T);
      if (c < 0 || r < 0 || c >= C || r >= R || grid[r][c]) return true;
      for (const b of bombs) if (b.c === c && b.r === r && !(isPlayer && b.pass)) return true;
    }
    return false;
  }
  function movePlayer(dt) {
    const dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    P.moving = !!(dx || dy);
    if (!P.moving) return;
    const total = P.speed * (P.curse && P.curse.type === 'slow' ? 0.5 : 1) * dt, n = Math.ceil(total / 6), s = total / n;   // small sub-steps: no tunnelling, smoother corners
    for (let i = 0; i < n; i++) {
      let mx = dx, my = dy;
      if (mx && my) {   // diagonal input (joystick): use whichever axis is open, keep the current heading if both are
        const canX = !hit(P.x + mx * s, P.y, H, true), canY = !hit(P.x, P.y + my * s, H, true);
        if (canX && canY) { if (P.axis === 'y') mx = 0; else my = 0; }
        else if (canX) my = 0; else if (canY) mx = 0; else my = 0;
      }
      P.axis = mx ? 'x' : 'y'; P.fx = mx; P.fy = my;
      if (mx) { if (!hit(P.x + mx * s, P.y, H, true)) P.x += mx * s; else nudge('y', s); }
      else if (my) { if (!hit(P.x, P.y + my * s, H, true)) P.y += my * s; else nudge('x', s); }
    }
  }
  function nudge(axis, s) {
    const v = P[axis], d = (Math.floor(v / T) + 0.5) * T - v;
    if (Math.abs(d) < 1 || Math.abs(d) > H) return;
    const st = Math.sign(d) * Math.min(s, Math.abs(d));
    if (axis === 'y' ? !hit(P.x, P.y + st, H, true) : !hit(P.x + st, P.y, H, true)) P[axis] += st;
  }

  // ---------- bombs, flames, particles ----------
  function placeBomb() {
    if (state !== 'play' || bombs.length >= P.max) return;
    const c = Math.floor(P.x / T), r = Math.floor(P.y / T);
    if (bombs.some(b => b.c === c && b.r === r)) return;
    bombs.push({ c, r, t: P.remote ? 14 : (P.curse && P.curse.type === 'fuse' ? 5.5 : 2.2), range: P.range, pass: true, remote: P.remote, long: !P.remote && !!P.curse && P.curse.type === 'fuse' });
    sfx.place();
  }
  function detonate() {
    if (state !== 'play' || !P.remote || !bombs.length) return;
    bombs.forEach(b => { b.t = 0; }); sfx.det();
  }
  const LETHAL = 0.18;   // flames only hurt while t > LETHAL; the rest is harmless embers
  const addFlame = (c, r, kind) => { const f = { c, r, t: 0.5, kind: kind || 'arm', rot: Math.floor(Math.random() * 4) * 1.5708 }; flames.push(f); return f; };

  function burst(x, y, col, n) {
    for (let i = 0; i < n && particles.length < 220; i++) {
      const a = Math.random() * 6.28, v = 40 + Math.random() * 110;
      particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, t: 0.5 + Math.random() * 0.4, col, s: 3 + Math.random() * 2 });
    }
  }
  const SMOKE = { classic: '70,72,86', star: '90,80,110', pumpkin: '60,90,50', ice: '200,225,250', candy: '255,190,230', gold: '120,100,50' };
  function puff(x, y, rgb) {   // soft smoke that rises and fades
    if (particles.length > 200) return;
    const t = 0.7 + Math.random() * 0.5;
    particles.push({ k: 'smoke', x: x + (Math.random() - 0.5) * 10, y, vx: (Math.random() - 0.5) * 24, vy: -(20 + Math.random() * 30), g: -10, t, t0: t, col: `rgb(${rgb})` });
  }
  function debris(x, y, cols, n) {   // tumbling chunks of a broken crate
    for (let i = 0; i < n && particles.length < 220; i++) {
      const a = Math.random() * 6.28, v = 50 + Math.random() * 120;
      particles.push({ k: 'chunk', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 90, g: 420, t: 0.6 + Math.random() * 0.4, col: cols[i % cols.length], s: 5 + Math.random() * 4, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 16 });
    }
  }

  function explode(b) {
    b.dead = true; shake = Math.min(1, shake + 0.3);
    const start = flames.length, sk0 = curSkin(), rgb = SMOKE[(profile && profile.look && profile.look.bomb) || 'classic'] || SMOKE.classic, bx = b.c * T + T / 2, by = b.r * T + T / 2;
    flash = 0.5;
    sk0.spark.forEach(col => burst(bx, by, col, 7));
    puff(bx, by, rgb); puff(bx, by, rgb);
    addFlame(b.c, b.r, 'center').range = b.range;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      let last = null;
      for (let i = 1; i <= b.range; i++) {
        const c = b.c + dc * i, r = b.r + dr * i;
        if (grid[r][c] === 1 || grid[r][c] === 3) break;
        last = addFlame(c, r); last.h = dc !== 0;
        if (i % 2 === 0 || i === b.range) burst(c * T + T / 2, r * T + T / 2, sk0.spark[i % sk0.spark.length], 2);
        if (grid[r][c] === 2) {
          grid[r][c] = 0; score += 10;
          debris(c * T + T / 2, r * T + T / 2, [theme().crate, theme().crateD], 9); puff(c * T + T / 2, r * T + T / 2, '150,130,100');
          if (door.c === c && door.r === r) door.shown = true;
          else if (keyPos.c === c && keyPos.r === r) { items.push({ c, r, type: 'key', grace: 0.7 }); say('The key! Grab it'); }
          else if (drops[r * C + c]) items.push({ c, r, type: drops[r * C + c], grace: 0.7 });
          else if (Math.random() < Math.max(0.12, 0.22 - (level - 1) * 0.004)) { const q = Math.random(); items.push({ c, r, grace: 0.7, type: q < 0.24 ? 'range' : q < 0.48 ? 'bomb' : q < 0.68 ? 'speed' : q < 0.8 ? 'skull' : q < 0.9 ? 'remote' : 'life' }); }
          else if (Math.random() < 0.35) items.push({ c, r, type: 'coin', grace: 0 });
          break;
        }
      }
    }
    for (const f of flames.slice(start)) if (f.kind === 'arm') { const n = flames.slice(start).filter(o => o !== f && o.kind === 'arm' && ((f.h && o.h && o.r === f.r) || (!f.h && !o.h && o.c === f.c))); f.tip = !n.some(o => Math.abs(o.c - b.c) + Math.abs(o.r - b.r) > Math.abs(f.c - b.c) + Math.abs(f.r - b.r) && Math.sign(o.c - b.c) === Math.sign(f.c - b.c) && Math.sign(o.r - b.r) === Math.sign(f.r - b.r)); }
    flames.slice(start).filter(f => f.tip).forEach(f => puff(f.c * T + T / 2, f.r * T + T / 2, rgb));
    // any bomb touched by this blast goes off at the same moment
    for (let i = start; i < flames.length; i++) for (const o of bombs) if (!o.dead && o.c === flames[i].c && o.r === flames[i].r) o.t = 0;
    if (!boomed) { boomed = true; sfx.boom((profile && profile.look && profile.look.bomb) || 'classic'); }
  }

  function die(timeout) {
    lives--; shake = 1;
    sfx.die(); burst(P.x, P.y, '#ffffff', 18);
    if (lives <= 0) {
      state = 'over'; stopMusic(); recordRun(); clearRun();
      setTimeout(sfx.over, 500);
      showOverlay('Game over', `Final score <b>${score}</b><br>Reached stage ${world() + 1}-${stageNo()}` + (profile ? `<br>Best score <b>${profile.bestScore}</b>` : ''), enter('retry'));
    } else {
      bombs = []; spawn();
      if (timeout) timeLeft = 60;
    }
    hud();
  }

  // ---------- enemies ----------
  const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const free = (e, c, r) =>
    (!grid[r][c] || (e.type === 'ghost' && grid[r][c] === 2)) && !bombs.some(b => b.c === c && b.r === r);

  // tiles that are burning now, or about to be hit by a bomb blast
  let danger = new Set();
  function calcDanger() {
    if (!flames.length && !bombs.length) { if (danger.size) danger = new Set(); return; }
    danger = new Set();
    for (const f of flames) if (f.t > LETHAL) danger.add(f.r * C + f.c);
    for (const b of bombs) {
      if (!(b.remote || b.t < 1.6)) continue;
      danger.add(b.r * C + b.c);
      for (const [dc, dr] of D4) for (let i = 1; i <= b.range; i++) {
        const c = b.c + dc * i, r = b.r + dr * i;
        if (grid[r][c] === 1 || grid[r][c] === 3) break;
        danger.add(r * C + c);
        if (grid[r][c] === 2) break;
      }
    }
  }

  // breadth-first search: first step towards the nearest tile that satisfies goal()
  function route(e, goal, maxLen) {
    const key = (c, r) => r * C + c, start = key(e.c, e.r), prev = { [start]: -1 }, dist = { [start]: 0 }, q = [[e.c, e.r]];
    for (const [c, r] of q) {
      if (dist[key(c, r)] >= maxLen) continue;
      for (const [dc, dr] of D4) {
        const nc = c + dc, nr = r + dr, k = key(nc, nr);
        if (k in prev || !free(e, nc, nr)) continue;
        if (danger.has(k) && !danger.has(start)) continue;   // never path through a blast zone unless already trapped in one
        prev[k] = key(c, r); dist[k] = dist[key(c, r)] + 1;
        if (goal(nc, nr)) { let s = k; while (prev[s] !== start) s = prev[s]; return [s % C, Math.floor(s / C)]; }
        q.push([nc, nr]);
      }
    }
    return null;
  }

  function pickDir(e) {
    const pc = Math.floor(P.x / T), pr = Math.floor(P.y / T);
    let step = null;
    if (danger.has(e.r * C + e.c) && Math.random() < e.dodge) step = route(e, (c, r) => !danger.has(r * C + c), 12);               // run from bombs
    else if (state === 'play' && Math.random() < e.smart) step = route(e, (c, r) => c === pc && r === pr, e.sight);  // hunt the player
    if (!step) {
      let dirs = D4.filter(([dc, dr]) => free(e, e.c + dc, e.r + dr));
      const safe = dirs.filter(([dc, dr]) => !danger.has((e.r + dr) * C + e.c + dc));
      if (safe.length && Math.random() < e.dodge) dirs = safe;
      if (!dirs.length) return;
      const straight = dirs.find(([dc, dr]) => dc === e.dc && dr === e.dr);
      const [dc, dr] = straight && Math.random() < (e.type === 'bat' ? 0.3 : 0.7) ? straight : dirs[Math.floor(Math.random() * dirs.length)];
      step = [e.c + dc, e.r + dr];
    }
    e.dc = Math.sign(step[0] - e.c); e.dr = Math.sign(step[1] - e.r); e.tc = step[0]; e.tr = step[1];
  }

  // ---------- update ----------
  function update(dt) {
    boomed = false;
    if (state === 'intro') {
      introT -= dt;
      if (introT <= 0) { state = 'play'; ui.overlay.classList.add('hidden'); startMusic(); }
      return;
    }
    if (state !== 'play') return;

    timeLeft -= dt;
    if (timeLeft <= 0) { die(true); return; }
    P.inv = Math.max(0, P.inv - dt);
    clock += dt; toast.t = Math.max(0, toast.t - dt);
    if (P.curse) {
      P.curse.t -= dt;
      if (P.curse.type === 'auto' && (P.curse.tick -= dt) <= 0) { P.curse.tick = 0.55; placeBomb(); }
      if (P.curse.t <= 0) { P.curse = null; say('The curse wore off'); }
    }
    if ((saveTimer += dt) > 5) { saveTimer = 0; saveRun(); }   // autosave while playing
    movePlayer(dt);

    for (const b of bombs) {
      b.t -= dt;
      if (b.t < 0.7 && b.t > 0 && (b.tk = (b.tk === undefined ? 0 : b.tk) - dt) <= 0) {   // fuse ticks speed up near the end
        b.tk = 0.1; const now = performance.now();
        if (now - lastTick > 60) { lastTick = now; sfx.tick(); }
      }
      if (b.pass && (Math.abs(P.x - (b.c * T + T / 2)) >= T / 2 + H || Math.abs(P.y - (b.r * T + T / 2)) >= T / 2 + H)) b.pass = false;
    }
    for (const f of flames) if (f.t > LETHAL) for (const b of bombs) if (b.c === f.c && b.r === f.r) b.t = 0;
    // chain reactions are resolved inside this one frame, so linked bombs explode together
    for (let again = true; again;) { again = false; for (const b of bombs) if (b.t <= 0 && !b.dead) { explode(b); again = true; } }
    bombs = bombs.filter(b => !b.dead);
    flames.forEach(f => f.t -= dt);
    flames = flames.filter(f => f.t > 0);

    const pc = Math.floor(P.x / T), pr = Math.floor(P.y / T);
    calcDanger();

    for (const e of enemies) {
      e.hurt = Math.max(0, e.hurt - dt);
      const tx = e.tc * T + T / 2, ty = e.tr * T + T / 2;
      const dist = Math.hypot(tx - e.x, ty - e.y), st = e.speed * dt;
      if (dist <= st) { e.x = tx; e.y = ty; e.c = e.tc; e.r = e.tr; pickDir(e); }
      else { e.x += (tx - e.x) / dist * st; e.y += (ty - e.y) / dist * st; }

      const ec = Math.floor(e.x / T), er = Math.floor(e.y / T);
      if (!e.hurt && flames.some(f => f.t > LETHAL && f.c === ec && f.r === er)) {
        e.hp--;
        if (e.hp <= 0) { e.dead = true; score += e.boss ? 1000 : 100; burst(e.x, e.y, '#ffd166', e.boss ? 40 : 12); sfx.kill();
          if (e.boss) { earn(Math.round(50)); say('Boss defeated! +50 coins'); }
          else if (Math.random() < 0.45 && grid[er][ec] === 0) items.push({ c: ec, r: er, type: 'coin', grace: 0 }); }
        else { e.hurt = 1.2; sfx.hit(); burst(e.x, e.y, '#ffffff', 8); }
      } else if (P.inv <= 0 && Math.hypot(e.x - P.x, e.y - P.y) < e.rad + 12) { die(false); return; }
    }
    enemies = enemies.filter(e => !e.dead);

    if (P.inv <= 0 && flames.some(f => f.t > LETHAL && f.c === pc && f.r === pr)) { die(false); return; }

    for (const s of spikes) if (P.inv <= 0 && s.c === pc && s.r === pr && (clock + s.ph) % 3.2 > 2.5) { die(false); return; }

    for (const it of items) {
      it.grace = Math.max(0, (it.grace || 0) - dt);
      if (!it.grace && it.type !== 'key' && it.type !== 'coin' && flames.some(f => f.t > LETHAL && f.c === it.c && f.r === it.r)) {
        it.dead = true; burst(it.c * T + T / 2, it.r * T + T / 2, '#8a8fa8', 8);
      }
    }
    items = items.filter(it => !it.dead);

    items = items.filter(it => {
      if (it.c !== pc || it.r !== pr) return true;
      if (it.type === 'coin') { earn(Math.round(5)); sfx.coin(); burst(P.x, P.y, '#ffd166', 6); return false; }
      if (it.type === 'skull') {   // a curse: ONE random bad effect for a few seconds (never combined)
        const kinds = ['slow', 'auto', 'fuse'].filter(k => !P.curse || P.curse.type !== k);
        const type = kinds[Math.floor(Math.random() * kinds.length)];
        P.curse = { type, t: 9, max: 9, tick: 0 };
        say({ slow: 'Cursed! Heavy legs...', auto: 'Cursed! Bombs keep dropping!', fuse: 'Cursed! Long fuses' }[type]);
        sfx.curse(); burst(P.x, P.y, '#9b59d0', 14); return false;
      }
      if (it.type === 'range') P.range = Math.min(P.range + 1, 7);
      else if (it.type === 'bomb') P.max = Math.min(P.max + 1, 5);
      else if (it.type === 'life') { lives = Math.min(lives + 1, 5); burst(P.x, P.y, '#ff4d6d', 12); }
      else if (it.type === 'key') { P.key = true; say('Got the key! Find the exit'); sfx.key(); score += 100; return false; }
      else if (it.type === 'remote') { P.remote = true; say('Remote bomb! Tap Boom (E) to detonate'); }
      else P.speed = Math.min(P.speed + 18, 235);
      score += 50; sfx.pickup();
      return false;
    });

    if (door.shown && door.c === pc && door.r === pr) {
      if (!P.key) nag('Locked! The key is hidden in a crate');
      else if (enemies.length) nag('Defeat every creature first');
      else {
        const bonus = 500 + Math.ceil(timeLeft) * 10;
        const gain = Math.round((20 + level * 4 + (isBoss() ? 60 : 0))); if (profile) profile.stages = (profile.stages || 0) + 1;
        earn(gain);
        state = 'clear'; score += bonus; stopMusic(); sfx.clear(); saveRun();
        showOverlay(`Stage ${world() + 1}-${stageNo()} clear`, `Bonus <b>+${bonus}</b><br>Coins <b>+${gain}</b><br>Lives reset to 3 next stage`, enter('continue'));
      }
    }
    hud();
  }

  // ---------- drawing ----------
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
    } else {
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

  const DEFAULT_LOOK = { style: 'classic', hat: 'none', face: 'none' };
  function drawPlayer(t) {
    if (P.inv > 0 && Math.floor(t / 90) % 2) return;
    shadow(P.x, P.y + 13, 12);
    drawHero(ctx, P.x, P.y, (profile && profile.look) || DEFAULT_LOOK, (profile && profile.color) || '#3b6fe0', P.fx, P.fy, t, P.moving ? Math.abs(Math.sin(t / 70)) * 2 : Math.sin(t / 280) * 0.7);
    if (P.curse) {
      ctx.strokeStyle = `rgba(155,89,208,${0.5 + Math.sin(t / 90) * 0.25})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(P.x, P.y + 4, 21, -1.57, -1.57 + 6.28 * (P.curse.t / P.curse.max)); ctx.stroke();
      drawIcon(ctx, 'skull', P.x, P.y - 46 + Math.sin(t / 120) * 2);
    }
  }

  // one renderer for the game and the shop previews: base style + hat + face accessory
  function drawHero(g, x, y, look, color, fx, fy, t, bob) {
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

  const RING = { bomb: '#b9c4ff', range: '#ffb84d', speed: '#7fb0ff', life: '#ff8fa6', key: '#ffd166', remote: '#7fd6ff', coin: '#ffd166', skull: '#9b59d0' };
  function drawIcon(g, type, x, y) {
    g.fillStyle = '#fff7e6'; g.beginPath(); g.arc(x, y, 13, 0, 6.3); g.fill();
    g.lineWidth = 2.5; g.strokeStyle = RING[type]; g.stroke();
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
    } else {
      g.fillStyle = '#3a4466'; g.fillRect(x - 8, y - 1, 16, 9);
      g.fillStyle = '#e0453b'; g.beginPath(); g.arc(x, y + 3.5, 3, 0, 6.3); g.fill();
      g.strokeStyle = '#4aa8ff'; g.lineWidth = 2; g.beginPath(); g.arc(x, y - 3, 4, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
      g.beginPath(); g.arc(x, y - 3, 8, Math.PI * 1.2, Math.PI * 1.8); g.stroke();
    }
  }

  function draw(time) {
    ctx.save();
    if (shake > 0) { const k = shake * 6; ctx.translate((Math.random() - 0.5) * k, (Math.random() - 0.5) * k); }
    ctx.drawImage(bg, 0, 0);
    for (let r = 1; r < R - 1; r++) for (let c = 1; c < C - 1; c++) {
      const g = grid[r][c];
      if (g === 2) ctx.drawImage(S.crate, c * T, r * T); else if (g === 3) ctx.drawImage(S.stone, c * T, r * T);
    }

    for (const s of spikes) {
      const x = s.c * T, y = s.r * T, ph = (clock + s.ph) % 3.2, h = ph > 2.5 ? 1 : ph > 2.0 ? 0.3 : 0;
      ctx.fillStyle = h && h < 1 ? 'rgba(200,60,40,.55)' : 'rgba(0,0,0,.35)'; ctx.fillRect(x + 4, y + 4, T - 8, T - 8);
      ctx.fillStyle = '#d7dbe6';
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        const sx = x + 9 + i * 11, sy = y + 12 + j * 10, hh = 3 + 8 * h;
        ctx.beginPath(); ctx.moveTo(sx - 4, sy + 4); ctx.lineTo(sx, sy + 4 - hh); ctx.lineTo(sx + 4, sy + 4); ctx.fill();
      }
    }

    if (door.shown) {
      const x = door.c * T, y = door.r * T, open = P.key && !enemies.length;
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

    for (const it of items) {
      const x = it.c * T + T / 2, y = it.r * T + T / 2 + Math.sin(time / 200) * 2;
      shadow(x, y + 13, 10);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.3; ctx.drawImage(S.glow, x - 20, y - 20, 40, 40);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      drawIcon(ctx, it.type, x, y);
    }

    const sk = skinArt(), pal = curSkin().flame;
    for (const b of bombs) {
      const x = b.c * T + T / 2, y = b.r * T + T / 2, p = 1 + Math.sin(time / 90) * 0.06;
      shadow(x, y + 14, 13);
      if (b.remote || b.long) {
        ctx.strokeStyle = b.remote ? '#7fd6ff' : '#9be56b'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y + 2, 18 + Math.sin(time / 120) * 1.5, 0, 6.3); ctx.stroke();
      }
      ctx.save(); ctx.translate(x, y + 8); ctx.scale(p, p); ctx.drawImage(sk.spr, -20, -28); ctx.restore();
      if (b.t < 0.6 && Math.floor(time / 80) % 2) { ctx.globalAlpha = 0.45; disc(x, y + 4, 14, '#ff3d3d'); ctx.globalAlpha = 1; }
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7 + Math.random() * 0.3;
      ctx.drawImage(sk.glow, x + 9 - 12, y - 16 - 12, 24, 24);   // fuse spark
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }

    for (const f of flames) {
      const x = f.c * T, y = f.r * T, age = 0.5 - f.t;
      if (f.t > LETHAL) {
        const s = Math.min(1, age / 0.08), pop = 1 - Math.pow(1 - s, 3);                 // quick ease-out pop-in
        const sc = (0.3 + 0.7 * pop) * (1 + Math.sin(time / 45 + f.c * 2 + f.r) * 0.04);
        ctx.globalAlpha = Math.min(1, (f.t - LETHAL) / 0.07 + 0.35);
        ctx.save(); ctx.translate(x + T / 2, y + T / 2); ctx.rotate(f.rot); ctx.scale(sc, sc); ctx.drawImage(sk.fl, -20, -20); ctx.restore();
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
            ctx.beginPath(); ctx.arc(x + T / 2, y + T / 2, 10 + k * (f.range * T + 14), 0, 6.3); ctx.stroke();
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

    for (const e of enemies) drawEnemy(e, time);
    if (state !== 'title') drawPlayer(time);

    for (const p of particles) {
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

    if (toast.t > 0) {
      ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
      const tw = ctx.measureText(toast.text).width + 24;
      ctx.globalAlpha = Math.min(1, toast.t * 2);
      ctx.fillStyle = 'rgba(10,12,28,.88)'; ctx.fillRect(cv.width / 2 - tw / 2, 10, tw, 28);
      ctx.fillStyle = '#ffd166'; ctx.fillText(toast.text, cv.width / 2, 29);
      ctx.globalAlpha = 1;
    }

    if (state === 'play' && timeLeft < 20 && Math.floor(time / 400) % 2) {
      ctx.strokeStyle = 'rgba(255,90,90,.6)'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, cv.width - 6, cv.height - 6);
    }

    if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * 0.3})`; ctx.fillRect(0, 0, cv.width, cv.height); }
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    for (const m of motes) ctx.fillRect(m.x, m.y, m.s, m.s);
    ctx.restore();
    ctx.drawImage(S.vig, 0, 0);
  }

  // ---------- loop ----------
  function frame(time) {
    const dt = Math.min((time - last) / 1000 || 0, 0.05);
    last = time;
    let n = 0;
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g === undefined ? 300 : p.g) * dt; if (p.vr) p.rot += p.vr * dt; p.t -= dt; if (p.t > 0) particles[n++] = p; }
    particles.length = n;
    for (const m of motes) { m.y -= m.v * dt; m.x += Math.sin(time / 700 + m.p) * 8 * dt; if (m.y < -4) { m.y = cv.height + 4; m.x = Math.random() * cv.width; } }
    shake = Math.max(0, shake - dt * 2.5); flash = Math.max(0, flash - dt * 3);
    update(dt);
    draw(time);
    requestAnimationFrame(frame);
  }

  // ---------- input ----------
  function confirm() {
    ready();
    if (state === 'title') mNew.click();
    else if (state === 'over') newGame();
    else if (state === 'clear') nextLevel();
  }
  addEventListener('keydown', e => {
    if (!menu.classList.contains('hidden')) {
      if (e.key === 'Escape' && state === 'paused') closeMenu();
      else if (e.key === 'Enter' && state === 'title' && !$('m-main').classList.contains('hidden')) mNew.click();
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
    if (k && k !== 'bomb') keys[k] = false;
  });
  ui.btn.addEventListener('click', confirm);
  menuBtn.addEventListener('click', () => { openMenu(); menuBtn.blur(); });
  $('toMenu').addEventListener('click', openMenu);
  // bomb button
  const bombBtn = document.querySelector('.bomb-btn');
  bombBtn.addEventListener('pointerdown', e => { e.preventDefault(); placeBomb(); });
  $('detBtn').addEventListener('pointerdown', e => { e.preventDefault(); detonate(); });

  // d-pad works as one touch zone, so you can slide a thumb between directions
  const dpad = document.getElementById('dpad');
  const setDir = (x, y) => {
    const r = dpad.getBoundingClientRect(), dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
    keys.up = keys.down = keys.left = keys.right = false;
    if (Math.hypot(dx, dy) < r.width * 0.1) return;
    if (Math.abs(dy) >= Math.abs(dx) * 0.9) keys[dy < 0 ? 'up' : 'down'] = true; else keys[dx < 0 ? 'left' : 'right'] = true;
  };
  dpad.addEventListener('pointerdown', e => { e.preventDefault(); dpad.setPointerCapture(e.pointerId); setDir(e.clientX, e.clientY); });
  dpad.addEventListener('pointermove', e => { if (dpad.hasPointerCapture(e.pointerId)) setDir(e.clientX, e.clientY); });
  ['pointerup', 'pointercancel'].forEach(ev => dpad.addEventListener(ev, () => { keys.up = keys.down = keys.left = keys.right = false; }));
  addEventListener('contextmenu', e => e.preventDefault());

  // ---------- menu, profile, settings ----------
  let armed = false, armT = 0;
  const menu = $('menu'), secs = [...menu.querySelectorAll('.msec')], mNew = $('mNew');
  const SWATCHES = ['#3b6fe0', '#e0453b', '#2fb36b', '#f0a81c', '#9b59d0', '#14b8c4'];
  let pColor = (profile && profile.color) || SWATCHES[0], pendingStart = false, pendingGo = '', shopTab = 'style';
  const stageText = lv => `${Math.floor((lv - 1) / 3) + 1}-${(lv - 1) % 3 + 1}`;

  function paintToggles() {
    $('tSound').textContent = `Sound effects: ${settings.sound ? 'ON' : 'OFF'}`; $('tSound').classList.toggle('off', !settings.sound);
    $('tMusic').textContent = `Music: ${settings.music ? 'ON' : 'OFF'}`; $('tMusic').classList.toggle('off', !settings.music);
    $('tCtrl').textContent = `Controls: ${settings.controls === 'stick' ? 'Joystick' : 'D-pad'}`;
    $('tFlip').textContent = `Touch layout: ${settings.flip ? 'Left-handed' : 'Right-handed'}`;
  }
  function paintProfile() {
    $('swatches').innerHTML = SWATCHES.map(c => `<button type="button" class="sw${c === pColor ? ' on' : ''}" data-c="${c}" style="background:${c}" aria-label="Suit colour"></button>`).join('');
    $('pStats').textContent = profile
      ? `Coins ${profile.coins} \u00b7 Games ${profile.games} \u00b7 Best score ${profile.bestScore} \u00b7 Best stage ${profile.bestLevel ? stageText(profile.bestLevel) : '-'}`
      : 'Create a profile to track your best scores.';
  }
  function showSec(id) {
    if ((id === 'm-shop' || id === 'm-daily') && !profile) { pendingGo = id; id = 'm-profile'; }
    secs.forEach(s => s.classList.toggle('hidden', s.id !== id));
    if (id === 'm-main') {
      $('who').textContent = profile ? `Playing as ${profile.name}` : 'No profile yet';
      $('mResume').style.display = state === 'paused' || state === 'clear' ? '' : 'none';
      armed = false; clearTimeout(armT); mNew.textContent = 'New Game';
      $('mDaily').textContent = profile && !dailyInfo().claimed ? 'Daily Reward \u25CF' : 'Daily Reward';
    }
    if (id === 'm-profile') { $('pName').value = profile ? profile.name : ''; paintProfile(); }
    if (id === 'm-settings') paintToggles();
    if (id === 'm-shop') { renderShop(); startShopAnim(); }
    if (id === 'm-daily') paintDaily();
  }
  function openMenu() {
    if (state === 'play' || state === 'intro') { resumeTo = state; state = 'paused'; stopMusic(); keys.up = keys.down = keys.left = keys.right = false; }
    menu.classList.remove('hidden'); showSec('m-main'); saveRun();
  }
  function closeMenu() {
    menu.classList.add('hidden');
    if (state === 'paused') { state = resumeTo; if (state === 'play') startMusic(); }
  }

  menu.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { pendingStart = false; pendingGo = ''; showSec(b.dataset.go); }));
  $('mResume').addEventListener('click', closeMenu);
  mNew.addEventListener('click', () => {
    ready();
    if (!profile) { pendingStart = true; showSec('m-profile'); return; }
    if ((state === 'paused' || state === 'clear') && !armed) {   // protect a run in progress: needs a second tap
      armed = true; mNew.textContent = 'Tap again to start over';
      armT = setTimeout(() => { armed = false; mNew.textContent = 'New Game'; }, 3000); return;
    }
    armed = false; clearTimeout(armT); mNew.textContent = 'New Game';
    menu.classList.add('hidden'); newGame();
  });
  $('swatches').addEventListener('click', e => { const c = e.target.dataset && e.target.dataset.c; if (c) { pColor = c; paintProfile(); } });
  $('pSave').addEventListener('click', () => {
    const name = $('pName').value.trim().slice(0, 12) || 'Player';
    profile = fixProfile(Object.assign({ games: 0, bestScore: 0, bestLevel: 0 }, profile, { name, color: pColor }));
    store.set('profile', profile);
    if (pendingStart) { pendingStart = false; menu.classList.add('hidden'); newGame(); } else if (pendingGo) { const go = pendingGo; pendingGo = ''; showSec(go); } else showSec('m-main');
  });
  $('tSound').addEventListener('click', () => { settings.sound = !settings.sound; store.set('settings', settings); paintToggles(); ready(); if (settings.sound) sfx.pickup(); });
  $('tMusic').addEventListener('click', () => { settings.music = !settings.music; store.set('settings', settings); paintToggles(); });

  drawIcon($('coinIcon').getContext('2d'), 'coin', 17, 17);
  $('verTag').textContent = `V${VERSION}`; $('verLine').textContent = `Version V${VERSION}`;
  $('devName').textContent = DEV.name; $('devVer').textContent = `V${VERSION}`;
  [['bomb', 'Bomb', 'Carry one more bomb at a time'], ['range', 'Flame', 'Bigger blast range'], ['speed', 'Shoe', 'Run faster'], ['life', 'Heart', 'One extra life (max 5)'], ['remote', 'Remote', 'Detonate your bombs yourself (E or Boom)'], ['key', 'Key', 'Hidden in a crate. Needed to open the exit'], ['skull', 'Skull', 'A curse! Slow legs, endless bombs or long fuses for a few seconds'], ['coin', 'Coin', 'Spend coins in the Shop on characters and accessories']].forEach(([t, n, d]) => {
    const li = document.createElement('li'), c = document.createElement('canvas');
    c.width = c.height = 34; drawIcon(c.getContext('2d'), t, 17, 17);
    li.appendChild(c); li.insertAdjacentHTML('beforeend', `<span><b>${n}</b> &mdash; ${d}</span>`);
    $('legend').appendChild(li);
  });

  // ---------- shop ----------
  const tier = p => (p <= 300 ? 'common' : p <= 700 ? 'rare' : p <= 1300 ? 'epic' : 'legend');
  let shownCoins = null, shopRaf = 0, shopPop = 0;
  function showCoins() {
    const el = $('shopCoins'), to = profile.coins, from = shownCoins === null ? to : shownCoins;
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
    .map(k => CATALOG[k].find(i => i.id === profile.look[k]) || CATALOG[k][0])
    .filter((it, i) => i === 0 || it.price > 0).map(it => it.name).join(' \u00b7 ');

  // big preview: spotlight, pedestal, sparkles; the hero looks around and breathes
  function drawShopHero(t) {
    const cvs = $('shopHero'), g = cvs.getContext('2d'), W2 = cvs.width, H2 = cvs.height;
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
    g.drawImage(skinArt(profile.look.bomb).spr, W2 / 2 + 40, H2 * 0.8 - 30, 44, 44);
    const pop = 1 + shopPop * 0.14; shopPop = Math.max(0, shopPop - 0.05);
    g.save(); g.translate(W2 / 2, H2 * 0.8 - 45 * pop); g.scale(3 * pop, 3 * pop);
    drawHero(g, 0, 0, profile.look, profile.color, Math.round(Math.sin(t / 1100)), 1, t, Math.sin(t / 280) * 0.7);
    g.restore();
  }
  function shopTick(t) {
    if (menu.classList.contains('hidden') || $('m-shop').classList.contains('hidden')) { shopRaf = 0; return; }
    drawShopHero(t); shopRaf = requestAnimationFrame(shopTick);
  }
  const startShopAnim = () => { if (!shopRaf) shopRaf = requestAnimationFrame(shopTick); };

  function renderShop() {
    fixProfile(profile);
    showCoins(); $('shopName').textContent = lookName();
    tabBtns.forEach(b => b.classList.toggle('on', b.dataset.tab === shopTab));
    $('shopGrid').innerHTML = '';
    CATALOG[shopTab].forEach(it => {
      const own = it.price === 0 || profile.owned.includes(shopTab + ':' + it.id), eq = profile.look[shopTab] === it.id, poor = !own && profile.coins < it.price;
      const b = document.createElement('button'), c = document.createElement('canvas');
      b.type = 'button'; b.className = `item r-${tier(it.price)}${eq ? ' eq' : ''}${poor ? ' poor' : ''}`; c.width = 72; c.height = 84;
      const g = c.getContext('2d');
      if (shopTab === 'bomb') drawSkinCard(g, it.id);
      else { g.translate(36, 58); g.scale(1.3, 1.3); drawHero(g, 0, 0, Object.assign({}, profile.look, { [shopTab]: it.id }), profile.color, 0, 1, 0, 0); }
      b.appendChild(c);
      b.insertAdjacentHTML('beforeend', `${eq ? '<i class="tag">\u2713</i>' : ''}<span class="nm">${it.name}</span>` +
        (own ? `<span class="own">${eq ? 'Equipped' : 'Owned'}</span>` : `<span class="pricechip">${it.price}</span>` + (poor ? `<span class="bar"><i style="width:${Math.min(100, Math.round(profile.coins / it.price * 100))}%"></i></span>` : '')));
      b.addEventListener('click', () => shopTap(it));
      $('shopGrid').appendChild(b);
    });
  }
  function shopTap(it) {
    const key = shopTab + ':' + it.id, own = it.price === 0 || profile.owned.includes(key);
    if (!own) {
      if (profile.coins < it.price) { $('shopMsg').textContent = `Need ${it.price - profile.coins} more coins (about ${Math.ceil((it.price - profile.coins) / perStage())} stage${Math.ceil((it.price - profile.coins) / perStage()) === 1 ? '' : 's'} of play)`; sfx.hit(); return; }
      profile.coins -= it.price; profile.owned.push(key); sfx.pickup(); $('shopMsg').textContent = `Bought ${it.name}!`;
    } else $('shopMsg').textContent = '';
    profile.look[shopTab] = it.id; store.set('profile', profile); shopPop = 1; if (own) sfx.coin(); renderShop(); hud();
  }
  const tabBtns = [...menu.querySelectorAll('.tabs button')];
  tabBtns.forEach(b => b.addEventListener('click', () => { shopTab = b.dataset.tab; $('shopMsg').textContent = ''; renderShop(); }));

  // ---------- controls: d-pad or joystick ----------
  const pad = document.querySelector('.pad'), stick = $('stick'), knob = $('knob');
  function applyControls() { pad.classList.toggle('use-stick', settings.controls === 'stick'); pad.classList.toggle('flip', !!settings.flip); }
  const clearDirs = () => { keys.up = keys.down = keys.left = keys.right = false; };
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
  stick.addEventListener('pointerdown', e => { e.preventDefault(); stick.setPointerCapture(e.pointerId); stickMove(e.clientX, e.clientY); });
  stick.addEventListener('pointermove', e => { if (stick.hasPointerCapture(e.pointerId)) stickMove(e.clientX, e.clientY); });
  ['pointerup', 'pointercancel'].forEach(ev => stick.addEventListener(ev, () => { clearDirs(); knob.style.transform = ''; }));

  const saveSet = () => { store.set('settings', settings); paintToggles(); applyControls(); clearDirs(); };
  $('tCtrl').addEventListener('click', () => { settings.controls = settings.controls === 'stick' ? 'dpad' : 'stick'; saveSet(); });
  $('tFlip').addEventListener('click', () => { settings.flip = !settings.flip; saveSet(); });

  function paintDaily() {
    const d = dailyInfo();
    $('dailyWeek').innerHTML = DAILY.map((v, i) => {
      const done = i < d.idx || (i === d.idx && d.claimed);
      return `<div class="day${done ? ' done' : ''}${i === d.idx && !d.claimed ? ' today' : ''}${i === 6 ? ' big' : ''}"><b>Day ${i + 1}</b><span class="amt">${v}</span>${done ? '<i>\u2713</i>' : ''}</div>`;
    }).join('');
    $('dClaim').style.display = d.claimed ? 'none' : '';
    $('dClaim').textContent = `Claim +${d.reward} coins`;
    $('dailyMsg').textContent = d.claimed ? `Claimed! Come back tomorrow for ${DAILY[d.idx === 6 ? 0 : d.idx + 1]} coins. Streak: ${d.streak} day${d.streak === 1 ? '' : 's'}` : 'Your reward is ready. Miss a day and the streak starts over.';
  }
  $('dClaim').addEventListener('click', claimDaily);

  menu.addEventListener('click', e => { if (e && e.target && e.target.closest && e.target.closest('button')) sfx.click(); });
  // leaving the page pauses the game and saves it, so you can pick up where you left off
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (state === 'play' || state === 'intro') openMenu(); saveRun(); } });
  addEventListener('pagehide', saveRun);

  // board behind the menu

  P = { x: T * 1.5, y: T * 1.5, speed: 150, max: 1, range: 2, inv: 0, fx: 0, fy: 1, moving: false };
  build();
  restoreRun();   // pick up an unfinished run from last time
  paintToggles(); applyControls(); showSec('m-main');
  if (profile && !dailyInfo().claimed) showSec('m-daily');   // daily reward pops up when you open the game
  requestAnimationFrame(frame);
})();
