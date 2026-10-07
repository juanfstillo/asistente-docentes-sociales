// Base de conocimiento: parte los instructivos en fragmentos y, para cada
// consulta, elige los más relevantes. Así el prompt queda chico y lo puede
// procesar un modelo local (o uno pago, gastando poco).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

// Cuánto texto de instructivos se manda por consulta (en caracteres; ~3,5 por
// token). "all" manda todos los instructivos completos (~55 mil tokens).
const CONTEXT_CHARS = process.env.CONTEXT_CHARS === "all" ? Infinity : Number(process.env.CONTEXT_CHARS) || 12000;
const CHUNK_CHARS = 2000;

const INSTRUCTIONS = `Sos un asistente para docentes de la Facultad de Ciencias Sociales de la Universidad de Buenos Aires. Les explicás cómo hacer trámites y usar los sistemas de la Facultad (SIU Guaraní, Campus Virtual, Microsoft Teams, etc.) a partir de los instructivos oficiales.

Sos un asistente no oficial: no representás a la Facultad ni tenés acceso a sus sistemas. Si te preguntan, decilo.

Más abajo tenés la lista de todos los instructivos disponibles y los fragmentos más relevantes para la consulta actual. Las líneas que empiezan con "Captura:" describen las capturas de pantalla del PDF.

Cómo responder:
- Basate únicamente en los fragmentos. Quien pregunta no los tiene abiertos, así que explicá los pasos completos, con los nombres exactos de menús y botones.
- Si la respuesta no está en los fragmentos, decilo claramente y no la completes con conocimiento general ni suposiciones: un paso inventado puede hacer que un docente cargue mal un acta. Si algún fragmento menciona un contacto pertinente (un correo o un área), sugerilo. Si el tema parece corresponder a otro instructivo de la lista, nombralo y pedí que reformulen la pregunta.
- Si la pregunta es ambigua (por ejemplo "cargar notas" puede ser acta de cursada o acta de examen), preguntá cuál antes de responder.
- Al final de la respuesta indicá la fuente: título del instructivo, página y enlace al PDF, para que puedan ver las capturas de pantalla.
- Cada instructivo indica su fecha de publicación. Si es de varios años atrás y la consulta depende de cómo se ve una pantalla, avisá que puede haber cambiado.
- Nunca pidas contraseñas, DNI ni otros datos personales; no los necesitás para explicar un trámite.
- Si te consultan por algo ajeno a la docencia en la Facultad, explicá brevemente para qué servís.

Formato: las respuestas se leen en un chat web y en Telegram como texto plano. Escribí en español rioplatense, de forma breve y directa, con pasos numerados cuando sea un procedimiento. No uses Markdown (ni asteriscos, ni numerales, ni tablas) y escribí los enlaces como URL completa.`;

const STOPWORDS = new Set(
  "a al algo como con cual cuando de del desde donde el ella ellos en entre era es esa ese eso esta este esto estos fue ha hace hacer hago hay hola la las le les lo los mas me mi mis muy no nos o para pero por puedo puede que quiero se ser si sin sobre son su sus tambien te tengo tiene tu un una uno unos y ya necesito quisiera favor gracias".split(" "),
);

// Palabras en minúscula, sin acentos, sin plurales, sin palabras vacías.
function tokenize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9ñ]+/)
    .filter((word) => word.length > 1 && !STOPWORDS.has(word))
    .map((word) => (word.length > 4 ? word.replace(/(es|s)$/, "") : word));
}

function loadSources() {
  const sources = JSON.parse(fs.readFileSync(path.join(root, "data", "sources.json"), "utf8"));
  const missing = [];
  const loaded = [];
  for (const source of sources) {
    const file = path.join(root, "data", "md", `${source.id}.md`);
    if (fs.existsSync(file)) loaded.push({ ...source, text: fs.readFileSync(file, "utf8") });
    else missing.push(source.id);
  }
  if (!loaded.length) throw new Error('No hay instructivos convertidos en data/md. Corré "npm run ingest".');
  if (missing.length) {
    console.warn(`Aviso: faltan ${missing.length} instructivos sin convertir (${missing.join(", ")}). El bot responde solo con los demás.`);
  }
  return loaded;
}

