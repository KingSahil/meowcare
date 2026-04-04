import './env.js';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000';
const GOOGLE_SPEECH_API_KEY = process.env.GOOGLE_SPEECH_API_KEY ?? '';
const VOICE_QUERY_LANGUAGE_CODE = process.env.VOICE_QUERY_LANGUAGE_CODE ?? 'en-IN';
const VOICE_QUERY_ALT_LANGUAGES = (process.env.VOICE_QUERY_ALT_LANGUAGES ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const GOOGLE_SPEECH_RECOGNIZE_URL = 'https://speech.googleapis.com/v1/speech:recognize';

async function postJson(path, payload) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export function updateStatus(payload) {
  return postJson('/api/status/update', payload);
}

export function triggerSos(payload) {
  return postJson('/api/sos', payload);
}

export function queryMedicineInfo(payload) {
  return postJson('/api/voice/query', payload);
}

export async function transcribeAudio(audioBuffer, options = {}) {
  if (!GOOGLE_SPEECH_API_KEY) {
    throw new Error('GOOGLE_SPEECH_API_KEY is not configured.');
  }

  const config = {
    encoding: options.encoding ?? 'OGG_OPUS',
    languageCode: options.languageCode ?? VOICE_QUERY_LANGUAGE_CODE,
    sampleRateHertz: options.sampleRateHertz ?? 48000,
    enableAutomaticPunctuation: true,
    model: options.model ?? 'latest_short'
  };

  const alternativeLanguageCodes = options.alternativeLanguageCodes ?? VOICE_QUERY_ALT_LANGUAGES;
  if (alternativeLanguageCodes.length > 0) {
    config.alternativeLanguageCodes = alternativeLanguageCodes;
  }

  const speechContexts = options.speechContexts ?? [];
  if (speechContexts.length > 0) {
    config.speechContexts = speechContexts;
  }

  if (options.originalMimeType) {
    config.originalMimeType = options.originalMimeType;
  }

  const response = await fetch(
    `${GOOGLE_SPEECH_RECOGNIZE_URL}?key=${encodeURIComponent(GOOGLE_SPEECH_API_KEY)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        config,
        audio: {
          content: audioBuffer.toString('base64')
        }
      })
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.message ||
      `Speech recognition failed with status ${response.status}`;
    throw new Error(message);
  }

  const transcript = data?.results
    ?.flatMap((result) => result.alternatives ?? [])
    ?.map((alternative) => alternative.transcript?.trim())
    ?.filter(Boolean)
    ?.join(' ')
    ?.trim();

  if (!transcript) {
    throw new Error('Could not understand the voice message.');
  }

  return {
    transcript,
    raw: data
  };
}

export { API_BASE_URL };
