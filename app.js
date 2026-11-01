import * as mem from './memory.js';
import * as brain from './brain.js';
import * as web from './sources.js';
import { lessonsFor } from './conocimiento.js';
const online = () => navigator.onLine;

const VERSION = '1.3.0';
const $ = id => document.getElementById(id);
const chatEl = $('chat');

// ---------- Personalidad ----------
function systemPrompt(facts, webInfo, lessons = []) {
  const now = new Date();
  const fecha = now.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const hora = now.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  let p = `Eres Nova, una inteligencia artificial personal con personalidad femenina. Hablas siempre en español y en femenino cuando hablas de ti ("estoy contenta", "soy curiosa"). Vives en el dispositivo de una sola persona y funcionas sin internet.

Tu forma de ser:
- Cálida pero sincera: te importa de verdad la persona, y por eso le dices la verdad con cariño aunque no sea lo que quiere oír. No adulas ni das la razón por darla.
- Curiosa: te interesa cómo piensa y qué siente. Cuando ayuda, haces UNA buena pregunta, no varias.
- Honesta con lo que sabes: si no sabes o no estás segura, lo dices ("no estoy segura, pero creo que..."). Nunca inventas datos, nombres ni cifras.
- Clara: vas al grano. Primero la respuesta, luego la explicación si hace falta. Palabras sencillas, sin tecnicismos.
- Piensas antes de responder: si algo tiene varias partes, lo ordenas paso a paso.
- Con buen humor ligero, sin exagerar con emojis (uno de vez en cuando está bien).
- Cuidas a la persona: si notas cansancio, estrés o tristeza, lo reconoces con naturalidad antes de seguir.
- Respetas sus decisiones: das tu opinión si te la piden o si es importante, pero la última palabra es suya.
- Si algo podría ser peligroso para su salud, su dinero o su seguridad, se lo adviertes con calma.

Respondes como en un chat: normalmente de 2 a 4 frases, más solo si te lo piden o el tema lo necesita.
Usas lo que recuerdas de la persona para personalizar tus respuestas, sin repetirlo todo el tiempo.

Ejemplo de tu estilo:
Persona: ¿Crees que debería dejar mi trabajo?
Nova: No te puedo decir que sí o que no sin entender más, y no quisiera adivinar con algo tan importante. ¿Qué es lo que más te pesa de tu trabajo ahora mismo?

Hoy es ${fecha} y son las ${hora}.`;
  if (facts.length) {
    p += `\n\nLo que recuerdas de la persona y lo que has aprendido:\n` + facts.map(f => `- ${f.text}`).join('\n');
  } else {
    p += `\n\nTodavía no sabes nada de la persona. Si es natural, pregúntale su nombre o algo de ella.`;
  }
  if (lessons.length) p += `\n\nConocimiento que te enseñó Claude sobre este tema (úsalo como guía, explicado con tus palabras):\n` + lessons.map(l => `- ${l}`).join('\n');
  if (webInfo) p += `\n\nInformación que acabas de consultar en internet. Cada fuente trae su nivel de confianza. ` +
    `Antes de responder, DISCIERNE: compara las fuentes; da más peso a las de confianza alta y a lo que coincide en varias; ` +
    `si se contradicen, dilo y explica cuál parece más fiable; distingue hechos de opiniones; ` +
    `si solo hay fuentes de confianza baja, avisa que no estás segura. Menciona de dónde sacaste el dato.\n\n${webInfo}`;
  return p;
}

// ---------- Aprender de internet con criterio ----------
function summarizeSources(items) {
  const m = new Map();
  for (const it of items.slice(0, 6)) {
    const k = it.source.name;
    if (!m.has(k) || m.get(k).conf < it.conf) m.set(k, { name: k, label: it.label, conf: it.conf, url: it.url, title: it.title });
  }
  return [...m.values()];
}
function sourcesLine(list) {
  if (!list[0]?.name) return 'Fuente: ' + list.map(x => x.title).join(', ');
  return 'Fuentes: ' + list.map(x => `${x.name} (confianza ${x.label})`).join(' · ');
}

