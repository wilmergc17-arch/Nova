// Fuentes gratuitas de internet que Nova puede consultar (sin cuentas ni claves),
// y su criterio para discernir: cuánto confiar en cada una, comparar entre ellas
// y decidir qué vale la pena guardar en su memoria.

const T = { alta: 0.85, media: 0.65, baja: 0.4 };

function withTimeout(p, ms = 9000) {
  return Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('tiempo agotado')), ms))]);
}
const getJSON = (url, ms) => withTimeout(fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }), ms);
const clean = q => q.replace(/^(nova[, ]*)?(busca|buscar|investiga|averigua|consulta)( a fondo)?( en internet)?( sobre)?\s*:?\s*/i, '').replace(/[¿?¡!]/g, '').trim();
const strip = h => (h || '').replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();

function jsonp(url, ms = 9000) {
  return withTimeout(new Promise((resolve, reject) => {
    const cb = 'novaCb' + Math.random().toString(36).slice(2);
    const s = document.createElement('script');
    window[cb] = d => { resolve(d); delete window[cb]; s.remove(); };
    s.onerror = () => { reject(new Error('jsonp')); delete window[cb]; s.remove(); };
    s.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cb;
    document.head.appendChild(s);
  }), ms);
}

// Ciudad mencionada ("clima en Lima") o la guardada.
function cityFrom(q) {
  const m = q.match(/\ben\s+([A-ZÁÉÍÓÚÑ][\wáéíóúñ]+(?:\s+(?:de\s+)?[A-ZÁÉÍÓÚÑ][\wáéíóúñ]+)*)/);
  return m ? m[1] : null;
}

