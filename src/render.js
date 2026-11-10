'use strict';
/* Backdrop, terrain and scenery drawing. */
const VW = 480, VH = 270;

const BG = { clouds: [], rain: [], stars: [], decor: null, patDirt: null, patRock: null, ready: false };

function initRender(g) {
  const r = rng(99);
  for (let i = 0; i < 11; i++) BG.clouds.push({ x: i * 150 + r() * 80, y: 12 + r() * 70, i: i % 4, s: 3 + r() * 5 });
  for (let i = 0; i < 70; i++) BG.stars.push({ x: r() * VW, y: r() * 150, p: r() * 6.28, b: r() });
  for (let i = 0; i < 160; i++) BG.rain.push({ x: r() * (VW + 60), y: r() * VH, v: 0.8 + r() * 0.5 });
  BG.patDirt = g.createPattern(SPR.dirt, 'repeat');
  BG.patRock = g.createPattern(SPR.rockT, 'repeat');
  // trees placed across the whole level
  const tr = rng(2024); BG.decor = { trees: [], tufts: [], flowers: [], ferns: [] };
  for (let x = -1500; x < L1.width + 200; x += 26 + (tr() * 46 | 0)) {
    if (x > 5200 && x < 5460) continue;
    const forest = (x > 1500 && x < 2550) || (x > 3450 && x < 4350);
    if (!forest && tr() < 0.45) continue;
    const idx = (tr() * SPR.pines.length) | 0;
    BG.decor.trees.push({ x, idx, dy: (tr() * 3) | 0, shade: tr() < .35 });
  }
  for (let x = -1500; x < L1.width; x += 14 + (tr() * 20 | 0)) {
    if (tr() < .5) BG.decor.tufts.push({ x, i: (tr() * 3) | 0 }); else if (tr() < .4) BG.decor.flowers.push({ x, i: (tr() * 4) | 0 });
  }
  for (let x = -1500; x < L1.width; x += 90 + (tr() * 160 | 0)) BG.decor.ferns.push({ x });
  BG.ready = true;
}

function fillCircle(g, cx, cy, r) {
  cx = Math.round(cx); cy = Math.round(cy);
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y));
    g.fillRect(cx - w, cy + y, w * 2 + 1, 1);
  }
}
function ringArc(g, cx, cy, rOut, rIn) {
  for (let y = -rOut; y <= 0; y++) {
    const o = Math.floor(Math.sqrt(rOut * rOut - y * y)), inn = Math.abs(y) < rIn ? Math.floor(Math.sqrt(rIn * rIn - y * y)) : 0;
    g.fillRect(cx - o, cy + y, o - inn, 1); g.fillRect(cx + inn, cy + y, o - inn, 1);
  }
}

function drawBackdrop(g, cam, env, t) {
  // sky in chunky bands
  const bands = 18;
  for (let i = 0; i < bands; i++) {
    g.fillStyle = rgbStr(mixRGB(env.top, env.bot, i / (bands - 1)));
    g.fillRect(0, Math.floor(i * 232 / bands), VW, Math.ceil(232 / bands) + 1);
  }
  g.fillStyle = rgbStr(env.bot); g.fillRect(0, 230, VW, VH - 230);

  // sun
  if (env.sun > 0 && !(env.night > 0.4)) {
    const sy = 156 - env.sun * 118, sx = 370 - cam * 0.02;
    const warm = clamp(1 - env.sun * 1.3, 0, 1);
    const glow = mixRGB([255, 244, 190], [255, 160, 90], warm);
    g.fillStyle = rgbStr(glow);
    g.globalAlpha = 0.14; fillCircle(g, sx, sy, 38); fillCircle(g, sx, sy, 29);
    g.globalAlpha = 0.3; fillCircle(g, sx, sy, 21);
    g.globalAlpha = 1; fillCircle(g, sx, sy, 15);
    g.fillStyle = '#fffbe0'; fillCircle(g, sx - 1, sy - 1, 10);
  }
  // rainbow
  if (env.rainbow > 0.02) {
    const cx = Math.round(330 - cam * 0.1), cy = 226, cols = ['#ff5a5a', '#ffa14a', '#ffe14a', '#5ad06a', '#4aa8ff', '#8a6aff'];
    g.globalAlpha = env.rainbow * 0.6;
    cols.forEach((c, i) => { g.fillStyle = c; ringArc(g, cx, cy, 190 - i * 5, 185 - i * 5); });
    g.globalAlpha = 1;
  }
  // far mountains / hills / treeline (parallax)
  const tile = (img, f, y, off = 0) => {
    const w = img.width; let x0 = -(((cam * f + off) % w) + w) % w;
    for (let x = x0; x < VW; x += w) g.drawImage(img, Math.round(x), y);
  };
  tile(SPR.mtnFar, 0.05, 232 - 150 - 24);
  tile(SPR.mtnNear, 0.11, 232 - 130 - 8, 240);
  // overcast layer sits in front of the far mountains for a moody start
  drawClouds(g, cam, env, t);
  tile(SPR.hills, 0.22, 232 - 120 + 4);
  tile(SPR.treeline, 0.45, 232 - 110 + 6);
  // wet mist near the horizon at the start
  if (env.over > 0.2) {
    g.fillStyle = '#e6eef5'; g.globalAlpha = 0.16 * env.over;
    g.fillRect(0, 160, VW, 72); g.globalAlpha = 0.1 * env.over; g.fillRect(0, 130, VW, 30); g.globalAlpha = 1;
  }
}

