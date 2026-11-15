import { fetchEarthData, geocode, reverseGeocode } from './api.js';
import { initMap, setMarker, setGibsLayer, GIBS_LAYERS } from './map.js';
import { renderChart, stats } from './charts.js';
import * as son from './sonification.js';
import { narrate, stopNarration, hasVoice } from './narrator.js';
import { GLOBE, chartScript } from './scripts.js';
import { toast, setLoading, showError, fmt, fmtTime, setText, startWaveLoop } from './ui.js';

const $ = (id) => document.getElementById(id);
const PARAMS = {
  T2M: { label: 'Temperature', unit: '°C', icon: 'thermometer', color: '#F97316', sci: 'Near-surface air temperature follows seasons and weather systems.' },
  PRECTOTCORR: { label: 'Precipitation', unit: 'mm/day', icon: 'cloud-rain', color: '#3B82F6', sci: 'Precipitation combines satellite and model data, bias-corrected with ground observations.' },
  WS2M: { label: 'Wind', unit: 'm/s', icon: 'wind', color: '#22D3EE', sci: 'Wind speed 2 m above ground; terrain and surface roughness affect it.' },
  ALLSKY_SFC_SW_DWN: { label: 'Solar Radiation', unit: 'kWh/m²/day', icon: 'sun', color: '#FACC15', sci: 'Shortwave radiation reaching the surface under all sky conditions; clouds reduce it.' },
};
const ORDER = Object.keys(PARAMS);
const iso = (d) => d.toISOString().slice(0, 10);
const compact = (s) => s.replaceAll('-', '');
const DEFAULT = { lat: 33.5731, lon: -7.5898, name: 'Casablanca, Morocco' };
// POWER data lags real time by days, so the default period ends ~10 days ago.
const defEnd = () => iso(new Date(Date.now() - 10 * 864e5)), defStart = () => iso(new Date(Date.now() - 40 * 864e5));
const state = { ...DEFAULT, params: ['T2M'], data: null, layers: null };
let dataRequestId = 0;
let searchInProgress = false;

// ---- Parameter cards (multi-select: combine 2 or more)
function buildParams() {
  $('params').innerHTML = ORDER.map((k) => `<button class="pcard" data-p="${k}" aria-pressed="false"><i data-lucide="${PARAMS[k].icon}"></i> <b>${PARAMS[k].label}</b><small>${PARAMS[k].unit}</small></button>`).join('');
  if (window.lucide) lucide.createIcons(); // icons are optional: the app still works if the CDN is blocked
  $('params').addEventListener('click', (e) => {
    const b = e.target.closest('.pcard'); if (!b) return;
    const p = b.dataset.p, on = state.params.includes(p);
    if (on && state.params.length === 1) return toast('Keep at least one parameter selected.');
    state.params = ORDER.filter((k) => (k === p ? !on : state.params.includes(k)));
    son.stopSonification(); markSelected(); load();
  });
}
const markSelected = () => document.querySelectorAll('.pcard').forEach((b) => { const s = state.params.includes(b.dataset.p); b.classList.toggle('sel', s); b.setAttribute('aria-pressed', s); });

// ---- Location
async function selectLocation(lat, lon, name, zoom) {
  state.lat = +lat.toFixed(4); state.lon = +lon.toFixed(4); state.name = name || `${state.lat}, ${state.lon}`;
  setMarker(state.lat, state.lon, zoom);
  setText('locName', state.name); setText('locLat', state.lat); setText('locLon', state.lon);
  son.stopSonification(); await load();
  if (!name) { const n = await reverseGeocode(state.lat, state.lon); if (n) { state.name = n; setText('locName', n); setText('plLoc', n); } }
}

