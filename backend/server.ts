import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { URL } from 'node:url';

const port = Number(process.env.PORT ?? 3000);
const isVercelRuntime = process.env.VERCEL === '1';

type JsonRecord = Record<string, unknown>;
type BurnoutLevel = 'low' | 'medium' | 'high';

const loadDb = () => import('./db/supabase');
const loadAiService = () => import('./services/aiService');
const loadAlertService = () => import('./services/alertService');
const loadCallReminderService = () => import('./services/callReminderService');
const loadReminderService = () => import('./services/reminderService');
const loadVoiceService = () => import('./services/voiceService');

function setCorsHeaders(response: ServerResponse) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown) {
  response.statusCode = statusCode;
  setCorsHeaders(response);
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

function sendText(response: ServerResponse, statusCode: number, contentType: string, payload: string) {
  response.statusCode = statusCode;
  setCorsHeaders(response);
  response.setHeader('Content-Type', contentType);
  response.end(payload);
}

function toText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

async function readRawBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf8');
}

async function readJsonBody(request: IncomingMessage): Promise<JsonRecord> {
  const raw = await readRawBody(request);

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as JsonRecord) : {};
  } catch {
    throw new Error('Request body must be valid JSON');
  }
}

async function readFormBody(request: IncomingMessage) {
  const raw = await readRawBody(request);
  return new URLSearchParams(raw);
}

function assessBurnout(userId: string | undefined, mood: string) {
  const normalizedMood = mood.trim().toLowerCase();

  let burnoutLevel: BurnoutLevel = 'low';
  let suggestion = 'Low burnout risk. Keep a healthy routine and continue regular check-ins.';

  if (['exhausted', 'overwhelmed', 'burned out', 'burnt out', 'hopeless'].includes(normalizedMood)) {
    burnoutLevel = 'high';
    suggestion =
      'High burnout risk. Encourage rest, check in with a caregiver, and reduce non-essential tasks.';
  } else if (['tired', 'stressed', 'anxious', 'drained', 'sad'].includes(normalizedMood)) {
    burnoutLevel = 'medium';
    suggestion = 'Medium burnout risk. Add a break, hydration, and a quick caregiver follow-up.';
  }

  return {
    userId: userId ?? null,
    mood,
    burnoutLevel,
    suggestion
  };
}

function isReminderStatus(value: unknown): value is 'taken' | 'later' | 'skip' {
  return value === 'taken' || value === 'later' || value === 'skip';
}

