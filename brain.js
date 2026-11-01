// Cerebro de Nova: un modelo de IA que corre DENTRO del dispositivo (wllama / llama.cpp).
// El modelo es reemplazable: la memoria vive aparte (memory.js) y no se pierde al cambiarlo.

import { Wllama } from './vendor/wllama/index.js';

export const MODELS = [
  {
    id: 'ligero',
    name: 'Ligero',
    desc: 'Para celulares sencillos. Rápido, pero menos lista.',
    size: '≈ 400 MB',
    url: 'https://huggingface.co/bartowski/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/Qwen2.5-0.5B-Instruct-Q4_K_M.gguf',
  },
  {
    id: 'recomendado',
    name: 'Recomendado',
    desc: 'Buen equilibrio para el celular. Habla bien español.',
    size: '≈ 1 GB',
    url: 'https://huggingface.co/bartowski/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/Qwen2.5-1.5B-Instruct-Q4_K_M.gguf',
    recommended: true,
  },
  {
    id: 'potente',
    name: 'Potente',
    desc: 'Para laptop o ROG Ally. Más lista, necesita más memoria.',
    size: '≈ 1.9 GB',
    url: 'https://huggingface.co/bartowski/Qwen2.5-3B-Instruct-GGUF/resolve/main/Qwen2.5-3B-Instruct-Q4_K_M.gguf',
  },
];

const LOCAL_FILE = 'nova-cerebro-local.gguf';

let wllama = null;
let busy = false;
let queue = Promise.resolve();
// Una tarea a la vez: si Nova está aprendiendo, la siguiente respuesta espera su turno.
function exclusive(fn) {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

function newEngine() {
  const w = new Wllama({ default: new URL('./vendor/wllama/wllama.wasm', import.meta.url).href }, {
    allowOffline: true,
    suppressNativeLog: true,
    parallelDownloads: 3,
  });
  // Sin descargas de terceros: así funciona sin internet.
  try { w.setCompat(null); } catch {}
  return w;
}

// Niveles de seguridad: si el cerebro se cae, se baja de nivel y se recuerda.
// 0 = usa la GPU (solo computadoras) · 1 = solo procesador · 2 = procesador, 1 hilo y menos memoria
const MOBILE = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
let level = (() => { try { return Number(localStorage.getItem('nova-nivel')) || 0; } catch { return 0; } })();
if (MOBILE && level < 1) level = 1; // la GPU del celular hace caer al cerebro
function setLevel(n) { level = n; try { localStorage.setItem('nova-nivel', String(n)); } catch {} }
export const safeLevel = () => level;

function loadParams() {
  const p = { n_ctx: MOBILE ? 2048 : 4096, n_batch: 512, warmup: false };
  if (level >= 1) p.n_gpu_layers = 0;
  if (level >= 2) Object.assign(p, { n_threads: 1, n_ctx: 1024, n_batch: 128 });
  return p;
}

async function unload() {
  if (wllama) { try { await wllama.exit(); } catch {} }
  wllama = null;
}

let lastSource = null; // { type: 'list', model } o { type: 'local' }

async function loadOnce(src, onProgress) {
  const w = newEngine();
  const progressCallback = ({ loaded, total }) => onProgress && onProgress(loaded, total);
  try {
    if (src.type === 'local') {
      const dir = await navigator.storage.getDirectory();
      const blob = await (await dir.getFileHandle(LOCAL_FILE)).getFile();
      await w.loadModel([blob], loadParams());
    } else {
      await w.loadModelFromUrl(src.model.url, { ...loadParams(), progressCallback });
    }
  } catch (e) {
    await w.exit().catch(() => {});
    throw e;
  }
  return w;
}

async function load(src, onProgress) {
  await unload();
  lastSource = src;
  for (;;) {
    try { wllama = await loadOnce(src, onProgress); return; }
    catch (e) {
      if (level >= 2 || /descarg|download|network|fetch/i.test(String(e?.message))) throw e;
      setLevel(level + 1);
    }
  }
}

// Descarga (solo la 1ª vez) y carga un modelo de la lista.
export const loadFromList = (model, onProgress) => load({ type: 'list', model }, onProgress);

// ¿Está ya descargado este modelo en el dispositivo?
export async function isDownloaded(model) {
  try {
    const w = newEngine();
    const list = await w.cacheManager.list();
    const name = await w.cacheManager.getNameFromURL(model.url);
    return list.some(e => e.name === name);
  } catch { return false; }
}

// Devuelve el archivo del modelo para guardarlo (USB, otra computadora...).
export async function getModelBlob(setting) {
  if (setting?.type === 'local') {
    const dir = await navigator.storage.getDirectory();
    return (await dir.getFileHandle(LOCAL_FILE)).getFile();
  }
  const model = MODELS.find(m => m.id === setting?.id);
  if (!model) return null;
  const w = newEngine();
  return w.cacheManager.open(model.url);
}

// Copia un archivo .gguf elegido por el usuario al almacenamiento privado de la app.
export async function importLocalFile(file, onProgress) {
  const dir = await navigator.storage.getDirectory();
  const handle = await dir.getFileHandle(LOCAL_FILE, { create: true });
  const writable = await handle.createWritable();
  const reader = file.stream().getReader();
  let done = 0;
  for (;;) {
    const { value, done: end } = await reader.read();
    if (end) break;
    await writable.write(value);
    done += value.byteLength;
    onProgress && onProgress(done, file.size);
  }
  await writable.close();
}

export const loadLocal = () => load({ type: 'local' });

export const ready = () => !!wllama && wllama.isModelLoaded();
export const isBusy = () => busy;
let replying = false;
export const isReplying = () => replying;

// Conversa en streaming: llama a onToken con el texto acumulado.
const crashed = e => /crash|abort|runtime|unreachable|memory|reload the module/i.test(String(e?.message || e));

// Si el cerebro se cae, se recupera solo en un modo más seguro y vuelve a intentar.
export const chat = (messages, opts = {}) => exclusive(async () => {
  try { return await chatNow(messages, opts); }
  catch (e) {
    if (!crashed(e) || level >= 2 || !lastSource) throw e;
    opts.onRecover && opts.onRecover();
    setLevel(level + 1);
    await load(lastSource);
    return chatNow(messages, opts);
  }
});
async function chatNow(messages, { onToken, maxTokens = 300, temperature = 0.7 } = {}) {
  if (!ready()) throw new Error('El cerebro no está cargado.');
  busy = true; replying = true;
  let text = '';
  try {
    const stream = await wllama.createChatCompletion({
      messages,
      max_tokens: maxTokens,
      temperature,
      top_p: 0.9,
      top_k: 40,
      stream: true,
    });
    for await (const chunk of stream) {
      const d = chunk?.choices?.[0]?.delta?.content;
      if (d) { text += d; onToken && onToken(text); }
    }
  } finally {
    busy = false; replying = false;
  }
  return text.trim();
}

// Respuesta corta sin streaming (para tareas internas como aprender datos).
export const ask = (messages, opts) => exclusive(async () => {
  try { return await askNow(messages, opts); }
  catch (e) {
    if (crashed(e) && level < 2 && lastSource) { setLevel(level + 1); await load(lastSource).catch(() => {}); }
    return '';
  }
});
async function askNow(messages, { maxTokens = 120, temperature = 0.1 } = {}) {
  if (!ready()) return '';
  busy = true;
  try {
    const r = await wllama.createChatCompletion({ messages, max_tokens: maxTokens, temperature });
    return r?.choices?.[0]?.message?.content?.trim() || '';
  } finally {
    busy = false;
  }
}