// ---- Data loading (location + parameters + dates)
async function load() {
  const requestId = ++dataRequestId;
  const start = $('startDate').value, end = $('endDate').value;
  const msg = validateDates(start, end);
  if (msg) { setLoading(false); showError(msg); toast(msg, 'error'); return; }
  stopNarration(); setLoading(true); showError('');
  setText('locPeriod', `${start} → ${end}`); setText('locStatus', 'Loading…');
  setGibsLayer($('layerSelect').value, end);
  try {
    const d = await fetchEarthData({ latitude: state.lat, longitude: state.lon, start: compact(start), end: compact(end), parameters: state.params.join(',') });
    if (requestId !== dataRequestId) return;
    const empty = state.params.filter((p) => !d.series[p].values.some((v) => v != null));
    if (empty.length) throw new Error(`NASA POWER returned no valid values for ${empty.map((p) => PARAMS[p].label).join(', ')} in this place and period.`);
    state.data = d;
    state.layers = state.params.map((p) => ({ param: p, values: d.series[p].values })); // what the audio engine plays
    const names = state.params.map((p) => PARAMS[p].label);
    renderChart($('chart'), d, state.params, PARAMS);
    setText('chartTitle', `${names.join(' + ')} — ${state.name}`);
    $('stats').innerHTML = state.params.map((p) => { const s = stats(d.series[p].values), u = PARAMS[p].unit;
      return `<div class="stat"><b>${PARAMS[p].label}</b>Average <span>${fmt(s.avg, u)}</span><br>Min <span>${fmt(s.min, u)}</span> · Max <span>${fmt(s.max, u)}</span><br>Missing days: ${s.missing}</div>`; }).join('');
    setText('sciText', state.params.map((p) => PARAMS[p].sci).join(' ') + (state.params.length > 1 ? ' Curves are normalized so different units can be compared; hover to see real values.' : ''));
    setText('sourceLine', `Source: ${d.source}. Resolution: ${d.temporalResolution}. Historical / near-real-time data (not live). Retrieved ${new Date(d.retrievedAt).toLocaleString()}.`);
    setText('locStatus', 'Available'); setText('plParam', names.join(' + ')); setText('plLoc', state.name);
    $('mapText').innerHTML = '<ul>' + state.params.map((p) => `<li>${son.MAPPINGS[p]}</li>`).join('') + '</ul>' + (state.params.length > 1 ? '<p>Combined: each parameter plays as its own voice at the same time, and the overall level is balanced automatically.</p>' : '');
    setText('plTime', `0:00 / ${fmtTime(d.dates.length * 0.3 / Number($('speed').value))}`);
  } catch (e) {
    if (requestId !== dataRequestId) return;
    state.data = null; state.layers = null; showError(e.message); setText('locStatus', 'Unavailable'); toast(e.message, 'error');
  } finally { if (requestId === dataRequestId) setLoading(false); }
}
function validateDates(s, e) {
  if (!s || !e) return 'Please choose both a start and an end date.';
  if (s > e) return 'Start date must be before the end date.';
  if (e > iso(new Date())) return 'End date cannot be in the future.';
  if (s < '1981-01-01') return 'NASA POWER daily data starts in 1981.';
  if ((new Date(e) - new Date(s)) / 864e5 > 365) return 'Please choose a range of at most 366 days.';
  return '';
}

// ---- Audio
async function listen() {
  if (!son.isSupported()) return toast('Your browser does not support the Web Audio API.', 'error');
  if (!state.layers) return toast('Load valid NASA data first.', 'error');
  stopNarration(); // a voice must not overlap with the data sound
  try { await son.playSonification(state.layers, { volume: $('volume').value / 100, speed: +$('speed').value }); }
  catch (e) { toast('Could not start audio: ' + e.message, 'error'); }
}

// ---- Voices: talking globe (EN/FR) and chart explainer (EN/FR)
const IDLE = 'Press “How It Works” (English) or “Comment ça marche” (Français) and the planet will explain.';
const UI = {
  globe: { en: { ids: ['howBtn', 'navHow'], idle: 'How It Works', busy: 'Stop narration' }, fr: { ids: ['howBtnFr'], idle: 'Comment ça marche', busy: 'Arrêter la voix' } },
  chart: { en: { ids: ['chartEn'], idle: 'Explain in English', busy: 'Stop' }, fr: { ids: ['chartFr'], idle: 'Expliquer en français', busy: 'Arrêter' } },
};
function hooksFor(kind, lang) {
  const u = UI[kind][lang];
  return {
    state: (on) => u.ids.forEach((id) => { const b = $(id); b.classList.toggle('on', on); (b.querySelector('span') || b).textContent = on ? u.busy : u.idle; }),
    speaking: (on) => (kind === 'globe' ? $('globe').classList.toggle('speaking', on) : $('chartCaption').classList.toggle('live', on)),
    caption: (t, label) => {
      if (kind === 'globe') { const c = $('caption'); c.classList.toggle('live', !!t); c.textContent = t ? `${label} — ${t}` : IDLE; }
      else { const c = $('chartCaption'); c.hidden = !t; c.textContent = t; }
    },
  };
}
const warnVoice = (lang) => { if (!hasVoice(lang)) toast(lang === 'fr' ? 'No French voice found on this device: install one in your system settings, or read the captions.' : 'No English voice found on this device: read the captions instead.'); };
function speakGlobe(lang) {
  warnVoice(lang); son.stopSonification();
  narrate({ id: 'globe-' + lang, lang, lines: GLOBE[lang], hooks: hooksFor('globe', lang),
    label: (i, n) => (lang === 'fr' ? `Étape ${i + 1} sur ${n}` : `Step ${i + 1} of ${n}`) });
}
function speakChart(lang) {
  if (!state.data) return toast(lang === 'fr' ? 'Load valid NASA data first (no chart to explain yet).' : 'Load valid NASA data first.', 'error');
  warnVoice(lang); son.stopSonification();
  const units = Object.fromEntries(ORDER.map((k) => [k, PARAMS[k].unit]));
  const place = state.name.split(',').slice(0, 2).join(',');
  narrate({ id: 'chart-' + lang, lang, lines: chartScript(lang, { place, data: state.data, params: state.params, units }), hooks: hooksFor('chart', lang) });
}