async function handleRequest(request: IncomingMessage, response: ServerResponse) {
  if (!request.url) {
    sendJson(response, 400, { success: false, message: 'Missing request URL' });
    return;
  }

  if (request.method === 'OPTIONS') {
    response.statusCode = 204;
    setCorsHeaders(response);
    response.end();
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const method = request.method || 'GET';

  if (method === 'GET' && pathname === '/') {
    const { getDataMode, getRuntimeNote } = await loadDb();
    sendJson(response, 200, {
      success: true,
      message: 'Remote Care Companion backend is running',
      data: {
        httpPort: port,
        socketPort: Number(process.env.SOCKET_PORT ?? 4001),
        mode: getDataMode(),
        note: getRuntimeNote(),
        socketServerEnabled: false
      }
    });
    return;
  }

  if (method === 'POST' && pathname === '/api/ai/parse-reminder') {
    const body = await readJsonBody(request);
    const text = toText(body.text);

    if (!text) {
      sendJson(response, 400, { success: false, message: 'Reminder text is required' });
      return;
    }

    const { buildReminderInsight, parseReminderText } = await loadAiService();
    const parsed = await parseReminderText(text, (body.userContext as Record<string, unknown>) || {});

    sendJson(response, 200, {
      success: true,
      message: 'Reminder text parsed successfully',
      data: {
        parsed,
        insight: buildReminderInsight(parsed)
      }
    });
    return;
  }

  if (method === 'POST' && pathname === '/api/ai/scan-prescription') {
    const body = await readJsonBody(request);
    const image = toText(body.image);

    if (!image) {
      sendJson(response, 400, { success: false, message: 'Prescription image source is required' });
      return;
    }

    const { buildPrescriptionScanResult, scanPrescriptionImage } = await loadAiService();
    const parsed = await scanPrescriptionImage(image, (body.userContext as Record<string, unknown>) || {});

    sendJson(response, 200, {
      success: true,
      message: 'Prescription image processed successfully',
      data: {
        parsed,
        scan: buildPrescriptionScanResult(parsed)
      }
    });
    return;
  }

  if (method === 'POST' && pathname === '/api/reminder/add') {
    const body = await readJsonBody(request);

    if (!toText(body.userId) || !toText(body.medicine) || !toText(body.time) || !toText(body.dosage)) {
      sendJson(response, 400, { success: false, message: 'userId, medicine, time, and dosage are required' });
      return;
    }

    const quantity = Number(body.quantity);
    if (!Number.isFinite(quantity) || quantity < 1) {
      sendJson(response, 400, { success: false, message: 'quantity must be at least 1' });
      return;
    }

    const { addReminder } = await loadReminderService();
    const { getDataMode } = await loadDb();
    const reminder = await addReminder({
      userId: toText(body.userId),
      phone: toText(body.phone) || undefined,
      medicine: toText(body.medicine),
      time: toText(body.time),
      dosage: toText(body.dosage),
      quantity
    });

    sendJson(response, 201, {
      success: true,
      message: 'Reminder added successfully',
      mode: getDataMode(),
      data: reminder
    });
    return;
  }

  if (method === 'GET' && pathname === '/api/reminder/list') {
    const userId = toText(url.searchParams.get('userId'));

    if (!userId) {
      sendJson(response, 400, { success: false, message: 'userId is required' });
      return;
    }

    const { getRemindersForUser } = await loadReminderService();
    const { getDataMode } = await loadDb();
    const reminders = await getRemindersForUser(userId);
    sendJson(response, 200, {
      success: true,
      message: 'Reminders fetched successfully',
      mode: getDataMode(),
      data: reminders
    });
    return;
  }

  if (method === 'POST' && pathname === '/api/reminder/voice-query') {
    const body = await readJsonBody(request);
    const userId = toText(body.userId);
    const query = toText(body.query);

    if (!userId || !query) {
      sendJson(response, 400, { success: false, message: 'userId and query are required' });
      return;
    }

    const { getRemindersForUser } = await loadReminderService();
    const { handleVoiceQuery } = await loadVoiceService();
    const { getDataMode } = await loadDb();
    const reminders = await getRemindersForUser(userId);
    const formattedReminders = reminders.map((reminder) => ({
      medicine: reminder.medicine,
      dosage: reminder.dosage,
      time: reminder.time,
      quantity: reminder.quantity
    }));
    const voiceResponse = await handleVoiceQuery({ userId, query }, formattedReminders);

    sendJson(response, voiceResponse.success ? 200 : 400, {
      success: voiceResponse.success,
      message: voiceResponse.text,
      data: voiceResponse,
      mode: getDataMode()
    });
    return;
  }

  if (method === 'POST' && pathname === '/api/status/update') {
    const body = await readJsonBody(request);
    const userId = toText(body.userId);
    const status = body.status;

    if (!userId || !isReminderStatus(status)) {
      sendJson(response, 400, { success: false, message: 'userId and a valid status are required' });
      return;
    }

    const { updateDoseStatus } = await loadReminderService();
    const { getDataMode } = await loadDb();
    const result = await updateDoseStatus({
      userId,
      phone: toText(body.phone) || undefined,
      status,
      timestamp: toText(body.timestamp) || undefined
    });

    sendJson(response, 200, {
      success: true,
      message: 'Dose status updated successfully',
      mode: getDataMode(),
      data: result
    });
    return;
  }

  if (method === 'POST' && pathname === '/api/sos') {
    const body = await readJsonBody(request);
    const userId = toText(body.userId);

    if (!userId) {
      sendJson(response, 400, { success: false, message: 'userId is required' });
      return;
    }

    const { ensureUserRecord, getDataMode } = await loadDb();
    await ensureUserRecord(userId, toText(body.phone) || undefined);
    const { createAlert } = await loadAlertService();
    const alert = await createAlert('sos', toText(body.message) || `SOS triggered by user ${userId}`);

    sendJson(response, 201, {
      success: true,
      message: 'SOS alert created successfully',
      mode: getDataMode(),
      data: { alert }
    });
    return;
  }

  if (method === 'POST' && pathname === '/api/burnout') {
    const body = await readJsonBody(request);
    const mood = toText(body.mood);

    if (!mood) {
      sendJson(response, 400, { success: false, message: 'mood is required' });
      return;
    }

    sendJson(response, 200, {
      success: true,
      message: 'Burnout assessment completed',
      data: assessBurnout(toText(body.userId) || undefined, mood)
    });
    return;
  }

  if (method === 'POST' && pathname === '/api/voice/query') {
    const body = await readJsonBody(request);
    const userId = toText(body.userId);
    const query = toText(body.query);

    if (!userId || !query) {
      sendJson(response, 400, { success: false, text: 'userId and query are required', medicines: [] });
      return;
    }

    const reminders = Array.isArray(body.reminders) ? body.reminders : [];
    const { handleVoiceQuery } = await loadVoiceService();
    const responsePayload = await handleVoiceQuery(
      { userId, query },
      reminders.map((reminder) => ({
        medicine: toText((reminder as JsonRecord).medicine),
        dosage: toText((reminder as JsonRecord).dosage),
        time: toText((reminder as JsonRecord).time),
        quantity: Number((reminder as JsonRecord).quantity) || 0
      }))
    );

    sendJson(response, responsePayload.success ? 200 : 400, responsePayload);
    return;
  }

  if (method === 'POST' && pathname === '/api/call-reminder/schedule') {
    if (isVercelRuntime) {
      sendJson(response, 501, {
        success: false,
        message: 'Scheduled reminder calls need a persistent worker and are better hosted on Render or another always-on service.'
      });
      return;
    }

    const body = await readJsonBody(request);
    const { scheduleReminderCall } = await loadCallReminderService();
    const job = scheduleReminderCall({
      userId: toText(body.userId),
      phone: toText(body.phone),
      medicine: toText(body.medicine),
      dosage: toText(body.dosage) || undefined,
      customScript: toText(body.customScript) || undefined,
      scheduledAtIso: toText(body.scheduledAt)
    });

    sendJson(response, 201, {
      success: true,
      message: 'Call reminder scheduled',
      data: job
    });
    return;
  }

  if (method === 'POST' && pathname === '/api/call-reminder/trigger-now') {
    const body = await readJsonBody(request);
    const { triggerReminderCallNow } = await loadCallReminderService();
    const job = await triggerReminderCallNow({
      userId: toText(body.userId),
      phone: toText(body.phone),
      medicine: toText(body.medicine),
      dosage: toText(body.dosage) || undefined,
      customScript: toText(body.customScript) || undefined
    });

    sendJson(response, 200, {
      success: true,
      message: 'Call reminder triggered',
      data: job
    });
    return;
  }

  if (method === 'GET' && pathname === '/api/call-reminder/jobs') {
    sendJson(response, 200, {
      success: true,
      data: (await loadCallReminderService()).listReminderCallJobs()
    });
    return;
  }

  const callJobMatch = pathname.match(/^\/api\/call-reminder\/jobs\/([^/]+)$/);
  if (method === 'GET' && callJobMatch) {
    const { getReminderCallJob } = await loadCallReminderService();
    const job = getReminderCallJob(callJobMatch[1]);

    if (!job) {
      sendJson(response, 404, { success: false, message: 'Call reminder job not found' });
      return;
    }

    sendJson(response, 200, {
      success: true,
      data: job
    });
    return;
  }

  const twilioVoiceMatch = pathname.match(/^\/api\/call-reminder\/twilio\/voice\/([^/]+)$/);
  if (method === 'POST' && twilioVoiceMatch) {
    const { buildReminderTwiml } = await loadCallReminderService();
    sendText(response, 200, 'text/xml; charset=utf-8', buildReminderTwiml(twilioVoiceMatch[1]));
    return;
  }

  const twilioRecordingMatch = pathname.match(/^\/api\/call-reminder\/twilio\/recording\/([^/]+)$/);
  if (method === 'POST' && twilioRecordingMatch) {
    const form = await readFormBody(request);
    const recordingUrl = toText(form.get('RecordingUrl'));

    if (!recordingUrl) {
      sendJson(response, 400, { success: false, message: 'Missing RecordingUrl in Twilio webhook body' });
      return;
    }

    const { handleTwilioRecording } = await loadCallReminderService();
    const updated = await handleTwilioRecording(twilioRecordingMatch[1], recordingUrl);
    sendJson(response, 200, {
      success: true,
      message: 'Recording processed and status updated',
      data: updated
    });
    return;
  }

  sendJson(response, 404, { success: false, message: 'Not found' });
}

const server = createServer(async (request, response) => {
  try {
    await handleRequest(request, response);
  } catch (error) {
    sendJson(response, 500, {
      success: false,
      message: error instanceof Error ? error.message : 'Request failed'
    });
  }
});

server.listen(port, () => {
  console.log(`[backend] running at http://localhost:${port}`);
});
