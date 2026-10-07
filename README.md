# Asistente para docentes · Sociales UBA

Chatbot que responde consultas de docentes de la Facultad de Ciencias Sociales (UBA) sobre trámites y sistemas (SIU Guaraní, Campus Virtual, Microsoft Teams), a partir de los instructivos que publica la Facultad en <https://www.sociales.uba.ar/docentes/instructivos/>.

**Es un proyecto no oficial.** No representa a la Facultad ni tiene acceso a sus sistemas: solo explica lo que dicen los instructivos y cita la fuente.

- Web: <https://asistente-docentes-sociales.duckdns.org>
- Telegram: [@asistente_docente_sociales_bot](https://t.me/asistente_docente_sociales_bot)

## Cómo funciona

1. **Instructivos en texto.** Los 14 PDF de la Facultad (unas 170 páginas) están transcriptos a Markdown en `data/md`. Como son paso a paso con capturas de pantalla, cada captura está descripta en una línea que empieza con `Captura:`, y cada página lleva una marca `[pág. N]` para poder citarla.
2. **Búsqueda de fragmentos.** Al arrancar, el bot parte los instructivos en fragmentos (156) y arma un índice por palabras (BM25) en memoria. Para cada consulta elige los fragmentos más relevantes. No usa embeddings ni base de datos.
3. **Respuesta.** Le manda al modelo las instrucciones, la lista de instructivos y esos fragmentos (unos 3.500 a 5.000 tokens). El modelo responde solo con ese material, indica título, página y enlace al PDF, y dice que no sabe cuando la respuesta no está.
4. **Canales.** El mismo núcleo atiende la web y Telegram. Sumar otro canal (por ejemplo WhatsApp) es agregar un adaptador.

```
public/index.html   Página de chat
src/server.js       Servidor web y arranque
src/telegram.js     Canal Telegram (long polling)
src/chat.js         Conversaciones, límite de uso y registro de consultas
src/kb.js           Carga de instructivos, fragmentos y búsqueda
src/llm.js          Modelo: Ollama, Groq o Gemini
src/gemini.js       Cliente de Gemini con modelos de respaldo
scripts/ingest.js   Conversión de PDF a Markdown con Gemini
data/sources.json   Lista de instructivos (título, fecha, enlace)
data/md/            Instructivos transcriptos
deploy/             Scripts de despliegue
```

## Instructivos incluidos

| Tema | Instructivo | Publicado |
|---|---|---|
| SIU Guaraní | Carga de actas de exámenes | 2020-09 |
| SIU Guaraní | Carga de actas de cursada | 2020-08 |
| SIU Guaraní | Uso de mensajería | 2021-03 |
| Campus Virtual | Manual de uso inicial | 2026-08 |
| Campus Virtual | Solicitud de aulas virtuales | 2020-08 |
| Campus Virtual | Creación y configuración de un cuestionario | 2020-11 |
| Campus Virtual | Preguntas con respuestas anidadas (Cloze) | 2021-03 |
| Campus Virtual | Taller | 2021-03 |
| Campus Virtual | Reportes | 2021-03 |
| Campus Virtual | Uso de la tarea | 2026-03 |
| Campus Virtual | Importar contenido, copia de seguridad y restaurar | 2026-03 |
| Teams | Uso de Microsoft Teams | 2020-11 |
| Grabación | Recomendaciones para grabar videos | 2022-03 |
| Grabación | Recomendaciones para grabar audios | 2021-06 |

Varios son de 2020-2021 y pueden estar desactualizados; el bot avisa la fecha de la fuente. No hay instructivo sobre cómo pedir mesas de examen, así que el bot no puede responder eso.

## Correrlo en tu máquina

Requiere Node 22 o superior.

```bash
npm install
cp .env.example .env    # y completar
npm start
```

Abre en <http://localhost:3000>. En Windows, si PowerShell bloquea `npm`, usar `npm.cmd`.

## Configuración (`.env`)

El modelo se elige con `LLM_PROVIDER`:

| Valor | Qué es | Qué necesita |
|---|---|---|
| `ollama` | Modelo local con [Ollama](https://ollama.com). Sin costo, sin límites, y las consultas no salen de la máquina. | Ollama instalado y un modelo descargado (`OLLAMA_MODEL`) |
| `groq` | API de Groq con modelos abiertos. Tiene capa gratuita. | `GROQ_API_KEY` |
| `gemini` | API de Google. | `GEMINI_API_KEY` |

Otras variables:

| Variable | Para qué |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Token del bot (lo da @BotFather). Vacío = Telegram desactivado. |
| `CONTEXT_CHARS` | Cuánto texto de instructivos se manda por consulta (por defecto 12000; con Groq gratuito conviene 7000). `all` manda todo. |
| `MAX_HISTORY` | Mensajes de la conversación que se recuerdan (por defecto 8). |
| `PORT` | Puerto web (por defecto 3000). |
| `TRUST_PROXY` | Poner `1` si corre detrás de un proxy, para que el límite de uso se cuente por visitante. |

El detalle de cada proveedor está en `.env.example`.

### Límites de las capas gratuitas

Los medimos durante el desarrollo:

- **Gemini**: 20 consultas por día por modelo. No alcanza ni para probar.
- **Groq**: 8.000 tokens por minuto y 200.000 por día, que con este bot son unas 50 consultas diarias entre todos los usuarios. Sirve para una prueba con pocos docentes.
- **Ollama**: sin tope, pero necesita una máquina con memoria suficiente y encendida. Un servidor chico sin placa de video (2 vCPU, 4 GB) no alcanza para correr el modelo.

Para abrirlo a más gente, la opción más simple es un modelo pago económico: a este tamaño de consulta cuesta fracciones de centavo de dólar por respuesta.

## Agregar o actualizar un instructivo

1. Agregar la entrada en `data/sources.json` (id, título, fecha, nombre de archivo y enlace).
2. Dejar la transcripción en `data/md/<id>.md`, con las marcas `[pág. N]` y las líneas `Captura:`.
3. Reiniciar el bot.

Para generar la transcripción automáticamente: bajar el PDF a `data/pdfs/` con el nombre indicado en `sources.json` y correr `npm run ingest` (usa Gemini, necesita `GEMINI_API_KEY`). Convierte solo los que falten. Los PDF originales no están en este repositorio; se bajan desde los enlaces de `sources.json`. Conviene revisar el resultado contra el PDF.

## Despliegue

Corre como un contenedor Docker (`Dockerfile` y `docker-compose.yml`).

Desde Windows, con el `.env` completo:

```powershell
powershell -ExecutionPolicy Bypass -File deploy\subir.ps1 -Servidor IP_DEL_SERVIDOR
```

El script empaqueta el proyecto con el `.env`, lo sube por SSH y en el servidor corre `deploy/setup.sh`, que lo deja en `/root/chat-uba` y levanta el contenedor. Sirve también para actualizar; el registro de consultas del servidor se conserva.

En el servidor:

```bash
cd /root/chat-uba
docker compose logs -f      # registro en vivo
docker compose restart      # reiniciar
```

El HTTPS lo da un proxy inverso delante del puerto 3000 (en producción, Nginx Proxy Manager con un subdominio de DuckDNS). Con proxy, poner `TRUST_PROXY=1`.

Con un mismo token de Telegram no pueden correr dos copias del bot a la vez.

## Cuidados incluidos

- Responde solo con el contenido de los instructivos y cita título, página y enlace.
- No pide contraseñas, DNI ni otros datos personales.
- Límite de 15 consultas cada 5 minutos por visitante o chat.
- Guarda preguntas y respuestas en `data/logs/chat.jsonl`, para detectar qué instructivos faltan o no se entienden. Ese archivo no se sube al repositorio.

## Pendientes

- La búsqueda es por coincidencia de palabras: si alguien pregunta con términos distintos a los del instructivo, puede no encontrar el fragmento. Se puede mejorar con búsqueda por significado.
- Las transcripciones se hicieron en parte a mano; en las tablas de íconos del manual del Campus, los íconos están descriptos de forma aproximada.
- Canal de WhatsApp (requiere la API oficial de WhatsApp Business y un número dedicado).
- Armar un set de preguntas reales con su respuesta correcta para medir cada cambio.