// ---- Search
async function search() {
  if (searchInProgress) return;
  const q = $('searchInput').value.trim(); if (q.length < 2) return toast('Type a city or place name.');
  const b = $('searchBtn');
  searchInProgress = true;
  b.disabled = true; b.setAttribute('aria-busy', 'true'); b.textContent = 'Searching…';
  try {
    const r = await geocode(q);
    if (!r) toast(`No location found for “${q}”.`, 'error');
    else {
      const lat = Number(r.lat), lon = Number(r.lon);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180)
        throw new Error('The location service returned invalid coordinates. Please try another place.');
      toast('Found: ' + r.name.split(',').slice(0, 2).join(','), 'success');
      await selectLocation(lat, lon, r.name, 7);
    }
  } catch (e) { toast(e.message, 'error'); }
  finally { searchInProgress = false; b.disabled = false; b.setAttribute('aria-busy', 'false'); b.textContent = 'Search Location'; }
}

function wire() {
  const go = (id) => $(id).scrollIntoView({ behavior: 'smooth' });
  $('exploreBtn').onclick = $('startBtn').onclick = () => go('explore');
  $('howBtn').onclick = $('navHow').onclick = () => { go('home'); $('menu').classList.remove('open'); speakGlobe('en'); };
  $('howBtnFr').onclick = () => { go('home'); speakGlobe('fr'); };
  $('chartEn').onclick = () => speakChart('en');
  $('chartFr').onclick = () => speakChart('fr');
  $('burger').onclick = () => { const o = $('menu').classList.toggle('open'); $('burger').setAttribute('aria-expanded', o); };
  $('menu').onclick = (e) => e.target.closest('a') && $('menu').classList.remove('open');
  $('searchBtn').onclick = search;
  $('searchInput').onkeydown = (e) => e.key === 'Enter' && search();
  $('applyDates').onclick = () => { son.stopSonification(); load(); };
  $('retryBtn').onclick = load;
  $('layerSelect').onchange = () => setGibsLayer($('layerSelect').value, $('endDate').value);
  $('resetBtn').onclick = () => { setDefaults(); markSelected(); selectLocation(DEFAULT.lat, DEFAULT.lon, DEFAULT.name, 5); };
  $('playBtn').onclick = listen; $('listenBtn').onclick = () => { go('studio'); listen(); };
  $('pauseBtn').onclick = () => son.pauseSonification();
  $('stopBtn').onclick = () => son.stopSonification();
  $('volume').oninput = (e) => son.setVolume(e.target.value / 100);
  $('speed').onchange = (e) => son.setSpeed(+e.target.value);
  $('heroBars').innerHTML = Array.from({ length: 28 }, (_, i) => `<i style="animation-delay:${(i * 0.07).toFixed(2)}s"></i>`).join('');
  document.querySelectorAll('main section').forEach((s) => io.observe(s)); // highlights the active nav link
}
const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && document.querySelectorAll('#menu a').forEach((a) => a.classList.toggle('active', a.dataset.s === e.target.id))), { rootMargin: '-40% 0px -55% 0px' });
function setDefaults() { state.params = ['T2M']; $('startDate').value = defStart(); $('endDate').value = defEnd(); }

// ---- Start
$('layerSelect').innerHTML = GIBS_LAYERS.map((l) => `<option value="${l.id}">${l.name}</option>`).join('');
$('layerSelect').value = 'BlueMarble_ShadedRelief_Bathymetry'; // default map type
buildParams(); setDefaults(); markSelected(); wire();
initMap((lat, lon) => selectLocation(lat, lon));
startWaveLoop(() => { // progress UI driven by the real audio clock
  const p = son.getProgress(); $('progress').value = p.fraction * 1000;
  if (state.data && son.getState() !== 'stopped') setText('plTime', `${fmtTime(p.current)} / ${fmtTime(p.total)}`);
  if (son.getState() === 'playing' && p.fraction >= 1) son.stopSonification();
});
selectLocation(DEFAULT.lat, DEFAULT.lon, DEFAULT.name, 5);
