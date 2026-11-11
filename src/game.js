'use strict';
/* Little Sasquatch: Find Your Family  -  main game: input, player, rangers, scenes. */

const canvas = document.getElementById('game');
const g = canvas.getContext('2d');
g.imageSmoothingEnabled = false;
const params = new URLSearchParams(location.search);

/* ================================================================== */
/* Input                                                                */
/* ================================================================== */
const Input = { down: {}, pressed: {}, touch: {}, touchPressed: {} };
const KEYMAP = {
  left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], jump: ['Space', 'ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'], act: ['KeyE', 'KeyX', 'KeyK'], confirm: ['Enter', 'Space', 'KeyE'],
  pause: ['KeyP', 'Escape'], mute: ['KeyM'],
};
const held = a => KEYMAP[a].some(c => Input.down[c]) || !!Input.touch[a];
const pressed = a => KEYMAP[a].some(c => Input.pressed[c]) || !!Input.touchPressed[a];
addEventListener('keydown', e => {
  Snd.init();
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  if (!e.repeat) Input.pressed[e.code] = true;
  Input.down[e.code] = true;
});
addEventListener('pointerdown', () => { Snd.init(); Input.pressed.Click = true; });
addEventListener('keyup', e => { Input.down[e.code] = false; });
addEventListener('blur', () => { Input.down = {}; Input.touch = {}; });
function endFrameInput() { Input.pressed = {}; Input.touchPressed = {}; }

/* touch buttons (only shown on touch screens) */
(function setupTouch() {
  const box = document.getElementById('touch');
  if (!box) return;
  if (!('ontouchstart' in window) && !(navigator.maxTouchPoints > 0)) return;
  box.style.display = 'block';
  box.querySelectorAll('[data-a]').forEach(b => {
    const a = b.dataset.a;
    const on = e => { e.preventDefault(); Snd.init(); Input.touch[a] = true; Input.touchPressed[a] = true; if (a === 'jump') Input.touchPressed.confirm = true; };
    const off = e => { e.preventDefault(); Input.touch[a] = false; };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off);
    b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
  });
  canvas.addEventListener('pointerdown', () => { Snd.init(); Input.touchPressed.confirm = true; });
})();

function fitCanvas() {
  const s = Math.min(innerWidth / VW, innerHeight / VH);
  const k = s >= 1 ? Math.floor(s * 4) / 4 : s;   // crisp quarter-steps
  canvas.style.width = Math.floor(VW * k) + 'px'; canvas.style.height = Math.floor(VH * k) + 'px';
}
addEventListener('resize', fitCanvas);

/* ================================================================== */
/* Helpers: environments, particles, toasts                            */
/* ================================================================== */
function envNum(o) {
  return { top: hex2rgb(o.top), bot: hex2rgb(o.bot), tint: hex2rgb(o.tint), over: o.over, sun: o.sun, rain: o.rain, night: o.night || 0, rainbow: o.rainbow || 0 };
}
function lerpEnv(a, b, t) {
  return {
    top: mixRGB(a.top, b.top, t), bot: mixRGB(a.bot, b.bot, t), tint: mixRGB(a.tint, b.tint, t),
    over: lerp(a.over, b.over, t), sun: lerp(a.sun, b.sun, t), rain: lerp(a.rain, b.rain, t),
    night: lerp(a.night, b.night, t), rainbow: lerp(a.rainbow, b.rainbow, t),
  };
}
const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const ENV_NIGHT = envNum(Object.assign({}, NIGHT_ENV, { night: 1 }));

const Parts = [];
function spawn(p) { Parts.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, g: 0, life: 1, max: 1, size: 1, col: '#fff', type: 'px' }, p, { max: p.life || 1 })); }
function updateParts(dt) {
  for (let i = Parts.length - 1; i >= 0; i--) {
    const p = Parts[i]; p.life -= dt;
    if (p.life <= 0) { Parts.splice(i, 1); continue; }
    p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
  }
}
function drawParts(g, cam) {
  for (const p of Parts) {
    const a = clamp(p.life / p.max * (p.fade === false ? 4 : 1.6), 0, 1);
    g.globalAlpha = a;
    const x = Math.round(p.x - cam), y = Math.round(p.y);
    if (p.type === 'px') { g.fillStyle = p.col; g.fillRect(x, y, p.size, p.size); }
    else if (p.type === 'text') drawText(g, p.text, x, y, { color: p.col, shadow: INK, align: 'center', scale: p.scale || 1 });
    else if (p.type === 'icon') g.drawImage(p.img, x - (p.img.width >> 1), y - (p.img.height >> 1));
    else if (p.type === 'glow') { g.fillStyle = p.col; g.fillRect(x, y, 1, 1); g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); }
  }
  g.globalAlpha = 1;
}
function dust(x, y, n = 5, col = '#d9c9a0') {
  for (let i = 0; i < n; i++) spawn({ x: x + (Math.random() - .5) * 8, y, vx: (Math.random() - .5) * 40, vy: -Math.random() * 25, g: 40, life: 0.35 + Math.random() * .2, col, size: 2 });
}

/* ================================================================== */
/* Collision                                                            */
/* ================================================================== */
const overlap = (ax, ay, aw, ah, bx, by, bw, bh) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
function moveBody(b, dt) {
  b.x += b.vx * dt;
  for (const s of WORLD.solids) {
    if (overlap(b.x, b.y, b.w, b.h, s.x, s.y, s.w, s.h)) {
      if (b.vx > 0) b.x = s.x - b.w; else if (b.vx < 0) b.x = s.x + s.w;
      b.vx = 0;
    }
  }
  const prevBottom = b.y + b.h;
  b.y += b.vy * dt; b.onGround = false;
  for (const s of WORLD.solids) {
    if (overlap(b.x, b.y, b.w, b.h, s.x, s.y, s.w, s.h)) {
      if (b.vy >= 0) { b.y = s.y - b.h; b.onGround = true; } else b.y = s.y + s.h;
      b.vy = 0;
    }
  }
  for (const o of WORLD.oneway) {
    if (b.vy >= 0 && b.x < o.x + o.w && b.x + b.w > o.x && prevBottom <= o.y + 0.5 && b.y + b.h >= o.y) {
      b.y = o.y - b.h; b.vy = 0; b.onGround = true;
    }
  }
}

