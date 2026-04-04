# Remote Care Companion

Demo-ready backend for a healthcare app using Bun, Elysia, TypeScript, Supabase, and Socket.io.

## Stack

- Bun
- Elysia
- TypeScript
- Supabase (PostgreSQL)
- Socket.io

## Project Structure

```text
/backend
  index.ts
  package.jsonF
  tsconfig.json
  .env.example
  migrations/
    supabase-schema.sql
  types.ts
  routes/
    reminder.ts
    status.ts
    sos.ts
    burnout.ts
  services/
    reminderService.ts
    alertService.ts
  db/
    supabase.ts
  socket/
    socket.ts
```

## Setup

```bash
cd backend
bun install
cp .env.example .env
```

Fill in Supabase values if you have them. If not, the app will automatically run in in-memory demo mode.

## Run

```bash
cd backend
bun run dev
```

Production-style start:

```bash
cd backend
bun run start
```

Render-style start:

```bash
cd backend
bun run server.ts
```

Type-check:

```bash
cd backend
bun run typecheck
```

## Environment Variables

Example `.env`:

```env
PORT=4000
SOCKET_PORT=4001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
PUBLIC_BASE_URL=https://your-public-backend-url
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_FROM_NUMBER=+1234567890
DEEPGRAM_API_KEY=your-deepgram-api-key
```

`PUBLIC_BASE_URL` must be reachable by Twilio webhooks (use ngrok or a deployed URL in development).

## Render Deployment

This repo now includes [render.yaml](/c:/Users/aanch/meowcare/render.yaml) with a `meowcare-backend` web service.

Recommended Render settings come from that blueprint:

- `rootDir`: `backend`
- `buildCommand`: `bun install`
- `startCommand`: `bun run server.ts`
- `healthCheckPath`: `/`

Set these environment variables in Render:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `PUBLIC_BASE_URL`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `DEEPGRAM_API_KEY`

After Render gives you the backend URL, set `PUBLIC_BASE_URL` to that same public Render URL so Twilio callback routes resolve correctly.

## Medicine Confirmation Calls (Twilio + Deepgram)

Deepgram does transcription and intent extraction here, while Twilio places PSTN calls.

1. `POST /api/call-reminder/schedule` to schedule a future call.
2. At reminder time, backend triggers Twilio outbound call.
3. Twilio hits `/api/call-reminder/twilio/voice/:jobId` for TwiML.
4. Patient records spoken answer after beep.
5. Twilio posts recording URL to `/api/call-reminder/twilio/recording/:jobId`.
6. Backend transcribes via Deepgram and maps to `taken`, `later`, or `skip`.
7. Backend writes medicine status through existing status/log flow.

### `POST /api/call-reminder/trigger-now`

Request:

```json
{
  "userId": "7e26d07f-b987-4c2b-98e2-4fb393f68df9",
  "phone": "+919999999999",
  "medicine": "Metformin",
  "dosage": "500mg"
}
```

## Supabase Schema

Run the SQL in [backend/migrations/supabase-schema.sql](/C:/Users/aanch/practice/backend/migrations/supabase-schema.sql) inside Supabase SQL Editor.

## API Examples

### `POST /api/reminder/add`

Request:

```json
{
  "userId": "7e26d07f-b987-4c2b-98e2-4fb393f68df9",
  "phone": "+919999999999",
  "medicine": "Metformin",
  "time": "08:00",
  "dosage": "500mg",
  "quantity": 1
}
```

Response:

```json
{
  "success": true,
  "message": "Reminder added successfully",
  "mode": "supabase",
  "data": {
    "id": "e0e2a1c6-1c52-4608-a6c6-46dc56442567",
    "user_id": "7e26d07f-b987-4c2b-98e2-4fb393f68df9",
    "medicine": "Metformin",
    "time": "08:00",
    "dosage": "500mg",
    "quantity": 1
  }
}
```

### `GET /api/reminder/list?userId=7e26d07f-b987-4c2b-98e2-4fb393f68df9`

Response:

```json
{
  "success": true,
  "message": "Reminders fetched successfully",
  "mode": "mock",
  "data": [
    {
      "id": "e0e2a1c6-1c52-4608-a6c6-46dc56442567",
      "user_id": "7e26d07f-b987-4c2b-98e2-4fb393f68df9",
      "medicine": "Metformin",
      "time": "08:00",
      "dosage": "500mg",
      "quantity": 1
    }
  ]
}
```

### `POST /api/status/update`

Request:

```json
{
  "userId": "7e26d07f-b987-4c2b-98e2-4fb393f68df9",
  "status": "skip"
}
```

Response:

```json
{
  "success": true,
  "message": "Dose status updated successfully",
  "mode": "mock",
  "data": {
    "log": {
      "id": "9162a557-3ad8-4560-a4e2-88994bc3c3d1",
      "user_id": "7e26d07f-b987-4c2b-98e2-4fb393f68df9",
      "status": "skip",
      "timestamp": "2026-04-01T13:15:00.000Z"
    },
    "alert": {
      "id": "5dad27ab-a0ae-490b-b7fc-a435ba86bd44",
      "type": "missed",
      "message": "Missed medication detected for user 7e26d07f-b987-4c2b-98e2-4fb393f68df9",
      "timestamp": "2026-04-01T13:15:00.000Z"
    }
  }
}
```

### `POST /api/sos`

Request:

```json
{
  "userId": "7e26d07f-b987-4c2b-98e2-4fb393f68df9",
  "message": "Patient needs immediate help"
}
```

Response:

```json
{
  "success": true,
  "message": "SOS alert created successfully",
  "mode": "mock",
  "data": {
    "alert": {
      "id": "f9f11e6c-88bc-462a-b4ca-1788bcc340a1",
      "type": "sos",
      "message": "Patient needs immediate help",
      "timestamp": "2026-04-01T13:15:00.000Z"
    }
  }
}
```

### `POST /api/burnout`

Request:

```json
{
  "userId": "7e26d07f-b987-4c2b-98e2-4fb393f68df9",
  "mood": "overwhelmed"
}
```

Response:

```json
{
  "success": true,
  "message": "Burnout assessment completed",
  "data": {
    "userId": "7e26d07f-b987-4c2b-98e2-4fb393f68df9",
    "mood": "overwhelmed",
    "burnoutLevel": "high",
    "suggestion": "High burnout risk. Encourage rest, check in with a caregiver, and reduce non-essential tasks."
  }
}
```

## Socket.io Events

- `alert:new`
- `dose:update`
- `sos:triggered`

Socket server runs on `SOCKET_PORT` and defaults to `3001`.
