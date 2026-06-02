/* ============================================================
   eggAudio — procedural swing-jazz for the Huttese Easter egg.

   No audio files, no dependencies, nothing copyrighted. The famous cantina
   number is John Williams' copyrighted composition, so this deliberately does
   NOT reproduce that melody. Instead it synthesizes an ORIGINAL tune in the
   same unmistakable idiom — a fast, bouncy Benny-Goodman / Dixieland swing
   combo: a clarinet-ish lead that scoops up into its notes, a walking upright
   bass, off-beat "piano" comp stabs, and brushed swing drums — so it reads as
   "cantina" without quoting anyone. Plus a guttural "ho ho ho" laugh. Stays
   silent until the user explicitly summons Jabba, so it never autoplays.
   ============================================================ */

type AudioWindow = typeof window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let vibrato: GainNode | null = null; // shared LFO depth (cents) → lead detune

let loopTimer: ReturnType<typeof setTimeout> | null = null;
let nextStepTime = 0;
let step = 0;
let running = false;

/** MIDI note number → frequency (A4 = 440 Hz). */
function mtof(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.15;
    master.connect(ctx.destination);
    // A reusable noise buffer for the brushed kit.
    const len = Math.floor(ctx.sampleRate * 0.3);
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    // A shared vibrato LFO for the clarinet-ish lead.
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 5.6;
    vibrato = ctx.createGain();
    vibrato.gain.value = 14; // ± cents
    lfo.connect(vibrato);
    lfo.start();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/**
 * Clarinet-ish lead: a square wave (odd harmonics, like a clarinet) softened by
 * a lowpass, given vibrato and — on accented notes — a quick scoop up into the
 * pitch, the signature swing-clarinet articulation.
 */
function lead(freq: number, start: number, dur: number, peak: number, scoop = false): void {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const lp = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = 'square';
  lp.type = 'lowpass';
  lp.frequency.value = 2600;
  if (scoop) {
    osc.frequency.setValueAtTime(freq * 0.92, start);
    osc.frequency.exponentialRampToValueAtTime(freq, start + 0.05);
  } else {
    osc.frequency.setValueAtTime(freq, start);
  }
  if (vibrato) vibrato.connect(osc.detune);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.015);
  gain.gain.setValueAtTime(peak, start + dur * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(lp).connect(gain).connect(master);
  osc.start(start);
  osc.stop(start + dur + 0.03);
}

/** Walking upright bass: a soft triangle with a quick pluck and a lowpass body. */
function bass(freq: number, start: number, dur: number, peak: number): void {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const lp = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, start);
  lp.type = 'lowpass';
  lp.frequency.value = 520;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(lp).connect(gain).connect(master);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

/** Off-beat comp stab (the swing "chnk") — a couple of short, bright guide tones. */
function comp(freqs: number[], start: number, peak: number): void {
  if (!ctx || !master) return;
  for (const f of freqs) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.13);
    osc.connect(gain).connect(master);
    osc.start(start);
    osc.stop(start + 0.15);
  }
}

/** A feathered, soft jazz kick. */
function kick(start: number, peak: number): void {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, start);
  osc.frequency.exponentialRampToValueAtTime(45, start + 0.1);
  gain.gain.setValueAtTime(peak, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
  osc.connect(gain).connect(master);
  osc.start(start);
  osc.stop(start + 0.18);
}

/** Brushed backbeat — soft band-passed noise with a little swish. */
function brush(start: number, peak: number): void {
  if (!ctx || !master || !noiseBuffer) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2400;
  bp.Q.value = 0.6;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
  src.connect(bp).connect(gain).connect(master);
  src.start(start);
  src.stop(start + 0.14);
}

/** Swing ride tick (the "spang-a-lang"). */
function ride(start: number, peak: number): void {
  if (!ctx || !master || !noiseBuffer) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 7000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(peak, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.05);
  src.connect(hp).connect(gain).connect(master);
  src.start(start);
  src.stop(start + 0.06);
}

/** A gruff, low tuba/trombone "honk" — Dixieland oom meets Hutt belch. */
function honk(start: number): void {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const lp = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(62, start);
  osc.frequency.exponentialRampToValueAtTime(46, start + 0.18);
  lp.type = 'lowpass';
  lp.frequency.value = 240;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.42, start + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
  osc.connect(lp).connect(gain).connect(master);
  osc.start(start);
  osc.stop(start + 0.3);
}

/** A clarinet trill — a quick shake between a note and its whole-step neighbor. */
function trill(freq: number, start: number, dur: number, peak: number): void {
  const segments = 6;
  const seg = dur / segments;
  const up = freq * Math.pow(2, 2 / 12);
  for (let k = 0; k < segments; k++) {
    lead(k % 2 === 0 ? freq : up, start + k * seg, seg * 1.15, peak);
  }
}

