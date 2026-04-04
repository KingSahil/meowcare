import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Medication, MedicationStatus } from '../components/MedicineTable';
import {
  addReminder,
  assessBurnout,
  frontendConfig,
  getBackendHealth,
  listReminders,
  triggerSos,
  updateDoseStatus
} from '../lib/api';

export type PatientProfile = {
  name: string;
  age: number;
  condition: string;
  location: string;
  photo: string;
  phone: string;
  userId: string;
};

export type VitalsSnapshot = {
  heartRate: number;
  bloodPressure: string;
  oxygen: number;
  temp: number;
};

export type CareAlert = {
  id: string;
  title: string;
  desc: string;
  type: 'missed' | 'refill' | 'prescription' | 'sos' | 'system';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  time: string;
  location: string;
};

export type CareLog = {
  id: string;
  type: 'Vital Check' | 'Medication' | 'Alert' | 'System';
  time: string;
  date: string;
  value: string;
  status: string;
  note: string;
  trend: 'up' | 'down' | 'stable' | 'none';
};

export type NotificationPreference = {
  id: number;
  label: string;
  desc: string;
  enabled: boolean;
};

export type BackendStatus = {
  mode: 'mock' | 'supabase' | 'unknown';
  note: string;
  online: boolean;
};

type BackendDoseUpdate = {
  id: string;
  user_id: string;
  status: string;
  timestamp: string;
};

type BurnoutInsight = {
  mood: string;
  burnoutLevel: 'low' | 'medium' | 'high';
  suggestion: string;
};

type CareContextValue = {
  patient: PatientProfile;
  vitals: VitalsSnapshot;
  medications: Medication[];
  alerts: CareAlert[];
  logs: CareLog[];
  notifications: NotificationPreference[];
  backendStatus: BackendStatus;
  burnoutInsight: BurnoutInsight | null;
  setPatient: (patient: PatientProfile) => void;
  setVitals: (vitals: VitalsSnapshot) => void;
  saveMedication: (medication: Omit<Medication, 'id'>, existingId?: string | number | null) => Promise<void>;
  setMedicationStatus: (
    medication: Medication,
    status: MedicationStatus | 'LATER',
    note?: string
  ) => Promise<void>;
  addImportedMedications: (medications: Array<Omit<Medication, 'id'>>) => Promise<void>;
  dismissAlert: (id: string) => void;
  pushAlert: (alert: CareAlert) => void;
  toggleNotification: (id: number) => void;
  refreshBackendStatus: () => Promise<void>;
  runBurnoutCheck: (mood: string) => Promise<BurnoutInsight>;
  sendSos: (message?: string) => Promise<void>;
};

const STORAGE_KEY = 'meowcare-care-state-v1';
const DEFAULT_USER_ID = '11111111-1111-1111-1111-111111111111';
const DEFAULT_PHONE = '+919988341071';

const defaultPatient: PatientProfile = {
  name: 'Ramen Dsouza',
  age: 78,
  condition: 'Hypertension & Type 2 Diabetes',
  location: 'Kitchen',
  photo: 'https://cdn.pixabay.com/photo/2016/11/21/12/54/man-1845259_1280.jpg',
  phone: DEFAULT_PHONE,
  userId: DEFAULT_USER_ID
};

const defaultVitals: VitalsSnapshot = {
  heartRate: 72,
  bloodPressure: '118/79',
  oxygen: 98.2,
  temp: 72.4
};

const defaultMedications: Medication[] = [
  {
    id: 'med-1',
    name: 'Crocin 500mg',
    dose: '1-0-1',
    time: '08:00',
    status: 'TAKEN',
    quantity: 12,
    stockDays: 4,
    notes: 'After food'
  },
  {
    id: 'med-2',
    name: 'BP Tablet',
    dose: '1-0-0',
    time: '09:30',
    status: 'MISSED',
    quantity: 6,
    stockDays: 2,
    notes: 'Before breakfast'
  },
  {
    id: 'med-3',
    name: 'Insulin',
    dose: '10 units',
    time: '14:00',
    status: 'PENDING',
    quantity: 10,
    stockDays: 3,
    notes: 'Post-lunch'
  },
  {
    id: 'med-4',
    name: 'Vitamin D',
    dose: '0-0-1',
    time: '21:00',
    status: 'PENDING',
    quantity: 18,
    stockDays: 6,
    notes: 'After dinner'
  }
];

