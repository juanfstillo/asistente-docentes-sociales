// Cliente de Gemini y reintentos: si un modelo está saturado (503) o sin cuota
// (429), se prueba con el siguiente de la lista.
import { GoogleGenAI } from "@google/genai";

// En orden de preferencia. Todos tienen capa gratuita.
export const MODELS = (process.env.GEMINI_MODELS || "gemini-3.8-flash,gemini-3.7-flash,gemini-3.6-flash,gemini-3.5-flash")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);

let client;
export function gemini() {
  return (client ??= new GoogleGenAI({})); // toma GEMINI_API_KEY del entorno
}

export function statusOf(error) {
  return error?.status ?? error?.statusCode ?? (Number(/^(\d{3})\b/.exec(error?.message || "")?.[1]) || undefined);
}

function isTemporary(error) {
  return [429, 500, 503].includes(statusOf(error));
}

// Ejecuta call(modelo) con cada modelo hasta que uno responda. Si todos fallan
// por saturación, espera y repite hasta completar `rounds` vueltas.
export async function tryModels(call, { rounds = 1, waitMs = 0, onSkip } = {}) {
  let lastError;
  for (let round = 0; round < rounds; round++) {
    if (round) await new Promise((resolve) => setTimeout(resolve, waitMs * round));
    for (const model of MODELS) {
      try {
        return await call(model);
      } catch (error) {
        if (!isTemporary(error)) throw error;
        lastError = error;
        onSkip?.(model, error);
      }
    }
  }
  throw lastError;
}
