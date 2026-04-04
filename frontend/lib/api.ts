const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:4001';
const WHATSAPP_BASE_URL = import.meta.env.VITE_WHATSAPP_BASE_URL ?? 'http://localhost:4012';

export type BackendResponse<T> = {
  success: boolean;
  message?: string;
  mode?: string;
  data: T;
};

type ReminderPayload = {
  userId: string;
  phone?: string;
  medicine: string;
  time: string;
  dosage: string;
  quantity: number;
};

type StatusPayload = {
  userId: string;
  phone?: string;
  status: 'taken' | 'later' | 'skip';
  timestamp?: string;
};

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error((data as { message?: string }).message ?? `Request failed (${response.status})`);
  }

  return data as T;
};

const postJson = async <T>(path: string, body: unknown) =>
  requestJson<T>(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

export const frontendConfig = {
  apiBaseUrl: API_BASE_URL,
  socketUrl: SOCKET_URL,
  whatsappBaseUrl: WHATSAPP_BASE_URL
};

export const getBackendHealth = () =>
  requestJson<
    BackendResponse<{
      httpPort: number;
      socketPort: number;
      mode: 'mock' | 'supabase';
      note: string;
    }>
  >('/');

export const listReminders = (userId: string) =>
  requestJson<
    BackendResponse<
      Array<{
        id: string;
        user_id: string;
        medicine: string;
        time: string;
        dosage: string;
        quantity: number;
      }>
    >
  >(`/api/reminder/list?userId=${encodeURIComponent(userId)}`);

export const addReminder = (payload: ReminderPayload) =>
  postJson<
    BackendResponse<{
      id: string;
      user_id: string;
      medicine: string;
      time: string;
      dosage: string;
      quantity: number;
    }>
  >('/api/reminder/add', payload);

export const updateDoseStatus = (payload: StatusPayload) =>
  postJson<
    BackendResponse<{
      log: {
        id: string;
        user_id: string;
        status: 'taken' | 'later' | 'skip';
        timestamp: string;
      };
      alert: null | {
        id: string;
        type: 'missed' | 'sos' | 'inactivity';
        message: string;
        timestamp: string;
      };
    }>
  >('/api/status/update', payload);

export const triggerSos = (payload: { userId: string; phone?: string; message?: string }) =>
  postJson<
    BackendResponse<{
      alert: {
        id: string;
        type: 'sos';
        message: string;
        timestamp: string;
      };
    }>
  >('/api/sos', payload);

export const assessBurnout = (payload: { userId?: string; mood: string }) =>
  postJson<
    BackendResponse<{
      userId: string | null;
      mood: string;
      burnoutLevel: 'low' | 'medium' | 'high';
      suggestion: string;
    }>
  >('/api/burnout', payload);

export const voiceQuery = (payload: {
  userId: string;
  query: string;
  reminders: Array<{ medicine: string; dosage: string; time: string; quantity: number }>;
}) =>
  postJson<{
    success: boolean;
    text: string;
    medicines: Array<{ name: string; dosage: string; time: string; quantity: number }>;
  }>('/api/voice/query', payload);

export const parseReminderText = (payload: {
  text: string;
  userContext?: Record<string, unknown>;
}) =>
  postJson<
    BackendResponse<{
      parsed: {
        medications?: Array<{
          name?: string;
          dosage?: string;
          schedule?: Array<{ time?: string }>;
          quantity?: number | string;
          timing?: string;
        }>;
      };
      insight: {
        title: string;
        details: string;
      };
    }>
  >('/api/ai/parse-reminder', payload);

export const scanPrescription = (payload: {
  image: string;
  userContext?: Record<string, unknown>;
}) =>
  postJson<
    BackendResponse<{
      parsed: Record<string, unknown>;
      scan: {
        title: string;
        summary: string;
        items: string[];
        detectedMedicines: Array<{
          name: string;
          dosage: string;
          time: string;
          stock?: number;
        }>;
      };
    }>
  >('/api/ai/scan-prescription', payload);

export const triggerCallReminderNow = (payload: {
  userId: string;
  phone: string;
  medicine: string;
  dosage?: string;
  customScript?: string;
}) =>
  postJson<
    BackendResponse<{
      id: string;
      userId: string;
      phone: string;
      medicine: string;
      dosage?: string;
      status?: string;
    }>
  >('/api/call-reminder/trigger-now', payload);

export const listCallReminderJobs = () =>
  requestJson<
    BackendResponse<
      Array<{
        id: string;
        userId: string;
        phone: string;
        medicine: string;
        dosage?: string;
        status?: string;
        createdAt?: string;
      }>
    >
  >('/api/call-reminder/jobs');

export const getWhatsappHealth = async () => {
  const response = await fetch(`${WHATSAPP_BASE_URL}/health`);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error((data as { message?: string }).message ?? `WhatsApp service unavailable (${response.status})`);
  }

  return data as {
    ok: boolean;
    connected?: boolean;
    qrAvailable?: boolean;
    qrUpdatedAt?: string | null;
  };
};

export const getWhatsappQrUrl = () => `${WHATSAPP_BASE_URL}/qr.png`;
