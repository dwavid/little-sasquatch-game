'use strict';
/* All art is generated in code as pixel art, so nothing needs to be downloaded. */

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
}
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function hex2rgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbStr(a) { return 'rgb(' + (a[0] | 0) + ',' + (a[1] | 0) + ',' + (a[2] | 0) + ')'; }
function mixRGB(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }

/* A tiny pixel painter on its own canvas. */
class Pix {
  constructor(w, h) { this.w = w; this.h = h; this.c = makeCanvas(w, h); this.g = this.c.getContext('2d'); }
  rect(x, y, w, h, col) { this.g.fillStyle = col; this.g.fillRect(Math.round(x), Math.round(y), Math.max(0, Math.round(w)), Math.max(0, Math.round(h))); return this; }
  px(x, y, col) { return this.rect(x, y, 1, 1, col); }
  ell(cx, cy, rx, ry, col) {
    const g = this.g; g.fillStyle = col;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + .5 - cx) / rx, dy = (y + .5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) g.fillRect(x, y, 1, 1);
      }
    }
    return this;
  }
  tri(x0, y0, x1, y1, x2, y2, col) {
    const g = this.g; g.fillStyle = col;
    const d = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
    if (!d) return this;
    for (let y = Math.floor(Math.min(y0, y1, y2)); y <= Math.ceil(Math.max(y0, y1, y2)); y++) {
      for (let x = Math.floor(Math.min(x0, x1, x2)); x <= Math.ceil(Math.max(x0, x1, x2)); x++) {
        const px = x + .5, py = y + .5;
        const a = ((y1 - y2) * (px - x2) + (x2 - x1) * (py - y2)) / d;
        const b = ((y2 - y0) * (px - x2) + (x0 - x2) * (py - y2)) / d;
        if (a >= 0 && b >= 0 && 1 - a - b >= 0) g.fillRect(x, y, 1, 1);
      }
    }
    return this;
  }
  poly(pts, col) {
    const g = this.g; g.fillStyle = col;
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const yy = y + .5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) xs.push(a[0] + (yy - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) g.fillRect(Math.round(xs[i]), y, Math.round(xs[i + 1]) - Math.round(xs[i]), 1);
    }
    return this;
  }
  line(x0, y0, x1, y1, col) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, col);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }
  /* 1px outline around every opaque pixel (outside only). */
  outline(col) {
    const w = this.w, h = this.h, img = this.g.getImageData(0, 0, w, h), a = img.data;
    const src = new Uint8ClampedArray(a), rgb = hex2rgb(col);
    const alpha = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : src[(y * w + x) * 4 + 3];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (src[(y * w + x) * 4 + 3] > 0) continue;
      if (alpha(x - 1, y) > 0 || alpha(x + 1, y) > 0 || alpha(x, y - 1) > 0 || alpha(x, y + 1) > 0) {
        const i = (y * w + x) * 4; a[i] = rgb[0]; a[i + 1] = rgb[1]; a[i + 2] = rgb[2]; a[i + 3] = 255;
      }
    }
    this.g.putImageData(img, 0, 0);
    return this;
  }
  /* Keep only pixels where the mask pixel is opaque (used for shading inside shapes). */
  mirror() {
    const c = makeCanvas(this.w, this.h), x = c.getContext('2d');
    x.translate(this.w, 0); x.scale(-1, 1); x.drawImage(this.c, 0, 0);
    return c;
  }
}

const INK = '#150a0b';