// Corta cada instructivo en fragmentos de hasta ~CHUNK_CHARS, preferentemente
// en los títulos de sección, recordando de qué páginas del PDF salió cada uno.
function chunkSource(source) {
  const chunks = [];
  let page = 1;
  let heading = "";
  let buffer = [];
  let size = 0;
  let firstPage = 1;
  let bufferHeading = "";

  const flush = () => {
    const text = buffer.join("\n\n").trim();
    if (text) chunks.push({ source, heading: bufferHeading, firstPage, lastPage: page, text });
    buffer = [];
    size = 0;
  };

  for (const block of source.text.split(/\n\s*\n/)) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const pageMark = /^\[pág\. (\d+)\]$/.exec(trimmed);
    if (pageMark) {
      page = Number(pageMark[1]);
      continue;
    }
    const isHeading = /^#{1,4} /.test(trimmed);
    if ((isHeading && size > 500) || size + trimmed.length > CHUNK_CHARS) flush();
    if (isHeading) heading = trimmed.replace(/^#+ /, "");
    if (!buffer.length) {
      firstPage = page;
      bufferHeading = heading;
    }
    buffer.push(trimmed);
    size += trimmed.length;
  }
  flush();
  return chunks;
}

const sources = loadSources();
const chunks = sources.flatMap(chunkSource);

// Índice BM25: el título del instructivo y de la sección pesan más que el cuerpo.
for (const chunk of chunks) {
  const boosted = `${chunk.source.title} ${chunk.heading} `.repeat(3);
  chunk.tokens = tokenize(boosted + chunk.text);
  chunk.counts = new Map();
  for (const token of chunk.tokens) chunk.counts.set(token, (chunk.counts.get(token) || 0) + 1);
}
const averageLength = chunks.reduce((sum, chunk) => sum + chunk.tokens.length, 0) / chunks.length;
const documentFrequency = new Map();
for (const chunk of chunks) {
  for (const token of chunk.counts.keys()) documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
}

function score(chunk, queryTokens) {
  let total = 0;
  for (const token of queryTokens) {
    const frequency = chunk.counts.get(token);
    if (!frequency) continue;
    const df = documentFrequency.get(token);
    const idf = Math.log(1 + (chunks.length - df + 0.5) / (df + 0.5));
    total += (idf * frequency * 2.2) / (frequency + 1.2 * (0.25 + (0.75 * chunk.tokens.length) / averageLength));
  }
  return total;
}

// Fragmentos más relevantes para la consulta, hasta llenar el presupuesto.
export function search(query, budget = CONTEXT_CHARS) {
  const queryTokens = [...new Set(tokenize(query))];
  const ranked = chunks
    .map((chunk) => ({ chunk, score: score(chunk, queryTokens) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  const selected = [];
  let used = 0;
  // Se descartan los que coinciden muy poco comparados con el mejor: son ruido.
  const minimum = ranked.length ? ranked[0].score * 0.3 : 0;
  for (const { chunk, score: chunkScore } of ranked) {
    if (chunkScore < minimum) break;
    if (used + chunk.text.length > budget) continue;
    selected.push(chunk);
    used += chunk.text.length;
  }
  // Se devuelven en el orden del documento para que los pasos queden seguidos.
  return selected.sort((a, b) => chunks.indexOf(a) - chunks.indexOf(b));
}

function formatChunk(chunk) {
  const pages = chunk.firstPage === chunk.lastPage ? `pág. ${chunk.firstPage}` : `págs. ${chunk.firstPage}-${chunk.lastPage}`;
  return `<fragmento instructivo="${chunk.source.title}" publicado="${chunk.source.published}" paginas="${pages}" url="${chunk.source.url}">\n${chunk.text}\n</fragmento>`;
}

const catalog = sources.map((source) => `- ${source.title} (publicado ${source.published}): ${source.url}`).join("\n");

// Prompt de sistema para una consulta concreta.
export function buildSystemPrompt(query) {
  const selected = CONTEXT_CHARS === Infinity ? chunks : search(query);
  const fragments = selected.length
    ? selected.map(formatChunk).join("\n\n")
    : "(Ningún fragmento coincide con la consulta.)";
  return `${INSTRUCTIONS}\n\nInstructivos disponibles:\n${catalog}\n\n<fragmentos>\n${fragments}\n</fragmentos>`;
}

export const stats = { sources: sources.length, chunks: chunks.length };
