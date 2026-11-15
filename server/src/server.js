require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();

// Permit local frontend dev servers (for example VS Code Live Server) while
// keeping production CORS controlled by the Worker configuration.
app.use((req, res, next) => {
  const origin = req.get('Origin');
  if (origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use('/api', require('./routes/earthRoutes'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
// The backend also serves the frontend, so one command runs everything.
app.use(express.static(path.join(__dirname, '../../frontend')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`EarthWave running at http://localhost:${PORT}`));
