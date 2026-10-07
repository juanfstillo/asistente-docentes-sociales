// Canal web: sirve la página de chat y la API que usa. Si hay token, levanta también Telegram.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { allow, errorMessage, reply, MAX_QUESTION_CHARS } from "./chat.js";
import { stats } from "./kb.js";
import { checkConfig, describe } from "./llm.js";
import { startTelegram } from "./telegram.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT) || 3000;
// Detrás de un proxy (nginx, Caddy) la IP real viene en X-Forwarded-For.
const TRUST_PROXY = process.env.TRUST_PROXY === "1";

function clientIp(req) {
  const forwarded = TRUST_PROXY && req.headers["x-forwarded-for"];
  return forwarded ? forwarded.split(",")[0].trim() : req.socket.remoteAddress;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 20_000) reject(new Error("cuerpo demasiado grande"));
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function sendText(res, status, text) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(text);
}

async function handleChat(req, res) {
  let body;
  try {
    body = await readJson(req);
  } catch {
    return sendText(res, 400, "Pedido inválido.");
  }
  const text = typeof body.message === "string" ? body.message.trim() : "";
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.slice(0, 64) : "";
  if (!text || !sessionId) return sendText(res, 400, "Pedido inválido.");
  if (text.length > MAX_QUESTION_CHARS) return sendText(res, 400, "El mensaje es muy largo. ¿Podés resumir la consulta?");
  if (!allow(`web:${clientIp(req)}`)) return sendText(res, 429, "Hiciste muchas consultas seguidas. Probá de nuevo en unos minutos.");

  // La respuesta se envía como texto a medida que se genera.
  res.writeHead(200, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" });
  try {
    await reply({ sessionId: `web:${sessionId}`, channel: "web", text, onDelta: (delta) => res.write(delta) });
  } catch (error) {
    res.write(errorMessage(error));
  }
  res.end();
}

try {
  checkConfig();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
console.log(`Instructivos: ${stats.sources} (${stats.chunks} fragmentos). Modelo: ${describe()}`);

const page = fs.readFileSync(path.join(root, "public", "index.html"));

http
  .createServer((req, res) => {
    const { pathname } = new URL(req.url, "http://localhost");
    if (req.method === "GET" && pathname === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(page);
    }
    if (req.method === "POST" && pathname === "/api/chat") return handleChat(req, res);
    sendText(res, 404, "No encontrado.");
  })
  .listen(PORT, () => console.log(`Web: http://localhost:${PORT}`));

if (process.env.TELEGRAM_BOT_TOKEN) startTelegram(process.env.TELEGRAM_BOT_TOKEN);
else console.log("Telegram: desactivado (falta TELEGRAM_BOT_TOKEN)");
