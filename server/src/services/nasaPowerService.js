const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: Number(process.env.CACHE_TTL_SECONDS) || 3600 });
const BASE = 'https://power.larc.nasa.gov/api/temporal/daily/point';

// Fetch daily point data from NASA POWER and return a clean structure.
async function getPowerData({ latitude, longitude, start, end, parameters }) {
  const key = [latitude, longitude, start, end, parameters.join()].join('|');
  const hit = cache.get(key);
  if (hit) return hit;

  const url = new URL(BASE);
  url.search = new URLSearchParams({
    parameters: parameters.join(','), community: 'RE',
    longitude, latitude, start, end, format: 'JSON',
  });

  let res;
  try { res = await fetch(url, { signal: AbortSignal.timeout(30000) }); }
  catch (e) {
    const err = new Error('NASA POWER did not respond in time or is unreachable.');
    err.status = 504; throw err;
  }
  if (!res.ok) {
    let msg = '';
    try { const j = await res.json(); msg = (j.messages || []).join(' ') || j.message || ''; } catch {}
    const err = new Error(msg || `NASA POWER returned HTTP ${res.status}.`);
    err.status = res.status === 400 || res.status === 422 ? 422 : 502; throw err;
  }
  const json = await res.json();
  const p = json?.properties?.parameter;
  if (!p || !p[parameters[0]]) { const e = new Error('Unexpected NASA POWER response.'); e.status = 502; throw e; }

  const dates = Object.keys(p[parameters[0]]).sort(); // YYYYMMDD
  const series = {};
  for (const par of parameters) {
    series[par] = {
      unit: json.parameters?.[par]?.units || '',
      name: json.parameters?.[par]?.longname || par,
      // NASA marks missing data as -999: we turn it into null, never invent values.
      values: dates.map((d) => (p[par][d] === -999 || p[par][d] == null ? null : p[par][d])),
    };
  }
  const out = {
    location: { latitude, longitude }, dates, series, range: { start, end },
    source: 'NASA POWER (Prediction Of Worldwide Energy Resources), community RE',
    temporalResolution: 'daily', retrievedAt: new Date().toISOString(),
  };
  cache.set(key, out);
  return out;
}
module.exports = { getPowerData };
