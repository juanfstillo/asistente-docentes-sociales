// Convierte cada PDF de data/pdfs a Markdown (data/md) usando Gemini con visión,
// para que las capturas de pantalla queden descriptas en texto.
// Uso: npm run ingest            (solo los que faltan)
//      npm run ingest -- --force (todos de nuevo)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gemini, statusOf, tryModels } from "../src/gemini.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pdfDir = path.join(root, "data", "pdfs");
const mdDir = path.join(root, "data", "md");
const sources = JSON.parse(fs.readFileSync(path.join(root, "data", "sources.json"), "utf8"));
const force = process.argv.includes("--force");

const PROMPT = `Este PDF es un instructivo para docentes de la Facultad de Ciencias Sociales de la UBA. Transcribilo a Markdown para que sirva como base de conocimiento de un asistente que responde preguntas de docentes sin mostrarles el PDF.

- Transcribí todo el texto de forma fiel y completa, en el orden del documento. No resumas ni agregues información que no esté en el PDF.
- Antes del contenido de cada página escribí una línea "[pág. N]" con el número de página del PDF (la primera es 1), para poder citarla después.
- Las capturas de pantalla e imágenes no se van a ver: describí cada una en una línea que empiece con "Captura:", indicando qué pantalla es y qué botones, menús, campos o flechas señala, con los nombres exactos que se leen en la imagen. Un docente tiene que poder seguir el paso solo con esa descripción.
- Conservá tal cual los enlaces, direcciones de correo, nombres de botones y menús, fechas y plazos.
- Omití encabezados y pies de página repetidos y elementos puramente decorativos.

Respondé solo con el Markdown, sin comentarios antes ni después.`;

if (!process.env.GEMINI_API_KEY) {
  console.error("Falta GEMINI_API_KEY. Copiá .env.example a .env y completala.");
  process.exit(1);
}
fs.mkdirSync(mdDir, { recursive: true });

let failed = 0;
let quotaShown = false;
for (const source of sources) {
  const out = path.join(mdDir, `${source.id}.md`);
  if (!force && fs.existsSync(out)) {
    console.log(`= ${source.id} (ya existe)`);
    continue;
  }
  process.stdout.write(`> ${source.id} ... `);
  try {
    const data = fs.readFileSync(path.join(pdfDir, source.file)).toString("base64");
    let usedModel;
    const interaction = await tryModels(
      (model) => {
        usedModel = model;
        return gemini().interactions.create({
          model,
          input: [
            { type: "document", data, mime_type: "application/pdf" },
            { type: "text", text: PROMPT },
          ],
          generation_config: { max_output_tokens: 65536 },
          store: false,
        });
      },
      { rounds: 5, waitMs: 60_000, onSkip: (model, error) => {
          process.stdout.write(`[${model}: ${statusOf(error)}] `);
          // El detalle del 429 dice qué cuota se agotó (por minuto o por día).
          if (statusOf(error) === 429 && !quotaShown) {
            quotaShown = true;
            console.log(`\n${String(error.message).slice(0, 600)}\n`);
          }
        } },
    );
    const markdown = (interaction.output_text || "").trim();
    if (interaction.status !== "completed" || !markdown) {
      throw new Error(`respuesta incompleta (status: ${interaction.status})`);
    }
    fs.writeFileSync(out, markdown + "\n");
    // Pausa entre PDFs para no agotar la cuota por minuto de la capa gratuita.
    await new Promise((resolve) => setTimeout(resolve, 15_000));
    console.log(`ok con ${usedModel} (${interaction.usage?.total_output_tokens ?? "?"} tokens de salida)`);
  } catch (error) {
    failed++;
    console.log(`ERROR: ${error.message}`);
  }
}

if (failed) {
  console.error(`\n${failed} instructivo(s) fallaron. Volvé a correr "npm run ingest" para reintentarlos.`);
  process.exit(1);
}