/* ------------------------------------------------------------------ */
/* Sasquatch (little kid, mom, dad) - based on the supplied reference   */
/* ------------------------------------------------------------------ */
function sasq(p = {}, k = 1, who = 'kid', look = 0) {
  const W = Math.ceil(26 * k), H = Math.ceil(30 * k), P = new Pix(W, H), S = v => v * k;
  const fur = who === 'dad' ? '#4d2a1f' : who === 'mom' ? '#693a2b' : '#5b2e22';
  const furD = who === 'dad' ? '#2f160f' : '#3b1b13';
  const furDD = '#241008';
  const furL = who === 'mom' ? '#84503c' : '#774030';
  const cream = '#f6edd3', creamD = '#e2d4ae';
  const by = (p.bob || 0) + (p.sit ? 2.2 : 0) + (p.duck ? 4.4 : 0);
  const fx = look;

  // legs & feet
  if (!p.sit) {
    for (const [lx, lift] of [[9, p.lL || 0], [17, p.lR || 0]]) {
      P.rect(S(lx - 2.2), S(23), S(4.4), S(4.2 - lift), fur);
      P.ell(S(lx - .2 + look * .5), S(27.4 - lift), S(4.3), S(2.3), fur);
      P.rect(S(lx - 4), S(28.7 - lift), S(8.3), S(1), furD);
      P.rect(S(lx - 2.2 + look * .5), S(27.6 - lift), 1, S(2), furDD); P.rect(S(lx + .8 + look * .5), S(27.6 - lift), 1, S(2), furDD);
    }
  } else {
    for (const lx of [7.3, 18.7]) {
      P.ell(S(lx), S(27.2), S(4.4), S(2.6), fur);
      P.ell(S(lx), S(27.5), S(2.3), S(1.3), '#8b5a47');
      P.rect(S(lx - 4), S(28.9), S(8), S(1), furD);
    }
  }
  // body (dark belly shade underneath, fur on top)
  if (p.duck) {            // crouched: short, wide, round body
    P.ell(S(13), S(23.4), S(9.4), S(5.4), furD);
    P.ell(S(13), S(22.6), S(9.4), S(4.8), fur);
  } else {
  P.ell(S(13), S(20.7 + by), S(9), S(7.6), furD);
  P.ell(S(13), S(19.7 + by), S(9), S(6.9), fur);
  P.ell(S(10), S(17 + by), S(4), S(2.5), furL);
  for (const [x, y] of [[11, 18.5], [12, 19.5], [13, 18.5], [14, 19.5], [15, 18.5]]) P.rect(S(x - .5), S(y + by), S(1) < 1 ? 1 : S(1), S(1) < 1 ? 1 : S(1), furD);
  }
  if (who === 'dad' && !p.duck) { P.rect(S(7), S(15.5 + by), S(12), S(2), '#3b6ea8'); P.rect(S(11), S(17 + by), S(4), S(2), '#3b6ea8'); }
  // arms
  const aL = p.aL || 0, aR = p.aR || 0, ab = by * .6;
  if (p.duck) {
    P.ell(S(4.6), S(23.6), S(2.7), S(3.6), fur); P.ell(S(21.4), S(23.6), S(2.7), S(3.6), fur);
    P.px(S(4), S(26.4), furDD); P.px(S(21.6), S(26.4), furDD);
  } else {
  P.ell(S(4.3), S(20.2 + aL + ab), S(2.7), S(5.6), fur);
  P.ell(S(21.7), S(20.2 + aR + ab), S(2.7), S(5.6), fur);
  P.ell(S(3.7), S(18.5 + aL + ab), S(1), S(2.4), furL);
  P.px(S(3.6), S(25 + aL + ab), furDD); P.px(S(5), S(25 + aL + ab), furDD);
  P.px(S(21), S(25 + aR + ab), furDD); P.px(S(22.4), S(25 + aR + ab), furDD);
  }
  // hair spikes behind head
  const hy = by * .9;
  const spikes = p.frizz ? [[4.5, 3.5], [6.5, 6], [9.5, 7.5], [13, 5], [16.8, 8], [19.8, 6], [22, 3.5]] : [[6.5, 2.8], [9.5, 4.6], [13, 2.4], [16.8, 5], [19.8, 3]];
  for (const [cx, h] of spikes) {
    P.tri(S(cx - 2.4), S(5.6 + hy), S(cx), S(5.6 + hy - h), S(cx + 2.4), S(5.6 + hy), fur);
  }
  // head
  P.ell(S(13), S(10.2 + hy), S(9.8), S(7.6), fur);
  P.ell(S(8), S(6.8 + hy), S(3), S(1.6), furL);
  // face mask
  P.ell(S(13 + fx), S(11.4 + hy), S(7.7), S(5.7), cream);
  if (p.soot) {   // singed face
    P.g.globalAlpha = 0.34; P.ell(S(13 + fx), S(11.4 + hy), S(7.7), S(5.7), '#3a2c24'); P.g.globalAlpha = 1;
    P.rect(S(11 + fx), S(7 + hy), S(4), 1, '#1c120e'); P.px(S(8 + fx), S(12 + hy), '#1c120e'); P.px(S(18 + fx), S(13 + hy), '#1c120e');
  }
  P.tri(S(10.3 + fx), S(5.3 + hy), S(15.7 + fx), S(5.3 + hy), S(13 + fx), S(8.3 + hy), fur);
  // eyes
  const er = p.blink ? .6 : 2.6, ey = S(10.8 + hy);
  P.ell(S(10 + fx), ey, S(2.3), S(er), INK); P.ell(S(16 + fx), ey, S(2.3), S(er), INK);
  if (!p.blink && k === 1) { P.px(9 + fx, Math.round(9 + hy), '#6b5a5a'); P.px(15 + fx, Math.round(9 + hy), '#6b5a5a'); }
  // mouth + little tusks
  if (p.mouth) {
    P.ell(S(13 + fx), S(14.6 + hy), S(2.6), S(1.7), INK);
    P.px(S(10.4 + fx), S(15 + hy), '#fff'); P.px(S(15.6 + fx), S(15 + hy), '#fff');
  } else {
    const my = Math.round(S(14.2 + hy)), u = Math.max(1, Math.round(k));
    P.rect(S(9.5 + fx), my, S(8) + u, u, INK);                 // thin mouth line
    for (const [tx, side] of [[9.5, 1], [16, 0]]) {      // two small tusks pointing up, no outline
      const x0 = Math.round(S(tx + fx));
      P.rect(x0, my + 2 * u, 2 * u, u, '#ffffff');              // wide base
      P.rect(x0 + side * u, my + u, u, u, '#ffffff');           // tip, touching the mouth line
    }
  }
  // accessories
  if (who === 'mom') {
    const fxp = S(5), fyp = S(5 + hy);
    P.ell(fxp, fyp, S(2.3), S(2.3), '#ff7fb0'); P.ell(fxp, fyp, S(.9), S(.9), '#ffe27a');
  }
  if (who === 'dad') { // bushy brows
    P.rect(S(7.6 + fx), S(7.6 + hy), S(4.6), S(1.2), furD); P.rect(S(13.9 + fx), S(7.6 + hy), S(4.6), S(1.2), furD);
  }
  P.outline(INK);
  return P.c;
}

