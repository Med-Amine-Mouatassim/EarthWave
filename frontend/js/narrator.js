// Generic speech engine (Web Speech API) used by the talking globe AND the chart explainer.
// Only one voice speaks at a time. Callbacks follow the real speech state.
const tts = 'speechSynthesis' in window;
let cur = null, token = 0; // token lets us ignore late events from a cancelled narration

function voicesFor(lang) { return tts ? speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(lang)) : []; }
// Warn only when voices are loaded but none matches the language.
export const hasVoice = (lang) => !tts || speechSynthesis.getVoices().length === 0 || voicesFor(lang).length > 0;
function pickVoice(lang) {
  const v = voicesFor(lang);
  const forced = v.find(x => /Aria|Zira|David|Mark/i.test(x.name));
if (forced) return forced;
  const pref = lang === 'fr' ? /fr-FR/i : /en-(GB|US)/i;
  return v.find((x) => /natural|google|online/i.test(x.name) && pref.test(x.lang)) || v.find((x) => pref.test(x.lang)) || v[0];
}
export function stopNarration() {
  if (!cur) return;
  const c = cur; cur = null; token++; clearTimeout(c.timer);
  if (tts) speechSynthesis.cancel();
  c.hooks.speaking(false); c.hooks.state(false); c.hooks.caption('', '');
}
// id: 'globe-en' ...; lang: 'en' | 'fr'; lines: array of sentences; hooks: { state, speaking, caption }
// Calling it again with the same id stops it (toggle); a different id replaces the current narration.
export function narrate({ id, lang, lines, hooks, label = () => '' }) {
  const same = cur && cur.id === id;
  stopNarration(); if (same) return;
  const my = ++token; cur = { id, hooks, timer: null };
  hooks.state(true);
  const step = (i) => {
    if (my !== token) return;
    if (i >= lines.length) return stopNarration();
    hooks.caption(lines[i], label(i, lines.length));
    const wait = lines[i].length * 65; // used for the captions-only fallback
    const next = () => { if (my !== token) return; hooks.speaking(false); step(i + 1); };
    if (!tts) { hooks.speaking(true); cur.timer = setTimeout(next, wait); return; }
    const u = new SpeechSynthesisUtterance(lines[i]);
    u.lang = lang === 'fr' ? 'fr-FR' : 'en-US'; u.rate = 0.95;
    const v = pickVoice(lang); if (v) { u.voice = v; u.lang = v.lang; }
    u.onstart = () => { if (my === token) hooks.speaking(true); };
    u.onend = next;
    u.onerror = (e) => { if (my !== token || e.error === 'canceled' || e.error === 'interrupted') return; cur.timer = setTimeout(next, wait); };
    speechSynthesis.speak(u);
  };
  if (tts) speechSynthesis.cancel();
  setTimeout(() => step(0), 80); // small delay: some browsers drop speak() right after cancel()
}