const defaultAlerts: CareAlert[] = [
  {
    id: 'alert-missed-bp',
    title: 'Missed Dose: BP Tablet',
    desc: 'Scheduled morning dose still needs confirmation.',
    type: 'missed',
    severity: 'WARNING',
    time: '12 mins ago',
    location: 'Dose Schedule'
  },
  {
    id: 'alert-refill-lisinopril',
    title: 'Refill follow-up needed',
    desc: 'One medicine is below the 3-day stock threshold.',
    type: 'refill',
    severity: 'CRITICAL',
    time: '48 mins ago',
    location: 'Medication Tray'
  }
];

const defaultNotifications: NotificationPreference[] = [
  { id: 1, label: 'Critical Vitals', desc: 'Immediate push & SMS', enabled: true },
  { id: 2, label: 'Medication Logs', desc: 'Daily summary email', enabled: true },
  { id: 3, label: 'System Alerts', desc: 'App notification only', enabled: false },
  { id: 4, label: 'Refill Reminders', desc: '48h before stock out', enabled: true }
];

const formatClock = (date: Date) =>
  date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

const formatDateLabel = (date: Date) =>
  date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric'
  });

const formatRelative = (value: Date | string) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  const deltaMinutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));

  if (deltaMinutes < 60) {
    return `${deltaMinutes} min${deltaMinutes === 1 ? '' : 's'} ago`;
  }

  const deltaHours = Math.round(deltaMinutes / 60);
  return `${deltaHours} hour${deltaHours === 1 ? '' : 's'} ago`;
};

const buildMedicationLog = (status: 'taken' | 'later' | 'skip', medicine: Medication, note?: string): CareLog => {
  const now = new Date();
  const label =
    status === 'taken' ? 'Taken' : status === 'later' ? 'Snoozed' : 'Missed';

  return {
    id: crypto.randomUUID(),
    type: 'Medication',
    time: formatClock(now),
    date: formatDateLabel(now),
    value: medicine.name,
    status: label,
    note: note ?? `${medicine.name} marked as ${label.toLowerCase()}.`,
    trend: 'none'
  };
};

const toAlertFromBackend = (alert: {
  id: string;
  type: 'missed' | 'sos' | 'inactivity';
  message: string;
  timestamp: string;
}): CareAlert => ({
  id: alert.id,
  title: alert.type === 'sos' ? 'Emergency alert triggered' : 'Medication alert',
  desc: alert.message,
  type: alert.type === 'sos' ? 'sos' : 'missed',
  severity: alert.type === 'sos' ? 'CRITICAL' : 'WARNING',
  time: formatRelative(alert.timestamp),
  location: alert.type === 'sos' ? 'Emergency Channel' : 'Dose Schedule'
});

const toStoredState = (state: {
  patient: PatientProfile;
  vitals: VitalsSnapshot;
  medications: Medication[];
  alerts: CareAlert[];
  logs: CareLog[];
  notifications: NotificationPreference[];
}) => state;

const loadState = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as ReturnType<typeof toStoredState>;
  } catch {
    return null;
  }
};

const CareContext = createContext<CareContextValue | null>(null);

