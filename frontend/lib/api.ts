import { DEMO_SCAN_RESULT } from '@/lib/demo-data';
import { loadDemoSnapshot, saveDemoSnapshot } from '@/lib/storage';
import type { AlertItem, BurnoutPoint, Medicine, ParsedAiInsight, Patient, ScanResult } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const CARE_USER_ID = '11111111-1111-1111-1111-111111111111';

type ReminderRow = { id: string; medicine: string; dosage: string; time: string; quantity: number };

const mapReminderRowsToMedicines = (rows: ReminderRow[], snapshot: Medicine[]): Medicine[] => {
  const snapshotById = new Map(snapshot.map((medicine) => [medicine.id, medicine]));

  const backendMapped = rows.map((row, index) => {
    const localVersion = snapshotById.get(row.id);

    return {
      id: row.id,
      name: row.medicine,
      dosage: row.dosage,
      time: row.time,
      status:
        localVersion?.status ??
        ((index % 3 === 0 ? 'taken' : index % 3 === 1 ? 'pending' : 'missed') as Medicine['status']),
      stock: row.quantity
    } satisfies Medicine;
  });

  const backendIds = new Set(backendMapped.map((medicine) => medicine.id));
  const snapshotOnly = snapshot.filter((medicine) => !backendIds.has(medicine.id));

  return [...backendMapped, ...snapshotOnly];
};

const fileToDataUrl = async (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        reject(new Error('Unable to read selected file'));
        return;
      }
      resolve(result);
    };

    reader.onerror = () => reject(new Error('Unable to read selected file'));
    reader.readAsDataURL(file);
  });

const getJson = async <T>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, init);
  const body = await response.json();

  if (!response.ok || body.success === false) {
    throw new Error(body.message ?? 'Request failed');
  }

  return body as T;
};

export const fetchDashboardData = async (): Promise<{
  patient: Patient;
  medicines: Medicine[];
  alerts: AlertItem[];
  burnout: BurnoutPoint[];
  demoMode: boolean;
}> => {
  try {
    const reminders = await getJson<{ data: ReminderRow[] }>(
      `${API_BASE}/api/reminder/list?userId=${CARE_USER_ID}`,
      { cache: 'no-store' }
    );

    const snapshot = loadDemoSnapshot();
    const medicines = mapReminderRowsToMedicines(reminders.data ?? [], snapshot.medicines);

    return {
      patient: snapshot.patient,
      medicines,
      alerts: snapshot.alerts,
      burnout: snapshot.burnout,
      demoMode: false
    };
  } catch {
    const snapshot = loadDemoSnapshot();
    return {
      patient: snapshot.patient,
      medicines: snapshot.medicines,
      alerts: snapshot.alerts,
      burnout: snapshot.burnout,
      demoMode: true
    };
  }
};

export const createMedicine = async (medicine: Omit<Medicine, 'id' | 'status'>): Promise<Medicine> => {
  try {
    const body = await getJson<{ data: { id: string } }>(`${API_BASE}/api/reminder/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: CARE_USER_ID,
        medicine: medicine.name,
        time: medicine.time,
        dosage: medicine.dosage,
        quantity: medicine.stock
      })
    });

    return {
      ...medicine,
      id: body.data.id,
      status: 'pending'
    };
  } catch {
    const snapshot = loadDemoSnapshot();
    const newMedicine: Medicine = {
      ...medicine,
      id: `med-${Date.now()}`,
      status: 'pending'
    };
    snapshot.medicines = [newMedicine, ...snapshot.medicines];
    saveDemoSnapshot(snapshot);
    return newMedicine;
  }
};

export const submitSos = async () => {
  await getJson(`${API_BASE}/api/sos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: CARE_USER_ID,
      message: 'SOS triggered from caretaker dashboard'
    })
  });
};

export const verifyBackendConnection = async (deviceId: string) => {
  return getJson<{ data: { mode: string; note: string } }>(`${API_BASE}/`, {
    cache: 'no-store',
    headers: {
      'x-device-id': deviceId
    }
  });
};

export const syncMedicineStatus = async (status: 'taken' | 'later' | 'skip') => {
  await getJson(`${API_BASE}/api/status/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: CARE_USER_ID,
      status,
      timestamp: new Date().toISOString()
    })
  });
};

export const fetchBurnoutSuggestion = async (mood: string): Promise<{ suggestion: string; level: string }> => {
  try {
    const body = await getJson<{ data: { suggestion: string; burnoutLevel: string } }>(`${API_BASE}/api/burnout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: CARE_USER_ID, mood })
    });

    return {
      suggestion: body.data.suggestion,
      level: body.data.burnoutLevel
    };
  } catch {
    const fallback = mood.toLowerCase().includes('stress')
      ? 'Medium burnout risk. Schedule a backup caretaker check-in today.'
      : 'Low burnout risk. Keep the current rhythm and daily touchpoints.';

    return {
      suggestion: fallback,
      level: fallback.includes('Medium') ? 'medium' : 'low'
    };
  }
};

export const simulateAiParse = async (input: string): Promise<ParsedAiInsight> => {
  try {
    const body = await getJson<{ data: { insight: ParsedAiInsight } }>(`${API_BASE}/api/ai/parse-reminder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: input })
    });

    return body.data.insight;
  } catch {
    return {
      title: 'Parsed care note',
      details: `Actionable summary: ${input}. Recommended follow-up is to confirm dose timing and hydration within the next check-in.`
    };
  }
};

export const scanPrescription = async (file: File): Promise<ScanResult> => {
  try {
    const image = await fileToDataUrl(file);
    const body = await getJson<{ data: { scan: ScanResult } }>(`${API_BASE}/api/ai/scan-prescription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image })
    });

    return body.data.scan;
  } catch {
    return DEMO_SCAN_RESULT;
  }
};
