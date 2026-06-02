/* ============================================================
   eggAudio — procedural chiptune for the Huttese Easter egg.

   No audio files, no dependencies, nothing copyrighted: every sound is
   synthesized live with the Web Audio API. A guttural "ho ho ho" laugh (with a
   touch of cavernous echo) plus an original 8-bit swing loop — a two-phrase
   A/B riff over a walking bass and a little kick/snare/hat kit — that evokes a
   seedy alien cantina without quoting anyone's melody. Stays silent until the
   user explicitly summons Jabba, so it never autoplays uninvited.
   ============================================================ */

type AudioWindow = typeof window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let vibrato: GainNode | null = null; // LFO depth (cents) → lead osc.detune

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
    master.gain.value = 0.16;
    master.connect(ctx.destination);
    // A short white-noise buffer reused for the hats and snare.
    const len = Math.floor(ctx.sampleRate * 0.2);
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    // A slow vibrato LFO shared by the lead, for a woozy "alien jazz" wobble.
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 5.4;
    vibrato = ctx.createGain();
    vibrato.gain.value = 16; // ± cents
    lfo.connect(vibrato);
    lfo.start();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** One pitched blip (square = lead, triangle = bass/pad). */
function blip(
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  peak: number,
  vib = false,
): void {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (vib && vibrato) vibrato.connect(osc.detune);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(master);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

/** A noise tick for the off-beat hat. */
function hat(start: number, peak: number): void {
  if (!ctx || !master || !noiseBuffer) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 6000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(peak, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.05);
  src.connect(hp).connect(gain).connect(master);
  src.start(start);
  src.stop(start + 0.06);
}

/** A low sine thump with a fast pitch drop — the kick. */
function kick(start: number, peak: number): void {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, start);
  osc.frequency.exponentialRampToValueAtTime(48, start + 0.12);
  gain.gain.setValueAtTime(peak, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
  osc.connect(gain).connect(master);
  osc.start(start);
  osc.stop(start + 0.2);
}

/** A short band-passed noise burst — the backbeat snare. */
function snare(start: number, peak: number): void {
  if (!ctx || !master || !noiseBuffer) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1900;
  bp.Q.value = 0.7;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(peak, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.13);
  src.connect(bp).connect(gain).connect(master);
  src.start(start);
  src.stop(start + 0.15);
}

// A 32-step, two-phrase riff in A Phrygian-dominant — the "exotic" scale that
// reads as cantina/klezmer without being anyone's tune. A is the call, B the
// higher answer with a little turnaround. `null` is a rest.
const LEAD: (number | null)[] = [
  // A — the call
  81, null, 80, 81, 76, null, 77, 76, 73, null, 72, 73, 69, null, 76, 77,
  // B — the higher answer + turnaround
  88, null, 86, 85, 81, null, 82, 81, 77, null, 76, 73, 74, 73, 70, 69,
];
// A walking bass in eighth notes, climbing under B to lift the answer.
const BASS: (number | null)[] = [
  45, null, 41, null, 40, null, 41, null, 45, null, 41, null, 40, null, 43, null,
  45, null, 47, null, 48, null, 52, null, 53, null, 52, null, 48, null, 47, null,
];

const STEP_DUR = 0.13; // ~115 bpm in sixteenths
const SWING = 0.035; // delay odd steps for a lazy swing

function scheduleStep(i: number, when: number): void {
  const inB = i >= 16;
  const lead = LEAD[i];
  if (lead != null) {
    blip(mtof(lead), when, STEP_DUR * 1.7, 'square', 0.5, true);
    // An octave pad thickens the B answer.
    if (inB) blip(mtof(lead - 12), when, STEP_DUR * 2.3, 'triangle', 0.16);
  }
  const bass = BASS[i];
  if (bass != null) blip(mtof(bass), when, STEP_DUR * 2.4, 'triangle', 0.62);
  // Kit: kick on beats 1 & 3, snare on 2 & 4, hats on the off-beats.
  if (i % 8 === 0) kick(when, 0.9);
  else if (i % 8 === 4) snare(when, 0.45);
  if (i % 2 === 1) hat(when, i % 4 === 3 ? 0.16 : 0.09);
}

function tick(): void {
  if (!ctx || !running) return;
  while (nextStepTime < ctx.currentTime + 0.18) {
    const swung = step % 2 === 1 ? nextStepTime + SWING : nextStepTime;
    scheduleStep(step, swung);
    nextStepTime += STEP_DUR;
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
    master.gain.exponentialRampToValueAtTime(0.16, c.currentTime + 0.8);
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