/* ================================================================== */
/* Park Ranger                                                          */
/* ================================================================== */
class Ranger {
  constructor(def) {
    this.home = def.x; this.min = def.min; this.max = def.max;
    this.w = 12; this.h = 32; this.reset();
  }
  reset() { this.x = this.home; this.dir = -1; this.state = 'patrol'; this.timer = 0; this.stun = 0; this.pause = 0; this.lostT = 0; this.leaveT = 0; this.anim = Math.random() * 3; this.moving = false; }
  get top() { return groundAt(this.x) - this.h; }
  update(dt, p) {
    this.anim += dt; this.moving = false;
    if (this.stun > 0) { this.stun -= dt; if (this.stun <= 0) { this.state = 'lost'; this.timer = 1.2; } return; }
    const dx = p.x + p.w / 2 - this.x, vertOK = Math.abs(p.y + p.h - (this.top + this.h)) < 44;
    const canSee = !p.hidden && p.state === 'normal' && Math.abs(dx) < 140 && vertOK && (Math.sign(dx) === this.dir || Math.abs(dx) < 70);
    if (this.state === 'patrol') {
      if (this.pause > 0) this.pause -= dt;
      else if (p.hidden && Math.sign(dx) === this.dir && Math.abs(dx) < 46) {
        this.dir = -this.dir; this.pause = 0.7;          // doesn't wander into a hiding spot
      } else {
        this.leaveT = Math.max(0, this.leaveT - dt);
        this.x += this.dir * (this.leaveT > 0 ? 38 : 24) * dt; this.moving = true;
        if (this.x < this.min) { this.x = this.min; this.dir = 1; this.pause = 0.8 + Math.random(); }
        if (this.x > this.max) { this.x = this.max; this.dir = -1; this.pause = 0.8 + Math.random(); }
      }
      if (canSee) this.spot(dx);
    } else if (this.state === 'alert') {
      this.timer -= dt; this.dir = dx < 0 ? -1 : 1;
      if (this.timer <= 0) this.state = 'chase';
    } else if (this.state === 'chase') {
      if (p.hidden || !vertOK || Math.abs(dx) > 240 || p.state !== 'normal') {
        this.lostT += dt;
        if (this.lostT > (p.hidden ? 0.4 : 0.9)) { this.state = 'lost'; this.timer = 1.8; this.lostT = 0; }
      } else this.lostT = 0;
      if (!p.hidden && Math.abs(dx) > 5) { this.dir = dx < 0 ? -1 : 1; this.x += this.dir * 66 * dt; this.moving = true; }
      this.x = clamp(this.x, this.min - 24, this.max + 24);
    } else if (this.state === 'lost') {
      this.timer -= dt;
      if (canSee) this.spot(dx);
      else if (this.timer <= 0) { this.state = 'patrol'; this.dir = dx < 0 ? 1 : -1; this.leaveT = 3; this.pause = 0; }   // give up and wander off
    }
  }
  spot(dx) { this.state = 'alert'; this.timer = 0.5; this.dir = dx < 0 ? -1 : 1; Snd.alert(); }
  draw(g, t) {
    let img = SPR.ranger.idle;
    if (this.stun > 0) img = SPR.ranger.dizzy;
    else if (this.moving) img = ((this.anim * (this.state === 'chase' ? 10 : 5)) | 0) % 2 ? SPR.ranger.w1 : SPR.ranger.w0;
    else if (this.state === 'lost') img = (t * 2 | 0) % 2 ? SPR.ranger.w2 : SPR.ranger.idle;
    const bottom = this.top + this.h + 3, hop = this.state === 'alert' ? -2 : 0;
    blit(g, img, this.x, bottom + hop, this.dir < 0);
    const hx = Math.round(this.x), hy = Math.round(this.top - 8);
    if (this.state === 'alert') drawText(g, '!', hx, hy - 10 + hop, { color: '#ff3b3b', shadow: INK, align: 'center', scale: 2 });
    else if (this.state === 'lost' && this.stun <= 0) drawText(g, '?', hx, hy - 12, { color: '#ffe27a', shadow: INK, align: 'center', scale: 2 });
    if (this.stun > 0) {
      for (let i = 0; i < 3; i++) {
        const a = t * 5 + i * 2.1; g.fillStyle = '#ffe14a';
        const sx = Math.round(this.x + Math.cos(a) * 9), sy = Math.round(this.top - 3 + Math.sin(a) * 2.5);
        g.fillRect(sx, sy, 1, 1); g.fillRect(sx - 1, sy, 3, 1); g.fillRect(sx, sy - 1, 1, 3);
      }
    }
  }
}

/* ================================================================== */
/* Player                                                               */
/* ================================================================== */
const MAXV = 104, ACC = 760, FRIC = 950, AIRACC = 560, GRAV = 1000, JUMPV = -345, MAXFALL = 430;

function newPlayer() {
  return { x: L1.startX, y: groundAt(L1.startX) - 24, w: 14, h: 24, vx: 0, vy: 0, face: 1, onGround: true, coyote: 0, jumpBuf: 0,
    hp: L1.startHp, inv: 0, lock: 0, hidden: false, ducking: false, eat: 0, anim: 0, state: 'normal', stepT: 0, blinkT: 2, wasAir: false, hurtAnim: 0 };
}

/* ================================================================== */
/* Scenes                                                               */
/* ================================================================== */
let scene = null, fade = { a: 1, dir: -1, next: null }, gameT = 0;
function go(name, opts) { if (fade.next) return; fade.next = { name, opts }; fade.dir = 1; }
const Scenes = {};

/* ---------------------------- Title ---------------------------- */
Scenes.title = {
  t: 0, state: { fireLit: false, cpActive: [], berries: [] },
  armed: false,
  enter() { this.t = 0; Snd.music('play'); this.armed = Snd.started; },
  update(dt) {
    this.t += dt;
    if (pressed('mute')) Snd.toggleMute();
    if (!this.armed) { if (Object.keys(Input.pressed).length || Input.touchPressed.confirm) { this.armed = true; Snd.init(); Snd.music('play'); } return; }
    if (pressed('confirm')) go('intro');
  },
  draw() {
    const cam = 760 + this.t * 16, env = envAt(0.4); env.rainbow = 0; env.rain = 0;
    drawBackdrop(g, cam, env, this.t);
    drawTrees(g, cam); drawTerrain(g, cam); drawScenery(g, cam, this.t, this.state);
    applyTint(g, env);
    const bob = Math.round(Math.sin(this.t * 2.4) * 2);
    const spr = SPR.sasq[((this.t * 2.2) | 0) % 9 === 0 ? 'blink' : 'idle'][1];
    g.drawImage(spr, 240 - 52, 232 - 120 + bob, spr.width * 4, spr.height * 4);
    // title
    const cream = '#fff3c9';
    drawText(g, 'LITTLE SASQUATCH', 240, 22, { scale: 4, color: cream, shadow: '#3b1b13', align: 'center' });
    drawText(g, 'FIND YOUR FAMILY', 240, 60, { scale: 3, color: '#ffd37a', shadow: '#3b1b13', align: 'center' });
    // bottom bar
    g.fillStyle = 'rgba(12,8,22,0.78)'; g.fillRect(0, 238, VW, 32);
    if (((this.t * 1.6) | 0) % 2 === 0) drawText(g, this.armed ? 'PRESS ENTER TO START' : 'PRESS ANY KEY OR CLICK', 240, 243, { scale: 1, color: '#fff3c9', align: 'center' });
    drawText(g, 'ARROWS OR WASD: MOVE   SPACE: JUMP   E: GRAB FOOD   DOWN: HIDE   M: SOUND', 240, 257, { color: '#b8aed0', align: 'center' });
  },
};

