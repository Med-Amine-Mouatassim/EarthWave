import { API_BASE_URL } from './config.js';

// Talks to our backend only (never directly to NASA or to search services).
async function req(url) {
  let res;
  try { res = await fetch(new URL(url, API_BASE_URL)); } catch { throw new Error('Cannot reach the EarthWave server. Is it running?'); }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(json.error || `Request failed (${res.status}).`); e.status = res.status; throw e; }
  return json;
}

export const checkHealth = () => req('/api/health');

// parameters: comma-separated NASA POWER parameter names, e.g. "T2M,WS2M"
export async function fetchEarthData({ latitude, longitude, start, end, parameters }) {
  const common = { latitude, longitude, start, end };
  const selected = String(parameters).split(',').map((parameter) => parameter.trim()).filter(Boolean);
  if (selected.length === 1) {
    const data = await req(`/api/earth-data?${new URLSearchParams({ ...common, parameter: selected[0] })}`);
    // Keep the app's existing series data model while consuming the single-value endpoint.
    const { parameter, name, unit, values, ...rest } = data;
    return { ...rest, series: { [parameter]: { name, unit, values } } };
  }
  return req(`/api/earth-data/multiple?${new URLSearchParams({ ...common, parameters: selected.join(',') })}`);
}
export async function geocode(q) {
  try { return await req('/api/geocode?q=' + encodeURIComponent(q)); }
  catch (e) { if (e.status === 404) return null; throw e; }
}
export async function reverseGeocode(lat, lon) {
  try { return (await req(`/api/reverse?lat=${lat}&lon=${lon}`)).name; } catch { return null; }
}
