import './env.js';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4000';

async function postJson(path, payload) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
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

export function updateStatus(payload) {
  return postJson('/api/status/update', payload);
}

export function triggerSos(payload) {
  return postJson('/api/sos', payload);
}

export function queryMedicineInfo(payload) {
  return postJson('/api/voice/query', payload);
}

export { API_BASE_URL };
