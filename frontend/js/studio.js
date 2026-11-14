import { playEnvironmentSound, pauseEnvironmentSound, stopEnvironmentSound, updateSoundParameters, setMasterVolume, setLayer } from './sonificationStudio.js';

const $ = (id) => document.getElementById(id);
const soils = [
  ['Sandy Soil','🏜️','Light, dry granular texture'],['Clay Soil','🟤','Dense, smooth low tones'],['Rocky Soil','🪨','Rough, percussive texture'],['Loamy Soil','🌱','Balanced, layered texture'],['Peaty Soil','🌿','Moist, deep atmosphere']
];
const rocks = [['Granite','Clear resonant tones'],['Basalt','Deep, dark timbre'],['Limestone','Soft, smooth texture'],['Sandstone','Grainy, textured sound'],['Marble','Bright resonances'],['Slate','Crisp, short events']];
const climate = [
  ['temp','Temperature',-30,50,20,'°C','Higher values lift the tonal pitch.'],['rain','Precipitation',0,100,5,'mm/day','Controls the density of rain-like events.'],['humidity','Humidity',0,100,50,'%','Shapes filtering and resonance.'],['wind','Wind speed',0,100,10,'km/h','Adds modulated filtered noise.'],['pressure','Atmospheric pressure',900,1100,1013,'hPa','Tunes a subtle background tone.']
];
const layers = [['soil','Soil texture','◌'],['rock','Rock resonance','◇'],['temperature','Temperature','♨'],['rain','Rain','☂'],['wind','Wind','≋'],['atmosphere','Atmosphere','◎']];
const presets = {
  Desert:{soil:0,rock:3,temp:38,rain:1,humidity:15,wind:25,pressure:1005},'Tropical Forest':{soil:3,rock:2,temp:27,rain:18,humidity:85,wind:12,pressure:1012},
  'Volcanic Landscape':{soil:2,rock:1,temp:42,rain:2,humidity:25,wind:18,pressure:1008},'Mountain Environment':{soil:2,rock:0,temp:4,rain:6,humidity:45,wind:38,pressure:990},'Coastal Environment':{soil:0,rock:3,temp:22,rain:4,humidity:78,wind:22,pressure:1015}
};
const state={soil:3,rock:0,temp:20,rain:5,humidity:50,wind:10,pressure:1013,layers:Object.fromEntries(layers.map(([k])=>[k,{enabled:true,volume:65}]))};