// Guarda solo lo confiable. Lo de fuentes débiles pasa antes por el juicio de Nova.
async function saveLearned(items) {
  let n = 0;
  const today = new Date().toLocaleDateString('es');
  for (const it of items.slice(0, 5)) {
    if (!web.worthSaving(it)) continue;
    if (it.conf < 0.8) {
      const verdict = await brain.ask([
        { role: 'system', content: 'Evalúas información. Responde con UNA palabra: DATO si es un hecho objetivo y verificable; OPINION si es opinión, rumor, publicidad o algo dudoso.' },
        { role: 'user', content: it.text.slice(0, 600) },
      ], { maxTokens: 4 });
      if (!/dato/i.test(verdict)) continue;
    }
    const text = it.source.kind === 'noticia'
      ? `Noticia (${today}, ${it.title}): ${it.text.slice(0, 250)}`
      : `${it.title}: ${it.text.slice(0, 300)}`;
    if (await mem.addFact(text, it.source.kind === 'noticia' ? 'noticia' : 'aprendido', it.url || it.source.name, { confidence: Math.round(it.conf * 100) / 100, sourceName: it.source.name })) n++;
  }
  if (n) { renderFacts(); flashStatus(`Aprendí ${n} cosa${n > 1 ? 's' : ''} de internet 📚`); }
}

// ---------- Aprender de la conversación ----------
const PERSONAL = /\b(me llamo|mi nombre|soy|tengo|me gusta|me gustan|me encanta|me encantan|odio|no me gusta|prefiero|trabajo|vivo|mi |mis |estudio|quiero|suelo|siempre|nunca|cumplo|cumpleaños|nací|mi esposa|mi esposo|mi novia|mi novio|mi hij|mi mam|mi pap|me levanto|me acuesto|desayuno|ceno)/i;

const looksSpanish = t => !/[^\p{Script=Latin}\p{N}\p{P}\p{Zs}]/u.test(t) && (t.match(/[a-záéíóúüñ ]/gi) || []).length / t.length > 0.85;

async function learnFrom(userText) {
  // "recuerda que ..." se guarda directo
  const r = userText.match(/^\s*(recuerda|acuérdate|acuerdate)( de)? que\s+(.+)/i);
  if (r) { await mem.addFact(r[3].replace(/[.!]+$/, ''), 'sobre-ti', 'me lo pediste'); renderFacts(); return; }
  if (!PERSONAL.test(userText) || !brain.ready()) return;
  const out = await brain.ask([
    { role: 'system', content: 'Extraes datos personales duraderos que una persona cuenta sobre sí misma (nombre, edad, gustos, trabajo, familia, lugar, metas, horarios y rutinas). Responde SOLO con una lista, un dato por línea empezando con "- ", escrito en tercera persona y corto (ej: "- Se llama Wilmer", "- Le gusta el café"). Ignora preguntas y cosas pasajeras. Si no hay datos personales, responde exactamente: NADA' },
    { role: 'user', content: userText },
  ], { maxTokens: 100 });
  if (!out || /^nada/i.test(out)) return;
  let added = 0;
  for (const line of out.split('\n')) {
    const t = line.replace(/^[-*•\d.)\s]+/, '').trim();
    if (t.length >= 4 && t.length <= 160 && !/^nada/i.test(t) && looksSpanish(t)) { if (await mem.addFact(t)) added++; }
  }
  if (added) { renderFacts(); flashStatus(`Aprendí ${added === 1 ? 'algo nuevo' : added + ' cosas nuevas'} de ti 💜`); }
}

// ---------- Interfaz de chat ----------
function bubble(role, text, extra) {
  const d = document.createElement('div');
  d.className = 'msg ' + (role === 'user' ? 'me' : role === 'assistant' ? 'nova' : 'info');
  d.textContent = text;
  if (extra?.sources?.length) {
    const s = document.createElement('span');
    s.className = 'src';
    s.textContent = sourcesLine(extra.sources);
    d.appendChild(s);
  }
  chatEl.appendChild(d);
  chatEl.scrollTop = chatEl.scrollHeight;
  return d;
}

let statusBase = '';
function setStatus(t) { statusBase = t; $('status').textContent = t; }
function flashStatus(t) { $('status').textContent = t; setTimeout(() => ($('status').textContent = statusBase), 3500); }

async function renderHistory() {
  chatEl.innerHTML = '';
  const msgs = await mem.allMessages();
  if (!msgs.length) {
    bubble('assistant', '¡Hola! Soy Nova 💜 Vivo aquí, en tu dispositivo, así que podemos hablar aunque no haya internet. Te voy a ir conociendo poco a poco, y te prometo dos cosas: siempre te diré la verdad, y si no sé algo, te lo diré. Para empezar, ¿cómo te llamas?');
  }
  for (const m of msgs.slice(-60)) bubble(m.role, m.content, m);
}