function drawClouds(g, cam, env, t) {
  const dark = env.over;
  for (const c of BG.clouds) {
    let sx = ((c.x - cam * 0.13 + t * c.s) % 1700 + 1700) % 1700 - 220;
    const y = Math.round(c.y + 6 * Math.sin(t * 0.3 + c.x));
    if (sx > VW || sx < -200) continue;
    g.globalAlpha = clamp(0.95 - dark * 0.15, 0, 1) * (1 - dark * 0.7);
    g.drawImage(SPR.cloudW[c.i], Math.round(sx), y);
    g.globalAlpha = clamp(dark * 1.1, 0, 0.95);
    g.drawImage(SPR.cloudD[c.i], Math.round(sx), y + 4);
  }
  g.globalAlpha = 1;
  if (dark > 0.05) {
    // ragged storm ceiling
    const col = mixRGB([120, 128, 142], [78, 86, 102], clamp(dark, 0, 1));
    g.fillStyle = rgbStr(col);
    for (let x = 0; x < VW; x += 2) {
      const n = Math.sin((x + cam * 0.1) * 0.035) * 14 + Math.sin((x + cam * 0.1) * 0.011 + 1.3) * 18 + Math.sin((x + t * 6) * 0.09) * 4;
      const h = Math.max(0, dark * (66 + n) - (1 - dark) * 8);
      if (h > 0) { g.globalAlpha = 0.93; g.fillRect(x, 0, 2, Math.round(h)); g.globalAlpha = 0.45; g.fillRect(x, Math.round(h), 2, 5); }
    }
    g.globalAlpha = 1;
  }
  // sun shafts breaking through while the storm clears
  if (dark > 0.12 && dark < 0.95) {
    const a = Math.sin(Math.PI * clamp((dark - 0.12) / 0.8, 0, 1)) * 0.2;
    g.fillStyle = '#fff6c2'; g.globalAlpha = a;
    for (const [bx, bw] of [[250, 30], [330, 18], [410, 26]]) {
      const x0 = bx - cam * 0.03;
      for (let y = 20; y < 232; y += 2) g.fillRect(Math.round(x0 - y * 0.35), y, bw, 2);
    }
    g.globalAlpha = 1;
  }
}

function drawRain(g, intensity, dt, wind = -30) {
  const n = Math.floor(BG.rain.length * clamp(intensity, 0, 1));
  g.fillStyle = '#c8e0f8'; g.globalAlpha = 0.65;
  for (let i = 0; i < n; i++) {
    const d = BG.rain[i];
    d.y += (260 + 160 * d.v) * dt; d.x += wind * dt * d.v;
    if (d.y > VH) { d.y = -8; d.x = Math.random() * (VW + 80); }
    if (d.x < -10) d.x += VW + 60;
    g.fillRect(Math.round(d.x), Math.round(d.y), 1, 3 + (d.v * 2 | 0));
  }
  g.globalAlpha = 1;
}

function applyTint(g, env) {
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = rgbStr(env.tint); g.fillRect(0, 0, VW, VH);
  g.globalCompositeOperation = 'source-over';
}

