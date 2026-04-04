import { beforeEach, describe, expect, test } from 'bun:test';
import { createTestApp } from './helpers/testApp';
import { requestJson } from './helpers/http';

describe('Voice APIs', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    app = createTestApp();
  });

  test('POST /api/voice/query returns a medicine list answer', async () => {
    const response = await requestJson<{
      success: boolean;
      text: string;
      medicines: Array<{ name: string; dosage: string; time: string; quantity: number }>;
    }>(app, 'POST', '/api/voice/query', {
      userId: crypto.randomUUID(),
      query: 'List my medicines',
      reminders: [
        {
          medicine: 'Metformin',
          dosage: '500mg',
          time: '08:00',
          quantity: 1
        }
      ]
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.text).toContain('Metformin');
    expect(response.body.medicines.length).toBe(1);
    expect(response.body.medicines[0]?.name).toBe('Metformin');
    expect(response.body.medicines[0]?.quantity).toBe(1);
  });

  test('POST /api/voice/query answers remaining medicine quantity', async () => {
    const response = await requestJson<{
      success: boolean;
      text: string;
      medicines: Array<{ name: string; quantity: number }>;
    }>(app, 'POST', '/api/voice/query', {
      userId: crypto.randomUUID(),
      query: 'How much medicine is remaining?',
      reminders: [
        {
          medicine: 'Metformin',
          dosage: '500mg',
          time: '08:00',
          quantity: 2
        },
        {
          medicine: 'Aspirin',
          dosage: '75mg',
          time: '21:00',
          quantity: 1
        }
      ]
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.text).toContain('3 total doses');
    expect(response.body.text).toContain('Metformin: 2 doses remaining');
    expect(response.body.text).toContain('Aspirin: 1 dose remaining');
    expect(response.body.medicines.length).toBe(2);
  });

  test('POST /api/reminder/voice-query uses saved reminders to answer', async () => {
    const userId = crypto.randomUUID();

    await requestJson(app, 'POST', '/api/reminder/add', {
      userId,
      medicine: 'Aspirin',
      time: '09:00',
      dosage: '75mg',
      quantity: 1
    });

    const response = await requestJson<{
      success: boolean;
      message: string;
      data: { success: boolean; text: string; medicines: Array<{ name: string; quantity: number }> };
      mode: 'mock' | 'supabase';
    }>(app, 'POST', '/api/reminder/voice-query', {
      userId,
      query: 'What medicines am I taking?'
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.success).toBe(true);
    expect(response.body.data.text).toContain('Aspirin');
    expect(response.body.data.medicines[0]?.name).toBe('Aspirin');
    expect(['mock', 'supabase']).toContain(response.body.mode);
  });

  test('POST /api/voice/query validates missing query', async () => {
    const response = await requestJson<Record<string, unknown>>(
      app,
      'POST',
      '/api/voice/query',
      {
        userId: crypto.randomUUID(),
        query: ''
      }
    );

    expect([400, 422]).toContain(response.status);
    expect(response.body).toBeDefined();
  });
});