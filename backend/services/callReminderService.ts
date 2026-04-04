import { updateDoseStatus } from './reminderService';

export type ReminderCallStatus = 'scheduled' | 'calling' | 'completed' | 'failed';

export type ScheduleCallInput = {
  userId: string;
  phone: string;
  medicine: string;
  dosage?: string;
  customScript?: string;
  scheduledAtIso: string;
};

export type ReminderCallJob = {
  id: string;
  userId: string;
  phone: string;
  medicine: string;
  dosage?: string;
  customScript?: string;
  scheduledAtIso: string;
  status: ReminderCallStatus;
  callSid?: string;
  transcript?: string;
  result?: 'taken' | 'later' | 'skip';
  error?: string;
};

type InternalJob = ReminderCallJob & {
  timeoutHandle?: ReturnType<typeof setTimeout>;
};

const jobs = new Map<string, InternalJob>();

const TWILIO_BASE_URL = 'https://api.twilio.com/2010-04-01';
const DEEPGRAM_LISTEN_URL = 'https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true';

const requiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const publicBaseUrl = () => {
  const raw = requiredEnv('PUBLIC_BASE_URL');
  const trimmed = raw.trim();

  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    const typoHint = trimmed.includes('.ngrok-fre')
      ? ' It looks like a typo: use .ngrok-free.app (or another full public domain).'
      : '';
    throw new Error(
      `PUBLIC_BASE_URL must be a valid absolute URL. Received: "${trimmed}".${typoHint}`
    );
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(
      `PUBLIC_BASE_URL must use https so Twilio can reach webhooks securely. Received: "${trimmed}".`
    );
  }

  // Keep an optional path prefix, but remove trailing slash to avoid double-slashes in callback routes.
  const normalizedPath = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '');
  return `${parsed.origin}${normalizedPath}`;
};

const buildTwilioAuthHeader = () => {
  const sid = requiredEnv('TWILIO_ACCOUNT_SID');
  const token = requiredEnv('TWILIO_AUTH_TOKEN');
  const encoded = Buffer.from(`${sid}:${token}`).toString('base64');

  return `Basic ${encoded}`;
};

const parseStatusFromTranscript = (transcript: string): 'taken' | 'later' | 'skip' => {
  const normalized = transcript.toLowerCase();

  if (/(took|taken|done|yes|already)/.test(normalized)) {
    return 'taken';
  }

  if (/(later|after|delay|remind)/.test(normalized)) {
    return 'later';
  }

  if (/(skip|miss|not|no)/.test(normalized)) {
    return 'skip';
  }

  return 'later';
};

const transcribeWithDeepgram = async (audioBuffer: ArrayBuffer): Promise<string> => {
  const apiKey = requiredEnv('DEEPGRAM_API_KEY');

  const response = await fetch(DEEPGRAM_LISTEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'audio/wav'
    },
    body: audioBuffer
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Deepgram transcription failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    results?: {
      channels?: Array<{
        alternatives?: Array<{
          transcript?: string;
        }>;
      }>;
    };
  };

  return (
    data.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? ''
  );
};

const twilioVoiceUrlForJob = (jobId: string): string =>
  `${publicBaseUrl()}/api/call-reminder/twilio/voice/${jobId}`;

const twilioRecordingActionForJob = (jobId: string): string =>
  `${publicBaseUrl()}/api/call-reminder/twilio/recording/${jobId}`;