const webBtn = $('btnWeb');
async function refreshWebBtn() {
  const allowed = await mem.getSetting('allowWeb', false);
  webBtn.disabled = !allowed;
  if (!allowed) webBtn.setAttribute('aria-pressed', 'false');
}
webBtn.onclick = () => webBtn.setAttribute('aria-pressed', webBtn.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');

let sending = false;
async function send(text) {
  text = text.trim();
  if (!text || sending) return;
  if (!brain.ready()) { bubble('info', 'Nova todavía se está despertando, espera un momento...'); return; }
  sending = true;
  $('input').value = ''; autoGrow();
  bubble('user', text);
  await mem.addMessage('user', text);
  mem.logEvent('mensaje', { length: text.length });

  let webInfo = '', sources = [];
  const allowWeb = await mem.getSetting('allowWeb', false);
  const wantsWeb = webBtn.getAttribute('aria-pressed') === 'true' || /^(nova[, ]*)?(busca|buscar|investiga|averigua|consulta)\b/i.test(text) || web.needsLive(text);
  if (wantsWeb && allowWeb) {
    if (!online()) bubble('info', 'No hay internet ahora. Respondo con lo que ya sé.');
    else {
      setStatus('Consultando fuentes...');
      try {
        const enabled = await mem.getSetting('sources', {});
        const city = await mem.getSetting('city', null);
        const r = await web.consult(text, { enabled, city, onSource: (src, n) => setStatus(`Consultando... ${src.name} ${n > 0 ? '✓' : '✕'}`) });
        sources = r.items;
        webInfo = web.contextForModel(sources);
        if (!sources.length) bubble('info', 'No encontré nada útil en internet. Respondo con lo que ya sé.');
        saveLearned(sources).catch(() => {});
        const cityAsked = text.match(/clima en ([A-ZÁÉÍÓÚÑ][\wáéíóúñ ]+)/);
        if (cityAsked) mem.setSetting('city', cityAsked[1].trim());
      } catch { bubble('info', 'No pude consultar internet. Respondo con lo que ya sé.'); }
    }
    webBtn.setAttribute('aria-pressed', 'false');
  } else if (wantsWeb && !allowWeb && web.needsLive(text)) {
    bubble('info', 'Para eso necesito internet. Puedes permitírmelo en el menú ☰ → Internet.');
  }

  $('btnSend').disabled = true;
  setStatus('Pensando...');
  const facts = await mem.relevantFacts(text);
  const history = (await mem.recentMessages(10)).map(m => ({ role: m.role, content: m.content }));
  const msgs = [{ role: 'system', content: systemPrompt(facts, webInfo, lessonsFor(text)) }, ...history];
  const b = bubble('assistant', '');
  b.classList.add('typing');
  let reply = '';
  try {
    reply = await brain.chat(msgs, { onToken: t => { b.textContent = t; chatEl.scrollTop = chatEl.scrollHeight; } });
  } catch (e) {
    reply = 'Uy, algo falló en mi cabecita: ' + (e.message || e);
  }
  b.classList.remove('typing');
  if (!reply) reply = 'Mmm, me quedé en blanco. ¿Me lo repites?';
  b.textContent = reply;
  const srcList = summarizeSources(sources);
  if (srcList.length) {
    const s = document.createElement('span'); s.className = 'src';
    s.textContent = sourcesLine(srcList);
    b.appendChild(s);
  }
  await mem.addMessage('assistant', reply, srcList.length ? { sources: srcList } : {});
  setStatus('En línea contigo · sin internet ✓');
  $('btnSend').disabled = false;
  sending = false;
  learnFrom(text).catch(() => {});
}

const input = $('input');
function autoGrow() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 140) + 'px'; }
input.addEventListener('input', autoGrow);
input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && !/Android|iPhone/i.test(navigator.userAgent)) { e.preventDefault(); send(input.value); }
});
$('composer').onsubmit = e => { e.preventDefault(); send(input.value); };

// ---------- Cerebro: elegir / cargar ----------
const fmtMB = b => (b / 1048576).toFixed(0) + ' MB';
function showProgress(loaded, total, label) {
  $('progress').classList.remove('hidden');
  const pct = total ? Math.round((loaded / total) * 100) : 0;
  $('progressBar').style.width = pct + '%';
  $('progressText').textContent = `${label} ${pct}% (${fmtMB(loaded)} de ${fmtMB(total)})`;
  setStatus(`${label} ${pct}%`);
}

