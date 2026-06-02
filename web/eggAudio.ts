/* ============================================================
   eggAudio — procedural Dixieland / novelty-swing for the Huttese egg.

   No audio files, no dependencies, nothing copyrighted. The famous cantina
   number is John Williams' copyrighted composition ("Mad About Me"), so this
   deliberately does NOT reproduce that melody. Instead it synthesizes an
   ORIGINAL tune in the same unmistakable idiom and borrows Williams' actual
   trick — "defamiliarization": take swing-era / Dixieland conventions and bend
   them a little sideways, so it reads as dance-band jazz from another planet.

   The combo (Benny Goodman + Louis Prima + Carl Stalling + a drunk alien reed
   section):
     • a reedy, nasal "kloo-horn" lead — clarinet by way of a band-pass formant
     • a second reed that harmonizes underneath (the sax-section pad)
     • trumpet-like brass stabs trading call-and-response in the lead's gaps
     • a walking upright bass and a gruff tuba "oom" honk
     • off-beat "piano" comp stabs and a brushed swing kit
   The harmony is a circle-of-fifths turnaround (I VI7 II7 V7) full of secondary
   dominants, so it never feels harmonically settled. The arrangement is a
   classic head chart that rotates HEAD -> DEVELOPMENT -> HEAD as it loops: the
   development chorus piles on the second reed, brass hits, and busier ride for
   that controlled-chaos New Orleans polyphony. A guttural "ho ho ho" laugh
   rides in on top. Stays silent until the user summons Jabba — never autoplays.
   ============================================================ */

type AudioWindow = typeof window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let vibrato: GainNode | null = null; // shared LFO depth (cents) → reed detune

let loopTimer: ReturnType<typeof setTimeout> | null = null;
let nextStepTime = 0;
let step = 0;
let chorus = 0; // which pass through the form — drives head/development rotation
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
    // A shared vibrato LFO for the reed voices (lead + second reed).
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 5.6;
    vibrato = ctx.createGain();
    vibrato.gain.value = 16; // ± cents
    lfo.connect(vibrato);
    lfo.start();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

type Artic = 'plain' | 'scoop' | 'fall';

/**
 * The "kloo horn" lead: a square wave (odd harmonics, like a clarinet) shaped by
 * a lowpass and a resonant band-pass formant that gives it a nasal, penetrating,
 * faintly comic bite — familiar reed, slightly wrong. Articulations:
 *   • scoop — the signature swing-clarinet smear UP into the pitch
 *   • fall  — a quick downward smear OFF the note at the end (Dixieland "fall")
 */
function lead(freq: number, start: number, dur: number, peak: number, artic: Artic = 'plain'): void {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const lp = ctx.createBiquadFilter();
  const formant = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = 'square';
  lp.type = 'lowpass';
  lp.frequency.value = 2600;
  // Nasal reed honk: a peak around the clarinet's "throat" register.
  formant.type = 'peaking';
  formant.frequency.value = 1650;
  formant.Q.value = 4;
  formant.gain.value = 7;
  if (artic === 'scoop') {
    osc.frequency.setValueAtTime(freq * 0.92, start);
    osc.frequency.exponentialRampToValueAtTime(freq, start + 0.05);
  } else {
    osc.frequency.setValueAtTime(freq, start);
  }
  if (artic === 'fall') {
    osc.frequency.setValueAtTime(freq, start + dur * 0.6);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, start + dur + 0.09);
  }
  if (vibrato) vibrato.connect(osc.detune);
  const tail = artic === 'fall' ? 0.1 : 0;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.015);
  gain.gain.setValueAtTime(peak, start + dur * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur + tail);
  osc.connect(lp).connect(formant).connect(gain).connect(master);
  osc.start(start);
  osc.stop(start + dur + tail + 0.03);
}

/** Second reed — a mellower, darker kloo-horn that harmonizes under the lead. */
function reed(freq: number, start: number, dur: number, peak: number): void {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const lp = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(freq, start);
  if (vibrato) vibrato.connect(osc.detune);
  lp.type = 'lowpass';
  lp.frequency.value = 1500; // darker than the lead so it sits underneath
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.04);
  gain.gain.setValueAtTime(peak, start + dur * 0.7);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(lp).connect(gain).connect(master);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

/** Trumpet-like brass stab — bright sawtooth with a quick scoop and a hard bite. */
function brass(freqs: number[], start: number, peak: number): void {
  if (!ctx || !master) return;
  for (const f of freqs) {
    const osc = ctx.createOscillator();
    const bp = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f * 0.94, start); // quick scoop into the hit
    osc.frequency.exponentialRampToValueAtTime(f, start + 0.04);
    bp.type = 'bandpass';
    bp.frequency.value = 1500;
    bp.Q.value = 0.9;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
    osc.connect(bp).connect(gain).connect(master);
    osc.start(start);
    osc.stop(start + 0.26);
  }
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