/* ---------------------------- Intro ---------------------------- */
const INTRO = {
  sunny: null, storm: null, clear: null,
  captions: [
    [0.8, 'HIGH IN A QUIET VALLEY, A SASQUATCH FAMILY WENT OUT FOR A HIKE.', 6.6],
    [7.2, 'BUT MOUNTAIN WEATHER CAN CHANGE IN A HURRY...', 11.0],
    [11.2, 'THEN... A HUGE STORM HIT!', 14.4],
    [15.6, 'WHEN THE STORM PASSED, LITTLE SASQUATCH WAS ALL ALONE.', 20.0],
  ],
  flashes: [11.5, 12.6, 13.4],
  END: 24,
};
function introSpeed(t) { return t < 7 ? 36 : t < 11 ? 46 : 74; }
function introS(t) { // distance walked
  const a = Math.min(t, 7) * 36, b = clamp(t - 7, 0, 4) * 46, c = Math.max(0, t - 11) * 74;
  return a + b + c;
}
Scenes.intro = {
  t: 0, flashAt: [], state: { fireLit: false, cpActive: [], berries: [], hideSigns: true },
  enter() {
    this.t = 0; this.flashAt = INTRO.flashes.slice(); this.thunderDone = {};
    Parts.length = 0;
    INTRO.sunny = envAt(0.35); INTRO.sunny.rain = 0; INTRO.sunny.over = 0.04; INTRO.sunny.rainbow = 0; INTRO.sunny.sun = 0.8;
    INTRO.storm = envNum({ top: '#2c3342', bot: '#566170', tint: '#7a8594', over: 1, sun: 0, rain: 1 });
    INTRO.clear = envAt(0); INTRO.clear.rainbow = 0;
    Snd.music('play');
  },
  update(dt) {
    const prev = this.t; this.t += dt;
    if (pressed('confirm') && this.t > 0.6) { go('play'); return; }
    if (this.t > INTRO.END) { setScene('play', { fromIntro: true }); return; }
    for (const f of INTRO.flashes) if (prev < f && this.t >= f) { Snd.thunder(); }
    if (prev < 7.6 && this.t >= 7.6) Snd.music('none');
    if (prev < 15 && this.t >= 15) Snd.music('sad');
    if (prev < 13.9 && this.t >= 13.9) Snd.whoosh();
  },
  envNow() {
    const t = this.t;
    if (t < 6.5) return INTRO.sunny;
    if (t < 11) return lerpEnv(INTRO.sunny, INTRO.storm, smooth((t - 6.5) / 3.5));
    if (t < 15.5) return INTRO.storm;
    return lerpEnv(INTRO.storm, INTRO.clear, smooth((t - 15.5) / 4));
  },
  rainNow() {
    const t = this.t;
    if (t < 7.5) return 0; if (t < 9) return (t - 7.5) / 1.5 * 0.5; if (t < 11) return 0.5 + (t - 9) / 2 * 0.3;
    if (t < 14.6) return Math.min(1, 0.8 + (t - 11) * .1); if (t < 18) return Math.max(0.35, 1 - (t - 14.6) / 3.4 * 0.65) * (1 - smooth((t - 15.5) / 3.5) * .3) * (t > 17 ? clamp(1 - (t - 17) / 2.2, 0, 1) : 1);
    return 0;
  },
  draw() {
    const t = this.t, env = this.envNow();
    const lx = 80 + introS(Math.min(t, 12.4)) - introS(12.4);
    let cam = t < 12.4 ? lx - 200 : lerp(-120, 0, smooth((t - 14.5) / 4));
    cam = Math.round(cam);
    drawBackdrop(g, cam, env, t);
    drawTrees(g, cam); drawTerrain(g, cam); drawScenery(g, cam, t, this.state);
    // family
    const fam = (img, x, who) => blit(g, img, x - cam, groundAt(x) + 1);
    const run = t > 11 ? 14 : 8;
    const wf = off => ['w0', 'w1', 'w2', 'w3'][((t * run + off) | 0) % 4];
    const littleStopped = t >= 12.4;
    if (!littleStopped) {
      // dad, mom, little walking together
      const dadX = lx + 118, momX = lx + 58;
      fam(SPR.dad[wf(0)][2], dadX); fam(SPR.mom[wf(2)][2], momX);
      fam(SPR.sasq[wf(1)][2], lx + 7);
    } else {
      const dt2 = t - 12.4, spd = 95;
      const a = clamp(1 - (dt2 - 0.3) / 1.4, 0, 1);
      if (a > 0) {
        g.globalAlpha = a;
        fam(SPR.dad[wf(0)][2], lx + 118 + dt2 * spd); fam(SPR.mom[wf(2)][2], lx + 58 + dt2 * spd * 0.95);
        g.globalAlpha = 1;
      }
      let pose = 'hurt', look = 1;
      if (t > 15) { pose = 'idle'; look = (((t - 15) / 1.1) | 0) % 2 ? 0 : -1; if (t > 17.6) look = 1; if (t > 16 && t < 16.2) pose = 'blink'; }
      fam(SPR.sasq[pose][look + 1], lx + 7);
      if (t > 13.9 && t < 16) { /* hidden by rain & flash */ }
    }
    // speech after the storm
    if (t > 17.4 && t < 20.2) {
      const full = 'MOM? DAD?';
      drawBubble(g, full, lx + 7 - cam, groundAt(lx) - 34, { typed: Math.floor((t - 17.4) * 12), maxChars: 12 });
    } else if (t >= 20.2 && t < 22.6) {
      drawBubble(g, '...?', lx + 7 - cam, groundAt(lx) - 34, { maxChars: 12 });
    }
    // rain + tint
    drawRain(g, this.rainNow(), 1 / 60, -36);
    applyTint(g, env);
    // lightning
    let fl = 0;
    for (const f of INTRO.flashes) if (t >= f && t < f + 0.5) fl = Math.max(fl, (1 - (t - f) / 0.5) * (((t - f) * 30 | 0) % 5 === 3 ? 0.4 : 0.9));
    if (t >= 13.7 && t < 15.4) fl = Math.max(fl, t < 14.3 ? smooth((t - 13.7) / 0.6) : 1 - smooth((t - 14.3) / 1.1));
    if (fl > 0) { g.fillStyle = '#fff'; g.globalAlpha = clamp(fl, 0, 1); g.fillRect(0, 0, VW, VH); g.globalAlpha = 1; }
    // captions
    for (const [a, txt, b] of INTRO.captions) if (t >= a && t < b) {
      const n = Math.floor((t - a) * 34), alpha = clamp((b - t) * 3, 0, 1);
      const lines = wrapText(txt, 52), h = lines.length * 11 + 10;
      g.globalAlpha = alpha; drawPanel(g, 40, 22, 400, h);
      let left = n; lines.forEach((l, i) => { drawText(g, l.slice(0, Math.max(0, left)), 52, 22 + 6 + i * 11, { color: '#fff6dc' }); left -= l.length + 1; });
      g.globalAlpha = 1;
    }
    // letterbox + level card
    const bar = Math.round(14 * (1 - smooth((t - (INTRO.END - 0.9)) / 0.8)));
    g.fillStyle = '#000'; g.fillRect(0, 0, VW, bar); g.fillRect(0, VH - bar, VW, bar);
    if (t > 20.4) {
      const a = smooth((t - 20.4) / 0.8) * (1 - smooth((t - (INTRO.END - 0.9)) / 0.8));
      g.fillStyle = '#000'; g.globalAlpha = a * 0.55; g.fillRect(0, 0, VW, VH); g.globalAlpha = a;
      drawText(g, 'LEVEL 1', 240, 96, { scale: 3, color: '#ffd37a', shadow: INK, align: 'center' });
      drawText(g, 'AFTER THE STORM', 240, 128, { scale: 2, color: '#fff3c9', shadow: INK, align: 'center' });
      g.globalAlpha = 1;
    }
    if (t < 20) drawText(g, 'ENTER: SKIP', 472, 258, { color: '#8a84a0', align: 'right' });
    if (t < 1) { g.fillStyle = '#000'; g.globalAlpha = 1 - t; g.fillRect(0, 0, VW, VH); g.globalAlpha = 1; }
  },
};

