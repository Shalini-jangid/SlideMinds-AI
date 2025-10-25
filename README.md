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
## Cause: req.body is undefined because the incoming request is multipart/form-data and you didn’t parse it, or express.json() is missing for JSON requests.

Fix:
For JSON requests: make sure app.use(express.json()) is called before routes.
For FormData file requests: register multer in the route:
router.post('/generate-with-file', upload.single('file'), generatePresentation);
Console debug: add console.log(req.headers['content-type'], req.body) to inspect what arrived.
models/XXX is not found for API version v1beta or 404 from Gemini

## Cause: package version not updated or old model strings still used.

Fix:
npm uninstall @google/generative-ai then npm install @google/generative-ai@latest (or delete node_modules + package-lock.json and reinstall). Re-run listModels to confirm accessible models.


## 10 — Deployments
Frontend :- https://slide-minds-ai.vercel.app
Backend :- https://slideminds-ai.onrender.com
