## SlideMinds — README

AI-powered chat app that generates and edits PowerPoint presentations using Gemini + pptxgenjs.
This README covers project setup (local + production), usage, API details, assumptions, and troubleshooting.


# Table of contents
# 1 — Project summary
SlideMinds is a chat-first UI where a user types a prompt (or uploads a file) and the app uses a Gemini model to produce structured slide content (JSON). The backend converts that JSON into a client-visible preview and can export a .pptx using pptxgenjs. The UI also supports basic slide editing and saving chat history.


# 2 — What’s included
Backend (Node.js / Express)
Routes for generation, file upload and PPT export
Gemini integration using @google/generative-ai
multer for file uploads
pptxgenjs to create PPTX
Frontend (React)
Chat UI (prompt input, file upload, messages)
Slide preview, slide editor, export/download button
Example scripts to list models / test Gemini
README + troubleshooting notes


# 3 — Requirements & prereqs
Node.js 18+ (tested)
npm
MongoDB (local for dev or MongoDB Atlas for production)
A Google Generative AI API key (Gemini) — added to .env


# 4 — Environment variables (add to backend .env)
# Gemini
GEMINI_API_KEY=AIza...         # Google API key for Generative AI
GEMINI_MODEL=models/gemini-2.5-pro   # model name 

# MongoDB
MONGODB_URI=mongodb://localhost:27017/slideminds

# JWT and general
JWT_SECRET=your_jwt_secret
PORT=5000
NODE_ENV=development


## Notes:
Use the exact model string that listModels() returned for your key. For v0.24.1 many installations will have models/gemini-2.5-flash or models/gemini-2.5-pro available .


## 5 — Local setup
# Backend
cd Backend

Install:
npm install
Create .env (see keys above). Ensure GEMINI_API_KEY and GEMINI_MODEL are set.

Start server:
npm run dev


# Frontend
cd frontend (or where Home.jsx lives)

Install:
npm install


Start:
npm run dev


## 6 — API endpoints

Assuming base http://localhost:5000/api/presentation

POST /api/presentation/generate

Accepts JSON { "prompt": "..." }

Returns { success: true, data: { title, subtitle?, slides: [ {title, content: [], notes?} ] } }

Use when no file is uploaded.

POST /api/presentation/generate-with-file

Accepts multipart/form-data:

prompt (text)

file (pdf/doc/docx/txt)

Uses multer middleware, reads file, adds content to prompt before sending to Gemini.

Use when you want to upload source files.

POST /api/presentation/export

Accepts JSON body { "presentationData": <the JSON slides> }

Generates .pptx and sends it as downloadable file.



## 7 — PPTX generation (flow)

Backend receives validated presentationData JSON (title, slides[]).

Uses pptxgenjs to add a title slide and content slides:

Slide title, bullet points, notes (if available).

Writes a temporary PPTX to temp/ and sends via res.download.

Temp file removed after sending to avoid disk accumulation.

## 8 — Deployment notes (important)

MongoDB: Change MONGODB_URI to a cloud DB (Atlas, Railway, Render). Local mongodb://localhost:27017/... won't work on cloud hosts. Add the cloud URI into your host's environment variables.

GEMINI_API_KEY: Set this in the deployment environment (do NOT commit .env).

GEMINI_MODEL: Use a model name your API key supports (see listModels output). On older SDKs you may need models/<name> form; on newer SDKs the format may differ.

File storage: Use ephemeral disk only for temp files. On some platforms (e.g., Vercel serverless) writing files is restricted — use a worker, external storage, or avoid file writes (stream to client).

Port: Respect the platform PORT env var.

## 9 — Troubleshooting (common errors & fixes)
Cannot read properties of undefined (reading 'prompt')
Cause: req.body is undefined because the incoming request is multipart/form-data and you didn’t parse it, or express.json() is missing for JSON requests.

Solutions:

For JSON requests: make sure app.use(express.json()) is called before routes.

For FormData file requests: register multer in the route:
router.post('/generate-with-file', upload.single('file'), generatePresentation);

Console debug: add console.log(req.headers['content-type'], req.body) to inspect what arrived.

models/XXX is not found for API version v1beta or 404 from Gemini

Cause: incorrect model name or API version mismatch.

Fix:

Run the small listModels script (provided earlier) to see which model strings your key supports, then use that exact model string.

On @google/generative-ai@0.24.1, the returned model names are like models/gemini-2.5-flash or models/gemini-2.5-pro. Use that literal string in your controller:

const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL });


If you want newer model name formats, upgrade @google/generative-ai per docs and adapt calls.

Converting circular structure to JSON

Cause: passing complex objects like req, res, or socket to JSON.stringify or including them in the prompt.

Fix:

Only send plain strings or plain objects (e.g., req.body.prompt) to the Gemini API. Don’t pass req or res.

Gemini returns invalid JSON (parse error)

Cause: model may wrap output in markdown or extra text.

Fix:

Use a strong system prompt instructing the model to return strict JSON-only (no markdown). Clean output (strip code fences) and JSON.parse inside try/catch with helpful debug logging.

404 model errors after upgrade attempts

Cause: package version not updated or old model strings still used.

Fix:

npm uninstall @google/generative-ai then npm install @google/generative-ai@latest (or delete node_modules + package-lock.json and reinstall). Re-run listModels to confirm accessible models.

11 — Assumptions & limitations

Assumes the user will provide a valid GEMINI_API_KEY with access to generation models.

Assumes pptxgenjs’s API is compatible with the server-side environment (it writes files).

The AI output is expected to be valid JSON — production systems should validate and sanitize AI outputs.

This implementation does not stream generation by default (optional).

File uploads are limited (multer limit configured to 10MB by default; adjust in presentationController if necessary).

Auth in the demo is simple token-based; secure auth and rate-limiting are recommended for production.

12 — Extra / plus-point features (optional)

Streaming generation and progress UI (websocket + chunked responses).

Export to PDF (server-side conversion) and thumbnails for slides.

Autosave and more robust versioning for chat history (per-user).

Admin dashboard to view usage, model calls, and logs.

13 — Example troubleshooting checklist (quick)

req.body undefined → check express.json() and multer on route

404 model → run node listModels.js and set GEMINI_MODEL to one listed

API key invalid → ensure GEMINI_API_KEY is correct and enabled

File uploads failing → check upload.single('file') and allowed mimetypes

Export not downloading → check res.download callback and temporary path + permissions

14 — Minimal testing commands (cURL)

JSON prompt:

curl -X POST http://localhost:5000/api/presentation/generate \
 -H "Content-Type: application/json" \
 -d '{"prompt":"Create a 5 slide overview of renewable energy"}'


FormData + file:

curl -X POST http://localhost:5000/api/presentation/generate-with-file \
 -H "Authorization: Bearer YOURTOKEN" \
 -F "prompt=Create slides from this file" \
 -F "file=@/path/to/doc.pdf"


Export:

curl -X POST http://localhost:5000/api/presentation/export \
 -H "Content-Type: application/json" \
 -d '{"presentationData": { "title":"My PPT","slides":[{"title":"S1","content":["A","B","C"]}]}}' \
 --output presentation.pptx

15 — Final notes & recommended next steps

Before deployment: create a MongoDB Atlas cluster, create DB user, update MONGODB_URI in production env.

Verify GEMINI_MODEL by running listModels.js and pick one of the "models/..." names returned, e.g. models/gemini-2.5-pro.

Harden production setup: add authentication, request rate limits, logging (sensitive data redaction), and disk-cleanup cron for temp files.

16 — License

Add your license of choice (MIT recommended). Example LICENSE (MIT) can be included at repo root