const SASQ_POSES = {
  idle: {}, w0: { lR: 3, aL: 1.5, aR: -1.5 }, w1: { bob: -1 }, w2: { lL: 3, aL: -1.5, aR: 1.5 }, w3: { bob: -1 },
  jump: { lL: 2, lR: 2, aL: -6, aR: -6, mouth: 1, bob: -1 }, fall: { lL: 1, lR: 1, aL: -4, aR: -4, mouth: 1 },
  hurt: { blink: 1, mouth: 1, aL: -4, aR: -4 }, eat1: { aL: -6.5, aR: -6.5, mouth: 1 }, eat2: { aL: -6.5, aR: -6.5, bob: -1 },
  blink: { blink: 1 }, zap: { frizz: 1, soot: 1, mouth: 1, aL: -6, aR: -6 }, dazed: { frizz: 1, soot: 1 }, duck: { duck: 1 }, duckblink: { duck: 1, blink: 1 }, sit: { sit: 1 }, sitblink: { sit: 1, blink: 1 }, sitlook: { sit: 1, aL: -1, aR: -1 },
};

/* ------------------------------------------------------------------ */
/* Park ranger                                                          */
/* ------------------------------------------------------------------ */
function ranger(pose = {}) {
  const P = new Pix(24, 42);
  const shirt = '#c9b27a', shirtD = '#a38e5c', pants = '#2f5f3c', pantsD = '#22462b', skin = '#eebb92', boot = '#3b2616';
  const lift = pose.lift || 0, sw = pose.swing || 0, bob = pose.bob || 0;
  // legs
  P.rect(7, 28, 4.5, 9 - lift, pants); P.rect(12.5, 28, 4.5, 9 - (pose.lift2 || 0), pants);
  P.rect(12.5, 28, 1, 9, pantsD);
  P.rect(6, 36 - lift, 6, 3, boot); P.rect(12, 36 - (pose.lift2 || 0), 6.5, 3, boot);
  // torso
  P.rect(5.5, 14 + bob, 13, 14, shirt); P.rect(5.5, 14 + bob, 3, 14, '#d8c48c'); P.rect(16, 14 + bob, 2.5, 14, shirtD);
  P.rect(5.5, 26 + bob, 13, 2, '#4a3220'); P.rect(11, 26 + bob, 3, 2, '#e8c84a');
  P.rect(8.5, 14 + bob, 7, 2, '#3e6b3a'); // scarf
  P.rect(14, 18 + bob, 2, 2, '#f2d33c'); // badge
  // arms
  P.rect(2.5, 15 + bob, 3.2, 10 + sw, shirt); P.rect(18.3, 15 + bob, 3.2, 10 - sw, shirt);
  P.rect(2.5, 25 + sw + bob, 3.2, 2.2, skin); P.rect(18.3, 25 - sw + bob, 3.2, 2.2, skin);
  // head
  P.ell(12, 9 + bob, 5.6, 5, skin);
  P.rect(8, 11.5 + bob, 8, 2, '#5a3416'); // mustache
  if (pose.dizzy) {
    P.line(8.5, 7 + bob, 10.5, 9 + bob, INK); P.line(10.5, 7 + bob, 8.5, 9 + bob, INK);
    P.line(13.5, 7 + bob, 15.5, 9 + bob, INK); P.line(15.5, 7 + bob, 13.5, 9 + bob, INK);
  } else {
    P.rect(9, 7.5 + bob, 1.5, 2, INK); P.rect(14, 7.5 + bob, 1.5, 2, INK);
    P.rect(8.2, 6.3 + bob, 3, 1, '#5a3416'); P.rect(13.2, 6.3 + bob, 3, 1, '#5a3416');
  }
  // campaign hat
  const hx = pose.dizzy ? 1 : 0;
  P.ell(12 + hx, 5 + bob, 9.5, 2.2, '#7a5326');
  P.rect(8 + hx, .5 + bob, 8, 4.5, '#8c6230'); P.rect(8 + hx, 3.8 + bob, 8, 1, '#c23a2e');
  P.rect(8 + hx, .5 + bob, 8, 1, '#a07640');
  P.outline(INK);
  return P.c;
}

/* ------------------------------------------------------------------ */
/* Items                                                                */
/* ------------------------------------------------------------------ */
function cooler(open) {
  const P = new Pix(24, open ? 26 : 16);
  const y0 = open ? 10 : 0;
  P.rect(1, y0 + 4, 22, 11, '#d23a30'); P.rect(1, y0 + 4, 22, 2, '#e85a4d'); P.rect(1, y0 + 13, 22, 2, '#a62a22');
  P.rect(9, y0 + 9, 6, 2, '#f4f4f4');
  if (!open) {
    P.rect(0, y0 + 2, 24, 4, '#f6f6f6'); P.rect(0, y0 + 5, 24, 1, '#c9c9d4');
    P.rect(8, y0, 8, 2, '#8d939e'); P.rect(9, y0 + 1, 6, 1, '#6a707b');
  } else {
    P.rect(2, y0 + 5, 20, 3, '#9fd8ff'); P.rect(4, y0 + 5, 4, 2, '#e4f6ff'); P.rect(12, y0 + 6, 5, 2, '#e4f6ff');
    // lid up
    P.poly([[0, y0 + 1], [24, y0 + 1], [22, 0], [2, 0]], '#f6f6f6'); P.rect(2, y0 - 1, 20, 1, '#c9c9d4');
  }
  P.outline(INK);
  return P.c;
}
function foodSprite(kind) {
  const P = new Pix(14, 14);
  if (kind === 'apple') {
    P.ell(7, 8, 5, 4.8, '#e02f2f'); P.ell(5.5, 6.5, 1.3, 1.3, '#ff8a80'); P.rect(7, 2, 1, 2, '#5a3416'); P.ell(9.5, 3, 2, 1, '#3fb34a');
  } else if (kind === 'cookie') {
    P.ell(7, 7, 5.5, 5.5, '#d49a4e'); for (const [x, y] of [[5, 5], [9, 6], [6, 9], [9, 10], [4, 8]]) P.rect(x, y, 1.5, 1.5, '#4a2a16');
  } else if (kind === 'sandwich') {
    P.rect(1, 3, 12, 3, '#e8b86a'); P.rect(1, 6, 12, 1, '#4cb050'); P.rect(1, 7, 12, 2, '#f08a8a'); P.rect(1, 9, 12, 1, '#f6d34a'); P.rect(1, 10, 12, 3, '#e8b86a');
  } else if (kind === 'fish') {
    P.ell(6, 7, 5, 3.2, '#7fa6c9'); P.tri(10, 7, 14, 3, 14, 11, '#6a8fb0'); P.rect(3, 6, 1, 1, INK); P.rect(2, 8, 5, 1, '#c9dff0');
  } else if (kind === 'berry') {
    P.ell(5, 8, 3, 3, '#7a2cc9'); P.ell(9, 7, 3, 3, '#8d3de0'); P.ell(7, 4, 2.6, 2.6, '#6b22b5'); P.rect(7, 0, 1, 2, '#3fb34a');
  }
  P.outline(INK);
  return P.c;
}
function heart(state) {
  const rows = ['.##...##.', '####.####', '#########', '#########', '.#######.', '..#####..', '...###...', '....#....'];
  const P = new Pix(11, 10);
  for (let y = 0; y < rows.length; y++) for (let x = 0; x < 9; x++) if (rows[y][x] === '#') {
    let col;
    if (state === 'full') col = '#ec3b4b';
    else if (state === 'half') col = x < 4.5 ? '#ec3b4b' : '#4a3a42';
    else col = '#4a3a42';
    P.px(x + 1, y + 1, col);
  }
  if (state !== 'empty') { P.px(2, 2, '#ffb3ba'); P.px(3, 2, '#ffb3ba'); }
  P.outline(INK);
  return P.c;
}

