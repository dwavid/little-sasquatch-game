'use strict';
/* LEVEL 1 - "After the Storm"
   Everything about the level lives here so it is easy to tweak:
   move a cooler, add a ranger, change a sign. Units are pixels. */

const FOOD = {                       // how much tummy each food fills (10 = full, each heart = 2)
  apple:    { heal: 1, text: 'CRUNCHY APPLE!' },
  cookie:   { heal: 1, text: 'YUMMY COOKIES!' },
  sandwich: { heal: 2, text: 'TASTY SANDWICH!' },
  fish:     { heal: 2, text: 'FISH! NOM NOM!' },
};

const L1 = {
  width: 5600,
  baseY: 232,
  startX: 80,
  startHp: 3,
  maxHp: 10,
  shelterX: 5330,      // where the campfire is
  barrierX: 5262,      // you can't go into the cave until your tummy is full
  progressEnd: 5200,   // for the sky colours

  // x0, x1, top y, kind
  ground: [
    [-1600, 300, 232, 'dirt'],
    [300, 338, 216, 'boulder'],
    [338, 1560, 232, 'dirt'],
    [1560, 1700, 216, 'dirt'], [1700, 1860, 198, 'dirt'], [1860, 2000, 216, 'dirt'],
    [2000, 2530, 232, 'dirt'],
    [2530, 2562, 214, 'crate'],
    [2562, 3500, 232, 'dirt'],
    [3500, 3620, 214, 'rock'], [3620, 3780, 194, 'rock'], [3780, 3960, 176, 'rock'],
    [3960, 4100, 196, 'rock'], [4100, 4220, 216, 'rock'],
    [4220, 5900, 232, 'dirt'],
  ],

  // one-way platforms (jump up through them)
  oneway: [
    { x: 1470, y: 213, w: 80, kind: 'log' },
    { x: 2190, y: 198, w: 96, kind: 'ledge' },
    { x: 2575, y: 190, w: 92, kind: 'rv' },
    { x: 3650, y: 150, w: 64, kind: 'log' },
  ],

  coolers: [
    { x: 560,  food: 'apple' },
    { x: 905,  food: 'sandwich' },
    { x: 1235, food: 'cookie' },
    { x: 1780, food: 'fish' },
    { x: 2238, food: 'apple', y: 198 },
    { x: 2620, food: 'sandwich', y: 190 },
    { x: 2722, food: 'fish' },
    { x: 2992, food: 'cookie' },
    { x: 3870, food: 'sandwich', y: 176 },
  ],

  berries: [{ x: 4860 }, { x: 5135 }],   // regrow, so you can never get stuck hungry

  rangers: [
    { x: 1010, min: 830,  max: 1300 },
    { x: 2260, min: 2060, max: 2480 },
    { x: 2800, min: 2660, max: 3010 },
    { x: 3250, min: 3020, max: 3460 },
    { x: 3900, min: 3560, max: 4180 },
    { x: 4560, min: 4400, max: 4770 },
  ],

  hideBushes: [770, 1335, 2075, 2495, 2665, 3070, 3470, 3555, 4010, 4435, 4745],

  checkpoints: [1450, 3420, 4800],

  signs: [
    { x: 150,  text: 'LITTLE SASQUATCH IS HUNGRY! MOVE WITH THE ARROW KEYS OR A AND D.' },
    { x: 255,  text: 'PRESS SPACE TO JUMP. TRY HOPPING OVER THAT ROCK!' },
    { x: 485,  text: 'A COOLER! STAND NEXT TO IT AND PRESS E TO GRAB FOOD.' },
    { x: 745,  text: 'WATCH OUT, PARK RANGERS! JUMP ON THEIR HATS, OR HIDE IN A BUSH BY HOLDING DOWN.' },
    { x: 1500, text: 'FULL TUMMY FIRST, THEN FIND SHELTER BEFORE DARK!' },
    { x: 4880, text: 'SHELTER AHEAD. NIGHT IS COMING SOON!' },
  ],

  tents: [{ x: 805, c: 0 }, { x: 1040, c: 1 }, { x: 1180, c: 2 }, { x: 2800, c: 3 }, { x: 2945, c: 0 }, { x: 3335, c: 1 }, { x: 3420, c: 2 }],
  tables: [920, 2880, 3110],
  campfires: [{ x: 1120 }, { x: 3015 }],
  rv: { x: 2575 }, truck: { x: 3160 },
  puddles: [185, 430, 610, 760],
  sticks: [360, 520, 700, 1400],
  rocks: [210, 640, 1620, 2050, 2380, 3550, 3700, 4300, 4650],
};

