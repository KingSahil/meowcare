# MeowCare

MeowCare is a remote care companion for medication reminders, caregiver monitoring, and emergency escalation.

It combines:

- a Vite + React frontend for caregivers
- a Bun + TypeScript backend for reminders, status logs, SOS alerts, AI parsing, and voice flows
- a WhatsApp bot for patient reminders and passive safety follow-up
- a standalone AI parsing module for free-text reminders and prescription-image extraction

## Repository Structure

```text
.
├─ frontend/      # Caregiver dashboard built with React + Vite
├─ backend/       # API built with Bun, TypeScript, and Elysia/Node runtime adapters
├─ Whatsapp/      # WhatsApp bot using Baileys + cron jobs
├─ ai-module/     # Reminder parsing + prescription OCR pipeline
├─ render.yaml    # Render blueprint for backend + WhatsApp bot
└─ vercel.json    # Vercel config for frontend, backend, and AI module routes
```

## Core Features

- medication reminder creation and listing
- dose status tracking: `taken`, `later`, `skip`
- SOS alert creation and passive safety escalation
- burnout check endpoint for quick caregiver risk assessment
- AI-assisted reminder parsing from natural language
- prescription scanning pipeline for structured medicine extraction
- WhatsApp reminder bot with QR pairing and scheduled nudges
- outbound call reminder flow via Twilio + Deepgram

## Tech Stack

- Frontend: React 19, TypeScript, Vite, React Router
- Backend: Bun, TypeScript, Elysia, Socket.io, Supabase
- WhatsApp bot: Node.js, Baileys, node-cron
- AI module: Node.js, Groq-based parsing/OCR pipeline
- Deployment: Vercel for frontend/serverless routes, Render for always-on services

## Local Development

### 1. Frontend

```bash
cd frontend
npm install
npm run dev
```

Common frontend env values:

```env
VITE_API_BASE_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4001
VITE_WHATSAPP_BASE_URL=http://localhost:4012
```

### 2. Backend

```bash
cd backend
bun install
bun run dev
```

Helpful backend env values:

```env
PORT=4000
SOCKET_PORT=4001
SUPABASE_URL=
SUPABASE_ANON_KEY=
PUBLIC_BASE_URL=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
DEEPGRAM_API_KEY=
```

The backend can run in demo/mock mode if Supabase is not configured.

### 3. WhatsApp Bot

```bash
cd Whatsapp
npm install
npm run dev
```

Typical bot env values:

```env
WA_AUTH_DIR=./wa-auth
WA_QR_HTTP_PORT=4012
API_BASE_URL=http://localhost:4000
DEMO_USER_ID=11111111-1111-1111-1111-111111111111
DEMO_MEDICINE=BP medicine
DEMO_DOSAGE=1 tablet
REMINDER_CRON=*/30 * * * *
```

On first run, scan the QR code from the terminal or load `http://localhost:4012/qr.png`.

### 4. AI Module

```bash
cd ai-module
npm install
node parseReminder.js "take 1 tablet of metformin after dinner for 5 days"
```

Optional AI env values:

```env
GROQ_API_KEY=
GROQ_TEXT_MODEL=
GROQ_VISION_MODEL=
```

## Main API Surface

- `GET /` health check
- `POST /api/reminder/add`
- `GET /api/reminder/list`
- `POST /api/status/update`
- `POST /api/sos`
- `POST /api/burnout`
- `POST /api/voice/query`
- `POST /api/ai/parse-reminder`
- `POST /api/ai/scan-prescription`
- `POST /api/call-reminder/trigger-now`

When running the Bun/Elysia backend directly, Swagger is available at `/swagger`.

## Deployment

### Render

`render.yaml` provisions:

- `meowcare-backend`
- `meowcare-whatsapp-bot`

Use Render for the WhatsApp bot and scheduled call/reminder flows because they need an always-on runtime and persistent auth storage.

### Vercel

`vercel.json` routes:

- `frontend/` at `/`
- `backend/server.ts` at `/_/backend`
- `ai-module/index.js` at `/_/ai`

Your frontend currently points at the deployed Render services through env values like:

```env
VITE_API_BASE_URL=https://meowcare-backend.onrender.com
VITE_WHATSAPP_BASE_URL=https://meowcare-whatsapp-bot.onrender.com
```

## Notes

- `backend/README.md` has backend-specific API and environment details.
- `Whatsapp/README.md` explains the bot lifecycle and QR flow.
- `ai-module/README.md` documents the OCR and reminder parsing pipeline.

## Status

This repository is structured like a demo or hackathon prototype, but it already includes a solid base for:

- caregiver dashboards
- reminder automation
- patient reply capture
- emergency escalation
- medication parsing workflows

The clearest next step would be wiring the AI module and WhatsApp scheduling more tightly into the backend reminder source of truth.