/* ------------------------------------------------------------------ */
/* Scenery                                                              */
/* ------------------------------------------------------------------ */
function pine(w, h, seed, pal) {
  const P = new Pix(w, h), r = rng(seed);
  const tw = Math.max(3, Math.round(w * .13)), th = Math.round(h * .16);
  P.rect(w / 2 - tw / 2, h - th, tw, th, '#4a2f1e'); P.rect(w / 2 + tw / 2 - 1, h - th, 1, th, '#33200f');
  const layers = h > 80 ? 5 : 4, span = (h - th * .7) / layers;
  for (let i = 0; i < layers; i++) {
    const y0 = 1 + i * span * .82, y1 = y0 + span * 1.55;
    const lw = w * (.42 + .58 * (i + 1) / layers) * (.94 + r() * .1);
    P.tri(w / 2, y0, w / 2 - lw / 2, y1, w / 2 + lw / 2, y1, pal[0]);
    P.tri(w / 2, y0, w / 2, y1, w / 2 + lw / 2, y1, pal[1]);
    P.rect(w / 2 - lw / 2 + 1, y1 - 1, lw - 2, 1, pal[2]);
  }
  P.outline(pal[3] || '#10301a');
  return P.c;
}
/* A tree lying on its side. Its base (stump) is at x=6 and the tip is `len` pixels to the right. */
function fallenLog(len) {
  const W = len + 24, H = 26, P = new Pix(W, H), top = 10;
  P.rect(6, top, len, 16, '#6b4524'); P.rect(6, top, len, 4, '#8a5a30'); P.rect(6, top + 12, len, 4, '#4a2f1e');
  for (let x = 16; x < len - 10; x += 13) { P.rect(x, top + 6, 3, 1, '#4a2f1e'); P.rect(x + 6, top + 9, 2, 1, '#4a2f1e'); }
  P.poly([[2, H], [3, 5], [5, 9], [7, 2], [10, 8], [12, 4], [14, H]], '#7a4c28');       // splintered stump
  P.rect(3, 12, 2, 14, '#8a5a30'); P.px(8, 8, '#d9b07a');
  for (const [cx, cy, rx, ry, c] of [[len - 10, 18, 11, 7, '#256a33'], [len + 2, 17, 12, 9, '#2f7a3b'], [len + 12, 19, 8, 6, '#256a33'], [len - 2, 13, 7, 4, '#4aa05a']]) P.ell(cx, cy, rx, ry, c);
  P.outline(INK);
  return P.c;
}
function boulder(w, h, seed, base = '#8a8d98', hi = '#a5a8b3', lo = '#6a6d78') {
  const P = new Pix(w, h), r = rng(seed);
  const pts = [[0, h], [1, h * .55], [w * .22, h * .15], [w * .5, 0], [w * .78, h * .18], [w - 1, h * .6], [w, h]];
  P.poly(pts, base);
  P.poly([[w * .5, 0], [w * .78, h * .18], [w - 1, h * .6], [w, h], [w * .6, h]], lo);
  P.poly([[1, h * .55], [w * .22, h * .15], [w * .5, 0], [w * .35, h * .35]], hi);
  for (let i = 0; i < 3; i++) { const x = r() * w * .7 + 3; P.px(x, h * (.5 + r() * .4), lo); P.px(x + 1, h * (.5 + r() * .4), lo); }
  P.outline(INK);
  return P.c;
}
function tent(main, dark, trim) {
  const P = new Pix(46, 30);
  P.poly([[23, 1], [1, 28], [45, 28]], main);
  P.poly([[23, 1], [45, 28], [30, 28]], dark);
  P.poly([[23, 9], [15, 28], [31, 28]], '#2b1f2e');
  P.poly([[23, 9], [23, 28], [31, 28]], '#3c2e40');
  P.rect(22, 0, 2, 3, trim); P.rect(1, 27, 44, 2, dark);
  P.line(23, 1, 4, 28, trim);
  P.outline(INK);
  return P.c;
}
function picnicTable() {
  const P = new Pix(42, 20);
  P.rect(3, 3, 36, 4, '#a8733c'); P.rect(3, 3, 36, 1, '#c28e55'); P.rect(3, 6, 36, 1, '#7a5128');
  P.rect(1, 12, 40, 3, '#9a6a36'); P.rect(1, 12, 40, 1, '#b98750');
  P.tri(8, 7, 5, 18, 11, 18, '#6b4524'); P.tri(34, 7, 31, 18, 37, 18, '#6b4524');
  P.rect(4, 14, 3, 5, '#5d3b1d'); P.rect(35, 14, 3, 5, '#5d3b1d');
  // a checkered cloth
  for (let x = 6; x < 36; x += 4) { P.rect(x, 2, 2, 2, '#e04b4b'); }
  P.outline(INK);
  return P.c;
}
function rv() {
  const P = new Pix(92, 44);
  P.rect(1, 2, 90, 34, '#f2f2f6'); P.rect(1, 2, 90, 3, '#ffffff'); P.rect(1, 30, 90, 6, '#d7d9e2');
  P.rect(1, 18, 90, 4, '#3d7bc9'); P.rect(1, 22, 90, 2, '#2c5a98');
  P.rect(60, 6, 24, 15, '#bfe3f5'); P.rect(62, 8, 20, 11, '#9fd2ee'); P.rect(60, 6, 24, 1, '#7a8794');
  P.rect(8, 7, 14, 10, '#bfe3f5'); P.rect(10, 9, 10, 6, '#9fd2ee');
  P.rect(28, 6, 12, 22, '#e4e6ee'); P.rect(30, 8, 8, 8, '#bfe3f5'); P.rect(36, 18, 2, 3, '#7a8794');
  P.rect(0, 0, 92, 2, '#c9ccd8');
  P.rect(46, -0, 8, 1, '#c9ccd8');
  for (const wx of [18, 70]) { P.ell(wx, 37, 7, 7, '#2a2a33'); P.ell(wx, 37, 3, 3, '#9aa0ae'); }
  P.rect(0, 33, 3, 4, '#555'); P.rect(88, 33, 4, 4, '#555');
  P.outline(INK);
  return P.c;
}
function rangerTruck() {
  const P = new Pix(70, 34);
  P.rect(2, 12, 66, 14, '#2f7a4a'); P.rect(2, 12, 66, 2, '#3f9a5c'); P.rect(2, 22, 66, 4, '#245f39');
  P.poly([[10, 12], [18, 2], [42, 2], [50, 12]], '#2f7a4a');
  P.poly([[19, 4], [41, 4], [47, 12], [14, 12]], '#bfe3f5'); P.rect(30, 4, 2, 8, '#2f7a4a');
  P.rect(52, 8, 16, 4, '#245f39');
  P.ell(55, 18, 5, 4, '#f2d33c'); P.rect(53, 16, 4, 4, '#a8761a'); // badge
  P.rect(0, 22, 3, 4, '#e0e0e8'); P.rect(66, 22, 4, 4, '#ffd34a');
  P.rect(21, 1, 8, 2, '#e04b4b'); P.rect(31, 1, 8, 2, '#4b7be0');
  for (const wx of [15, 55]) { P.ell(wx, 28, 6, 6, '#26262e'); P.ell(wx, 28, 2.6, 2.6, '#a0a6b4'); }
  P.outline(INK);
  return P.c;
}
function crate(w, h) {
  const P = new Pix(w, h);
  P.rect(0, 0, w, h, '#b07a3c'); P.rect(0, 0, w, 2, '#c9964f');
  P.rect(0, 0, 2, h, '#8a5a28'); P.rect(w - 2, 0, 2, h, '#8a5a28'); P.rect(0, h - 2, w, 2, '#8a5a28');
  P.line(1, 1, w - 2, h - 2, '#8a5a28'); P.line(w - 2, 1, 1, h - 2, '#8a5a28');
  P.outline(INK);
  return P.c;
}
function sign() {
  const P = new Pix(24, 28);
  P.rect(11, 12, 3, 16, '#6b4524'); P.rect(11, 12, 1, 16, '#8a5a30');
  P.rect(1, 2, 22, 13, '#c28e55'); P.rect(1, 2, 22, 2, '#dcae74'); P.rect(1, 13, 22, 2, '#8a5a30');
  P.rect(11, 5, 2, 5, '#4a2a14'); P.rect(11, 11, 2, 2, '#4a2a14');
  P.outline(INK);
  return P.c;
}
function flag(active) {
  const P = new Pix(20, 36);
  P.rect(3, 2, 3, 34, '#6b4524'); P.rect(3, 2, 1, 34, '#8a5a30');
  P.rect(0, 33, 10, 3, '#5a5d68');
  if (active) {
    P.poly([[6, 3], [19, 7], [6, 14]], '#3fcf63'); P.px(11, 8, '#fff');
  } else {
    P.poly([[6, 3], [16, 6], [6, 9]], '#9a9aa8');
  }
  P.outline(INK);
  return P.c;
}
function bush(kind) {
  const P = new Pix(40, 28);
  const dark = '#1f6a31', mid = '#2f8a3f', lite = '#46aa4f';
  P.ell(11, 18, 11, 9, dark); P.ell(29, 18, 11, 9, dark); P.ell(20, 12, 13, 11, dark);
  P.ell(11, 17, 9.5, 7.5, mid); P.ell(29, 17, 9.5, 7.5, mid); P.ell(20, 11, 11.5, 9.5, mid);
  P.ell(16, 8, 5, 3, lite); P.ell(8, 14, 3.5, 2.5, lite); P.ell(27, 10, 4, 2.5, lite);
  P.rect(2, 25, 36, 3, dark);
  if (kind === 'berry') for (const [x, y] of [[10, 14], [17, 10], [24, 15], [30, 18], [14, 20], [22, 7], [6, 19]]) { P.rect(x, y, 3, 3, '#8d3de0'); P.px(x, y, '#c9a0ff'); }
  P.outline('#10301a');
  return P.c;
}
function fern() {
  const P = new Pix(18, 12);
  for (let i = -3; i <= 3; i++) P.line(9, 11, 9 + i * 2.4, 3 + Math.abs(i) * 1.6, '#2f8a3f');
  for (let i = -3; i <= 3; i++) P.px(9 + i * 2.4, 3 + Math.abs(i) * 1.6, '#58c25c');
  return P.c;
}
function tuft(r) {
  const P = new Pix(9, 7);
  for (let i = 0; i < 4; i++) P.line(4, 6, 1 + i * 2 + (r() * 2 | 0), 1 + (r() * 3 | 0), i % 2 ? '#58c25c' : '#3fa04a');
  return P.c;
}
function flower(col) {
  const P = new Pix(7, 9);
  P.rect(3, 4, 1, 5, '#2f8a3f'); P.px(2, 6, '#2f8a3f'); P.px(4, 7, '#2f8a3f');
  P.px(3, 1, col); P.px(1, 3, col); P.px(5, 3, col); P.px(3, 3, col); P.px(2, 2, col); P.px(4, 2, col); P.px(2, 4, col); P.px(4, 4, col); P.px(3, 2, '#ffe27a');
  return P.c;
}
function logSprite(w) {
  const P = new Pix(w, 15);
  P.rect(0, 2, w, 11, '#7a4c28'); P.rect(0, 2, w, 3, '#9a6538'); P.rect(0, 11, w, 2, '#5a3519');
  for (let x = 8; x < w - 8; x += 11) { P.px(x, 7, '#5a3519'); P.px(x + 1, 7, '#5a3519'); P.px(x + 4, 9, '#5a3519'); }
  P.ell(2, 7.5, 2.4, 5.5, '#d9b07a'); P.ell(2, 7.5, 1, 2.5, '#b98a52');
  P.ell(w - 3, 7.5, 2.4, 5.5, '#d9b07a'); P.ell(w - 3, 7.5, 1, 2.5, '#b98a52');
  P.outline(INK);
  return P.c;
}
function ledgeSprite(w) {
  const P = new Pix(w, 16);
  P.ell(w / 2, 14, w / 2, 9, '#6a6d78'); P.ell(w / 2, 11, w / 2 - 2, 7, '#8a8d98');
  P.rect(0, 0, w, 4, '#3f9a4a'); P.rect(0, 0, w, 2, '#5fba5a'); P.rect(1, 4, w - 2, 1, '#2a7a36');
  for (let x = 4; x < w - 4; x += 9) { P.rect(x, 5, 3, 2, '#6a6d78'); }
  P.outline(INK);
  return P.c;
}
function stickSprite(r) {
  const P = new Pix(30, 10);
  P.line(1, 8, 28, 3 + (r() * 3 | 0), '#6b4524'); P.line(10, 6, 16, 1, '#6b4524'); P.line(18, 5, 24, 8, '#6b4524');
  return P.c;
}
function cloud(w, h, seed, col, shade) {
  const P = new Pix(w, h), r = rng(seed);
  const n = 6 + (r() * 3 | 0);
  for (let i = 0; i < n; i++) {
    const cx = w * (.18 + .64 * i / (n - 1)), rr = h * (.3 + .32 * Math.sin(Math.PI * i / (n - 1)) + r() * .1);
    P.ell(cx, h - rr, rr * 1.25, rr, shade);
  }
  P.rect(w * .12, h - 3, w * .76, 3, shade);
  for (let i = 0; i < n; i++) {
    const cx = w * (.18 + .64 * i / (n - 1)), rr = h * (.3 + .32 * Math.sin(Math.PI * i / (n - 1)) + r() * .1);
    P.ell(cx, h - rr - 1.5, rr * 1.2, rr * .86, col);
  }
  return P.c;
}
function makeCave() {
  const W = 260, H = 156, P = new Pix(W, H), r = rng(77), cx = 130;
  const inDome = (x, y) => ((x - cx) / 124) ** 2 + ((y - H) / 146) ** 2 <= 1;
  P.ell(cx, H, 124, 146, '#6f727d');
  P.ell(cx - 24, 60, 70, 34, '#858894');
  P.ell(cx + 40, 100, 70, 50, '#62656f');
  // stones
  for (let i = 0; i < 70; i++) {
    const x = r() * W, y = r() * H;
    if (!inDome(x, y) || !inDome(x + 9, y + 5)) continue;
    P.rect(x, y, 8 + r() * 8, 1, '#4e515b'); P.rect(x + 1, y + 1, 5 + r() * 6, 1, '#9296a2');
  }
  // moss cap
  for (let x = 4; x < W - 4; x++) {
    for (let y = 0; y < H; y++) if (inDome(x, y)) { const n = 2 + ((Math.sin(x * .3) + Math.sin(x * .11)) * 1.2 + 2 | 0); P.rect(x, y, 1, n, '#3f9a4a'); P.rect(x, y, 1, 1, '#6fd06a'); break; }
  }
  // arch
  P.ell(cx + 2, H + 6, 54, 80, '#8e919d');
  P.ell(cx + 2, H + 6, 46, 72, '#2b2536');
  P.ell(cx + 2, H + 6, 40, 64, '#322b3f');
  P.rect(cx - 44, H - 12, 92, 12, '#4a4156');
  P.rect(cx - 44, H - 12, 92, 1, '#5d5470');
  P.outline(INK);
  return P.c;
}

