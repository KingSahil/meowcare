const http = require('node:http');

const { parseReminder } = require('./parseReminder');
const { extractMedicinesAndReminders } = require('./ocr');

const port = Number(process.env.PORT || 3000);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  });
  response.end(JSON.stringify(payload));
}

function toText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function collectBody(request) {
  return new Promise((resolve, reject) => {
    let raw = '';

    request.on('data', (chunk) => {
      raw += chunk;
    });

    request.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Request body must be valid JSON'));
      }
    });

    request.on('error', reject);
  });
}

function buildReminderInsight(parsed) {
  const medications = Array.isArray(parsed?.medications) ? parsed.medications : [];
  const clarifications = Array.isArray(parsed?.clarifications_needed) ? parsed.clarifications_needed : [];

  if (!medications.length) {
    return {
      title: 'No medicines detected',
      details: 'No medication reminder could be extracted from the provided note.'
    };
  }

  const preview = medications
    .slice(0, 3)
    .map((medication) => {
      const name = toText(medication?.name) || 'Unknown medicine';
      const dosage = toText(medication?.dosage);
      const schedule = Array.isArray(medication?.schedule)
        ? medication
            .schedule
            .map((entry) => toText(entry?.time))
            .filter(Boolean)
            .join(', ')
        : '';

      return [name, dosage, schedule].filter(Boolean).join(' | ');
    })
    .filter(Boolean);

  return {
    title: `Parsed ${medications.length} medication reminder${medications.length === 1 ? '' : 's'}`,
    details: `${preview.join(' ; ')}${
      clarifications.length ? `. Clarifications needed: ${clarifications.slice(0, 2).join(' | ')}` : '.'
    }`
  };
}

function buildPrescriptionScanResult(parsed) {
  const medications = Array.isArray(parsed?.medications) ? parsed.medications : [];
  const clarifications = Array.isArray(parsed?.clarifications_needed) ? parsed.clarifications_needed : [];

  if (!medications.length) {
    return {
      title: 'Prescription scan summary',
      summary: toText(parsed?.error) || 'No medicines could be reliably detected from this image.',
      items: clarifications.length ? clarifications : ['Try a clearer image with better lighting.'],
      detectedMedicines: []
    };
  }

  return {
    title: 'Prescription scan summary',
    summary: `Detected ${medications.length} medicine${medications.length === 1 ? '' : 's'}${
      clarifications.length ? ` with ${clarifications.length} clarification${clarifications.length === 1 ? '' : 's'} needed` : ''
    }.`,
    items: medications.slice(0, 6).map((medication) => {
      const name = toText(medication?.name) || 'Unknown medicine';
      const dosage = toText(medication?.dosage);
      const schedule = Array.isArray(medication?.schedule)
        ? medication
            .schedule
            .map((entry) => toText(entry?.time))
            .filter(Boolean)
            .join(', ')
        : '';

      return [name, dosage, schedule].filter(Boolean).join(' | ');
    }),
    detectedMedicines: medications.slice(0, 20).map((medication) => ({
      name: toText(medication?.name) || 'Unknown medicine',
      dosage: toText(medication?.dosage) || '1 dose',
      time:
        (Array.isArray(medication?.schedule) &&
          medication.schedule.map((entry) => toText(entry?.time)).find(Boolean)) ||
        toText(medication?.timing) ||
        '08:00',
      stock: Number.isFinite(Number(medication?.quantity)) ? Number(medication.quantity) : 10
    }))
  };
}

async function handleParseReminder(request, response) {
  const body = await collectBody(request);
  const text = toText(body?.text);

  if (!text) {
    sendJson(response, 400, {
      success: false,
      message: 'Reminder text is required'
    });
    return;
  }

  const parsed = await parseReminder(text, {
    userContext: body?.userContext && typeof body.userContext === 'object' ? body.userContext : {}
  });

  sendJson(response, 200, {
    success: true,
    message: 'Reminder text parsed successfully',
    data: {
      parsed,
      insight: buildReminderInsight(parsed)
    }
  });
}

async function handleScanPrescription(request, response) {
  const body = await collectBody(request);
  const image = toText(body?.image);

  if (!image) {
    sendJson(response, 400, {
      success: false,
      message: 'Prescription image source is required'
    });
    return;
  }

  const parsed = await extractMedicinesAndReminders(image, {
    userContext: body?.userContext && typeof body.userContext === 'object' ? body.userContext : {}
  });

  sendJson(response, 200, {
    success: true,
    message: 'Prescription image processed successfully',
    data: {
      parsed,
      scan: buildPrescriptionScanResult(parsed)
    }
  });
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === 'OPTIONS') {
      sendJson(response, 204, {});
      return;
    }

    const url = request.url || '/';

    if (request.method === 'GET' && url === '/') {
      sendJson(response, 200, {
        success: true,
        message: 'Remote Care Companion AI module is running'
      });
      return;
    }

    if (request.method === 'POST' && url === '/api/parse-reminder') {
      await handleParseReminder(request, response);
      return;
    }

    if (request.method === 'POST' && url === '/api/scan-prescription') {
      await handleScanPrescription(request, response);
      return;
    }

    sendJson(response, 404, {
      success: false,
      message: 'Not found'
    });
  } catch (error) {
    sendJson(response, 500, {
      success: false,
      message: error instanceof Error ? error.message : 'Request failed'
    });
  }
});

server.listen(port, () => {
  console.log(`[ai-module] running at http://localhost:${port}`);
});
