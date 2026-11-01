// Memoria de Nova: todo se guarda en este dispositivo (IndexedDB).
// Almacenes:
//   facts    -> cosas que Nova sabe de ti o aprendió (crece con el uso)
//   messages -> historial de conversación
//   events   -> registro de cuándo hablas con ella (base para aprender rutinas, paso 3)
//   settings -> preferencias

const DB_NAME = 'nova-memoria';
const DB_VERSION = 1;
const STORES = ['facts', 'messages', 'events', 'settings'];
export const FORMAT = 'nova-memoria';
export const FORMAT_VERSION = 1;

let dbPromise;
function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains('facts')) d.createObjectStore('facts', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('messages')) d.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
        if (!d.objectStoreNames.contains('events')) d.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
        if (!d.objectStoreNames.contains('settings')) d.createObjectStore('settings', { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function run(store, mode, fn) {
  return db().then(d => new Promise((resolve, reject) => {
    const tx = d.transaction(store, mode);
    const s = tx.objectStore(store);
    const out = fn(s);
    tx.oncomplete = () => resolve(out && 'result' in out ? out.result : out);
    tx.onerror = () => reject(tx.error);
  }));
}

const all = store => run(store, 'readonly', s => s.getAll());
const put = (store, v) => run(store, 'readwrite', s => s.put(v));
const del = (store, k) => run(store, 'readwrite', s => s.delete(k));
const clear = store => run(store, 'readwrite', s => s.clear());

// ---------- Ajustes ----------
export async function getSetting(key, fallback = null) {
  const r = await run('settings', 'readonly', s => s.get(key));
  return r ? r.value : fallback;
}
export const setSetting = (key, value) => put('settings', { key, value });

// ---------- Hechos / recuerdos ----------
const norm = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim();

export async function listFacts() {
  const f = await all('facts');
  return f.sort((a, b) => b.updated - a.updated);
}

export async function addFact(text, category = 'sobre-ti', source = 'conversación', extra = {}) {
  text = (text || '').trim();
  if (text.length < 3) return null;
  const facts = await all('facts');
  const n = norm(text);
  const same = facts.find(f => norm(f.text) === n);
  const now = Date.now();
  if (same) {
    same.updated = now;
    same.hits = (same.hits || 1) + 1;
    await put('facts', same);
    return same;
  }
  const fact = { id: crypto.randomUUID(), text, category, source, created: now, updated: now, hits: 1, ...extra };
  await put('facts', fact);
  return fact;
}
export const deleteFact = id => del('facts', id);
export async function updateFact(id, changes) {
  const f = await run('facts', 'readonly', s => s.get(id));
  if (f) await put('facts', { ...f, ...changes, updated: Date.now() });
}

// Elige los recuerdos más útiles para la pregunta actual (sin internet, por palabras).
export async function relevantFacts(query, limit = 25) {
  const facts = await all('facts');
  if (facts.length <= limit) return facts;
  const q = new Set(norm(query).split(' ').filter(w => w.length > 3));
  const score = f => {
    let s = 0;
    for (const w of norm(f.text).split(' ')) if (q.has(w)) s += 3;
    if (f.category === 'sobre-ti' || f.verified) s += 1;
    if (f.category === 'noticia') s -= (Date.now() - f.created) / 864e5 * 0.1; // las noticias envejecen
    s += (f.confidence ?? 0.8) - 0.8;
    s += Math.min(f.hits || 1, 5) * 0.3;
    s += (f.updated / Date.now()) * 0.5;
    return s;
  };
  return facts.map(f => [score(f), f]).sort((a, b) => b[0] - a[0]).slice(0, limit).map(x => x[1]);
}

// Para conversar: datos personales en orden estable (no cambia entre mensajes, más rápido)
// y lo aprendido de internet solo si tiene que ver con la pregunta.
export async function factsForChat(query) {
  const facts = await all('facts');
  const personal = facts.filter(f => f.category === 'sobre-ti').sort((a, b) => a.created - b.created).slice(-20);
  const q = new Set(norm(query).split(' ').filter(w => w.length > 3));
  const learned = facts.filter(f => f.category !== 'sobre-ti')
    .map(f => [norm(f.text).split(' ').filter(w => q.has(w)).length + (f.verified ? 0.5 : 0), f])
    .filter(x => x[0] >= 1).sort((a, b) => b[0] - a[0]).slice(0, 3).map(x => x[1]);
  return { personal, learned };
}

// ---------- Mensajes ----------
export const addMessage = (role, content, extra = {}) => put('messages', { role, content, ts: Date.now(), ...extra });
export async function recentMessages(n = 12) {
  const m = await all('messages');
  return m.slice(-n);
}
export const allMessages = () => all('messages');
export const clearMessages = () => clear('messages');

// ---------- Eventos (para rutinas) ----------
export function logEvent(type, data = {}) {
  const d = new Date();
  return put('events', { type, ts: d.getTime(), hour: d.getHours(), weekday: d.getDay(), ...data });
}

// ---------- Exportar / importar ----------
export async function exportAll() {
  const data = { format: FORMAT, version: FORMAT_VERSION, exported: new Date().toISOString() };
  for (const s of STORES) data[s] = await all(s);
  return data;
}

// Importar MEZCLA con lo que ya hay (no borra nada).
export async function importAll(data) {
  if (!data || data.format !== FORMAT) throw new Error('Este archivo no es una memoria de Nova.');
  let n = 0;
  for (const f of data.facts || []) {
    const { id, text, category, source, created, updated, hits, ...extra } = f;
    if (await addFact(text, category, source, extra)) n++;
  }
  const existing = new Set((await all('messages')).map(m => m.ts + m.role));
  for (const m of data.messages || []) {
    if (existing.has(m.ts + m.role)) continue;
    const { id, ...rest } = m;
    await put('messages', rest);
  }
  const evs = new Set((await all('events')).map(e => e.ts + e.type));
  for (const e of data.events || []) {
    if (evs.has(e.ts + e.type)) continue;
    const { id, ...rest } = e;
    await put('events', rest);
  }
  for (const s of data.settings || []) {
    if (s.key === 'model') continue; // el cerebro depende de cada dispositivo
    await put('settings', s);
  }
  return n;
}

export async function wipeAll() {
  for (const s of STORES) await clear(s);
}
