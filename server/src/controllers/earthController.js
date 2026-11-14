const { validate } = require('../utils/validation');
const { getPowerData } = require('../services/nasaPowerService');
const fail = (res, err) => res.status(err.status || 500).json({ error: err.message || 'Server error.' });

exports.health = (req, res) => res.json({ status: 'ok', time: new Date().toISOString() });

exports.single = async (req, res) => {
  const v = validate(req.query);
  if (v.error) return res.status(400).json({ error: v.error });
  try {
    const d = await getPowerData(v.value);
    const par = v.value.parameters[0];
    const { series, ...rest } = d;
    res.json({ ...rest, parameter: par, name: series[par].name, unit: series[par].unit, values: series[par].values });
  } catch (e) { fail(res, e); }
};

exports.multiple = async (req, res) => {
  const v = validate(req.query, true);
  if (v.error) return res.status(400).json({ error: v.error });
  try { res.json(await getPowerData(v.value)); } catch (e) { fail(res, e); }
};

const geo = require('../services/geocodeService');
exports.geocode = async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2 || q.length > 100) return res.status(400).json({ error: 'Enter between 2 and 100 characters.' });
  try {
    const r = await geo.search(q);
    if (!r) return res.status(404).json({ error: `No location found for “${q}”.` });
    res.json(r);
  } catch (e) { fail(res, e); }
};
exports.reverse = async (req, res) => {
  const lat = Number(req.query.lat), lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return res.status(400).json({ error: 'Invalid coordinates.' });
  res.json({ name: await geo.reverse(lat, lon) });
};