/* ----------------------------- Play ---------------------------- */
const TOAST_TIME = 3.2;
Scenes.play = {
  enter(opts = {}) {
    buildWorld();
    Parts.length = 0;
    this.p = newPlayer();
    this.rangers = L1.rangers.map(d => new Ranger(d));
    this.coolers = L1.coolers.map(c => ({ x: c.x, y: c.y !== undefined ? c.y : groundAt(c.x), food: c.food, empty: false, glow: Math.random() * 6 }));
    this.state = { fireLit: false, cpActive: L1.checkpoints.map(() => false), berries: L1.berries.map(b => ({ x: b.x, has: true, t: 0 })) };
    this.cp = { x: L1.startX };
    this.progress = 0; this.cam = 0; this.t0 = opts.fromIntro ? INTRO.END : 0; this.t = this.t0; this.shake = 0; this.toasts = []; this.timers = [];
    this.mode = 'play'; this.fadeOut = 0; this.hungryBubble = 0; this.hungryCool = 0; this.paused = false; this.eaten = 0; this.fullShown = false;
    this.night = 0; this.endT = 0; this.endStage = 0; this.stageT = 0; this.sit = false; this.dialogIdx = 0; this.dialogT = 0; this.doneT = 0; this.flash = 0;
    this.DIALOG.forEach(d => { d.played = false; });
    // debug / testing shortcuts: ?x=2500&hp=10&scene=ending
    const dx = parseFloat(params.get('x')); if (!isNaN(dx) && !opts.noDebug) { this.p.x = dx; this.p.y = groundAt(dx) - 24; this.progress = clamp(dx / L1.progressEnd, 0, 1); this.cp.x = dx; }
    const dh = parseFloat(params.get('hp')); if (!isNaN(dh) && !opts.noDebug) this.p.hp = dh;
    if (params.get('ending') && !opts.noDebug) { this.p.hp = L1.maxHp; this.p.x = L1.shelterX - 150; this.progress = 1; }
    this.cam = clamp(this.p.x + 7 - VW / 2, 0, L1.width - VW);
    Snd.music('sad');
    this.toast('LITTLE SASQUATCH IS HUNGRY! FIND FOOD!');
  },
  toast(text) { if (this.toasts.some(x => x.text === text)) return; this.toasts.push({ text, t: TOAST_TIME }); if (this.toasts.length > 3) this.toasts.shift(); },

  /* ---- gameplay ---- */
  update(dt) {
    if (pressed('pause') && this.mode === 'play') this.paused = !this.paused;
    if (pressed('mute')) Snd.toggleMute();
    if (this.paused) return;
    this.t += dt;
    const p = this.p;
    for (const tm of this.toasts) tm.t -= dt;
    this.toasts = this.toasts.filter(tm => tm.t > 0);
    for (let i = this.timers.length - 1; i >= 0; i--) { this.timers[i].t -= dt; if (this.timers[i].t <= 0) { const f = this.timers.splice(i, 1)[0].fn; f(); } }
    this.shake = Math.max(0, this.shake - dt * 2);
    this.flash = Math.max(0, this.flash - dt * 2);
    this.hungryBubble = Math.max(0, this.hungryBubble - dt); this.hungryCool = Math.max(0, this.hungryCool - dt);

    if (this.mode === 'ending') this.updateEnding(dt);
    else this.updatePlayer(dt);

    if (this.mode === 'play') {
      for (const r of this.rangers) r.update(dt, p);
      this.rangerContacts();
      this.updateWorldBits(dt);
    }
    updateParts(dt);
    if (p.state === 'faint') this.updateFaint(dt);

    // progress -> sky
    this.progress = Math.max(this.progress, clamp((p.x + p.w / 2) / L1.progressEnd, 0, 1));
    // camera
    const target = this.mode === 'ending' ? L1.shelterX - VW / 2 + 40 : p.x + p.w / 2 - VW / 2 + p.face * 34;
    this.cam += (clamp(target, 0, L1.width - VW) - this.cam) * Math.min(1, dt * (this.mode === 'ending' ? 1.6 : 5));
    // ambient leaves
    if (this.mode === 'play' && Math.random() < dt * 0.8) spawn({ x: this.cam + VW + 10, y: Math.random() * 120, vx: -(25 + Math.random() * 30), vy: 14 + Math.random() * 10, life: 14, col: Math.random() < .5 ? '#7cc35a' : '#d9a441', size: 2, fade: false });
  },

  updatePlayer(dt) {
    const p = this.p;
    if (p.state === 'faint') { p.vx = 0; p.vy = Math.min(p.vy + GRAV * dt, MAXFALL); moveBody(p, dt); return; }
    p.inv = Math.max(0, p.inv - dt); p.lock = Math.max(0, p.lock - dt); p.eat = Math.max(0, p.eat - dt);
    const inBush = L1.hideBushes.some(b => Math.abs(p.x + p.w / 2 - b) < 14);
    p.ducking = held('down') && p.onGround && p.lock <= 0 && p.eat <= 0;
    p.hidden = p.ducking && inBush;
    let dir = 0;
    if (p.lock <= 0 && p.eat <= 0 && !p.hidden) { if (held('left')) dir--; if (held('right')) dir++; }
    if (dir) p.face = dir;
    const target = dir * MAXV * (p.ducking ? 0.5 : 1), a = p.onGround ? (dir ? ACC : FRIC) : (dir ? AIRACC : 220);
    if (p.lock > 0 && p.inv > 0) { /* knocked back: keep velocity */ }
    else if (p.vx < target) p.vx = Math.min(target, p.vx + a * dt); else p.vx = Math.max(target, p.vx - a * dt);
    // jump
    if (pressed('jump')) p.jumpBuf = 0.13; else p.jumpBuf = Math.max(0, p.jumpBuf - dt);
    p.coyote = p.onGround ? 0.1 : Math.max(0, p.coyote - dt);
    if (p.jumpBuf > 0 && p.coyote > 0 && !p.hidden && p.lock <= 0 && p.eat <= 0) {
      p.vy = JUMPV; p.jumpBuf = 0; p.coyote = 0; Snd.jump(); dust(p.x + 7, p.y + p.h, 4);
    }
    if (!held('jump') && p.vy < -140 && p.lock <= 0) p.vy = -140;
    p.vy = Math.min(p.vy + GRAV * dt, MAXFALL);
    const wasGround = p.onGround, pvy = p.vy;
    moveBody(p, dt);
    p.x = clamp(p.x, 2, L1.width - p.w - 2);
    // shelter gate
    if (p.state === 'normal') this.shelterLogic();
    if (!wasGround && p.onGround && pvy > 120) { Snd.land(); dust(p.x + 7, p.y + p.h, 5); }
    // anim
    p.anim += dt * (Math.abs(p.vx) / 60); p.blinkT -= dt; if (p.blinkT < -0.13) p.blinkT = 2 + Math.random() * 2.5;
    if (p.onGround && Math.abs(p.vx) > 50) { p.stepT -= dt; if (p.stepT <= 0) { p.stepT = 0.26; Snd.step(); } }
    // interact
    if (pressed('act') && p.lock <= 0 && p.eat <= 0) this.interact();
    // checkpoints
    L1.checkpoints.forEach((x, i) => {
      if (!this.state.cpActive[i] && p.x + 7 > x - 6) {
        this.state.cpActive[i] = true; this.cp = { x }; Snd.check(); this.toast('TRAIL MARKER! YOU RESTART HERE IF YOU FAINT.');
        for (let k = 0; k < 14; k++) spawn({ type: 'glow', x: x + 8, y: groundAt(x) - 20, vx: (Math.random() - .5) * 70, vy: -Math.random() * 70, g: 90, life: 0.9, col: '#8dffb0' });
      }
    });
  },

  shelterLogic() {
    const p = this.p, cx = p.x + p.w / 2;
    if (p.hp < L1.maxHp && p.x + p.w > L1.barrierX) {
      p.x = L1.barrierX - p.w; p.vx = 0;
      if (this.hungryCool <= 0) { this.hungryBubble = 2.8; this.hungryCool = 5; Snd.growl(); }
    }
    if (p.hp >= L1.maxHp && cx > L1.shelterX - 150) this.startEnding();
  },

  interact() {
    const p = this.p, cx = p.x + p.w / 2, bottom = p.y + p.h;
    for (const c of this.coolers) {
      if (!c.empty && Math.abs(cx - c.x) < 22 && Math.abs(bottom - c.y) < 8) { this.raid(c); return; }
    }
    for (const b of this.state.berries) {
      if (b.has && Math.abs(cx - b.x) < 24 && Math.abs(bottom - groundAt(b.x)) < 8) {
        b.has = false; b.t = 12; p.eat = 0.5; p.vx = 0; p.face = b.x < cx ? -1 : 1; Snd.open();
        this.timers.push({ t: 0.3, fn: () => { Snd.munch(); this.heal(1, 'berry', b.x, groundAt(b.x) - 20, 'YUMMY BERRIES!'); } });
        return;
      }
    }
  },
  raid(c) {
    const p = this.p; c.empty = true; p.eat = 0.8; p.vx = 0; p.face = c.x < p.x + 7 ? -1 : 1; Snd.open();
    dust(c.x, c.y, 5, '#ffffff');
    for (const r of this.rangers) if (Math.abs(r.x - c.x) < 190 && Math.abs(r.top + r.h - c.y) < 60 && (r.state === 'patrol' || r.state === 'lost') && r.stun <= 0) { r.spot(c.x - r.x); }
    const f = FOOD[c.food];
    this.timers.push({ t: 0.32, fn: () => { Snd.munch(); this.heal(f.heal, c.food, c.x, c.y - 24, f.text); } });
    this.eaten++;
  },
  heal(n, kind, x, y, text) {
    const p = this.p, before = p.hp; p.hp = Math.min(L1.maxHp, p.hp + n);
    spawn({ type: 'icon', img: SPR.food[kind], x, y, vy: -34, life: 1.1 });
    spawn({ type: 'text', text: '+' + (p.hp - before) + (p.hp - before === 1 ? ' HALF HEART' : ' HEARTS'), x: x, y: y - 14, vy: -22, life: 1.3, col: '#ff8a9a', scale: 1 });
    for (let i = 0; i < 8; i++) spawn({ x: p.x + 7, y: p.y + 6, vx: (Math.random() - .5) * 60, vy: -30 - Math.random() * 40, g: 120, life: 0.5, col: '#e8b86a', size: 2 });
    Snd.yum(); this.toast(text);
    if (p.hp >= L1.maxHp && before < L1.maxHp) {
      this.fullShown = true; Snd.full();
      this.timers.push({ t: 0.5, fn: () => this.toast('TUMMY FULL! NOW FIND SHELTER BEFORE DARK!') });
      for (let i = 0; i < 18; i++) { const a = i / 18 * 6.28; spawn({ type: 'glow', x: p.x + 7, y: p.y + 10, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60 - 20, life: 0.9, col: '#ffe27a' }); }
    }
  },

  rangerContacts() {
    const p = this.p; if (p.state !== 'normal' || p.hidden) return;
    for (const r of this.rangers) {
      if (r.stun > 0) continue;
      if (overlap(p.x, p.y, p.w, p.h, r.x - 6, r.top, 12, r.h)) {
        if (p.vy > 40 && p.y + p.h - r.top < 17) this.stomp(r);
        else if (p.inv <= 0) this.hurt(r);
      }
    }
  },
  stomp(r) {
    const p = this.p; r.stun = 4.5; r.state = 'patrol'; p.vy = -270; p.onGround = false; Snd.bonk();
    spawn({ type: 'text', text: 'BONK!', x: r.x, y: r.top - 14, vy: -26, life: 0.9, col: '#ffe14a', scale: 1 });
    for (let i = 0; i < 8; i++) spawn({ type: 'glow', x: r.x, y: r.top, vx: (Math.random() - .5) * 90, vy: -Math.random() * 60, g: 120, life: 0.6, col: '#ffe14a' });
    this.shake = 0.25;
  },
  hurt(r) {
    const p = this.p; p.hp = Math.max(0, p.hp - 2); p.inv = 1.7; p.lock = 0.32;
    p.vx = (p.x + 7 < r.x ? -1 : 1) * 160; p.vy = -190; p.onGround = false; Snd.hit(); this.shake = 0.35;
    spawn({ type: 'text', text: 'OUCH!', x: p.x + 7, y: p.y - 6, vy: -26, life: 0.9, col: '#ff6a6a', scale: 1 });
    if (p.hp <= 0) this.faint();
  },
  faint() {
    const p = this.p; p.state = 'faint'; p.faintT = 0; p.vx = 0; Snd.faint();
    this.toast('LITTLE SASQUATCH FELL ASLEEP FROM HUNGER...');
  },
  updateFaint(dt) {
    const p = this.p; p.faintT += dt;
    this.fadeOut = clamp((p.faintT - 1.2) / 0.7, 0, 1);
    if (p.faintT > 2.1) {
      p.state = 'normal'; p.hp = Math.max(p.hp, L1.startHp); p.x = this.cp.x; p.y = groundAt(this.cp.x) - 24; p.vx = p.vy = 0;
      p.inv = 1.5; p.lock = 0; this.fadeOut = 0; p.hidden = false;
      this.rangers.forEach(r => r.reset()); this.cam = clamp(p.x - VW / 2, 0, L1.width - VW);
      this.toast('A LITTLE NAP HELPED. KEEP GOING!');
    }
  },
  updateWorldBits(dt) {
    for (const b of this.state.berries) if (!b.has) { b.t -= dt; if (b.t <= 0) { b.has = true; } }
  },

  /* ---- ending: night falls, campfire ---- */
  startEnding() {
    if (this.mode === 'ending') return;
    this.mode = 'ending'; this.endT = 0; this.endStage = 0; this.p.hidden = false; this.p.lock = 99;
    this.toasts = []; Snd.music('none');
    this.rangers.forEach(r => { r.state = 'patrol'; });
  },
  updateEnding(dt) {
    const p = this.p; this.endT += dt; const T = this.endT;
    this.night = smooth(T / 7);
    if (this.night > 0.3) Snd.music('night');
    // stage 0: walk to the fire
    const stopX = L1.shelterX - 26;
    if (this.endStage === 0) {
      p.face = 1; const dist = stopX - p.x;
      if (dist > 1) { p.vx = Math.min(70, dist * 4 + 20); p.vy = Math.min(p.vy + GRAV * dt, MAXFALL); moveBody(p, dt); p.anim += dt * (Math.abs(p.vx) / 60); }
      else { p.vx = 0; this.endStage = 1; this.stageT = 0; }
    } else {
      this.stageT += dt; const s = this.stageT;
      if (this.endStage === 1 && s > 0.9) { this.endStage = 2; for (let i = 0; i < 10; i++) spawn({ type: 'glow', x: L1.shelterX + 14, y: L1.baseY - 6, vx: (Math.random() - .5) * 50, vy: -Math.random() * 40, g: 60, life: 0.6, col: '#ffe27a' }); Snd.spark(); this.timers.push({ t: 0.25, fn: () => Snd.spark() }); }
      if (this.endStage === 2 && s > 1.7) { this.endStage = 3; this.state.fireLit = true; Snd.ignite(); this.flash = 0.35; }
      if (this.endStage === 3 && s > 3.0) { this.endStage = 4; this.sit = true; this.dialogT = 0; this.dialogIdx = 0; Snd.blip(); }
      if (this.endStage >= 4) this.updateDialog(dt);
    }
    if (this.state.fireLit && Math.random() < dt * 14) spawn({ type: 'glow', x: L1.shelterX + 14 + (Math.random() - .5) * 8, y: L1.baseY - 12, vx: (Math.random() - .5) * 14, vy: -26 - Math.random() * 26, g: -5, life: 0.9 + Math.random() * .6, col: Math.random() < .5 ? '#ffb84a' : '#ff7a2e' });
    if (this.night > 0.5 && Math.random() < dt * 3) spawn({ type: 'glow', x: this.cam + Math.random() * VW, y: 150 + Math.random() * 80, vx: (Math.random() - .5) * 12, vy: (Math.random() - .5) * 10, life: 2.5 + Math.random() * 2, col: '#d8ff7a', fade: true });
  },
  DIALOG: [
    { text: 'LITTLE SASQUATCH IS FULL, SAFE, AND WARM.', time: 3.6 },
    { text: 'BUT THE FIRE IS TOO QUIET WITHOUT HIS FAMILY.', time: 3.8 },
    { text: 'WAIT... WHAT WAS THAT SOUND?', time: 2.4, howl: true },
    { text: 'IT SOUNDED LIKE A FAMILIAR HOWL, FAR AWAY...', time: 4.2, look: true },
    { text: 'TOMORROW, HE WILL KEEP LOOKING.', time: 3.8 },
  ],
  updateDialog(dt) {
    this.dialogT += dt;
    const d = this.DIALOG[this.dialogIdx];
    if (!d) { this.done = true; if (pressed('confirm')) go('title'); return; }
    if (d.howl && !d.played && this.dialogT > 0.9) { d.played = true; Snd.howl(); }
    if (d.look) this.p.face = this.dialogT > 1.2 ? -1 : this.p.face;
    if (this.dialogT > d.time) { this.dialogIdx++; this.dialogT = 0; if (this.DIALOG[this.dialogIdx - 1] && this.dialogIdx === this.DIALOG.length) { this.doneT = 0; } }
    if (pressed('confirm') && this.dialogT > 0.5) { this.dialogT = d.time; }
  },

  /* ---- drawing ---- */
  envNow() {
    let env = envAt(this.progress);
    const pr = this.progress;
    env.rainbow = smooth(pr / 0.1) * (1 - smooth((pr - 0.2) / 0.14)) * 0.9;
    // rain only while the camera is near the start
    env.rain = clamp(1 - this.cam / 700, 0, 1) * 0.5 * smooth((this.t - this.t0) / 2.5);
    if (this.mode === 'ending') {
      env = lerpEnv(env, ENV_NIGHT, this.night);
      env.rain = 0;
    }
    return env;
  },
  draw() {
    const env = this.envNow(), p = this.p, t = this.t;
    const sh = this.shake > 0 ? Math.round((Math.random() - .5) * 6 * this.shake) : 0;
    const cam = Math.round(this.cam) + sh;
    drawBackdrop(g, cam, env, t);
    drawTrees(g, cam); drawCave(g, cam); drawTerrain(g, cam); drawScenery(g, cam, t, this.state);
    g.save(); g.translate(-cam, 0);
    // coolers
    for (const c of this.coolers) {
      if (c.x + 20 < cam || c.x - 20 > cam + VW) continue;
      blit(g, c.empty ? SPR.coolerOpen : SPR.cooler, c.x, c.y + 1);
      if (!c.empty && Math.abs(c.x - p.x) < 260 && this.mode === 'play') {
        const k = Math.sin(t * 3 + c.glow);
        if (k > 0.55) { g.fillStyle = '#fff6a8'; const sx = Math.round(c.x + 9), sy = Math.round(c.y - 20 - k * 2); g.fillRect(sx, sy - 1, 1, 3); g.fillRect(sx - 1, sy, 3, 1); }
      }
    }
    g.restore();
    g.save(); g.translate(-cam, 0);
    for (const r of this.rangers) if (r.x > cam - 40 && r.x < cam + VW + 40) r.draw(g, t);
    this.drawPlayer();
    g.restore();
    drawFrontScenery(g, cam, t, this.state);
    drawParts(g, cam);
    this.drawPlayerOverlays(cam);
    drawRain(g, env.rain, 1 / 60, -30);
    applyTint(g, env);
    // night extras
    if (this.mode === 'ending') {
      drawStars(g, this.night, t); drawMoon(g, this.night, cam);
      const fx = L1.shelterX + 14 - cam;
      if (this.state.fireLit) fireGlow(g, fx, L1.baseY - 12, clamp((this.stageT - 1.7) * 1.5, 0, 1), t);
      g.fillStyle = '#0a0f2c'; g.globalAlpha = 0.18 * this.night; g.fillRect(0, 0, VW, VH); g.globalAlpha = 1;
      if (this.state.fireLit) { // redraw the sitting sasquatch & fire above the darkness so they glow
        g.save(); g.translate(-cam, 0);
        blit(g, SPR.fire[((t * 9) | 0) % 4], L1.shelterX + 14, L1.baseY + 3);
        this.drawPlayer(); g.restore();
        fireGlow(g, fx, L1.baseY - 14, 0.5, t);
      }
    }
    if (this.flash > 0) { g.fillStyle = '#ffd9a0'; g.globalAlpha = this.flash * 0.7; g.fillRect(0, 0, VW, VH); g.globalAlpha = 1; }
    this.drawHUD();
    if (this.fadeOut > 0) { g.fillStyle = '#000'; g.globalAlpha = this.fadeOut; g.fillRect(0, 0, VW, VH); g.globalAlpha = 1; }
    if (this.paused) {
      g.fillStyle = 'rgba(8,6,16,0.7)'; g.fillRect(0, 0, VW, VH);
      drawText(g, 'PAUSED', 240, 112, { scale: 3, color: '#fff3c9', shadow: INK, align: 'center' });
      drawText(g, 'PRESS P TO KEEP GOING', 240, 146, { color: '#b8aed0', align: 'center' });
    }
  },

  drawPlayer() {
    const p = this.p;
    if (p.inv > 0 && p.state === 'normal' && ((p.inv * 14) | 0) % 2 === 0) return;
    let pose = 'idle';
    if (p.state === 'faint') pose = (p.faintT * 3 | 0) % 2 ? 'hurt' : 'blink';
    else if (this.mode === 'ending' && this.sit) pose = (this.stageT || 0) % 5 > 4.85 ? 'sitblink' : 'sit';
    else if (p.ducking) pose = p.blinkT < 0 && p.blinkT > -0.12 ? 'duckblink' : 'duck';
    else if (p.eat > 0) pose = ((p.eat * 7) | 0) % 2 ? 'eat1' : 'eat2';
    else if (p.lock > 0 && p.inv > 0) pose = 'hurt';
    else if (!p.onGround) pose = p.vy < 0 ? 'jump' : 'fall';
    else if (Math.abs(p.vx) > 12) pose = ['w0', 'w1', 'w2', 'w3'][((p.anim * 1.7) | 0) % 4];
    else if (p.blinkT < 0 && p.blinkT > -0.12) pose = 'blink';
    const look = (this.mode === 'ending' && this.sit && !this.DIALOG[this.dialogIdx]?.look) ? 1 : p.face;
    const img = SPR.sasq[pose][look + 1];
    if (p.hidden) g.globalAlpha = 0.92;
    const cx = Math.round(p.x + p.w / 2), bottom = p.y + p.h + 1 + (pose === 'sit' || pose === 'sitblink' ? 1 : 0);
    if (p.state === 'faint') { // lie down: draw rotated
      g.save(); g.translate(cx, Math.round(p.y + p.h)); g.rotate(Math.PI / 2 * (p.face)); g.drawImage(img, -img.width / 2, -img.height + 4); g.restore();
    } else blit(g, img, cx, bottom);
    g.globalAlpha = 1;
  },
  drawPlayerOverlays(cam) {
    const p = this.p, cx = Math.round(p.x + p.w / 2) - cam;
    if (this.mode === 'play' && p.state === 'normal' && p.eat <= 0) {
      const tgt = this.interactTarget();
      if (tgt) this.drawKeyPrompt(tgt.x - cam, tgt.y - 34 + Math.round(Math.sin(this.t * 6) * 1.5), 'E');
    }
    if (p.hidden) drawText(g, 'HIDING...', cx, Math.round(p.y - 4), { color: '#bff0c0', shadow: INK, align: 'center' });
    if (this.hungryBubble > 0 && this.mode === 'play') drawBubble(g, 'TUMMY STILL GROWLY... NEED MORE FOOD!', cx, p.y - 8, { maxChars: 18, typed: Math.floor((2.8 - this.hungryBubble) * 40) });
  },
  interactTarget() {
    const p = this.p, cx = p.x + p.w / 2, bottom = p.y + p.h;
    for (const c of this.coolers) if (!c.empty && Math.abs(cx - c.x) < 22 && Math.abs(bottom - c.y) < 8) return { x: c.x, y: c.y };
    for (const b of this.state.berries) if (b.has && Math.abs(cx - b.x) < 24 && Math.abs(bottom - groundAt(b.x)) < 8) return { x: b.x, y: groundAt(b.x) };
    return null;
  },
  drawKeyPrompt(x, y, key) {
    x = Math.round(x) - 6; y = Math.round(y);
    g.fillStyle = INK; g.fillRect(x - 1, y - 1, 15, 15);
    g.fillStyle = '#f4ecd2'; g.fillRect(x, y, 13, 12); g.fillStyle = '#c9bd98'; g.fillRect(x, y + 10, 13, 2);
    drawText(g, key, x + 4, y + 2, { color: '#2a1a14' });
  },

  drawHUD() {
    const p = this.p;
    // hearts
    drawPanel(g, 4, 4, 112, 30);
    g.drawImage(SPR.sasq.idle[1], 0, 0, 26, 19, 8, 8, 26, 19);
    const hearts = L1.maxHp / 2, flashLow = p.hp <= 2 && ((this.t * 3) | 0) % 2;
    for (let i = 0; i < hearts; i++) {
      const v = p.hp - i * 2, st = v >= 2 ? 'full' : v >= 1 ? 'half' : 'empty';
      g.drawImage(SPR.heart[st], 40 + i * 14, 8 + (flashLow ? -1 : 0));
    }
    drawText(g, 'TUMMY', 40, 23, { color: '#d9cfae' });
    // objective
    const obj = p.hp >= L1.maxHp ? 'TUMMY FULL! FIND SHELTER BEFORE DARK!' : 'FIND FOOD IN THE COOLERS!';
    if (this.mode === 'play') {
      const w = obj.length * 6 + 14;
      drawPanel(g, Math.round(240 - w / 2) + 4, 4, w, 16);
      drawText(g, obj, 244, 9, { color: p.hp >= L1.maxHp ? '#ffe27a' : '#fff6dc', align: 'center' });
      // cooler counter
      drawPanel(g, 392, 4, 84, 16);
      g.drawImage(SPR.cooler, 0, 0, 24, 16, 396, 4, 15, 10);
      drawText(g, this.eaten + '/' + this.coolers.length, 414, 9, { color: '#fff6dc' });
    }
    // toasts
    if (this.mode === 'play') this.toasts.forEach((tm, i) => {
      const lines = wrapText(tm.text, 56), w = Math.max(...lines.map(l => l.length)) * 6 + 14, a = clamp(tm.t * 3, 0, 1) * clamp((TOAST_TIME - tm.t) * 6, 0, 1);
      g.globalAlpha = a; drawPanel(g, Math.round(240 - w / 2), 26 + i * 20, w, lines.length * 10 + 8, { fill: 'rgba(40,28,20,0.85)', border: '#ffd37a' });
      lines.forEach((l, k) => drawText(g, l, 240, 30 + i * 20 + k * 10, { color: '#fff6dc', align: 'center' }));
      g.globalAlpha = 1;
    });
    // sign
    if (this.mode === 'play' && p.state === 'normal') {
      const s = L1.signs.find(s => Math.abs(p.x + 7 - s.x) < 34);
      if (s) {
        const lines = wrapText(s.text, 46), w = 46 * 6 + 20, h = lines.length * 11 + 12;
        drawPanel(g, 240 - w / 2, 262 - h - 4, w, h, { fill: 'rgba(54,36,22,0.93)', border: '#e0b070' });
        lines.forEach((l, i) => drawText(g, l, 240 - w / 2 + 10, 262 - h - 4 + 7 + i * 11, { color: '#fff3d0' }));
      }
    }
    // arrow to shelter
    if (this.mode === 'play' && p.hp >= L1.maxHp && p.x < L1.shelterX - 300) {
      const bounce = Math.round(Math.sin(this.t * 5) * 3);
      for (let i = 0; i < 3; i++) {
        const ax = 424 + i * 14 + bounce;
        for (let k = 0; k < 9; k++) {
          const w = 5 - Math.abs(k - 4) ;
          g.fillStyle = INK; g.fillRect(ax + Math.abs(k - 4) * 0 - 1, 120 + k * 2 - 1, 4 + (4 - Math.abs(k - 4)) * 2 + 2 - 4, 4);
        }
        for (let k = 0; k < 9; k++) {
          g.fillStyle = i === 0 ? '#ffe27a' : i === 1 ? '#ffd04a' : '#ffbf2e';
          g.fillRect(ax + Math.abs(k - 4) * 0, 120 + k * 2, 2 + (4 - Math.abs(k - 4)) * 2 - 2, 2);
        }
      }
      drawText(g, 'SHELTER', 468, 144, { color: '#ffe27a', shadow: INK, align: 'right' });
    }
    // ending text
    if (this.mode === 'ending' && this.endStage >= 4) {
      const d = this.DIALOG[this.dialogIdx];
      if (d) {
        const n = Math.floor(this.dialogT * 32), lines = wrapText(d.text, 58), h = lines.length * 11 + 10;
        drawPanel(g, 40, 42, 372, h, { fill: 'rgba(10,8,26,0.85)', border: '#ffd37a' });
        let left = n; lines.forEach((l, i) => { drawText(g, l.slice(0, Math.max(0, left)), 52, 47 + i * 11, { color: '#fff6dc' }); left -= l.length + 1; });
      } else {
        const a = clamp(this.doneT = (this.doneT || 0) + 1 / 60, 0, 1);
        g.fillStyle = '#000'; g.globalAlpha = 0.45 * a; g.fillRect(0, 0, VW, VH); g.globalAlpha = a;
        drawText(g, 'LEVEL 1 COMPLETE!', 240, 70, { scale: 3, color: '#ffd37a', shadow: INK, align: 'center' });
        drawText(g, 'LITTLE SASQUATCH IS SAFE FOR THE NIGHT.', 240, 108, { color: '#fff6dc', align: 'center', shadow: INK });
        drawText(g, 'TO BE CONTINUED...', 240, 132, { scale: 2, color: '#fff3c9', shadow: INK, align: 'center' });
        if (((this.t * 1.6) | 0) % 2 === 0) drawText(g, 'PRESS ENTER TO PLAY AGAIN', 240, 168, { color: '#b8aed0', align: 'center' });
        g.globalAlpha = 1;
      }
    }
  },
};