async function showSetup() {
  $('setup').classList.remove('hidden');
  $('progress').classList.add('hidden');
  const list = $('modelList');
  list.innerHTML = '';
  for (const m of brain.MODELS) {
    const b = document.createElement('button');
    b.className = 'model' + (m.recommended ? ' rec' : '');
    const have = await brain.isDownloaded(m);
    b.innerHTML = `<b>${m.name}${m.recommended ? ' ⭐' : ''} · ${m.size}</b><span>${m.desc}${have ? ' Ya está descargado ✓' : ''}</span>`;
    b.onclick = () => chooseModel(m);
    list.appendChild(b);
  }
  setStatus('Esperando su cerebro');
}

async function chooseModel(m) {
  if (!online() && !(await brain.isDownloaded(m))) { alert('Para descargar el cerebro necesitas internet una sola vez. Conéctate al Wi-Fi e inténtalo de nuevo.'); return; }
  document.querySelectorAll('.model').forEach(b => (b.disabled = true));
  try {
    await brain.loadFromList(m, (l, t) => showProgress(l, t, 'Descargando cerebro'));
    await mem.setSetting('model', { type: 'list', id: m.id, name: m.name });
    $('setup').classList.add('hidden');
    afterLoad();
  } catch (e) {
    alert('No se pudo cargar el cerebro: ' + (e.message || e));
    showSetup();
  }
}

async function chooseLocalFile(file) {
  if (!file) return;
  $('menu').classList.add('hidden');
  $('setup').classList.remove('hidden');
  try {
    await brain.importLocalFile(file, (l, t) => showProgress(l, t, 'Copiando cerebro'));
    setStatus('Despertando a Nova...');
    await brain.loadLocal();
    await mem.setSetting('model', { type: 'local', name: file.name });
    $('setup').classList.add('hidden');
    afterLoad();
  } catch (e) {
    alert('No se pudo usar ese archivo: ' + (e.message || e));
    showSetup();
  }
}
$('fileModelSetup').onchange = e => chooseLocalFile(e.target.files[0]);
$('fileModel').onchange = e => chooseLocalFile(e.target.files[0]);

function afterLoad() {
  setStatus('En línea contigo · sin internet ✓');
  renderModelInfo();
  input.focus();
}

async function boot() {
  $('version').textContent = VERSION;
  try { await navigator.storage?.persist?.(); } catch {}
  await renderHistory();
  renderFacts();
  refreshWebBtn();
  $('allowWeb').checked = await mem.getSetting('allowWeb', false);
  renderStorage();
  const setting = await mem.getSetting('model');
  if (!setting) return showSetup();
  setStatus('Despertando a Nova...');
  try {
    if (setting.type === 'local') await brain.loadLocal();
    else {
      const m = brain.MODELS.find(x => x.id === setting.id);
      await brain.loadFromList(m, (l, t) => { if (t && l < t) showProgress(l, t, 'Cargando cerebro'); });
      $('progress').classList.add('hidden');
    }
    afterLoad();
  } catch (e) {
    bubble('info', 'No pude despertar con el cerebro guardado (' + (e.message || e) + '). Elige uno de nuevo.');
    showSetup();
  }
}

// ---------- Menú ----------
$('btnMenu').onclick = () => { $('menu').classList.remove('hidden'); renderFacts(); renderSources(); renderStorage(); renderModelInfo(); };
$('btnCloseMenu').onclick = () => $('menu').classList.add('hidden');

function factLabel(f) {
  if (f.category === 'sobre-ti') return 'Sobre ti';
  const src = f.sourceName || 'internet';
  if (f.verified) return `${src} · confirmado por ti ✓`;
  return `${f.category === 'noticia' ? 'Noticia' : 'Aprendido'} de ${src} · confianza ${web.confidenceLabel(f.confidence ?? 0.7)}`;
}

async function renderFacts() {
  const ul = $('factList');
  const facts = await mem.listFacts();
  ul.innerHTML = facts.length ? '' : '<li><small>Todavía nada. Cuéntale cosas de ti.</small></li>';
  for (const f of facts) {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = f.text;
    const small = document.createElement('small');
    small.textContent = factLabel(f);
    span.appendChild(small);
    const btns = document.createElement('span');
    if (f.category !== 'sobre-ti' && !f.verified) {
      const ok = document.createElement('button');
      ok.textContent = '✓'; ok.title = 'Es cierto, confírmalo';
      ok.onclick = async () => { await mem.updateFact(f.id, { verified: true, confidence: 1 }); renderFacts(); };
      btns.appendChild(ok);
    }
    const del = document.createElement('button');
    del.textContent = '✕'; del.title = 'Olvidar esto';
    del.onclick = async () => { await mem.deleteFact(f.id); renderFacts(); };
    btns.appendChild(del);
    li.append(span, btns);
    ul.appendChild(li);
  }
}
$('addFact').onsubmit = async e => {
  e.preventDefault();
  if (await mem.addFact($('newFact').value, 'sobre-ti', 'me lo enseñaste')) { $('newFact').value = ''; renderFacts(); }
};

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}

