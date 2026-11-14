// Place search done on the server: sets a proper User-Agent (required by Nominatim)
// and falls back to Open-Meteo geocoding if Nominatim is unavailable.
const H = { 'User-Agent': 'EarthWave/1.0 (NASA Space Apps prototype)', 'Accept-Language': 'en' };
const getJson = async (u) => { const r = await fetch(u, { headers: H, signal: AbortSignal.timeout(8000) }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };

async function search(q) {
  let failures = 0;
  try {
    const a = await getJson(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`);
    if (a[0]) return { lat: +a[0].lat, lon: +a[0].lon, name: a[0].display_name };
  } catch { failures++; }
  try {
    const b = await getJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`);
    const r = b.results && b.results[0];
    if (r) return { lat: r.latitude, lon: r.longitude, name: [r.name, r.admin1, r.country].filter(Boolean).join(', ') };
  } catch { failures++; }
  if (failures === 2) { const e = new Error('Search services are unreachable right now.'); e.status = 502; throw e; }
  return null;
}
async function reverse(lat, lon) {
  try { const j = await getJson(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&lat=${lat}&lon=${lon}`); return j.display_name || null; }
  catch { return null; }
}
module.exports = { search, reverse };
