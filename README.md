🌍 EarthWave — Listen to the Planet. Understand the Earth.

EarthWave is an interactive platform that transforms Earth science, meteorological data, and geological information into immersive sound experiences through data sonification.

Our goal is to offer a new way to explore and understand our planet: not only by seeing environmental data through maps and visualizations, but also by listening to it.

🚀 Project Overview

EarthWave connects science, technology, geography, and sound to make environmental information more accessible and engaging.

By combining NASA environmental datasets, geographic exploration, geological characteristics, and audio synthesis, the platform creates unique soundscapes inspired by Earth's conditions.

✨ Main Features :

🌎 1. Earth Explorer

Explore geographic locations and discover environmental information using NASA data.

Interactive world map.

Geographic location selection.

NASA POWER environmental datasets.

NASA GIBS satellite imagery and visualization layers.

Meteorological data visualization.

Sound generation based on environmental measurements.

🎧 2. EarthWave Studio

Create personalized environmental soundscapes by configuring your own virtual environment.

Select different soil types.

Explore geological rock types.

Configure temperature.

Adjust precipitation.

Control humidity and wind conditions.

Generate customized environmental sounds.

🔊 3. Data Sonification

EarthWave translates numerical environmental information into sound characteristics using algorithmic mappings.

Examples:

Environmental Parameter

Sound Mapping

Temperature

Pitch and frequency

Precipitation

Rhythm and event density

Wind speed

Noise intensity and modulation

Humidity

Sound filtering and texture

Atmospheric pressure

Background tonal layer

These mappings are creative sonification rules, not direct physical laws.

🛰️ NASA Data Sources

EarthWave uses NASA scientific resources to explore environmental conditions.

NASA POWER

Temperature (T2M).

Precipitation (PRECTOTCORR).

Wind speed (WS2M).

Relative humidity (RH2M).

Atmospheric pressure (PS).

Solar radiation (ALLSKY_SFC_SW_DWN).

NASA GIBS / Worldview

Satellite imagery.

Earth observation layers.

Geographic visualization.

Resources:

NASA POWER

NASA POWER Documentation

NASA Worldview

NASA GIBS Documentation

Note: NASA POWER datasets are not necessarily instantaneous real-time weather observations. Data availability and latency depend on the dataset and parameter.

🪨 Geology and Environmental Soundscapes

EarthWave Studio combines geological and atmospheric characteristics to create different sound environments.

Soil examples:

Sandy soil.

Clay soil.

Silty soil.

Loamy soil.

Peaty soil.

Rock examples:

Granite.

Basalt.

Limestone.

Sandstone.

Marble.

Slate.

The geological sound representations are algorithmic artistic interpretations, not recordings or measured acoustic fingerprints of these materials.

🧬 Sound and Living Organisms

The project also introduces fundamental concepts of sound waves:

Frequency (Hz).

Amplitude.

Sound intensity (dB).

Human audible range.

Animal hearing and acoustic communication.

Biological responses to mechanical vibrations.

EarthWave is an educational and scientific exploration platform. It does not claim therapeutic or medical effects from generated sounds.

🛠️ Technologies

Technology

Purpose

HTML5

Page structure

CSS3

Interface and visual design

JavaScript

Application logic

Node.js

Backend runtime

Express.js

API server

Leaflet.js

Interactive maps

Chart.js

Data visualization

Web Audio API

Sound generation

NASA POWER API

Environmental datasets

NASA GIBS

Satellite imagery

🏗️ Project Architecture

EarthWave is organized around two main experiences:

Earth Explorer: Retrieves available environmental data for selected geographic locations, visualizes the measurements, and transforms them into sound.

EarthWave Studio: Allows users to configure a virtual environment and generate customized soundscapes directly in the browser.

The backend handles external data requests and processing, while the browser handles interactive visualization and audio generation.

⚙️ Installation and Setup

Requirements

Node.js

npm

Git

### Backend local

From `server/`, install the backend packages and run the Express development server:

```sh
npm install
npm start
```

It listens at `http://localhost:3000`. For the frontend's configured local API, use `npm run dev:worker` (Wrangler listens at `http://localhost:8787`). `.env` is only used by the local Express server; do not commit it. `CACHE_TTL_SECONDS` is optional and defaults to 3600.

### Cloudflare Workers deployment

The API Worker lives in `server/src/worker.js`; it does not serve static files. Cloudflare Pages continues to host the files in `frontend/`. Wrangler is a development dependency of the backend.

Before deploying, update the two URL placeholders:

1. In `server/wrangler.jsonc`, set `vars.ALLOWED_ORIGIN` to the exact production Pages origin, including `https://` and no trailing slash (for example `https://earthwave.pages.dev`). This is the only production origin allowed by CORS; localhost origins are allowed for local development.
2. In `frontend/js/config.js`, set the production `API_BASE_URL` to the deployed Worker URL. Local pages served on `localhost` or `127.0.0.1` use `http://localhost:8787` automatically.

Then run these commands from `server/`:

```sh
npm install
npm run dev:worker
npm run deploy
```

`npm run dev:worker` starts Wrangler's local Worker preview. `npm run deploy` deploys using the account already authenticated with Wrangler. First-time setup requires `npx wrangler login` in a browser and your approval; no account action was performed as part of this code change. Wrangler prints the final `workers.dev` URL after deployment. Copy it into `frontend/js/config.js`, then publish the frontend directory to Cloudflare Pages.

No secrets or API keys are required for the current NASA POWER, Nominatim, or Open-Meteo endpoints. If credentials are added later, store them with `npx wrangler secret put NAME`; never put them in `vars`, source files, or `.env` committed to Git.

The Worker handles the same five GET endpoints and JSON payloads, applies the existing request validation, answers preflight `OPTIONS`, and allows only the configured Pages origin plus localhost development origins. Successful NASA data responses use Cloudflare's data-center Cache API for one hour; cache contents are best effort and are not globally replicated. The local Express server keeps its own bounded in-memory cache.

### Local API checks

With the local server running, check health and validation responses:

```sh
curl "http://localhost:3000/api/health"
curl -i "http://localhost:3000/api/earth-data?latitude=91&longitude=0&start=20260101&end=20260102&parameter=T2M"
curl -i -X OPTIONS "http://localhost:3000/api/health" -H "Origin: http://localhost:5500" -H "Access-Control-Request-Method: GET"
```

To smoke-test the Worker routes locally, use `npm run dev:worker` and replace port `8787` below as Wrangler reports:

```sh
curl "http://localhost:8787/api/health"
curl -i "http://localhost:8787/api/earth-data?latitude=91&longitude=0&start=20260101&end=20260102&parameter=T2M"
curl -i -X OPTIONS "http://localhost:8787/api/health" -H "Origin: http://localhost:5500" -H "Access-Control-Request-Method: GET"
```
