// Fixed numbers and tables: nothing in here changes while the game runs.

export const VERSION = self.FUSE_VERSION || 'dev';
export const DEV = { name: 'jmprojectsme' };   // shown in Settings > Developer info: change to the name you want players to see

export const T = 40;          // tile size in game pixels
export const C = 15;          // columns
export const R = 13;          // rows
export const H = 14;          // half the player's hit box
export const W = C * T;       // board width in game pixels
export const HT = R * T;      // board height in game pixels

export const LETHAL = 0.18;   // flames only hurt while t > LETHAL; the rest is harmless embers
export const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export const START_LIVES = 3; // every stage starts with this many; hearts add more during the stage
export const MAX_LIVES = 5;

// tile values in the grid
export const FLOOR = 0, WALL = 1, CRATE = 2, ROCK = 3;

export const CATALOG = {
  style: [{ id: 'classic', name: 'Classic', price: 0 }, { id: 'cat', name: 'Cat', price: 600 }, { id: 'ninja', name: 'Ninja', price: 800 }, { id: 'robot', name: 'Robot', price: 1200 }, { id: 'astro', name: 'Astronaut', price: 1800 }],
  hat: [{ id: 'none', name: 'No hat', price: 0 }, { id: 'cap', name: 'Cap', price: 150 }, { id: 'party', name: 'Party', price: 250 }, { id: 'cowboy', name: 'Cowboy', price: 400 }, { id: 'wizard', name: 'Wizard', price: 650 }, { id: 'crown', name: 'Crown', price: 1000 }],
  face: [{ id: 'none', name: 'Plain', price: 0 }, { id: 'shades', name: 'Shades', price: 200 }, { id: 'mustache', name: 'Mustache', price: 300 }, { id: 'mask', name: 'Mask', price: 450 }, { id: 'monocle', name: 'Monocle', price: 700 }],
  bomb: [{ id: 'classic', name: 'Classic', price: 0 }, { id: 'star', name: 'Star', price: 250 }, { id: 'pumpkin', name: 'Pumpkin', price: 400 }, { id: 'ice', name: 'Frost', price: 600 }, { id: 'candy', name: 'Candy', price: 800 }, { id: 'gold', name: 'Golden', price: 1500 }]
};

// stages: 3 per zone, the last one is a boss
export const THEMES = [
  { name: 'Green Garden', a: '#3f8f4a', b: '#3a8344', wall: '#566579', wallTop: '#8d9bb0', crate: '#c98a3c', crateD: '#7a4d1c' },
  { name: 'Dune Ruins',   a: '#d9b46a', b: '#cfa75c', wall: '#6e4529', wallTop: '#a8734c', crate: '#6aa3a0', crateD: '#37605e' },
  { name: 'Frost Cavern', a: '#a9d4ea', b: '#9ccae2', wall: '#3a5580', wallTop: '#6b8cbb', crate: '#e8f2f8', crateD: '#7aa0bd' },
  { name: 'Magma Forge',  a: '#5a3330', b: '#512d2a', wall: '#1f161a', wallTop: '#463238', crate: '#b5502f', crateD: '#6e2a16' },
  { name: 'Coral Reef',   a: '#2f8fa6', b: '#2a869c', wall: '#8a4a6a', wallTop: '#c2759a', crate: '#f0b34a', crateD: '#9a6a1a' },
  { name: 'Storm Peak',   a: '#7f93a8', b: '#7689a0', wall: '#3b4560', wallTop: '#6a7596', crate: '#c9d3e3', crateD: '#76849e' },
  { name: 'Neon Night',   a: '#26264d', b: '#2b2b57', wall: '#0c0c20', wallTop: '#3a3a78', crate: '#c04fd0', crateD: '#6a2475' }
];

// enemy stats per type: base speed, chance to hunt the player, how far it sees, chance to dodge blasts
export const ENEMY = {
  balloon: { speed: 42, smart: 0.12, sight: 5, dodge: 0.3, hp: 1 },
  blob:    { speed: 60, smart: 0.3,  sight: 7, dodge: 0.5, hp: 1 },
  ghost:   { speed: 38, smart: 0.4,  sight: 8, dodge: 0.65, hp: 1 },
  bat:     { speed: 78, smart: 0.15, sight: 6, dodge: 0.6, hp: 1 },
  knight:  { speed: 34, smart: 0.55, sight: 8, dodge: 0.3, hp: 2 },
  boss:    { speed: 58, smart: 0.55, sight: 10, dodge: 0.7, hp: 3 }
};

export const DAILY = [25, 30, 40, 50, 60, 80, 150];   // 7-day streak rewards

export const SWATCHES = ['#3b6fe0', '#e0453b', '#2fb36b', '#f0a81c', '#9b59d0', '#14b8c4'];
