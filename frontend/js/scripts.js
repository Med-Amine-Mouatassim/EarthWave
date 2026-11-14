// Texts read aloud. The chart script is built from the real NASA data currently displayed.
export const GLOBE = {
  en: [
    'Welcome to EarthWave. I am the planet, and I will show you how this site works.',
    'First, explore. Click anywhere on the map, or search for a city, to choose a place on Earth.',
    'Second, analyze. Pick one or several science parameters, choose your dates, and EarthWave retrieves daily NASA POWER data and draws it as a chart.',
    'Third, listen. Every daily value becomes sound. Temperature becomes pitch, rain becomes rhythm, wind becomes loudness, and sunlight becomes brightness.',
    'You can also combine several parameters, and hear them play together, like instruments in an orchestra.',
    'Remember, this is a sonification. It is a sound built from data, not a recording of the Earth. Now press Start Listening, and explore.',
  ],
  fr: [
    'Bienvenue sur EarthWave. Je suis la planète, et je vais vous expliquer comment fonctionne ce site.',
    'D’abord, explorez. Cliquez n’importe où sur la carte, ou recherchez une ville, pour choisir un lieu sur Terre.',
    'Ensuite, analysez. Choisissez un ou plusieurs paramètres scientifiques, puis vos dates. EarthWave récupère les données quotidiennes de NASA POWER et les affiche sous forme de graphique.',
    'Enfin, écoutez. Chaque valeur quotidienne devient un son. La température devient la hauteur du son, la pluie devient un rythme, le vent devient le volume, et le soleil devient la brillance.',
    'Vous pouvez aussi combiner plusieurs paramètres, et les entendre jouer ensemble, comme les instruments d’un orchestre.',
    'N’oubliez pas : c’est une sonification. C’est un son construit à partir de données, pas un enregistrement de la Terre. Maintenant, appuyez sur Start Listening, et explorez.',
  ],
};

const UNIT = {
  en: { '°C': 'degrees Celsius', 'mm/day': 'millimeters per day', 'm/s': 'meters per second', 'kWh/m²/day': 'kilowatt-hours per square meter per day' },
  fr: { '°C': 'degrés Celsius', 'mm/day': 'millimètres par jour', 'm/s': 'mètres par seconde', 'kWh/m²/day': 'kilowattheures par mètre carré par jour' },
};
const LABEL = {
  en: { T2M: 'Temperature', PRECTOTCORR: 'Precipitation', WS2M: 'Wind', ALLSKY_SFC_SW_DWN: 'Solar radiation' },
  fr: { T2M: 'Température', PRECTOTCORR: 'Précipitations', WS2M: 'Vent', ALLSKY_SFC_SW_DWN: 'Rayonnement solaire' },
};
const SOUND = {
  en: { T2M: 'temperature becomes pitch, so warmer days sound higher', PRECTOTCORR: 'precipitation becomes rhythm, with silence on dry days', WS2M: 'wind speed becomes loudness', ALLSKY_SFC_SW_DWN: 'solar radiation becomes brightness' },
  fr: { T2M: 'la température devient la hauteur du son, donc les jours chauds sonnent plus aigu', PRECTOTCORR: 'les précipitations deviennent un rythme, avec du silence les jours secs', WS2M: 'la vitesse du vent devient le volume', ALLSKY_SFC_SW_DWN: 'le rayonnement solaire devient la brillance du son' },
};
const TREND = {
  en: { up: 'tended to rise', down: 'tended to fall', stable: 'stayed fairly stable' },
  fr: { up: 'ont eu tendance à augmenter', down: 'ont eu tendance à diminuer', stable: 'sont restées assez stables' },
};
const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const num = (x, l) => { const s = Math.abs(x) < 1 && x !== 0 ? x.toFixed(2) : x.toFixed(1); return l === 'fr' ? s.replace('.', ',') : s; };
const day = (d, l) => new Date(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}T12:00:00Z`)
  .toLocaleDateString(l === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
// Compares the first and second half of the period (real values only).
function trend(values) {
  const v = values.filter((x) => x != null);
  if (v.length < 4) return 'stable';
  const range = Math.max(...v) - Math.min(...v); if (!range) return 'stable';
  const h = Math.floor(v.length / 2), d = (avg(v.slice(h)) - avg(v.slice(0, h))) / range;
  return d > 0.15 ? 'up' : d < -0.15 ? 'down' : 'stable';
}

// data: backend response; params: selected parameter keys; units: { KEY: '°C' ... }
export function chartScript(lang, { place, data, params, units }) {
  const fr = lang === 'fr', d0 = data.dates[0], d1 = data.dates[data.dates.length - 1];
  const lines = [fr
    ? `Voici le graphique pour ${place}, du ${day(d0, lang)} au ${day(d1, lang)}. Il montre ${data.dates.length} jours de données quotidiennes de NASA POWER.`
    : `This is the chart for ${place}, from ${day(d0, lang)} to ${day(d1, lang)}. It shows ${data.dates.length} days of daily data from NASA POWER.`];
  params.forEach((p) => {
    const vals = data.series[p].values, v = vals.filter((x) => x != null);
    const min = Math.min(...v), max = Math.max(...v), unit = UNIT[lang][units[p]] || units[p];
    const dmin = day(data.dates[vals.indexOf(min)], lang), dmax = day(data.dates[vals.indexOf(max)], lang);
    const miss = vals.length - v.length, t = TREND[lang][trend(vals)];
    let s = fr
      ? `${LABEL.fr[p]}. La moyenne était de ${num(avg(v), lang)} ${unit}. La valeur la plus basse était ${num(min, lang)}, le ${dmin}, et la plus haute était ${num(max, lang)}, le ${dmax}. Sur la période, les valeurs ${t}.`
      : `${LABEL.en[p]}. The average was ${num(avg(v), lang)} ${unit}. The lowest value was ${num(min, lang)}, on ${dmin}, and the highest was ${num(max, lang)}, on ${dmax}. Over the period, the values ${t}.`;
    if (miss) s += fr ? ` ${miss} jour${miss > 1 ? 's' : ''} sans données ${miss > 1 ? 'resteront silencieux' : 'restera silencieux'}.`
                      : ` ${miss} ${miss > 1 ? 'days have' : 'day has'} no data and will stay silent.`;
    lines.push(s);
  });
  if (params.length > 1) lines.push(fr
    ? 'Les courbes sont normalisées entre zéro et un pour comparer leurs formes. Passez la souris sur le graphique pour voir les vraies valeurs.'
    : 'The curves are normalized between zero and one so that their shapes can be compared. Hover over the chart to see the real values.');
  const snd = params.map((p) => SOUND[lang][p]).join(fr ? ' ; ' : '; ');
  lines.push(fr ? `Quand vous appuyez sur lecture : ${snd}. N’oubliez pas : c’est une sonification, pas un enregistrement de la Terre.`
                : `When you press play: ${snd}. Remember, this is a sonification, not a recording of the Earth.`);
  return lines;
}