export function CareProvider({ children }: { children: ReactNode }) {
  const stored = loadState();
  const [patient, setPatient] = useState(stored?.patient ?? defaultPatient);
  const [vitals, setVitalsState] = useState(stored?.vitals ?? defaultVitals);
  const [medications, setMedications] = useState<Medication[]>(stored?.medications ?? defaultMedications);
  const [alerts, setAlerts] = useState<CareAlert[]>(stored?.alerts ?? defaultAlerts);
  const [logs, setLogs] = useState<CareLog[]>(stored?.logs ?? []);
  const [notifications, setNotifications] = useState<NotificationPreference[]>(
    stored?.notifications ?? defaultNotifications
  );
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({
    mode: 'unknown',
    note: 'Checking backend connection...',
    online: false
  });
  const [burnoutInsight, setBurnoutInsight] = useState<BurnoutInsight | null>(null);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        toStoredState({
          patient,
          vitals,
          medications,
          alerts,
          logs,
          notifications
        })
      )
    );
  }, [alerts, logs, medications, notifications, patient, vitals]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        await refreshBackendStatus();
        const response = await listReminders(patient.userId);

        if (cancelled) {
          return;
        }

        if ((response.data ?? []).length === 0) {
          await Promise.all(
            (stored?.medications ?? defaultMedications).map((medication) =>
              addReminder({
                userId: patient.userId,
                phone: patient.phone,
                medicine: medication.name,
                time: medication.time,
                dosage: medication.dose,
                quantity: medication.quantity
              }).catch(() => null)
            )
          );
          return;
        }

        setMedications((response.data ?? []).map((reminder) => ({
          id: reminder.id,
          name: reminder.medicine,
          dose: reminder.dosage,
          time: reminder.time,
          status: 'PENDING',
          quantity: reminder.quantity,
          stockDays: Math.max(reminder.quantity, 1),
          notes: 'Synced from backend reminders'
        })));
      } catch {
        // The UI still works in local mode if the backend is offline.
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let socket: Socket | null = null;

    try {
      socket = io(frontendConfig.socketUrl, {
        autoConnect: true,
        transports: ['websocket', 'polling']
      });

      socket.on('alert:new', (alert) => {
        setAlerts((current) => [toAlertFromBackend(alert), ...current].slice(0, 20));
      });

      socket.on('sos:triggered', (alert) => {
        setAlerts((current) => [toAlertFromBackend(alert), ...current].slice(0, 20));
      });

      socket.on('dose:update', (entry: BackendDoseUpdate) => {
        const date = new Date(entry.timestamp);
        const nextLog: CareLog = {
            id: entry.id,
            type: 'Medication',
            time: formatClock(date),
            date: formatDateLabel(date),
            value: 'WhatsApp / backend update',
            status: entry.status,
            note: `Dose status synced from backend for user ${entry.user_id}.`,
            trend: 'none'
          };

        setLogs((current) => [nextLog, ...current].slice(0, 50));
      });
    } catch {
      socket = null;
    }

    return () => {
      socket?.disconnect();
    };
  }, []);

  const refreshBackendStatus = async () => {
    try {
      const response = await getBackendHealth();
      setBackendStatus({
        mode: response.data.mode,
        note: response.data.note,
        online: true
      });
    } catch (error) {
      setBackendStatus({
        mode: 'unknown',
        note: error instanceof Error ? error.message : 'Backend is offline',
        online: false
      });
    }
  };

  const setVitals = (nextVitals: VitalsSnapshot) => {
    setVitalsState(nextVitals);
    const now = new Date();
    const nextLog: CareLog = {
      id: crypto.randomUUID(),
      type: 'Vital Check',
      time: formatClock(now),
      date: formatDateLabel(now),
      value: `${nextVitals.heartRate} bpm / ${nextVitals.bloodPressure}`,
      status: 'Updated',
      note: `O₂ ${nextVitals.oxygen}% • Temp ${nextVitals.temp}°F`,
      trend: 'stable'
    };

    setLogs((current) => [nextLog, ...current].slice(0, 50));
  };

  const pushAlert = (alert: CareAlert) => {
    setAlerts((current) => [alert, ...current].slice(0, 20));
  };

  const dismissAlert = (id: string) => {
    setAlerts((current) => current.filter((alert) => alert.id !== id));
  };

  const saveMedication = async (
    medication: Omit<Medication, 'id'>,
    existingId?: string | number | null
  ) => {
    const nextId = existingId ?? crypto.randomUUID();

    setMedications((current) => {
      if (existingId) {
        return current.map((item) => (item.id === existingId ? { ...item, ...medication, id: nextId } : item));
      }

      return [...current, { ...medication, id: nextId }];
    });

    if (!existingId) {
      try {
        const created = await addReminder({
          userId: patient.userId,
          phone: patient.phone,
          medicine: medication.name,
          time: medication.time,
          dosage: medication.dose,
          quantity: medication.quantity
        });

        setMedications((current) =>
          current.map((item) =>
            item.id === nextId
              ? {
                  ...item,
                  id: created.data.id
                }
              : item
          )
        );
      } catch (error) {
        pushAlert({
          id: crypto.randomUUID(),
          title: 'Reminder saved locally',
          desc:
            error instanceof Error
              ? `Backend sync failed: ${error.message}`
              : 'Backend sync failed, but the medicine is still available locally.',
          type: 'system',
          severity: 'INFO',
          time: formatRelative(new Date()),
          location: 'Medication Sync'
        });
      }
    }
  };

  const setMedicationStatus = async (
    medication: Medication,
    status: MedicationStatus | 'LATER',
    note?: string
  ) => {
    const backendStatusValue = status === 'TAKEN' ? 'taken' : status === 'MISSED' ? 'skip' : 'later';

    await updateDoseStatus({
      userId: patient.userId,
      phone: patient.phone,
      status: backendStatusValue,
      timestamp: new Date().toISOString()
    });

    setMedications((current) =>
      current.map((item) =>
        item.id === medication.id
          ? {
              ...item,
              status: status === 'LATER' ? 'PENDING' : status
            }
          : item
      )
    );

    setLogs((current) => [buildMedicationLog(backendStatusValue, medication, note), ...current].slice(0, 50));

    if (backendStatusValue === 'skip') {
      pushAlert({
        id: crypto.randomUUID(),
        title: `Missed Dose: ${medication.name}`,
        desc: note ?? `${medication.name} was marked as skipped.`,
        type: 'missed',
        severity: 'WARNING',
        time: formatRelative(new Date()),
        location: 'Dose Schedule'
      });
    }
  };

  const addImportedMedications = async (incoming: Array<Omit<Medication, 'id'>>) => {
    for (const medication of incoming) {
      await saveMedication(medication);
    }

    pushAlert({
      id: crypto.randomUUID(),
      title: 'Prescription imported',
      desc: `${incoming.length} medicine(s) added to the care schedule.`,
      type: 'prescription',
      severity: 'INFO',
      time: formatRelative(new Date()),
      location: 'AI Prescription Scan'
    });
  };

  const toggleNotification = (id: number) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? {
              ...notification,
              enabled: !notification.enabled
            }
          : notification
      )
    );
  };

  const runBurnoutCheck = async (mood: string) => {
    const response = await assessBurnout({
      userId: patient.userId,
      mood
    });

    setBurnoutInsight(response.data);
    return response.data;
  };

  const sendSos = async (message?: string) => {
    const response = await triggerSos({
      userId: patient.userId,
      phone: patient.phone,
      message
    });

    pushAlert(toAlertFromBackend(response.data.alert));
  };

  const value = useMemo<CareContextValue>(
    () => ({
      patient,
      vitals,
      medications,
      alerts,
      logs,
      notifications,
      backendStatus,
      burnoutInsight,
      setPatient,
      setVitals,
      saveMedication,
      setMedicationStatus,
      addImportedMedications,
      dismissAlert,
      pushAlert,
      toggleNotification,
      refreshBackendStatus,
      runBurnoutCheck,
      sendSos
    }),
    [alerts, backendStatus, burnoutInsight, logs, medications, notifications, patient, vitals]
  );

  return <CareContext.Provider value={value}>{children}</CareContext.Provider>;
}

export const useCare = () => {
  const context = useContext(CareContext);

  if (!context) {
    throw new Error('useCare must be used within a CareProvider');
  }

  return context;
};
