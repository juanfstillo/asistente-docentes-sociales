// Canal Telegram por long polling: no necesita dominio ni HTTPS público.
import { allow, errorMessage, reply, resetSession, MAX_QUESTION_CHARS } from "./chat.js";

const WELCOME =
  "Hola. Soy un asistente no oficial para docentes de la Facultad de Ciencias Sociales (UBA). " +
  "Preguntame cómo hacer un trámite o usar SIU Guaraní, el Campus Virtual o Teams, y te respondo en base a los instructivos publicados por la Facultad.\n\n" +
  "Por ejemplo: ¿cómo cargo un acta de examen?";

export function startTelegram(token) {
  const api = `https://api.telegram.org/bot${token}`;

  async function call(method, body) {
    const response = await fetch(`${api}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await response.json();
    if (!json.ok) throw new Error(`Telegram ${method}: ${json.description}`);
    return json.result;
  }

  // Telegram muestra el texto tal cual: se quita el Markdown que a veces usa el modelo.
  function plain(text) {
    return text
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/\*\*([^*\n]+)\*\*/g, "$1")
      .replace(/`([^`\n]+)`/g, "$1")
      .replace(/^(\s*)[*•]\s+/gm, "$1- ")
      .replace(/(?<![*\w])\*(?![\s*])([^*\n]+?)(?<![\s*])\*(?![*\w])/g, "$1");
  }

  async function send(chatId, text) {
    // Telegram admite hasta 4096 caracteres por mensaje.
    for (let rest = plain(text); rest; ) {
      let cut = rest.length <= 4000 ? rest.length : rest.lastIndexOf("\n", 4000);
      if (cut <= 0) cut = 4000;
      await call("sendMessage", { chat_id: chatId, text: rest.slice(0, cut), disable_web_page_preview: true });
      rest = rest.slice(cut).trimStart();
    }
  }

  async function handle(message) {
    const chatId = message.chat.id;
    const sessionId = `telegram:${chatId}`;
    const text = message.text?.trim();
    if (!text) return send(chatId, "Por ahora solo puedo leer mensajes de texto.");
    if (text.startsWith("/start")) {
      resetSession(sessionId);
      return send(chatId, WELCOME);
    }
    if (text.length > MAX_QUESTION_CHARS) return send(chatId, "El mensaje es muy largo. ¿Podés resumir la consulta?");
    if (!allow(sessionId)) return send(chatId, "Hiciste muchas consultas seguidas. Probá de nuevo en unos minutos.");

    const typing = setInterval(() => call("sendChatAction", { chat_id: chatId, action: "typing" }).catch(() => {}), 4000);
    call("sendChatAction", { chat_id: chatId, action: "typing" }).catch(() => {});
    try {
      await send(chatId, await reply({ sessionId, channel: "telegram", text }));
    } catch (error) {
      await send(chatId, errorMessage(error));
    } finally {
      clearInterval(typing);
    }
  }

  (async () => {
    console.log("Telegram: bot iniciado");
    let offset = 0;
    for (;;) {
      try {
        const updates = await call("getUpdates", { offset, timeout: 50, allowed_updates: ["message"] });
        for (const update of updates) {
          offset = update.update_id + 1;
          if (update.message) handle(update.message).catch((error) => console.error("Telegram:", error.message));
        }
      } catch (error) {
        console.error("Telegram:", error.message);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  })();
}
