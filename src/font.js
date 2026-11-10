'use strict';
/* Tiny 5x7 pixel font (uppercase only) so text stays crisp at any zoom. */
const GLYPH_SRC = {
  'A': '.###.|#...#|#...#|#####|#...#|#...#|#...#',
  'B': '####.|#...#|#...#|####.|#...#|#...#|####.',
  'C': '.###.|#...#|#....|#....|#....|#...#|.###.',
  'D': '####.|#...#|#...#|#...#|#...#|#...#|####.',
  'E': '#####|#....|#....|####.|#....|#....|#####',
  'F': '#####|#....|#....|####.|#....|#....|#....',
  'G': '.###.|#...#|#....|#.###|#...#|#...#|.###.',
  'H': '#...#|#...#|#...#|#####|#...#|#...#|#...#',
  'I': '.###.|..#..|..#..|..#..|..#..|..#..|.###.',
  'J': '..###|...#.|...#.|...#.|...#.|#..#.|.##..',
  'K': '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#',
  'L': '#....|#....|#....|#....|#....|#....|#####',
  'M': '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#',
  'N': '#...#|##..#|#.#.#|#..##|#...#|#...#|#...#',
  'O': '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
  'P': '####.|#...#|#...#|####.|#....|#....|#....',
  'Q': '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#',
  'R': '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
  'S': '.####|#....|#....|.###.|....#|....#|####.',
  'T': '#####|..#..|..#..|..#..|..#..|..#..|..#..',
  'U': '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
  'V': '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
  'W': '#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#',
  'X': '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  'Y': '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..',
  'Z': '#####|....#|...#.|..#..|.#...|#....|#####',
  '0': '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.',
  '1': '..#..|.##..|..#..|..#..|..#..|..#..|.###.',
  '2': '.###.|#...#|....#|...#.|..#..|.#...|#####',
  '3': '####.|....#|....#|.###.|....#|....#|####.',
  '4': '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.',
  '5': '#####|#....|####.|....#|....#|#...#|.###.',
  '6': '.###.|#....|#....|####.|#...#|#...#|.###.',
  '7': '#####|....#|...#.|..#..|.#...|.#...|.#...',
  '8': '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
  '9': '.###.|#...#|#...#|.####|....#|....#|.###.',
  '.': '.....|.....|.....|.....|.....|.##..|.##..',
  ',': '.....|.....|.....|.....|.##..|..#..|.#...',
  '!': '..#..|..#..|..#..|..#..|..#..|.....|..#..',
  '?': '.###.|#...#|....#|...#.|..#..|.....|..#..',
  ':': '.....|.##..|.##..|.....|.##..|.##..|.....',
  "'": '..#..|..#..|.#...|.....|.....|.....|.....',
  '-': '.....|.....|.....|#####|.....|.....|.....',
  '+': '.....|..#..|..#..|#####|..#..|..#..|.....',
  '/': '....#|....#|...#.|..#..|.#...|#....|#....',
  '<': '...#.|..#..|.#...|#....|.#...|..#..|...#.',
  '>': '.#...|..#..|...#.|....#|...#.|..#..|.#...',
  '^': '..#..|.###.|#.#.#|..#..|..#..|..#..|..#..',
  'v': '..#..|..#..|..#..|#.#.#|.###.|..#..|..#..',
  '(': '...#.|..#..|.#...|.#...|.#...|..#..|...#.',
  ')': '.#...|..#..|...#.|...#.|...#.|..#..|.#...',
  '=': '.....|.....|#####|.....|#####|.....|.....',
  '*': '.....|#.#.#|.###.|#####|.###.|#.#.#|.....',
  ' ': '.....|.....|.....|.....|.....|.....|.....',
};

const _fontSheets = {};
function fontSheet(color) {
  if (_fontSheets[color]) return _fontSheets[color];
  const keys = Object.keys(GLYPH_SRC);
  const c = makeCanvas(keys.length * 6, 7);
  const x = c.getContext('2d');
  x.fillStyle = color;
  const idx = {};
  keys.forEach((k, i) => {
    idx[k] = i;
    GLYPH_SRC[k].split('|').forEach((row, y) => {
      for (let cx = 0; cx < 5; cx++) if (row[cx] === '#') x.fillRect(i * 6 + cx, y, 1, 1);
    });
  });
  return (_fontSheets[color] = { c, idx });
}