// An ORIGINAL bluesy-swing tune over a I–IV–I–V loop (C7 · F7 · C7 · G7) — the
// cantina band's idiom, not its melody. 32 swung eighth-notes = 4 bars; even
// steps land on the beat, odd steps are the swung up-beat. `null` is a rest.
const LEAD: (number | null)[] = [
  76, null, 79, 76, null, 75, 76, null, // C7  — the hook
  77, null, 81, 77, null, 75, 77, null, // F7  — the same hook, up a fourth
  79, 81, 84, 81, 79, null, 76, 75, // C7  — climb to the peak, bluesy fall
  74, 77, 79, 77, 74, 71, null, null, // G7  — turnaround, home to C
];
// Dixieland clarinet ornaments: grace pickups, scoops, and a trill on the peak.
const GRACE = new Set([0, 8]); // quick lower-neighbor pickup into the hook
const SCOOP = new Set([16, 24]); // scoop up into the second-half phrases
const TRILL = new Set([18]); // a little shake on the high note
// A walking upright bass: one quarter note per beat (the even steps).
const BASS: (number | null)[] = [
  36, null, 38, null, 40, null, 43, null,
  41, null, 43, null, 45, null, 48, null,
  36, null, 40, null, 43, null, 45, null,
  43, null, 41, null, 40, null, 38, null,
];
// Guide tones (3rd, 7th) per bar for the off-beat comp stabs.
const COMP: number[][] = [
  [64, 70], // C7 — E, B♭
  [69, 75], // F7 — A, E♭
  [64, 70], // C7 — E, B♭
  [71, 77], // G7 — B, F
];

const BEAT = 0.3; // ~200 bpm — a frantic cantina bounce
const SWING = 0.66; // a true triplet shuffle — the on-beat eighth holds two-thirds

function scheduleStep(i: number, when: number): void {
  const note = LEAD[i];
  if (note != null) {
    if (GRACE.has(i)) lead(mtof(note - 2), when - 0.05, 0.06, 0.26); // grace pickup
    if (TRILL.has(i)) trill(mtof(note), when, BEAT * 0.5, 0.36);
    else lead(mtof(note), when, BEAT * (i % 2 === 0 ? 0.5 : 0.32), 0.4, SCOOP.has(i));
  }
  const b = BASS[i];
  if (b != null) bass(mtof(b), when, BEAT * 0.9, 0.5);
  const bar = Math.floor(i / 8) % 4;
  // Comp stabs on the "and" of beats 2 & 4.
  if (i % 4 === 3) comp(COMP[bar]!.map(mtof), when, 0.14);
  // A gruff low honk opens each half-phrase — Dixieland tuba meets Hutt belch.
  if (i === 0 || i === 16) honk(when);
  // Brushed kit: feathered kick on beats 1 & 3, brush on 2 & 4, swing ride.
  if (i % 8 === 0 || i % 8 === 4) kick(when, 0.42);
  if (i % 8 === 2 || i % 8 === 6) brush(when, 0.26);
  if (i % 2 === 0 || i % 4 === 3) ride(when, i % 8 === 0 ? 0.09 : 0.06);
}

function tick(): void {
  if (!ctx || !running) return;
  while (nextStepTime < ctx.currentTime + 0.2) {
    scheduleStep(step, nextStepTime);
    // Triplet shuffle: the on-beat eighth is long, the up-beat short.
    nextStepTime += step % 2 === 0 ? BEAT * SWING : BEAT * (1 - SWING);
    step = (step + 1) % LEAD.length;
  }
  loopTimer = setTimeout(tick, 40);
}

/**
 * A low, guttural "ho ho ho ho" — Jabba's chuckle, synthesized, fattened with a
 * detuned layer and trailed by a touch of cavernous echo.
 */
export function jabbaLaugh(): void {
  const c = ensureContext();
  if (!c || !master) return;
  const t0 = c.currentTime + 0.02;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  filter.connect(master);
  // A short feedback delay gives the laugh a seedy-cantina echo.
  const delay = c.createDelay(1);
  delay.delayTime.value = 0.19;
  const feedback = c.createGain();
  feedback.gain.value = 0.32;
  const echo = c.createGain();
  echo.gain.value = 0.5;
  filter.connect(delay);
  delay.connect(feedback).connect(delay);
  delay.connect(echo).connect(master);

  const osc = c.createOscillator();
  const sub = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sawtooth';
  sub.type = 'square';
  sub.detune.value = -8; // a slight detune reads as thicker and gruffer
  osc.connect(gain);
  sub.connect(gain);
  gain.connect(filter);
  gain.gain.setValueAtTime(0.0001, t0);

  // Four descending "ho" bumps with a slow guttural wobble.
  const bumps = [120, 110, 102, 92];
  let t = t0;
  for (const base of bumps) {
    osc.frequency.setValueAtTime(base, t);
    sub.frequency.setValueAtTime(base / 2, t);
    osc.frequency.linearRampToValueAtTime(base * 0.82, t + 0.18);
    sub.frequency.linearRampToValueAtTime((base * 0.82) / 2, t + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.9, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.08, t + 0.22);
    t += 0.26;
  }
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
  osc.start(t0);
  sub.start(t0);
  osc.stop(t + 0.2);
  sub.stop(t + 0.2);
}

/** Begin the cantina loop (idempotent) and let out a laugh over the top. */
export function enterCantina(): void {
  const c = ensureContext();
  if (!c) return;
  // Already in the cantina: don't stack a second laugh/loop on top of the first.
  if (running) return;
  jabbaLaugh();
  running = true;
  step = 0;
  nextStepTime = c.currentTime + 0.6; // let the laugh breathe first
  if (master) {
    master.gain.cancelScheduledValues(c.currentTime);
    master.gain.setValueAtTime(0.0001, c.currentTime);
    master.gain.exponentialRampToValueAtTime(0.15, c.currentTime + 0.8);
  }
  tick();
}

/** Fade out and stop the loop. */
export function leaveCantina(): void {
  if (loopTimer) {
    clearTimeout(loopTimer);
    loopTimer = null;
  }
  running = false;
  if (ctx && master) {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    // The level is restored by the next enterCantina(), so we don't re-raise it
    // here — doing so would pop any loop tail still in the lookahead window.
  }
}