function drawMoon(g, alpha, cam) {
  if (alpha <= 0.02) return;
  const mx = Math.round(442 - cam * 0.01), my = 62;
  g.globalAlpha = alpha * 0.18; g.fillStyle = '#cfd8ff'; fillCircle(g, mx, my, 27); fillCircle(g, mx, my, 21);
  g.globalAlpha = alpha; g.fillStyle = '#fff6d0'; fillCircle(g, mx, my, 15);
  g.fillStyle = '#e6dba8'; fillCircle(g, mx - 5, my + 4, 3); fillCircle(g, mx + 6, my - 5, 2); fillCircle(g, mx + 3, my + 7, 2);
  g.globalAlpha = 1;
}

function drawStars(g, alpha, t) {
  if (alpha <= 0.02) return;
  for (const s of BG.stars) {
    const tw = 0.55 + 0.45 * Math.sin(t * 2 + s.p);
    g.globalAlpha = alpha * tw * (0.5 + s.b * 0.5);
    g.fillStyle = s.b > .85 ? '#ffe9a8' : '#ffffff';
    g.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
    if (s.b > 0.93) { g.fillRect(Math.round(s.x) - 1, Math.round(s.y), 3, 1); g.fillRect(Math.round(s.x), Math.round(s.y) - 1, 1, 3); }
  }
  g.globalAlpha = 1;
}

/* Warm light from a fire, in chunky steps so it stays "pixely". */
function fireGlow(g, sx, sy, strength, t) {
  if (strength <= 0.01) return;
  const flick = 1 + 0.04 * Math.sin(t * 17) + 0.03 * Math.sin(t * 9.3);
  g.globalCompositeOperation = 'lighter';
  const steps = [[128, 0.012], [100, 0.016], [76, 0.02], [54, 0.026], [36, 0.034], [20, 0.045]];
  for (const [r, a] of steps) {
    g.fillStyle = '#ff9a3c'; g.globalAlpha = a * strength;
    fillCircle(g, sx, sy, Math.round(r * flick * (0.5 + 0.5 * strength)));
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
}

/* ------------------------------------------------------------------ */
/* World                                                                */
/* ------------------------------------------------------------------ */
function blit(g, img, cx, bottom, flip = false) {
  const x = Math.round(cx - img.width / 2), y = Math.round(bottom - img.height);
  if (!flip) g.drawImage(img, x, y);
  else { g.save(); g.translate(x + img.width, y); g.scale(-1, 1); g.drawImage(img, 0, 0); g.restore(); }
}

function drawTrees(g, cam) {
  for (const tr of BG.decor.trees) {
    if (tr.x < cam - 60 || tr.x > cam + VW + 60) continue;
    const img = SPR.pines[tr.idx];
    if (tr.shade) g.globalAlpha = .85;
    blit(g, img, tr.x - cam, groundAt(tr.x) + 6 + tr.dy);
    g.globalAlpha = 1;
  }
}

function drawCave(g, cam) {
  g.drawImage(SPR.cave, Math.round(L1.shelterX - 130 + 4 - cam), L1.baseY - SPR.cave.height);
}

function drawTerrain(g, cam) {
  g.save(); g.translate(-cam, 0);
  for (let i = 0; i < L1.ground.length; i++) {
    const s = L1.ground[i];
    if (s[1] < cam - 8 || s[0] > cam + VW + 8) continue;
    const kind = s[3], x0 = Math.max(s[0], cam - 6), x1 = Math.min(s[1], cam + VW + 6), y = s[2];
    let top = y;
    if (kind === 'boulder' || kind === 'crate') top = L1.baseY;   // draw plain ground underneath, object on top
    g.fillStyle = kind === 'rock' ? BG.patRock : BG.patDirt;
    g.fillRect(x0, top, x1 - x0, VH - top + 2);
    // shaded lower edge
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x0, top + 8, x1 - x0, VH - top);
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x0, top + 22, x1 - x0, VH);
    // grass cap
    g.fillStyle = '#2f7f3a'; g.fillRect(x0, top, x1 - x0, 6);
    g.fillStyle = kind === 'rock' ? '#4f9d4c' : '#46a64a'; g.fillRect(x0, top, x1 - x0, 4);
    g.fillStyle = '#6fd066'; g.fillRect(x0, top, x1 - x0, 1);
    g.fillStyle = '#1f5f2c'; g.fillRect(x0, top + 6, x1 - x0, 1);
    for (let x = Math.ceil(x0 / 5) * 5; x < x1; x += 5) { if ((x * 7) % 3 === 0) g.fillRect(x, top + 7, 1, 2); }
    for (let x = Math.ceil(x0 / 7) * 7; x < x1; x += 7) { g.fillStyle = '#6fd066'; g.fillRect(x, top - 1, 1, 1); if (x % 3 === 0) g.fillRect(x + 2, top - 1, 1, 1); }
    if (kind === 'boulder') { g.drawImage(SPR.rock, s[0], y - 2); continue; }
    if (kind === 'crate') { g.drawImage(SPR.crate, s[0], y); continue; }
    // darker cliff faces where the neighbour is lower
    const L = L1.ground[i - 1], R = L1.ground[i + 1];
    if (L && L[2] > y) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(s[0], y + 6, 3, L[2] - y); g.fillStyle = INK; g.fillRect(s[0] - 1, y, 1, L[2] - y + 6); }
    if (R && R[2] > y) { g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(s[1] - 3, y + 6, 3, R[2] - y); g.fillStyle = INK; g.fillRect(s[1], y, 1, R[2] - y + 6); }
    if (L && L[2] < y) { g.fillStyle = INK; g.fillRect(s[0], L[2], 1, y - L[2]); }
  }
  // one-way platforms
  for (const o of L1.oneway) {
    if (o.x + o.w < cam - 8 || o.x > cam + VW + 8) continue;
    if (o.kind === 'log') g.drawImage(SPR.log[o.w] || SPR.log[80], o.x, o.y - 2);
    else if (o.kind === 'ledge') g.drawImage(SPR.ledge[96], o.x, o.y - 3);
  }
  g.restore();
}

