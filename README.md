# EarthWave — Listen to the Planet. Understand the Earth.
Interactive map + NASA POWER data + Web Audio sonification (NASA Space Apps 2026, "The Earth Information Jukebox").

## Run
```
cd server && npm install && npm start
```
Open http://localhost:3000 (Node 18+; the Express server also serves `frontend/`).

## Architecture
- `server/` Express API: `GET /api/health`, `GET /api/earth-data` (latitude, longitude, start, end as YYYYMMDD, parameter), `GET /api/earth-data/multiple` (`parameters=T2M,WS2M`, used by the app), `GET /api/geocode?q=` and `GET /api/reverse` (place search via Nominatim with Open-Meteo fallback). Validates input, calls NASA POWER daily point API (community RE), turns -999 fill values into `null`, caches 1 h.
- `frontend/js/` `api.js` (backend calls), `map.js` (Leaflet, NASA GIBS, geocoding), `charts.js`, `sonification.js` (audio engine), `ui.js`, `app.js` (state/wiring).

## Data sources
- NASA POWER (numbers): T2M °C, PRECTOTCORR mm/day, WS2M m/s, ALLSKY_SFC_SW_DWN kWh/m²/day. Daily, historical/near-real-time (lag of several days) — not live.
- NASA GIBS (imagery only), EPSG:3857 "best" WMTS: BlueMarble_ShadedRelief_Bathymetry, MODIS_Terra_CorrectedReflectance_TrueColor, MODIS_Terra_Land_Surface_Temp_Day, IMERG_Precipitation_Rate. Verify/extend against https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml
- OpenStreetMap / Nominatim for base map and place search.

## Sonification mapping (deterministic, min-max normalized per period; 0.3 s per day at 1×)
| Parameter | Sound |
|---|---|
| Temperature | pitch, pentatonic, 220–740 Hz |
| Precipitation | dry = silence; wetter = more/louder drops per day |
| Wind | filtered-noise loudness |
| Solar radiation | low-pass cutoff (300–4000 Hz) brightness |
Missing days are silent rests; nothing is invented. This is a sonification, not a recording of Earth.

## Limits / notes
- Range ≤ 366 days, 1981 onward, end date not in the future.
- Changing speed while paused stops playback.

## Features added in v2
- Multi-parameter selection: parameters play together as separate voices (level auto-balanced); the chart normalizes curves, tooltips show real values.
- Talking globe: "How It Works" reads a 6-step explanation with the browser Web Speech API (English voice; captions shown if speech is unavailable).
- "NASA → Sound" section explaining NASA data → weather variables → sound waves.
