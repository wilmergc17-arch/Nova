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

function loadParams() {
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  return {
    n_ctx: mobile ? 2048 : 4096,
    n_batch: 256,
    warmup: false,
  };
}

async function unload() {
  if (wllama) { try { await wllama.exit(); } catch {} }
  wllama = null;
}

// Descarga (solo la 1ª vez) y carga un modelo de la lista.
export async function loadFromList(model, onProgress) {
  await unload();
  const w = newEngine();
  try {
    await w.loadModelFromUrl(model.url, {
      ...loadParams(),
      progressCallback: ({ loaded, total }) => onProgress && onProgress(loaded, total),
    });
  } catch (e) {
    // Si el teléfono no soporta la GPU, intenta solo con el procesador.
    await w.exit().catch(() => {});
    const w2 = newEngine();
    await w2.loadModelFromUrl(model.url, { ...loadParams(), n_gpu_layers: 0, progressCallback: ({ loaded, total }) => onProgress && onProgress(loaded, total) });
    wllama = w2;
    return;
  }
  wllama = w;
}

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

export async function loadLocal() {
  await unload();
  const dir = await navigator.storage.getDirectory();
  const blob = await (await dir.getFileHandle(LOCAL_FILE)).getFile();
  const w = newEngine();
  try {
    await w.loadModel([blob], loadParams());
  } catch {
    await w.exit().catch(() => {});
    const w2 = newEngine();
    await w2.loadModel([blob], { ...loadParams(), n_gpu_layers: 0 });
    wllama = w2;
    return;
  }
  wllama = w;
}

export const ready = () => !!wllama && wllama.isModelLoaded();
export const isBusy = () => busy;
let replying = false;
export const isReplying = () => replying;

// Conversa en streaming: llama a onToken con el texto acumulado.
export const chat = (...a) => exclusive(() => chatNow(...a));
async function chatNow(messages, { onToken, maxTokens = 400, temperature = 0.7 } = {}) {
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
export const ask = (...a) => exclusive(() => askNow(...a));
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