export const buildReminderTwiml = (jobId: string): string => {
  const job = jobs.get(jobId);

  if (!job) {
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Invalid reminder call request.</Say><Hangup/></Response>`;
  }

  const dosageText = job.dosage ? `, ${job.dosage}` : '';
  const prompt =
    job.customScript?.trim() ||
    `Hello. This is your medicine reminder. It is time to take ${job.medicine}${dosageText}. After the beep, say if you have taken it, will take it later, or want to skip.`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${prompt}</Say>
  <Record maxLength="12" playBeep="true" trim="trim-silence" action="${twilioRecordingActionForJob(jobId)}" method="POST" />
  <Say>We did not receive your response. Please contact your caregiver if you need help.</Say>
  <Hangup/>
</Response>`;
};

export const placeReminderCall = async (jobId: string): Promise<void> => {
  const job = jobs.get(jobId);

  if (!job) {
    throw new Error('Reminder call job not found');
  }

  const fromNumber = requiredEnv('TWILIO_FROM_NUMBER');
  const accountSid = requiredEnv('TWILIO_ACCOUNT_SID');

  job.status = 'calling';

  const form = new URLSearchParams({
    To: job.phone,
    From: fromNumber,
    Url: twilioVoiceUrlForJob(jobId),
    Method: 'POST'
  });

  const response = await fetch(`${TWILIO_BASE_URL}/Accounts/${accountSid}/Calls.json`, {
    method: 'POST',
    headers: {
      Authorization: buildTwilioAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: form
  });

  if (!response.ok) {
    job.status = 'failed';
    const errorText = await response.text();
    job.error = `Twilio call failed (${response.status}): ${errorText}`;
    throw new Error(job.error);
  }

  const callData = (await response.json()) as { sid?: string };
  job.callSid = callData.sid;
};

const scheduleTimeout = (jobId: string, scheduledTimeMs: number) => {
  const delayMs = Math.max(0, scheduledTimeMs - Date.now());

  return setTimeout(async () => {
    const job = jobs.get(jobId);

    if (!job) {
      return;
    }

    try {
      await placeReminderCall(jobId);
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Failed to place call';
    }
  }, delayMs);
};

export const scheduleReminderCall = (input: ScheduleCallInput): ReminderCallJob => {
  const scheduledMs = new Date(input.scheduledAtIso).getTime();

  if (Number.isNaN(scheduledMs)) {
    throw new Error('scheduledAtIso must be a valid ISO datetime string');
  }

  if (scheduledMs <= Date.now()) {
    throw new Error('scheduledAtIso must be in the future');
  }

  const id = crypto.randomUUID();

  const job: InternalJob = {
    id,
    userId: input.userId,
    phone: input.phone,
    medicine: input.medicine,
    dosage: input.dosage,
    customScript: input.customScript,
    scheduledAtIso: new Date(scheduledMs).toISOString(),
    status: 'scheduled'
  };

  job.timeoutHandle = scheduleTimeout(id, scheduledMs);
  jobs.set(id, job);

  return { ...job };
};

export const triggerReminderCallNow = async (
  input: Omit<ScheduleCallInput, 'scheduledAtIso'>
): Promise<ReminderCallJob> => {
  const id = crypto.randomUUID();

  const job: InternalJob = {
    id,
    userId: input.userId,
    phone: input.phone,
    medicine: input.medicine,
    dosage: input.dosage,
    customScript: input.customScript,
    scheduledAtIso: new Date().toISOString(),
    status: 'scheduled'
  };

  jobs.set(id, job);

  try {
    await placeReminderCall(id);
  } catch (error) {
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : 'Failed to place call';
  }

  return { ...job };
};

export const getReminderCallJob = (jobId: string): ReminderCallJob | null => {
  const job = jobs.get(jobId);
  return job ? { ...job } : null;
};

export const listReminderCallJobs = (): ReminderCallJob[] =>
  Array.from(jobs.values()).map((job) => ({ ...job }));

export const handleTwilioRecording = async (
  jobId: string,
  recordingUrl: string
): Promise<ReminderCallJob> => {
  const job = jobs.get(jobId);

  if (!job) {
    throw new Error('Reminder call job not found');
  }

  const recordingFetch = await fetch(`${recordingUrl}.wav`, {
    headers: {
      Authorization: buildTwilioAuthHeader()
    }
  });

  if (!recordingFetch.ok) {
    const details = await recordingFetch.text();
    job.status = 'failed';
    job.error = `Failed to download recording (${recordingFetch.status}): ${details}`;
    throw new Error(job.error);
  }

  const audioBuffer = await recordingFetch.arrayBuffer();
  const transcript = await transcribeWithDeepgram(audioBuffer);
  const result = parseStatusFromTranscript(transcript);

  await updateDoseStatus({
    userId: job.userId,
    status: result,
    timestamp: new Date().toISOString()
  });

  job.transcript = transcript;
  job.result = result;
  job.status = 'completed';

  return { ...job };
};
