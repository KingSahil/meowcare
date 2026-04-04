import './env.js';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4000';

function buildUrl(path, query = {}) {
  const url = new URL(`${API_BASE_URL}${path}`);

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

async function requestJson(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown network error';
    throw new Error(`Unable to reach backend at ${API_BASE_URL}${path}: ${reason}`);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

async function postJson(path, payload) {
  return requestJson(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

export function updateStatus(payload) {
  return postJson('/api/status/update', payload);
}

export function triggerSos(payload) {
  return postJson('/api/sos', payload);
}

export function queryMedicineInfo(payload) {
  return postJson('/api/reminder/voice-query', {
    userId: payload.userId,
    query: payload.query
  });
}

export function listReminders(userId) {
  const query = new URLSearchParams({ userId });
  return requestJson(`/api/reminder/list?${query.toString()}`);
}

export { API_BASE_URL };