function drawScenery(g, cam, t, state) {
  g.save(); g.translate(-cam, 0);
  const vis = (x, w = 100) => x + w > cam && x - w < cam + VW;
  for (const f of BG.decor.ferns) if (vis(f.x, 20)) blit(g, SPR.fern, f.x, groundAt(f.x) + 3);
  for (const f of BG.decor.tufts) if (vis(f.x, 10)) blit(g, SPR.tufts[f.i], f.x, groundAt(f.x) + 3);
  for (const f of BG.decor.flowers) if (vis(f.x, 10)) blit(g, SPR.flowers[f.i], f.x, groundAt(f.x) + 3);
  for (const x of L1.puddles) if (vis(x)) blit(g, SPR.puddle, x, groundAt(x) + 3);
  for (const x of L1.sticks) if (vis(x)) blit(g, SPR.sticks[(x / 7 | 0) % 3], x, groundAt(x) + 2);
  for (const x of L1.rocks) if (vis(x)) blit(g, SPR.rocks[(x / 13 | 0) % 3], x, groundAt(x) + 3);
  for (const tn of L1.tents) if (vis(tn.x)) blit(g, SPR.tents[tn.c], tn.x, L1.baseY + 1);
  for (const x of L1.tables) if (vis(x)) blit(g, SPR.table, x, L1.baseY + 1);
  if (vis(L1.rv.x + 46, 120)) g.drawImage(SPR.rv, L1.rv.x, L1.baseY - SPR.rv.height + 3);
  if (vis(L1.truck.x, 120)) g.drawImage(SPR.truck, L1.truck.x, L1.baseY - SPR.truck.height + 3);
  for (const c of L1.campfires) if (vis(c.x)) blit(g, SPR.fireOff, c.x, L1.baseY + 3);
  // the shelter campfire
  const fireX = L1.shelterX + 14;
  if (state.fireLit) blit(g, SPR.fire[((t * 9) | 0) % 4], fireX, L1.baseY + 3);
  else blit(g, SPR.fireOff, fireX, L1.baseY + 3);
  // signs & flags
  if (!state.hideSigns) for (const s of L1.signs) if (vis(s.x, 20)) blit(g, SPR.sign, s.x, groundAt(s.x) + 3);
  state.berries.forEach(b => { if (vis(b.x, 30)) blit(g, b.has ? SPR.berryBush : SPR.berryBare, b.x, groundAt(b.x) + 3); });
  L1.checkpoints.forEach((x, i) => { if (vis(x, 20)) blit(g, SPR.flag[state.cpActive[i] ? 1 : 0], x, groundAt(x) + 3); });
  g.restore();
}

function drawFrontScenery(g, cam, t, state) {
  g.save(); g.translate(-cam, 0);
  for (const b of L1.hideBushes) if (b + 30 > cam && b - 30 < cam + VW) blit(g, SPR.bush, b, groundAt(b) + 3);
  g.restore();
}
