import { getAnalyser, getState } from './sonification.js';
const $ = (id) => document.getElementById(id);
export function toast(msg, type = 'info') {
  const t = document.createElement('div'); t.className = `toast ${type}`; t.textContent = msg;
  $('toasts').append(t); setTimeout(() => t.remove(), 4500);
}
export const setLoading = (on) => ($('loading').hidden = !on);
export function showError(msg) { $('errorMsg').textContent = msg; $('errorBox').hidden = !msg; }
export const fmt = (x, u = '') => (x == null ? '–' : `${x.toFixed(2)} ${u}`);
export const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export function setText(id, v) { $(id).textContent = v; }
// Draws the real waveform from the AnalyserNode attached to the audio output.
export function startWaveLoop(onFrame) {
  const c = $('wave'), g = c.getContext('2d');
  (function loop() {
    c.width = c.clientWidth; const w = c.width, h = c.height;
    g.clearRect(0, 0, w, h); g.strokeStyle = '#22D3EE'; g.lineWidth = 2; g.beginPath();
    const a = getAnalyser();
    if (a && getState() === 'playing') {
      const buf = new Uint8Array(a.fftSize); a.getByteTimeDomainData(buf);
      buf.forEach((v, i) => { const x = (i / buf.length) * w, y = (v / 255) * h; i ? g.lineTo(x, y) : g.moveTo(x, y); });
    } else { g.moveTo(0, h / 2); g.lineTo(w, h / 2); }
    g.stroke(); onFrame(); requestAnimationFrame(loop);
  })();
}