/* ------------------------------------------------------------------ */
/* Parallax backgrounds (tileable)                                      */
/* ------------------------------------------------------------------ */
function periodic(x, W, seed) {
  const r = rng(seed); let v = 0, amp = 1;
  for (let k = 1; k <= 5; k++) { v += amp * Math.sin(2 * Math.PI * k * x / W + r() * 6.28); amp *= .55; }
  return v;
}
function mountains(W, H, seed, base, snow, hi, lo, snowLine) {
  const P = new Pix(W, H), tops = [], v = [];
  for (let x = 0; x < W; x++) { v.push(periodic(x, W, seed)); tops.push(Math.round(H * (.42 - .14 * v[x]))); }
  const slope = x => { x = ((x % W) + W) % W; return v[(x + 3) % W] - v[x]; };
  for (let x = 0; x < W; x++) {
    const top = tops[x];
    for (let y = top; y < H; y++) {
      const sx = x - Math.floor((y - top) * 0.55);          // slanted shading so ridges look diagonal
      const sl = slope(sx);
      let col = sl < -0.004 ? hi : sl > 0.02 ? lo : base;
      if (((sx * 5 + y * 3) % 23) === 0 && y - top > 6) col = lo;   // rocky speckle
      P.px(x, y, col);
    }
    if (top < H * snowLine) {
      const d = Math.round((H * snowLine - top) * .5) + 2;
      for (let y = top; y < top + d; y++) { const sx = x - Math.floor((y - top) * 0.55); P.px(x, y, slope(sx) > 0.02 ? '#c9d6e8' : snow); }
      if ((x * 7 + top) % 5 < 2) P.rect(x, top + d, 1, 2 + (x % 3), snow);
    }
  }
  return P.c;
}
function hills(W, H, seed, col, colD, pineCol) {
  const P = new Pix(W, H), r = rng(seed);
  const tops = [];
  for (let x = 0; x < W; x++) {
    const top = Math.round(H * (.5 - .12 * periodic(x, W, seed)));
    tops.push(top); P.rect(x, top, 1, H - top, col);
    if (x % 2 === 0) P.rect(x, top + 6 + (x * 13 % 5), 1, 2, colD);
  }
  for (let x = 6; x < W - 6; x += 7 + (r() * 9 | 0)) {
    const t = tops[x], h = 12 + (r() * 12 | 0), w = 8 + (h >> 2);
    for (const ox of [0, x < 20 ? W : x > W - 20 ? -W : 0]) {
      if (ox === 0 && false) continue;
      P.tri(x + ox, t - h + 2, x + ox - w / 2, t + 2, x + ox + w / 2, t + 2, pineCol);
    }
  }
  return P.c;
}
function treeline(W, H, seed, pal) {
  const P = new Pix(W, H), r = rng(seed);
  for (let x = -10; x < W + 10; x += 9 + (r() * 10 | 0)) {
    const h = 34 + (r() * 30 | 0), w = 14 + (r() * 6 | 0);
    for (const ox of [0, W]) {
      const cx = x + ox - (ox ? W * 0 : 0);
      for (let l = 0; l < 4; l++) {
        const y0 = H - h + l * h * .2, y1 = y0 + h * .38, lw = w * (.5 + .5 * (l + 1) / 4);
        P.tri(cx, y0, cx - lw / 2, y1, cx + lw / 2, y1, pal[0]);
        P.tri(cx, y0, cx, y1, cx + lw / 2, y1, pal[1]);
      }
      P.rect(cx - 1, H - h * .2, 3, h * .2, pal[1]);
    }
  }
  P.rect(0, H - 6, W, 6, pal[1]);
  return P.c;
}
function dirtTile(base, a, b, seed) {
  const P = new Pix(32, 32), r = rng(seed);
  P.rect(0, 0, 32, 32, base);
  for (let i = 0; i < 46; i++) P.rect(r() * 32, r() * 32, 1 + (r() * 2 | 0), 1, r() < .5 ? a : b);
  for (let i = 0; i < 5; i++) { const x = r() * 28, y = r() * 28; P.rect(x, y, 3, 2, b); P.rect(x + 1, y, 1, 1, a); }
  return P.c;
}
function rockTile(base, a, b, seed) {
  const P = new Pix(32, 32), r = rng(seed);
  P.rect(0, 0, 32, 32, base);
  for (let i = 0; i < 9; i++) {
    const x = r() * 26, y = r() * 28, w = 6 + r() * 8;
    P.rect(x, y, w, 1, a); P.rect(x + 1, y + 1, w - 2, 1, b);
  }
  for (let i = 0; i < 30; i++) P.rect(r() * 32, r() * 32, 1, 1, r() < .5 ? a : b);
  return P.c;
}
function campfire(frame, lit) {
  const P = new Pix(30, 30);
  // stones
  for (let i = 0; i < 7; i++) { const a = Math.PI * (i / 6); P.ell(15 + Math.cos(a) * 11, 26 - Math.sin(a) * 2.2, 3, 2.4, i % 2 ? '#8a8d98' : '#6a6d78'); }
  // logs
  P.line(6, 27, 22, 22, '#5d3b1d'); P.line(7, 24, 24, 27, '#7a4c28'); P.line(6, 26, 22, 21, '#7a4c28');
  if (lit) {
    const r = rng(100 + frame * 7);
    const h = 15 + (frame % 3) * 2;
    P.poly([[15, 26 - h], [20, 20], [22, 25], [8, 25], [10, 20]], '#e8561f');
    P.poly([[15.5, 24 - h * .75], [19, 20], [20, 25], [10, 25], [12, 20]], '#ff9a2e');
    P.poly([[15, 25 - h * .5], [17.5, 22], [18, 25], [12, 25], [13, 22]], '#ffe27a');
    if (frame % 2) P.px(10, 14, '#ff9a2e'); else P.px(21, 12, '#ff9a2e');
  } else {
    P.px(15, 24, '#3a3340');
  }
  P.outline(INK);
  return P.c;
}
function puddle() {
  const P = new Pix(34, 6);
  P.ell(17, 3, 16, 2.6, '#6fa5d6'); P.ell(17, 2.5, 13, 1.6, '#9ccaf0'); P.rect(9, 2, 6, 1, '#e2f3ff');
  return P.c;
}