function textWidth(str, scale = 1) { return Math.max(0, str.length * 6 - 1) * scale; }

/* Draw text. opts: color, scale, align (left|center|right), shadow, alpha */
function drawText(ctx, str, x, y, o = {}) {
  const { color = '#ffffff', scale = 1, align = 'left', shadow = null, alpha = 1 } = o;
  str = String(str).toUpperCase();
  const w = textWidth(str, scale);
  if (align === 'center') x -= Math.round(w / 2);
  else if (align === 'right') x -= w;
  x = Math.round(x); y = Math.round(y);
  const prevA = ctx.globalAlpha;
  ctx.globalAlpha = prevA * alpha;
  const passes = shadow ? [[shadow, scale, scale], [color, 0, 0]] : [[color, 0, 0]];
  for (const [col, ox, oy] of passes) {
    const sh = fontSheet(col);
    for (let i = 0; i < str.length; i++) {
      const gi = sh.idx[str[i]];
      if (gi === undefined || str[i] === ' ') continue;
      ctx.drawImage(sh.c, gi * 6, 0, 5, 7, x + i * 6 * scale + ox, y + oy, 5 * scale, 7 * scale);
    }
  }
  ctx.globalAlpha = prevA;
}

function wrapText(str, maxChars) {
  const words = String(str).toUpperCase().split(' ');
  const lines = []; let cur = '';
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

/* Filled, outlined panel with a pixel-cut corner look. */
function drawPanel(ctx, x, y, w, h, o = {}) {
  const { fill = 'rgba(14,12,26,0.82)', border = '#f4e9c8', shade = null } = o;
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 1, y, w - 2, h);
  ctx.fillRect(x, y + 1, w, h - 2);
  ctx.fillStyle = border;
  ctx.fillRect(x + 2, y, w - 4, 1);
  ctx.fillRect(x + 2, y + h - 1, w - 4, 1);
  ctx.fillRect(x, y + 2, 1, h - 4);
  ctx.fillRect(x + w - 1, y + 2, 1, h - 4);
  ctx.fillRect(x + 1, y + 1, 1, 1); ctx.fillRect(x + w - 2, y + 1, 1, 1);
  ctx.fillRect(x + 1, y + h - 2, 1, 1); ctx.fillRect(x + w - 2, y + h - 2, 1, 1);
  if (shade) { ctx.fillStyle = shade; ctx.fillRect(x + 2, y + h - 3, w - 4, 2); }
}

/* Speech bubble whose tail points down at (tx, ty). */
function drawBubble(ctx, str, tx, ty, o = {}) {
  const { maxChars = 20, color = '#2a1a14', fill = '#fffaf0', border = '#2a1a14', typed = null } = o;
  let shown = typed === null ? str : str.slice(0, typed);
  const lines = wrapText(str, maxChars);
  const wchars = Math.max(...lines.map(l => l.length));
  const w = wchars * 6 + 9, h = lines.length * 9 + 7;
  let x = Math.round(tx - w / 2), y = Math.round(ty - h - 6);
  x = clamp(x, 4, 480 - w - 4);
  drawPanel(ctx, x, y, w, h, { fill, border });
  // tail
  ctx.fillStyle = border;
  ctx.fillRect(Math.round(tx) - 2, y + h, 5, 1);
  ctx.fillRect(Math.round(tx) - 1, y + h + 1, 3, 1);
  ctx.fillRect(Math.round(tx), y + h + 2, 1, 1);
  ctx.fillStyle = fill;
  ctx.fillRect(Math.round(tx) - 1, y + h - 1, 3, 1);
  let left = shown.length;
  lines.forEach((l, i) => {
    const part = l.slice(0, Math.max(0, left));
    left -= l.length + 1;
    drawText(ctx, part, x + 5, y + 4 + i * 9, { color });
  });
}