// An ORIGINAL novelty-swing head over a circle-of-fifths turnaround — the
// cantina band's idiom, not its melody. 8 bars of secondary dominants:
//   | C7 | A7 | D7 | G7 | C7 | A7 | D7→G7 | C7 |  (I VI7 II7 V7 …)
// 64 swung eighths (8 per bar). Even steps land on the beat, odd steps are the
// swung up-beat; `null` is a rest. The line behaves like a clarinet solo: a
// quick leap up, tumbling descents, repeated rhythmic cells, chromatic motion,
// and sudden accents rather than long lyrical phrases.
const LEAD: (number | null)[] = [
  72, null, 76, 74, 72, 70, 67, null, // 1 C7 — leap up to C, tumble down the chord
  73, null, 76, 73, 72, 70, 69, null, // 2 A7 — C# shake down, chromatic to A
  78, null, 81, 78, 77, 74, 72, null, // 3 D7 — scoop to F#, trill the high A, fall
  77, 76, 74, 71, 74, 71, 67, null, //   4 G7 — turnaround run, heading home
  72, null, 76, 74, 72, 70, 67, 64, //   5 C7 — the hook again, comic octave drop
  73, null, 76, 73, 72, 69, 73, null, // 6 A7 — answer, hop back up
  78, 77, 74, 72, 77, 74, 71, 70, //     7 D7→G7 — descend, then a bluesy Bb
  72, 71, 72, 74, 76, 79, null, null, // 8 C7 — resolve, then a rising tag up to G
];
// Dixieland reed ornaments by step index: grace pickups, scoops up, falls off,
// and one shake on the high note.
const GRACE = new Set([0, 32]); // quick lower-neighbor pickup into the hook
const SCOOP = new Set([8, 16, 40, 48]); // scoop up into the accented phrase starts
const FALL = new Set([39, 55]); // smear down off the low/bluesy phrase endings
const TRILL = new Set([18]); // a shake on the high A
// A walking upright bass — one quarter note per beat (even steps), stepping
// through chord tones with chromatic approaches into each new chord.
const BASS: (number | null)[] = [
  36, null, 40, null, 43, null, 44, null, // C7 → (G#) approach A
  45, null, 43, null, 40, null, 39, null, // A7 → (Eb) approach D
  38, null, 42, null, 45, null, 44, null, // D7 → (G#) approach G
  43, null, 41, null, 40, null, 38, null, // G7 → back to C
  36, null, 40, null, 43, null, 44, null, // C7
  45, null, 43, null, 40, null, 39, null, // A7
  38, null, 42, null, 43, null, 41, null, // D7→G7
  36, null, 40, null, 43, null, 47, null, // C7 (B leads back to the top)
];
// Guide tones (3rd, 7th) per bar — the off-beat comp stabs, the second reed's
// sustained harmony, and (up an octave) the brass call-and-response.
const COMP: number[][] = [
  [64, 70], // C7 — E, B♭
  [61, 67], // A7 — C#, G
  [66, 72], // D7 — F#, C
  [71, 77], // G7 — B, F
  [64, 70], // C7
  [61, 67], // A7
  [66, 72], // D7(→G7)
  [64, 70], // C7
];

const BEAT = 0.3; // ~200 bpm — a frantic cantina bounce
const SWING = 0.66; // a true triplet shuffle — the on-beat eighth holds two-thirds

function scheduleStep(i: number, when: number): void {
  const dev = chorus % 2 === 1; // a development chorus — pile on the band
  const bar = Math.floor(i / 8) % 8;
  const inBar = i % 8;
  const onBeat = i % 2 === 0;

  // ---- lead: the head melody (always) ----
  const note = LEAD[i];
  if (note != null) {
    if (GRACE.has(i)) lead(mtof(note - 2), when - 0.05, 0.06, 0.24); // grace pickup
    if (TRILL.has(i)) trill(mtof(note), when, BEAT * 0.5, 0.34);
    else {
      const artic: Artic = SCOOP.has(i) ? 'scoop' : FALL.has(i) ? 'fall' : 'plain';
      lead(mtof(note), when, BEAT * (onBeat ? 0.5 : 0.32), 0.4, artic);
    }
  }

  // ---- walking bass (always) ----
  const b = BASS[i];
  if (b != null) bass(mtof(b), when, BEAT * 0.9, 0.5);

  // ---- off-beat comp stabs (the swing "chnk") ----
  // Head: the "and" of beats 2 & 4. Development: every off-beat.
  if (inBar === 3 || inBar === 7 || (dev && (inBar === 1 || inBar === 5))) {
    comp(COMP[bar]!.map(mtof), when, 0.12);
  }

  // ---- gruff tuba "oom" opening each four-bar half ----
  if (i === 0 || i === 32) honk(when);

  // ---- DEVELOPMENT layer: harmonized second reed + brass call-and-response ----
  if (dev) {
    // The second reed holds the lower guide tone under each bar's downbeat.
    if (inBar === 0) reed(mtof(COMP[bar]![0]!), when, BEAT * 1.6, 0.16);
    // Brass answers the lead in its phrase-end gaps (the "and of 4" of bars
    // 2/4/6/8), up an octave for that big-band brightness.
    if (inBar === 7 && bar % 2 === 1) brass(COMP[bar]!.map((g) => mtof(g + 12)), when, 0.2);
  }

  // ---- brushed swing kit ----
  if (inBar === 0 || inBar === 4) kick(when, 0.42);
  if (inBar === 2 || inBar === 6) brush(when, 0.26);
  // Ride "spang-a-lang": on the beats and the and-of-4; busier in development.
  if (onBeat || inBar === 7 || (dev && inBar === 3)) ride(when, inBar === 0 ? 0.09 : 0.06);
}

function tick(): void {
  if (!ctx || !running) return;
  while (nextStepTime < ctx.currentTime + 0.2) {
    scheduleStep(step, nextStepTime);
    // Triplet shuffle: the on-beat eighth is long, the up-beat short.
    nextStepTime += step % 2 === 0 ? BEAT * SWING : BEAT * (1 - SWING);
    step += 1;
    if (step >= LEAD.length) {
      step = 0;
      // Rotate the form: head → development → head → development …
      chorus = (chorus + 1) % 4;
    }
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
  chorus = 0; // always open on the head
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
