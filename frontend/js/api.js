// Talks to our backend only (never directly to NASA or to search services).
async function req(url) {
  let res;
  try { res = await fetch(url); } catch { throw new Error('Cannot reach the EarthWave server. Is it running?'); }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(json.error || `Request failed (${res.status}).`); e.status = res.status; throw e; }
  return json;
}
// parameters: comma-separated NASA POWER parameter names, e.g. "T2M,WS2M"
export const fetchEarthData = ({ latitude, longitude, start, end, parameters }) =>
  req(`/api/earth-data/multiple?${new URLSearchParams({ latitude, longitude, start, end, parameters })}`);
export async function geocode(q) {
  try { return await req('/api/geocode?q=' + encodeURIComponent(q)); }
  catch (e) { if (e.status === 404) return null; throw e; }
}
export async function reverseGeocode(lat, lon) {
  try { return (await req(`/api/reverse?lat=${lat}&lon=${lon}`)).name; } catch { return null; }
}