export const SOURCES = [
  {
    id: 'wikipedia', name: 'Wikipedia', trust: T.alta, kind: 'estable', general: true,
    desc: 'Enciclopedia: personas, lugares, historia, ciencia.',
    async fetch(q) {
      const s = await getJSON(`https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(clean(q))}&srlimit=2&format=json&origin=*`);
      const out = [];
      for (const h of s?.query?.search || []) {
        const p = await getJSON(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(h.title.replace(/ /g, '_'))}`).catch(() => null);
        if (p?.extract) out.push({ title: p.title, text: p.extract, url: p.content_urls?.desktop?.page });
      }
      return out;
    },
  },
  {
    id: 'duckduckgo', name: 'DuckDuckGo', trust: T.media, kind: 'estable', general: true,
    desc: 'Respuestas rápidas del buscador DuckDuckGo.',
    async fetch(q) {
      const d = await jsonp(`https://api.duckduckgo.com/?q=${encodeURIComponent(clean(q))}&format=json&no_html=1&skip_disambig=1&kl=es-es`);
      const out = [];
      if (d?.AbstractText) out.push({ title: d.Heading || clean(q), text: d.AbstractText, url: d.AbstractURL, origin: d.AbstractSource });
      if (d?.Answer) out.push({ title: 'Respuesta directa', text: String(d.Answer), url: 'https://duckduckgo.com/?q=' + encodeURIComponent(clean(q)) });
      return out;
    },
  },
  {
    id: 'diccionario', name: 'Wikcionario', trust: T.alta, kind: 'estable',
    desc: 'Diccionario: qué significa una palabra.',
    match: q => /signific|definici|define |qu[eé] quiere decir|qu[eé] es la palabra/i.test(q),
    async fetch(q) {
      const word = (clean(q).match(/(?:significa(?:do de)?|definici[oó]n de|define|quiere decir|palabra)\s+["«]?([\wáéíóúñü-]+)/i) || [])[1]
        || clean(q).split(' ').pop();
      const d = await getJSON(`https://es.wiktionary.org/w/api.php?action=query&prop=extracts&explaintext=1&exchars=900&titles=${encodeURIComponent(word.toLowerCase())}&format=json&origin=*`);
      const page = Object.values(d?.query?.pages || {})[0];
      return page?.extract ? [{ title: `«${word}»`, text: page.extract.replace(/\n{2,}/g, '\n'), url: `https://es.wiktionary.org/wiki/${encodeURIComponent(word.toLowerCase())}` }] : [];
    },
  },
  {
    id: 'clima', name: 'Open-Meteo (clima)', trust: 0.95, kind: 'pasajero',
    desc: 'El clima de hoy y de los próximos días.',
    match: q => /clima|qu[eé] tiempo|temperatura|llov|lluvia|pron[oó]stico|calor|fr[ií]o hace/i.test(q),
    async fetch(q, ctx) {
      let name = cityFrom(q) || ctx.city, lat, lon;
      if (name) {
        const g = await getJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=es`);
        const r = g?.results?.[0];
        if (!r) return [];
        lat = r.latitude; lon = r.longitude; name = `${r.name}${r.country ? ', ' + r.country : ''}`;
      } else {
        const pos = await withTimeout(new Promise((ok, no) => navigator.geolocation.getCurrentPosition(ok, no, { timeout: 8000 })), 9000).catch(() => null);
        if (!pos) return [{ title: 'Clima', text: 'No sé en qué ciudad estás. Dime por ejemplo "clima en Lima".', url: '' }];
        lat = pos.coords.latitude; lon = pos.coords.longitude; name = 'donde estás';
      }
      const w = await getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=3`);
      const c = w.current, d = w.daily;
      const dias = d.time.map((t, i) => `${new Date(t + 'T12:00').toLocaleDateString('es', { weekday: 'long' })}: entre ${d.temperature_2m_min[i]}°C y ${d.temperature_2m_max[i]}°C, ${d.precipitation_probability_max[i]}% de probabilidad de lluvia`).join('; ');
      return [{ title: `Clima en ${name}`, text: `Ahora: ${c.temperature_2m}°C, ${describeWeather(c.weather_code)}, humedad ${c.relative_humidity_2m}%, viento ${c.wind_speed_10m} km/h. Pronóstico: ${dias}.`, url: 'https://open-meteo.com' }];
    },
  },
  {
    id: 'monedas', name: 'Tipo de cambio (ExchangeRate-API)', trust: 0.9, kind: 'pasajero',
    desc: 'Precio del dólar, euro y otras monedas.',
    match: q => /d[oó]lar|euro|tipo de cambio|cotizaci|divisa|moneda|cu[aá]nto vale el|peso mexicano|sol peruano/i.test(q),
    async fetch() {
      const d = await getJSON('https://open.er-api.com/v6/latest/USD');
      const want = ['EUR', 'MXN', 'PEN', 'COP', 'ARS', 'CLP', 'BOB', 'GTQ', 'HNL', 'NIO', 'CRC', 'DOP', 'UYU', 'PYG', 'VES', 'BRL', 'CAD', 'GBP'];
      const list = want.filter(k => d.rates?.[k]).map(k => `${k} ${d.rates[k]}`).join(', ');
      return [{ title: 'Tipo de cambio', text: `1 dólar (USD) equivale a: ${list}. Actualizado: ${d.time_last_update_utc}.`, url: 'https://www.exchangerate-api.com' }];
    },
  },
  {
    id: 'noticias', name: 'Noticias (GDELT)', trust: T.media, kind: 'noticia',
    desc: 'Titulares recientes de periódicos en español de todo el mundo.',
    match: q => /noticia|actualidad|qu[eé] (pas[oó]|est[aá] pasando)|[uú]ltima hora|hoy en el mundo/i.test(q),
    async fetch(q) {
      const topic = clean(q).replace(/(las |los )?(noticias|[uú]ltimas|actualidad|de hoy|sobre|acerca de|qu[eé] pas[oó] (con|en)?)/gi, '').trim();
      const query = `${topic ? `"${topic}" ` : ''}sourcelang:spanish`;
      const d = await getJSON(`https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=6&sort=datedesc&format=json&timespan=3d`, 12000);
      return (d?.articles || []).slice(0, 6).map(a => ({ title: a.domain, text: a.title, url: a.url, date: a.seendate }));
    },
  },
  {
    id: 'wikinoticias', name: 'Wikinoticias', trust: T.media, kind: 'noticia',
    desc: 'Noticias escritas por voluntarios.',
    match: q => /noticia|actualidad/i.test(q),
    async fetch(q) {
      const topic = clean(q).replace(/noticias?|actualidad|de hoy|sobre/gi, '').trim() || 'noticias';
      const s = await getJSON(`https://es.wikinews.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&srlimit=3&srsort=create_timestamp_desc&format=json&origin=*`);
      return (s?.query?.search || []).map(h => ({ title: h.title, text: strip(h.snippet), url: `https://es.wikinews.org/wiki/${encodeURIComponent(h.title)}`, date: h.timestamp }));
    },
  },
  {
    id: 'libros', name: 'Open Library (libros)', trust: T.alta, kind: 'estable',
    desc: 'Libros y autores.',
    match: q => /libro|novela|autor|escritor|escribi[oó]|poema/i.test(q),
    async fetch(q) {
      const d = await getJSON(`https://openlibrary.org/search.json?q=${encodeURIComponent(clean(q))}&limit=3&fields=title,author_name,first_publish_year,key`);
      return (d?.docs || []).map(b => ({ title: b.title, text: `«${b.title}» de ${(b.author_name || ['autor desconocido']).join(', ')}${b.first_publish_year ? `, publicado por primera vez en ${b.first_publish_year}` : ''}.`, url: `https://openlibrary.org${b.key}` }));
    },
  },
  {
    id: 'paginas', name: 'Leer páginas web (Jina Reader)', trust: T.baja, kind: 'web',
    desc: 'Lee el enlace que le pegues en el chat.',
    match: q => /https?:\/\/\S+/.test(q),
    async fetch(q) {
      const url = q.match(/https?:\/\/\S+/)[0];
      const txt = await withTimeout(fetch('https://r.jina.ai/' + url, { headers: { Accept: 'text/plain' } }).then(r => { if (!r.ok) throw new Error(r.status); return r.text(); }), 15000);
      return [{ title: new URL(url).hostname, text: txt.replace(/\s+/g, ' ').slice(0, 1800), url }];
    },
  },
];

function describeWeather(c) {
  if (c === 0) return 'despejado';
  if (c <= 3) return 'parcialmente nublado';
  if (c <= 48) return 'con niebla';
  if (c <= 67) return 'con lluvia';
  if (c <= 77) return 'con nieve';
  if (c <= 82) return 'con chubascos';
  return 'con tormenta';
}

// ¿Esta pregunta necesita internet sí o sí? (clima, dinero, noticias, un enlace)
export const needsLive = q => SOURCES.some(s => ['pasajero', 'noticia', 'web'].includes(s.kind) && s.match?.(q));

// Elige qué fuentes consultar según la pregunta.
export function pickSources(q, enabled) {
  const on = SOURCES.filter(s => enabled[s.id] !== false);
  const specific = on.filter(s => s.match?.(q));
  const deep = /a fondo|investiga|todas las fuentes/i.test(q);
  if (deep) return on.filter(s => s.general || s.kind === 'noticia' || s.match?.(q));
  if (specific.length) {
    // Para diccionario y libros también se compara con la enciclopedia.
    if (specific.every(s => s.kind === 'estable')) return [...specific, ...on.filter(s => s.general)];
    return specific;
  }
  return on.filter(s => s.general);
}

// ---------- Discernir ----------
const STOP = new Set('para como pero este esta esto sobre entre desde hasta donde cuando porque tambien tiene puede fueron sido otros otras cual cuales todo toda todos todas muy mas menos segun durante'.split(' '));
const keyTerms = t => new Set((t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-z0-9ñ]{5,}|\b\d{3,4}\b/g) || []).filter(w => !STOP.has(w)));

export function confidenceLabel(c) {
  return c >= 0.8 ? 'alta' : c >= 0.6 ? 'media' : 'baja';
}

// Junta los resultados, les da un nivel de confianza y marca si varias fuentes coinciden.
export function discern(results) {
  const items = results.flatMap(r => r.items.map(it => ({ ...it, source: r.source, conf: r.source.trust })));
  const bySource = new Map();
  for (const it of items) {
    const terms = keyTerms(it.title + ' ' + it.text);
    it.terms = terms;
    if (!bySource.has(it.source.id)) bySource.set(it.source.id, new Set());
    for (const t of terms) bySource.get(it.source.id).add(t);
  }
  for (const it of items) {
    let agree = 0;
    for (const [sid, terms] of bySource) {
      if (sid === it.source.id) continue;
      let shared = 0;
      for (const t of it.terms) if (terms.has(t)) shared++;
      if (shared >= 3) agree++;
    }
    it.agree = agree;
    if (agree) it.conf = Math.min(0.97, it.conf + 0.1 * agree);
    if (/publicidad|patrocinado|compra ahora|oferta|haz clic|suscr[ií]bete/i.test(it.text)) it.conf -= 0.25;
    if (/(se cree|supuestamente|rumor|podr[ií]a|habr[ií]a|seg[uú]n fuentes no)/i.test(it.text)) it.conf -= 0.1;
    it.label = confidenceLabel(it.conf);
    delete it.terms;
  }
  return items.sort((a, b) => b.conf - a.conf);
}

// Texto para que Nova razone con las fuentes.
export function contextForModel(items) {
  return items.slice(0, 6).map(it =>
    `[${it.source.name} · confianza ${it.label}${it.agree ? ` · coincide con ${it.agree} fuente(s) más` : ''}${it.date ? ' · ' + String(it.date).slice(0, 10) : ''}] ${it.title}: ${it.text.slice(0, 700)}`
  ).join('\n\n');
}

// ¿Se guarda en la memoria? Solo lo confiable y lo que no caduca enseguida.
export function worthSaving(it) {
  if (it.source.kind === 'pasajero') return false; // el clima y el dólar cambian a diario
  if (it.source.kind === 'noticia') return it.conf >= 0.6;
  return it.conf >= 0.6;
}

export async function consult(q, { enabled = {}, city = null, onSource } = {}) {
  const picked = pickSources(q, enabled);
  const results = await Promise.all(picked.map(async source => {
    try {
      const items = await source.fetch(q, { city });
      onSource && onSource(source, items.length);
      return { source, items: items.filter(i => i.text) };
    } catch {
      onSource && onSource(source, -1);
      return { source, items: [] };
    }
  }));
  return { tried: picked, items: discern(results), failed: results.filter(r => !r.items.length).map(r => r.source) };
}
