// Núcleo del bot, compartido por todos los canales (web, Telegram, ...).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { statusOf } from "./gemini.js";
import { buildSystemPrompt } from "./kb.js";
import { generate } from "./llm.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const logFile = path.join(root, "data", "logs", "chat.jsonl");

const MAX_HISTORY = Number(process.env.MAX_HISTORY) || 8; // mensajes (4 idas y vueltas)
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_MAX = 15;
export const MAX_QUESTION_CHARS = 2000;

const NO_ANSWER = "No pude generar una respuesta para esa consulta. ¿Podés reformularla?";

const sessions = new Map(); // id -> { messages, lastUsed, queue }
const hits = new Map(); // clave -> timestamps

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastUsed > SESSION_TTL_MS) sessions.delete(id);
  }
  for (const [key, times] of hits) {
    if (times.every((t) => now - t > RATE_WINDOW_MS)) hits.delete(key);
  }
}, 10 * 60 * 1000).unref();

// Límite simple por usuario (IP o chat de Telegram), para cuidar el modelo.
export function allow(key) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export function resetSession(sessionId) {
  sessions.delete(sessionId);
}

// Responde un mensaje dentro de una conversación. onDelta recibe el texto a
// medida que se genera (opcional). Los mensajes de una misma sesión se procesan
// de a uno para no mezclar el historial.
export function reply({ sessionId, channel, text, onDelta }) {
  let session = sessions.get(sessionId);
  if (!session) {
    session = { messages: [], lastUsed: Date.now(), queue: Promise.resolve() };
    sessions.set(sessionId, session);
  }
  const run = session.queue.then(() => answer(session, channel, text, onDelta));
  session.queue = run.catch(() => {});
  return run;
}

async function answer(session, channel, text, onDelta) {
  session.lastUsed = Date.now();
  const messages = [...session.messages, { role: "user", text }];

  // Los fragmentos se buscan con esta pregunta y la anterior, para que una
  // repregunta ("¿y después?") siga encontrando el mismo instructivo.
  const query = messages
    .filter((message) => message.role === "user")
    .slice(-2)
    .map((message) => message.text)
    .join("\n");

  const result = await generate({ system: buildSystemPrompt(query), messages, onDelta });

  let output = result.text;
  if (!output.trim()) {
    output = NO_ANSWER;
    onDelta?.(output);
  }

  session.messages = [...messages, { role: "assistant", text: output }].slice(-MAX_HISTORY);
  log({ channel, model: result.model, question: text, answer: output, usage: result.usage });
  return output;
}

// Mensaje para mostrarle al usuario cuando falla la llamada al modelo.
export function errorMessage(error) {
  const status = statusOf(error);
  console.error(`Error del modelo${status ? ` (${status})` : ""}:`, error?.message || error);
  if (status === 429 || status === 503) return "Hay muchas consultas en este momento. Probá de nuevo en un minuto.";
  return "Hubo un problema al procesar tu consulta. Probá de nuevo en un rato.";
}

// Registro de consultas, para detectar qué instructivos faltan o no se entienden.
function log(entry) {
  try {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    fs.appendFileSync(logFile, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n");
  } catch (error) {
    console.error("No se pudo escribir el log:", error.message);
  }
}