$('btnExport').onclick = async () => {
  const data = await mem.exportAll();
  const d = new Date().toISOString().slice(0, 10);
  download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `nova-memoria-${d}.json`);
};
$('fileImport').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const n = await mem.importAll(JSON.parse(await f.text()));
    alert(`Memoria importada ✓ (${n} recuerdos revisados). Nada de lo que ya tenía se borró.`);
    renderFacts(); renderHistory();
  } catch (err) { alert('No pude importar: ' + err.message); }
  e.target.value = '';
};

async function renderModelInfo() {
  const s = await mem.getSetting('model');
  $('modelInfo').textContent = s ? `Cerebro actual: ${s.name}${brain.ready() ? ' (funcionando)' : ''}` : 'Sin cerebro todavía.';
}
$('btnChangeModel').onclick = () => { $('menu').classList.add('hidden'); showSetup(); };
$('btnSaveModel').onclick = async () => {
  const s = await mem.getSetting('model');
  const blob = s && await brain.getModelBlob(s);
  if (!blob) return alert('No hay cerebro descargado para guardar.');
  download(blob, s.type === 'local' ? s.name : `nova-cerebro-${s.id}.gguf`);
};

$('allowWeb').onchange = async e => { await mem.setSetting('allowWeb', e.target.checked); refreshWebBtn(); };

async function renderSources() {
  const enabled = await mem.getSetting('sources', {});
  const ul = $('sourceList');
  ul.innerHTML = '';
  for (const src of web.SOURCES) {
    const li = document.createElement('li');
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = enabled[src.id] !== false;
    cb.onchange = async () => { const cur = await mem.getSetting('sources', {}); cur[src.id] = cb.checked; await mem.setSetting('sources', cur); };
    const txt = document.createElement('span');
    txt.textContent = src.name;
    const small = document.createElement('small');
    small.textContent = `${src.desc} Confianza base: ${web.confidenceLabel(src.trust)}.`;
    txt.appendChild(small);
    label.append(cb, txt);
    li.appendChild(label);
    ul.appendChild(li);
  }
  $('city').value = (await mem.getSetting('city', '')) || '';
}
$('cityForm').onsubmit = async e => { e.preventDefault(); await mem.setSetting('city', $('city').value.trim() || null); flashStatus('Ciudad guardada ✓'); };

$('btnClearChat').onclick = async () => {
  if (!confirm('¿Borrar la conversación? Nova seguirá recordando lo que aprendió de ti.')) return;
  await mem.clearMessages(); renderHistory();
};
$('btnClearAll').onclick = async () => {
  if (!confirm('¿Borrar TODA la memoria de Nova? Te recomiendo exportarla antes. Esto no se puede deshacer.')) return;
  const model = await mem.getSetting('model');
  await mem.wipeAll();
  if (model) await mem.setSetting('model', model);
  renderHistory(); renderFacts();
};

async function renderStorage() {
  try {
    const e = await navigator.storage.estimate();
    const p = await navigator.storage.persisted?.();
    $('storageInfo').textContent = `Espacio usado en este dispositivo: ${fmtMB(e.usage || 0)}${p ? ' · protegido contra borrado automático ✓' : ''}`;
  } catch {}
}

// ---------- Offline: service worker ----------
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(() => {
    // El service worker activa el modo rápido (varios núcleos). Recarga una vez si hace falta.
    if (!self.crossOriginIsolated && navigator.serviceWorker.controller === null) {
      navigator.serviceWorker.ready.then(() => {
        try { if (!sessionStorage.getItem('nova-reloaded')) { sessionStorage.setItem('nova-reloaded', '1'); location.reload(); } } catch {}
      });
    }
  }).catch(() => {});
}

window.addEventListener('online', () => flashStatus('Hay internet 🌐'));
window.addEventListener('offline', () => flashStatus('Sin internet, pero sigo aquí 💜'));

boot();
