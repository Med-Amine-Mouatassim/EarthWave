import validation from './utils/validation.js';
import nasaPower from './services/nasaPowerService.js';
import geocode from './services/geocodeService.js';

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
});

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = origin && (
    origin === env.ALLOWED_ORIGIN ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  );
  const headers = { Vary: 'Origin' };
  if (allowed) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Access-Control-Max-Age'] = '86400';
  }
  return headers;
}

function fail(error, headers) {
  return json({ error: error.message || 'Server error.' }, error.status || 500, headers);
}

async function cached(request, handler, headers) {
  const cache = globalThis.caches?.default;
  if (request.method !== 'GET' || !cache) return handler();
  const key = new Request(request.url, { method: 'GET' });
  let hit;
  try { hit = await cache.match(key); } catch { return handler(); }
  if (hit) {
    const response = new Response(hit.body, hit);
    for (const name of ['Access-Control-Allow-Origin', 'Access-Control-Allow-Methods', 'Access-Control-Allow-Headers', 'Access-Control-Max-Age']) response.headers.delete(name);
    for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
    return response;
  }
  const response = await handler();
  if (response.ok) {
    const stored = new Response(response.clone().body, response);
    stored.headers.set('Cache-Control', 'public, max-age=3600');
    try { await cache.put(key, stored); } catch { /* Cache is best effort on Workers. */ }
  }
  for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
  return response;
}

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '') || '/';
  const q = Object.fromEntries(url.searchParams);
  const headers = corsHeaders(request, env);

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405, headers);
  try {
    if (path === '/api/health') return json({ status: 'ok', time: new Date().toISOString() }, 200, headers);
    if (path === '/api/earth-data' || path === '/api/earth-data/multiple') {
      const multiple = path.endsWith('/multiple');
      const result = validation.validate(q, multiple);
      if (result.error) return json({ error: result.error }, 400, headers);
      const getResponse = async () => {
        const data = await nasaPower.getPowerData(result.value);
        if (multiple) return json(data, 200, headers);
        const parameter = result.value.parameters[0];
        const { series, ...rest } = data;
        return json({ ...rest, parameter, name: series[parameter].name, unit: series[parameter].unit, values: series[parameter].values }, 200, headers);
      };
      return cached(request, getResponse, headers);
    }
    if (path === '/api/geocode') {
      const query = String(q.q || '').trim();
      if (query.length < 2 || query.length > 100) return json({ error: 'Enter between 2 and 100 characters.' }, 400, headers);
      const result = await geocode.search(query);
      if (!result) return json({ error: `No location found for “${query}”.` }, 404, headers);
      return json(result, 200, headers);
    }
    if (path === '/api/reverse') {
      const lat = Number(q.lat), lon = Number(q.lon);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180)
        return json({ error: 'Invalid coordinates.' }, 400, headers);
      return json({ name: await geocode.reverse(lat, lon) }, 200, headers);
    }
    return json({ error: 'Endpoint not found.' }, 404, headers);
  } catch (error) { return fail(error, headers); }
}

export default { fetch: route };
