// Modo híbrido: si hay internet y está permitido, Nova busca en Wikipedia (español)
// y guarda un resumen en su memoria para usarlo después sin conexión.

const WIKI = 'https://es.wikipedia.org';

export const online = () => navigator.onLine;

export async function searchWeb(query) {
  const q = query.replace(/^(busca|buscar|investiga|averigua)\s*(en internet)?\s*:?\s*/i, '').trim();
  const s = await fetch(`${WIKI}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=3&format=json&origin=*`)
    .then(r => r.json());
  const hits = s?.query?.search || [];
  const results = [];
  for (const h of hits.slice(0, 2)) {
    try {
      const p = await fetch(`${WIKI}/api/rest_v1/page/summary/${encodeURIComponent(h.title.replace(/ /g, '_'))}`).then(r => r.json());
      if (p.extract) results.push({ title: p.title, text: p.extract, url: p.content_urls?.desktop?.page || `${WIKI}/wiki/${encodeURIComponent(h.title)}` });
    } catch {}
  }
  return results;
}
