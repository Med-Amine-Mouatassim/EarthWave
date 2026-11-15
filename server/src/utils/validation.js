// Parameters supported by EarthWave (all are NASA POWER daily parameters).
const PARAMETERS = ['T2M', 'PRECTOTCORR', 'WS2M', 'ALLSKY_SFC_SW_DWN'];
const MAX_DAYS = 366; // keeps requests fast and sonifications a sensible length

const toDate = (s) => {
  if (!/^\d{8}$/.test(s || '')) return new Date(NaN);
  const year = Number(s.slice(0, 4)), month = Number(s.slice(4, 6)), day = Number(s.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date
    : new Date(NaN);
};

function validate(q, multiple = false) {
  const latitude = Number(q.latitude), longitude = Number(q.longitude);
  if (q.latitude === undefined || !Number.isFinite(latitude) || latitude < -90 || latitude > 90)
    return { error: 'latitude must be a number between -90 and 90.' };
  if (q.longitude === undefined || !Number.isFinite(longitude) || longitude < -180 || longitude > 180)
    return { error: 'longitude must be a number between -180 and 180.' };
  for (const k of ['start', 'end'])
    if (!/^\d{8}$/.test(q[k] || '') || isNaN(toDate(q[k])))
      return { error: `${k} must be a valid date in YYYYMMDD format.` };
  const s = toDate(q.start), e = toDate(q.end);
  if (s < toDate('19810101')) return { error: 'NASA POWER daily data starts in 1981.' };
  if (e < s) return { error: 'end date must not be before start date.' };
  if (e > new Date()) return { error: 'end date cannot be in the future. NASA POWER lags real time by a few days.' };
  if ((e - s) / 864e5 + 1 > MAX_DAYS) return { error: `Date range is limited to ${MAX_DAYS} days.` };
  const raw = multiple ? q.parameters : q.parameter;
  const parameters = String(raw || '').split(',').map((p) => p.trim()).filter(Boolean);
  if (!parameters.length || (!multiple && parameters.length > 1)) return { error: 'Provide a valid parameter.' };
  const bad = parameters.filter((p) => !PARAMETERS.includes(p));
  if (bad.length) return { error: `Unsupported parameter(s): ${bad.join(', ')}. Allowed: ${PARAMETERS.join(', ')}.` };
  return { value: { latitude, longitude, start: q.start, end: q.end, parameters: [...new Set(parameters)] } };
}
module.exports = { validate, PARAMETERS };
