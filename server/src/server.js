require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();

app.use('/api', require('./routes/earthRoutes'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
// The backend also serves the frontend, so one command runs everything.
app.use(express.static(path.join(__dirname, '../../frontend')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`EarthWave running at http://localhost:${PORT}`));
