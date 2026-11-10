'use strict';
/* Synthesised sound effects + a gentle music loop (no audio files needed). */
const Snd = (() => {
  let ctx = null, master = null, muted = false, mode = 'none', step = 0, timer = null;
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ctx.destination);
      if (mode !== 'none') startMusic();
    } catch (e) { ctx = null; }
  }
  function tone(f, d, type = 'square', vol = 0.1, slide = 0, delay = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.05);
  }
  function noise(d, vol = 0.1, freq = 1000, delay = 0, q = 0.7) {
    if (!ctx) return;
    const t = ctx.currentTime + delay, len = Math.max(1, Math.floor(ctx.sampleRate * d));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate), data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(f); f.connect(g); g.connect(master); src.start(t);
  }

  /* ---- music ---- */
  const PATTERNS = {
    play: { bpm: 104, bass: [48, 43, 45, 41], lead: [
      [76, 0, 79, 0, 76, 74, 72, 0], [74, 0, 79, 0, 74, 71, 67, 0],
      [72, 0, 76, 0, 81, 79, 76, 0], [77, 0, 76, 0, 74, 72, 69, 0]], leadType: 'triangle', vol: 0.05 },
    sad: { bpm: 66, bass: [45, 41, 48, 43], lead: [
      [69, 0, 0, 0, 72, 0, 71, 0], [69, 0, 0, 0, 65, 0, 0, 0],
      [72, 0, 0, 0, 76, 0, 74, 0], [71, 0, 0, 0, 67, 0, 0, 0]], leadType: 'sine', vol: 0.07 },
    night: { bpm: 56, bass: [48, 53, 48, 43], lead: [
      [72, 0, 0, 0, 76, 0, 0, 0], [77, 0, 0, 0, 76, 0, 0, 74],
      [72, 0, 0, 0, 79, 0, 0, 0], [77, 0, 0, 0, 76, 0, 0, 0]], leadType: 'sine', vol: 0.06 },
  };
  function tick() {
    const p = PATTERNS[mode]; if (!ctx || !p || muted) { schedule(); return; }
    const bar = Math.floor(step / 8) % 4, i = step % 8;
    const spb = 60 / p.bpm / 2;
    const n = p.lead[bar][i];
    if (n) tone(midi(n), spb * 1.8, p.leadType, p.vol);
    if (i === 0 || i === 4) tone(midi(p.bass[bar]), spb * 3.2, 'sine', 0.09);
    step++; schedule();
  }
  function schedule() {
    clearTimeout(timer);
    const p = PATTERNS[mode]; if (!p) return;
    timer = setTimeout(tick, 60 / p.bpm / 2 * 1000);
  }
  function startMusic() { step = 0; schedule(); }

  return {
    init,
    music(m) { if (m === mode) return; mode = m; step = 0; clearTimeout(timer); if (ctx && PATTERNS[m]) schedule(); },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.8; return muted; },
    get muted() { return muted; },
    jump() { tone(300, 0.16, 'square', 0.07, 380); },
    land() { noise(0.07, 0.05, 500); },
    step() { noise(0.04, 0.025, 300); },
    open() { tone(180, 0.12, 'square', 0.06, 160); noise(0.15, 0.05, 1800, 0.02); },
    munch() { for (let i = 0; i < 3; i++) noise(0.07, 0.09, 700, i * 0.12); },
    yum() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'square', 0.06, 0, i * 0.07)); },
    full() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, 'triangle', 0.1, 0, i * 0.1)); },
    hit() { tone(180, 0.28, 'sawtooth', 0.12, -120); noise(0.18, 0.09, 900); },
    bonk() { tone(420, 0.1, 'square', 0.1, -240); tone(220, 0.14, 'square', 0.08, -100, 0.05); },
    alert() { tone(880, 0.09, 'square', 0.07); tone(1175, 0.12, 'square', 0.07, 0, 0.08); },
    check() { [659, 880, 1175].forEach((f, i) => tone(f, 0.16, 'triangle', 0.09, 0, i * 0.09)); },
    growl() { tone(90, 0.5, 'sawtooth', 0.09, -30); tone(70, 0.45, 'sawtooth', 0.06, -20, 0.08); },
    faint() { tone(400, 0.6, 'triangle', 0.1, -300); },
    thunder() { noise(1.6, 0.35, 380, 0.05, 1.5); noise(0.5, 0.25, 1500); },
    whoosh() { noise(0.7, 0.12, 2400, 0, 2); },
    spark() { tone(1200, 0.06, 'square', 0.04, 600); },
    ignite() { noise(0.5, 0.12, 1800, 0, 1); tone(220, 0.3, 'triangle', 0.07, 200); },
    howl() { // distant "awooo"
      tone(260, 1.6, 'sine', 0.06, 190); tone(262, 1.6, 'sine', 0.04, 150, 0.05);
      tone(390, 1.2, 'sine', 0.025, 80, 0.3);
    },
    blip() { tone(660, 0.04, 'square', 0.04); },
  };
})();