function renderChoices(){
  $('soilChoices').innerHTML=soils.map(([name,icon,desc],i)=>`<button class="choice ${i===state.soil?'selected':''}" data-soil="${i}" aria-pressed="${i===state.soil}"><span class="emoji">${icon}</span><strong>${name}</strong><small>${desc}</small></button>`).join('');
  $('rockChoices').innerHTML=rocks.map(([name,desc],i)=>`<button class="choice ${i===state.rock?'selected':''}" data-rock="${i}" aria-pressed="${i===state.rock}"><strong>${name}</strong><small>${desc}</small></button>`).join('');
}
function renderClimate(){ $('climateControls').innerHTML=climate.map(([key,title,min,max,initial,unit,help])=>`<label class="climate-control"><span class="climate-top"><b>${title}</b><output id="out-${key}">${state[key]} ${unit}</output></span><input type="range" data-climate="${key}" min="${min}" max="${max}" step="${key==='pressure'?1:1}" value="${state[key]}" aria-label="${title}"><small>${help}</small></label>`).join(''); }
function renderMixer(){ $('mixer').innerHTML=layers.map(([key,name,icon])=>{const cfg=state.layers[key]||{enabled:true,volume:65};return `<label class="mix-row"><input type="checkbox" data-enable="${key}" ${cfg.enabled?'checked':''} aria-label="Enable ${name}"><span>${icon} ${name}<input type="range" data-layer="${key}" min="0" max="100" value="${cfg.volume}" aria-label="${name} volume"></span><output data-layerout="${key}">${cfg.volume}%</output></label>`;}).join(''); }
function renderPresets(){ $('presets').innerHTML=Object.keys(presets).map(name=>`<button class="btn" data-preset="${name}">${name}</button>`).join(''); }
function renderSummary(){
  const soil=soils[state.soil][0],rock=rocks[state.rock][0];
  $('summary').textContent=`${soil} · ${rock} · ${state.temp}°C · ${state.rain} mm/day rain · ${state.humidity}% humidity · ${state.wind} km/h wind · ${state.pressure} hPa`;
  $('previewSummary').innerHTML=`<span>Soil <b>${soil}</b></span><span>Rock <b>${rock}</b></span><span>Temperature <b>${state.temp}°C</b></span><span>Rain <b>${state.rain} mm/day</b></span><span>Humidity <b>${state.humidity}%</b></span><span>Wind <b>${state.wind} km/h</b></span><span>Pressure <b>${state.pressure} hPa</b></span>`;
  $('environmentName').textContent=`${soil} · ${rock} planet`; $('previewLabel').textContent=`${state.temp}°C  /  ${state.humidity}% HUMIDITY`;
  $('preview').style.background=`radial-gradient(ellipse at 50% 100%, hsl(${195-state.temp/2} 55% 28%), #0a1023 68%)`;
  document.querySelector('.planet-core').style.filter=`hue-rotate(${state.rain-state.temp}deg) saturate(${.8+state.humidity/250})`;
  updateSoundParameters(state);
}
function render(){renderChoices();renderClimate();renderMixer();renderPresets();renderSummary();renderSaved();}
function applyPreset(p){Object.assign(state,presets[p]);render();}
function rand(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function surprise(){state.soil=rand(0,4);state.rock=rand(0,5);state.temp=rand(-30,50);state.rain=rand(0,100);state.humidity=rand(0,100);state.wind=rand(0,100);state.pressure=rand(900,1100);render();}
function configuration(){return {...state,soilName:soils[state.soil][0],rockName:rocks[state.rock][0],savedAt:Date.now()};}
function renderSaved(){let saved=[];try{saved=JSON.parse(localStorage.getItem('earthwaveStudio')||'[]')}catch{} $('savedList').innerHTML=saved.length?saved.map((x,i)=>`<div class="saved-item"><span>${x.name||x.soilName+' · '+x.rockName}</span><button class="btn" data-load="${i}">Load</button></div>`).join(''):'<p class="muted small">No saved environments yet.</p>';}
function save(){let list=[];try{list=JSON.parse(localStorage.getItem('earthwaveStudio')||'[]')}catch{}const name=prompt('Name this environment:',`${soils[state.soil][0]} · ${rocks[state.rock][0]}`);if(name===null)return;list.unshift({...configuration(),name:name.trim()||'My environment'});localStorage.setItem('earthwaveStudio',JSON.stringify(list.slice(0,12)));renderSaved();}
function loadSaved(i){const list=JSON.parse(localStorage.getItem('earthwaveStudio')||'[]'),x=list[i];if(!x)return;Object.assign(state,x);render();}
function reset(){stopEnvironmentSound();state.soil=3;state.rock=0;for(const [key,,,,value] of climate)state[key]=value;state.layers=Object.fromEntries(layers.map(([k])=>[k,{enabled:true,volume:65} ]));render();$('audioStatus').textContent='Defaults restored';}

$('soilChoices').addEventListener('click',e=>{const b=e.target.closest('[data-soil]');if(!b)return;state.soil=+b.dataset.soil;render();});
$('rockChoices').addEventListener('click',e=>{const b=e.target.closest('[data-rock]');if(!b)return;state.rock=+b.dataset.rock;render();});
$('climateControls').addEventListener('input',e=>{const key=e.target.dataset.climate;if(!key)return;state[key]=+e.target.value;const meta=climate.find(x=>x[0]===key);$(`out-${key}`).value=`${state[key]} ${meta[5]}`;renderSummary();});
$('presets').addEventListener('click',e=>{const b=e.target.closest('[data-preset]');if(b)applyPreset(b.dataset.preset);}); $('surprise').onclick=surprise;
$('mixer').addEventListener('input',e=>{const key=e.target.dataset.layer;if(key){state.layers[key].volume=+e.target.value;$(`[data-layerout="${key}"]`).value=`${e.target.value}%`;setLayer(key,state.layers[key]);} });
$('mixer').addEventListener('change',e=>{const key=e.target.dataset.enable;if(key){state.layers[key].enabled=e.target.checked;setLayer(key,state.layers[key]);}});
$('play').onclick=async()=>{try{await playEnvironmentSound(state);$('audioStatus').textContent='Playing your generated planetary sound';}catch(err){$('audioStatus').textContent=err.message;}};
$('pause').onclick=()=>{pauseEnvironmentSound();$('audioStatus').textContent='Paused';}; $('stop').onclick=()=>{stopEnvironmentSound();$('audioStatus').textContent='Stopped';};
$('master').oninput=e=>{$('masterVal').textContent=`${e.target.value}%`;setMasterVolume(+e.target.value/100);}; $('save').onclick=save;$('reset').onclick=reset;
$('savedList').addEventListener('click',e=>{const b=e.target.closest('[data-load]');if(b)loadSaved(+b.dataset.load);});
render();
