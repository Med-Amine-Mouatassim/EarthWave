// Leaflet map + NASA GIBS imagery layers (EPSG:3857 / GoogleMapsCompatible tiles).
export const GIBS_LAYERS = [
  { id: 'BlueMarble_ShadedRelief_Bathymetry', name: 'Blue Marble (static)', matrix: 'GoogleMapsCompatible_Level8', ext: 'jpeg', time: false, zoom: 8 },
  { id: 'MODIS_Terra_CorrectedReflectance_TrueColor', name: 'MODIS Terra True Color (daily)', matrix: 'GoogleMapsCompatible_Level9', ext: 'jpg', time: true, zoom: 9 },
  { id: 'MODIS_Terra_Land_Surface_Temp_Day', name: 'MODIS Land Surface Temp, day', matrix: 'GoogleMapsCompatible_Level7', ext: 'png', time: true, zoom: 7 },
  { id: 'IMERG_Precipitation_Rate', name: 'IMERG Precipitation Rate', matrix: 'GoogleMapsCompatible_Level6', ext: 'png', time: true, zoom: 6 },
];
let map, marker, gibs, current = GIBS_LAYERS[0]; // Blue Marble by default

export function initMap(onPick) {
  map = L.map('map', { worldCopyJump: true }).setView([33.5731, -7.5898], 5);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);
  map.on('click', (e) => onPick(e.latlng.lat, ((e.latlng.lng + 540) % 360) - 180));
}
export function setMarker(lat, lon, zoom) {
  if (!marker) marker = L.marker([lat, lon]).addTo(map); else marker.setLatLng([lat, lon]);
  if (zoom) map.flyTo([lat, lon], zoom); else map.panTo([lat, lon]);
}
// date = 'YYYY-MM-DD' (daily GIBS layers need a date that has imagery)
export function setGibsLayer(layerId, date) {
  current = GIBS_LAYERS.find((l) => l.id === layerId) || current;
  if (gibs) map.removeLayer(gibs);
  const t = current.time ? `/default/${date}` : '/default';
  gibs = L.tileLayer(`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${current.id}${t}/${current.matrix}/{z}/{y}/{x}.${current.ext}`,
    { maxNativeZoom: current.zoom, maxZoom: 12, opacity: /^(MODIS_Terra_Land|IMERG)/.test(current.id) ? 0.7 : 1, attribution: 'Imagery: NASA EOSDIS GIBS' }).addTo(map);
}