/* ================================================================== */
/* Main loop                                                            */
/* ================================================================== */
function setScene(name, opts) { scene = Scenes[name]; scene.enter(opts); }
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; gameT += dt;
  if (fade.dir !== 0) {
    fade.a = clamp(fade.a + fade.dir * dt * 2.6, 0, 1);
    if (fade.dir > 0 && fade.a >= 1) { setScene(fade.next.name, fade.next.opts); fade.next = null; fade.dir = -1; }
    else if (fade.dir < 0 && fade.a <= 0) fade.dir = 0;
  }
  if (scene) { scene.update(dt); scene.draw(); }
  if (fade.a > 0) { g.fillStyle = '#000'; g.globalAlpha = fade.a; g.fillRect(0, 0, VW, VH); g.globalAlpha = 1; }
  endFrameInput();
  requestAnimationFrame(frame);
}

function boot() {
  buildSprites(); buildWorld(); initRender(g); fitCanvas();
  const start = params.get('scene') || 'title';
  setScene(Scenes[start] ? start : 'title', { debug: true });
  if (start === 'play' && params.get('ending')) Scenes.play.startEnding();
  requestAnimationFrame(frame);
}
boot();
window.__LS = { Scenes, get scene() { return scene; }, player: () => Scenes.play.p, go };
