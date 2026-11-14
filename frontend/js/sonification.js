// EarthWave sonification engine — independent of the UI.
// Each data point is one "step" of the sound. Same data + settings => same sound (no Math.random).
// Several parameters can play at once: each one is a "layer" with its own voice.
export const MAPPINGS = {
  T2M: 'Temperature → pitch. Normalized values snap to a pentatonic scale over two octaves (220–740 Hz); warmer days sound higher.',
  PRECTOTCORR: 'Precipitation → rhythm. Dry days are silent; wetter days play more, louder drops.',
  WS2M: 'Wind → intensity. Filtered noise whose loudness follows wind speed.',
  ALLSKY_SFC_SW_DWN: 'Solar radiation → brightness. A low drone chord whose filter opens with more sunlight.',
};
const BASE_STEP = 0.3; // seconds per data point at 1× speed
const PENT = [0, 2, 4, 7, 9];
let ctx, master, analyser, nodes = [];
const S = { state: 'stopped', layers: null, n: 0, startIdx: 0, t0: 0, speed: 1, volume: 0.7 };

export const isSupported = () => !!(window.AudioContext || window.webkitAudioContext);

// Min-max normalization to 0..1. Missing values (null) stay null and become rests.
export function normalizeData(values) {
  const v = values.filter((x) => x != null && Number.isFinite(x));
  if (!v.length) return values.map(() => null);
  const min = Math.min(...v), max = Math.max(...v);
  return values.map((x) => (x == null || !Number.isFinite(x) ? null : max === min ? 0.5 : (x - min) / (max - min)));
}
export function mapTemperatureToFrequency(n) {
  const step = Math.round(n * 9);
  const semis = Math.floor(step / 5) * 12 + PENT[step % 5];
  return Math.min(880, 220 * 2 ** (semis / 12)); // hard ceiling protects ears
}
export function mapPrecipitationToRhythm(n, raw) { return raw > 0 ? { hits: 1 + Math.round(n * 5), gain: 0.15 + 0.3 * n } : { hits: 0, gain: 0 }; }
export function mapWindToAmplitude(n) { return 0.05 + 0.45 * n; }
export function mapSolarRadiationToTimbre(n) { return { cutoff: 300 + n * 3700 }; }

function init() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = S.volume * 0.6;
  analyser = ctx.createAnalyser(); analyser.fftSize = 1024;
  master.connect(analyser); analyser.connect(ctx.destination);
}
export const getAnalyser = () => analyser;
const stepDur = () => BASE_STEP / S.speed;
const seeded = (i, k) => ((i * 9301 + k * 49297 + 233280) % 233280) / 233280; // deterministic pseudo-random

function osc(type, freq, when, dest) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq; g.gain.value = 0;
  o.connect(g); g.connect(dest); o.start(when); nodes.push(o, g); return { o, g };
}
// Schedule every layer on the AudioContext clock, starting at data index startIdx.
function schedule(startIdx) {
  const d = stepDur(), t0 = ctx.currentTime + 0.1, n = S.n;
  S.t0 = t0; S.startIdx = startIdx;
  const end = t0 + (n - startIdx) * d, at = (i) => t0 + (i - startIdx) * d;
  const mix = ctx.createGain(); mix.gain.value = 1 / Math.sqrt(S.layers.length); // keeps combinations from getting too loud
  mix.connect(master); nodes.push(mix);

  S.layers.forEach(({ param, values }) => {
    const norm = normalizeData(values);
    if (param === 'T2M') {
      for (let i = startIdx; i < n; i++) if (norm[i] != null) {
        const t = at(i), { o, g } = osc('triangle', mapTemperatureToFrequency(norm[i]), t, mix);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.45, t + 0.03); g.gain.linearRampToValueAtTime(0, t + d * 0.92);
        o.stop(end + 0.3);
      }
    } else if (param === 'PRECTOTCORR') {
      for (let i = startIdx; i < n; i++) if (norm[i] != null) {
        const { hits, gain } = mapPrecipitationToRhythm(norm[i], values[i]);
        for (let k = 0; k < hits; k++) {
          const t = at(i) + (k * d) / hits, { o, g } = osc('sine', 600 + seeded(i, k) * 900, t, mix);
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
          o.stop(t + 0.15);
        }
      }
    } else if (param === 'WS2M') {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), ch = buf.getChannelData(0);
      for (let i = 0, last = 0; i < ch.length; i++) { last = (last + 0.02 * (seeded(i % 9973, 7) * 2 - 1)) / 1.02; ch[i] = last * 8; }
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = buf; src.loop = true; f.type = 'bandpass'; f.frequency.value = 350; f.Q.value = 0.7; g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(mix); src.start(t0); src.stop(end + 0.3); nodes.push(src, f, g);
      for (let i = startIdx; i < n; i++) g.gain.linearRampToValueAtTime(norm[i] == null ? 0 : mapWindToAmplitude(norm[i]), at(i) + d / 2);
      g.gain.linearRampToValueAtTime(0, end);
    } else { // ALLSKY_SFC_SW_DWN: low C+G drone (inside the A-minor pentatonic used by temperature)
      const f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'lowpass'; f.frequency.value = 400; g.gain.value = 0;
      f.connect(g); g.connect(mix); nodes.push(f, g);
      [130.81, 196].forEach((fr) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(f); o.start(t0); o.stop(end + 0.3); nodes.push(o); });
      for (let i = startIdx; i < n; i++) {
        const t = at(i) + d / 2;
        if (norm[i] == null) g.gain.linearRampToValueAtTime(0, t);
        else { g.gain.linearRampToValueAtTime(0.12, t); f.frequency.linearRampToValueAtTime(mapSolarRadiationToTimbre(norm[i]).cutoff, t); }
      }
      g.gain.linearRampToValueAtTime(0, end);
    }
  });
}
function clear() { nodes.forEach((n) => { try { n.stop && n.stop(); } catch {} try { n.disconnect(); } catch {} }); nodes = []; }

// layers: [{ param: 'T2M', values: [...] }, ...] — all with the same length (same dates)
export async function playSonification(layers, opts = {}) {
  init();
  if (opts.volume != null) S.volume = opts.volume;
  if (opts.speed != null) S.speed = opts.speed;
  master.gain.value = S.volume * 0.6;
  if (S.state === 'paused' && S.layers === layers) { await ctx.resume(); S.state = 'playing'; return; }
  clear(); await ctx.resume();
  S.layers = layers; S.n = layers[0].values.length; S.state = 'playing'; schedule(0);
}
export async function pauseSonification() { if (S.state === 'playing') { await ctx.suspend(); S.state = 'paused'; } }
export async function stopSonification() { if (!ctx) return; clear(); await ctx.resume(); S.state = 'stopped'; }
export function setVolume(v) { S.volume = v; if (master) master.gain.setTargetAtTime(v * 0.6, ctx.currentTime, 0.02); }
export async function setSpeed(s) {
  S.speed = s;
  if (S.state === 'playing') { const i = Math.floor(getProgress().index); clear(); schedule(i); }
  else if (S.state === 'paused') await stopSonification();
}
export const getState = () => S.state;
// Progress derived from the audio clock (suspend() freezes currentTime, so pause works).
export function getProgress() {
  const d = stepDur();
  if (!ctx || !S.layers || S.state === 'stopped') return { index: 0, fraction: 0, current: 0, total: S.n * d };
  const el = Math.max(0, ctx.currentTime - S.t0), index = Math.min(S.n, S.startIdx + el / d);
  return { index, fraction: index / S.n, current: index * d, total: S.n * d };
}