/* ------------------------------------------------------------------ */
/* Build everything once                                                */
/* ------------------------------------------------------------------ */
const SPR = {};
function buildSprites() {
  SPR.sasq = {}; SPR.dad = {}; SPR.mom = {};
  for (const name in SASQ_POSES) {
    SPR.sasq[name] = [-1, 0, 1].map(l => sasq(SASQ_POSES[name], 1, 'kid', l));
  }
  for (const [key, who] of [['dad', 'dad'], ['mom', 'mom']]) {
    for (const name of ['idle', 'w0', 'w1', 'w2', 'w3', 'hurt', 'jump']) SPR[key][name] = [-1, 0, 1].map(l => sasq(SASQ_POSES[name], 1.75, who, l));
  }
  SPR.ranger = {
    idle: ranger({}), w0: ranger({ lift: 3, swing: 2 }), w1: ranger({ lift2: 3, swing: -2 }), w2: ranger({ bob: 1 }),
    dizzy: ranger({ dizzy: true }),
  };
  SPR.cooler = cooler(false); SPR.coolerOpen = cooler(true);
  SPR.food = {}; for (const k of ['apple', 'cookie', 'sandwich', 'fish', 'berry']) SPR.food[k] = foodSprite(k);
  SPR.heart = { full: heart('full'), half: heart('half'), empty: heart('empty') };
  const treePals = [['#2f7a3b', '#245f2e', '#4aa05a'], ['#2a6f45', '#1f5636', '#41905f'], ['#3a8a3a', '#2c6c2e', '#5cb35c']];
  SPR.pines = [];
  for (let i = 0; i < 9; i++) {
    const big = i % 3;
    SPR.pines.push(pine([30, 38, 46][big], [64, 84, 112][big], 11 + i * 17, treePals[i % 3]));
  }
  SPR.tents = [tent('#4fae6b', '#3b8a52', '#f2e6b8'), tent('#e0813a', '#b8622a', '#f2e6b8'), tent('#4b7be0', '#385fb8', '#f2e6b8'), tent('#d95a8a', '#b04268', '#f2e6b8')];
  SPR.table = picnicTable(); SPR.rv = rv(); SPR.truck = rangerTruck();
  SPR.sign = sign(); SPR.flag = [flag(false), flag(true)];
  SPR.bush = bush('plain'); SPR.berryBush = bush('berry'); SPR.berryBare = bush('plain');
  SPR.fern = fern();
  const r = rng(5);
  SPR.tufts = [tuft(r), tuft(r), tuft(r)];
  SPR.flowers = ['#ff7fb0', '#ffe27a', '#ffffff', '#ff9a4a'].map(flower);
  SPR.log = {}; for (const w of [64, 80]) SPR.log[w] = logSprite(w);
  SPR.ledge = {}; for (const w of [96]) SPR.ledge[w] = ledgeSprite(w);
  SPR.sticks = [stickSprite(r), stickSprite(r), stickSprite(r)];
  SPR.rock = boulder(38, 18, 3);
  SPR.rocks = [boulder(18, 10, 9), boulder(26, 13, 21), boulder(12, 7, 4)];
  SPR.crate = crate(32, 18);
  SPR.cave = makeCave();
  SPR.treeA = pine(46, 100, 501, treePals[0]); SPR.treeB = pine(36, 66, 502, treePals[1]);
  SPR.fallen = { 100: fallenLog(100), 66: fallenLog(66) };
  SPR.puddle = puddle();
  SPR.fire = [0, 1, 2, 3].map(f => campfire(f, true)); SPR.fireOff = campfire(0, false);
  SPR.cloudW = [0, 1, 2, 3].map(i => cloud(110 + i * 20, 34 + i * 4, 31 + i * 5, '#ffffff', '#d9e4f0'));
  SPR.cloudD = [0, 1, 2, 3].map(i => cloud(110 + i * 20, 34 + i * 4, 31 + i * 5, '#8c95a3', '#6b7482'));
  SPR.mtnFar = mountains(960, 150, 3, '#8fa4c4', '#f2f6fb', '#a4b6d2', '#7d92b4', .5);
  SPR.mtnNear = mountains(960, 130, 8, '#6e8fb0', '#e8eff7', '#82a2c0', '#5e7fa0', .42);
  SPR.hills = hills(720, 120, 5, '#4f8a6a', '#43795c', '#356b4e');
  SPR.treeline = treeline(640, 110, 12, ['#2a6a45', '#1f5236']);
  SPR.dirt = dirtTile('#6f4b30', '#815a3a', '#5a3b25', 1);
  SPR.rockT = rockTile('#6e7380', '#868b99', '#585d69', 2);
}