function groundAt(x) {
  let best = L1.baseY;
  for (const s of L1.ground) if (x >= s[0] && x < s[1]) { best = s[2]; }
  return best;
}

/* ---------- build collision data from the level ---------- */
const WORLD = { solids: [], oneway: [] };
function buildWorld() {
  WORLD.solids = L1.ground.map(s => ({ x: s[0], y: s[2], w: s[1] - s[0], h: 400, kind: s[3] }));
  WORLD.oneway = L1.oneway.map(o => ({ x: o.x, y: o.y, w: o.w, h: 6, kind: o.kind }));
}

/* ---------- time of day: sky + tint as Little Sasquatch makes progress ---------- */
const SKY_KEYS = [
  // p: progress 0..1.   top / bottom of sky, world tint, overcast 0..1, sun height (0 low..1 high), rainbow
  { p: 0.00, top: '#6f7d8e', bot: '#aeb9c2', tint: '#b3bcc8', over: 0.8, sun: 0.55, rain: 0.45 },
  { p: 0.08, top: '#6a9bc8', bot: '#c4dcec', tint: '#dfe6ee', over: 0.5, sun: 0.6, rain: 0.15 },
  { p: 0.18, top: '#4f9be0', bot: '#bfe6f7', tint: '#ffffff', over: 0.12, sun: 0.7, rain: 0 },
  { p: 0.55, top: '#4f9be0', bot: '#c7eaf8', tint: '#ffffff', over: 0.05, sun: 0.85, rain: 0 },
  { p: 0.78, top: '#5a94d2', bot: '#ffe2a8', tint: '#ffe7c4', over: 0.05, sun: 0.4, rain: 0 },
  { p: 1.00, top: '#6b5fa8', bot: '#ffa36b', tint: '#ffc79a', over: 0.1, sun: 0.1, rain: 0 },
];
const NIGHT_ENV = { top: '#0b1030', bot: '#27386e', tint: '#5d6db0', over: 0, sun: 0, rain: 0 };

function envAt(p) {
  p = clamp(p, 0, 1);
  let a = SKY_KEYS[0], b = SKY_KEYS[SKY_KEYS.length - 1];
  for (let i = 0; i < SKY_KEYS.length - 1; i++) {
    if (p >= SKY_KEYS[i].p && p <= SKY_KEYS[i + 1].p) { a = SKY_KEYS[i]; b = SKY_KEYS[i + 1]; break; }
  }
  const t = b.p === a.p ? 0 : (p - a.p) / (b.p - a.p);
  return mixEnv(a, b, t);
}
function mixEnv(a, b, t) {
  return {
    top: mixRGB(hex2rgb(a.top), hex2rgb(b.top), t), bot: mixRGB(hex2rgb(a.bot), hex2rgb(b.bot), t),
    tint: mixRGB(hex2rgb(a.tint), hex2rgb(b.tint), t),
    over: lerp(a.over, b.over, t), sun: lerp(a.sun, b.sun, t), rain: lerp(a.rain, b.rain, t),
    night: lerp(a.night || 0, b.night || 0, t), rainbow: lerp(a.rainbow || 0, b.rainbow || 0, t),
  };
}
