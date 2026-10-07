// Modelo que redacta las respuestas. Tres opciones, elegidas con LLM_PROVIDER:
//   ollama: modelo local (https://ollama.com), sin costo ni claves.
//   groq:   API de Groq con modelos abiertos; tiene capa gratuita (GROQ_API_KEY).
//   gemini: API de Google (necesita GEMINI_API_KEY).
import { gemini, statusOf, tryModels } from "./gemini.js";

export const PROVIDER = process.env.LLM_PROVIDER || (process.env.GEMINI_API_KEY ? "gemini" : "ollama");

const OLLAMA_URL = (process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, "");
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gemma3:4b";
// Ventana de contexto. Ollama usa una muy chica por defecto y recorta el prompt
// sin avisar, así que se fija acá: tiene que entrar instrucciones + fragmentos
// + historial + respuesta.
const OLLAMA_NUM_CTX = Number(process.env.OLLAMA_NUM_CTX) || 8192;
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const GEMINI_THINKING_LEVEL = process.env.GEMINI_THINKING_LEVEL || "low";

export function describe() {
  if (PROVIDER === "ollama") return `Ollama (${OLLAMA_MODEL}) en ${OLLAMA_URL}`;
  if (PROVIDER === "groq") return `Groq (${GROQ_MODEL})`;
  return "Gemini";
}

export function checkConfig() {
  if (!["ollama", "groq", "gemini"].includes(PROVIDER)) {
    throw new Error(`LLM_PROVIDER desconocido: ${PROVIDER} (usar "ollama", "groq" o "gemini").`);
  }
  if (PROVIDER === "groq" && !process.env.GROQ_API_KEY) {
    throw new Error("Falta GROQ_API_KEY. Se crea gratis en https://console.groq.com/keys");
  }
  if (PROVIDER === "gemini" && !process.env.GEMINI_API_KEY) {
    throw new Error("Falta GEMINI_API_KEY. Copiá .env.example a .env y completala, o usá LLM_PROVIDER=ollama.");
  }
}

// messages: [{ role: "user" | "assistant", text }]. Devuelve { text, model, usage }.
export function generate({ system, messages, onDelta }) {
  if (PROVIDER === "ollama") return generateOllama(system, messages, onDelta);
  if (PROVIDER === "groq") return generateGroq(system, messages, onDelta);
  return generateGemini(system, messages, onDelta);
}

// Groq habla el formato de la API de OpenAI (chat completions con streaming).
async function generateGroq(system, messages, onDelta) {
  // Estos modelos "razonan" antes de responder: se pide poco razonamiento (gasta
  // cuota) y que no lo mezclen con la respuesta.
  const reasoning = GROQ_MODEL.startsWith("openai/gpt-oss")
    ? { reasoning_effort: "low", include_reasoning: false }
    : GROQ_MODEL.startsWith("qwen/")
      ? { reasoning_effort: "low", reasoning_format: "hidden" }
      : {};
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      stream: true,
      temperature: 0.2,
      ...reasoning,
      messages: [
        { role: "system", content: system },
        ...messages.map((message) => ({ role: message.role, content: message.text })),
      ],
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw Object.assign(new Error(`Groq respondió ${response.status}: ${detail.slice(0, 400)}`), { status: response.status });
  }

  // La respuesta llega como eventos "data: {...}" y termina con "data: [DONE]".
  let text = "";
  let usage;
  let pending = "";
  const decoder = new TextDecoder();
  const handle = (line) => {
    if (!line.startsWith("data:")) return;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") return;
    const part = JSON.parse(data);
    if (part.error) throw new Error(`Groq: ${part.error.message || JSON.stringify(part.error)}`);
    const delta = part.choices?.[0]?.delta?.content;
    if (delta) {
      text += delta;
      onDelta?.(delta);
    }
    const reported = part.usage || part.x_groq?.usage;
    if (reported) usage = { input_tokens: reported.prompt_tokens, output_tokens: reported.completion_tokens };
  };
  for await (const bytes of response.body) {
    pending += decoder.decode(bytes, { stream: true });
    const lines = pending.split("\n");
    pending = lines.pop();
    lines.forEach(handle);
  }
  handle(pending);
  return { text, model: GROQ_MODEL, usage };
}

async function generateOllama(system, messages, onDelta) {
  let response;
  try {
    response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: true,
        options: { num_ctx: OLLAMA_NUM_CTX, temperature: 0.2 },
        messages: [
          { role: "system", content: system },
          ...messages.map((message) => ({ role: message.role, content: message.text })),
        ],
      }),
    });
  } catch (error) {
    throw new Error(`No se pudo conectar con Ollama en ${OLLAMA_URL} (¿está abierto?): ${error.cause?.message || error.message}`);
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw Object.assign(new Error(`Ollama respondió ${response.status}: ${detail.slice(0, 300)}`), { status: response.status });
  }

  // La respuesta llega como una línea JSON por fragmento.
  let text = "";
  let usage;
  let pending = "";
  const decoder = new TextDecoder();
  const handle = (line) => {
    if (!line.trim()) return;
    const part = JSON.parse(line);
    if (part.error) throw new Error(`Ollama: ${part.error}`);
    if (part.message?.content) {
      text += part.message.content;
      onDelta?.(part.message.content);
    }
    if (part.done) usage = { input_tokens: part.prompt_eval_count, output_tokens: part.eval_count };
  };
  for await (const bytes of response.body) {
    pending += decoder.decode(bytes, { stream: true });
    const lines = pending.split("\n");
    pending = lines.pop();
    lines.forEach(handle);
  }
  handle(pending);
  return { text, model: OLLAMA_MODEL, usage };
}

async function generateGemini(system, messages, onDelta) {
  const input = messages.map((message) => ({
    type: message.role === "user" ? "user_input" : "model_output",
    content: [{ type: "text", text: message.text }],
  }));
  let text = "";
  let usage;
  let usedModel;
  await tryModels(
    async (model) => {
      usedModel = model;
      try {
        // store: false para que Google no conserve las conversaciones.
        const stream = await gemini().interactions.create({
          model,
          system_instruction: system,
          input,
          generation_config: { thinking_level: GEMINI_THINKING_LEVEL },
          store: false,
          stream: true,
        });
        for await (const event of stream) {
          if (event.event_type === "step.delta" && event.delta.type === "text") {
            text += event.delta.text;
            onDelta?.(event.delta.text);
          } else if (event.event_type === "error") {
            throw new Error(event.error?.message || "error en el stream de Gemini");
          } else if (event.event_type === "interaction.completed") {
            usage = event.interaction.usage;
          }
        }
      } catch (error) {
        // Si ya se mostró parte de la respuesta no se puede cambiar de modelo.
        if (text) throw new Error(`respuesta interrumpida: ${error.message}`);
        throw error;
      }
    },
    { onSkip: (model, error) => console.warn(`${model} no disponible (${statusOf(error)}), pruebo el siguiente`) },
  );
  return { text, model: usedModel, usage };
}
