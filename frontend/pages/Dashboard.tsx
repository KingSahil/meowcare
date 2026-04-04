import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Download,
  Frown,
  Heart,
  Laugh,
  Link2,
  Meh,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Smile,
  Sparkles,
  Thermometer,
  Upload,
  Wind
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import MedicineTable, { type Medication, type MedicationStatus } from '../components/MedicineTable';
import { useCare, type PatientProfile, type VitalsSnapshot } from '../context/CareContext';
import { getWhatsappHealth, getWhatsappQrUrl, parseReminderText, scanPrescription, triggerCallReminderNow, voiceQuery } from '../lib/api';
import { generatePDF } from '../lib/pdfGenerator';
import { cn } from '../lib/utils';
import { getDashboardHeartRateTrend } from '../lib/vitalsChart';

type SchedulePeriod = 'Morning' | 'Afternoon' | 'Night';

type ParsedPrescriptionItem = {
  name: string;
  dose: string;
  schedule: string;
  durationDays: number;
  notes?: string;
};

type WhatsappStatus = {
  ok: boolean;
  connected?: boolean;
  connectionState?: string;
  qrAvailable?: boolean;
  qrUpdatedAt?: string | null;
  lastConnectedAt?: string | null;
};

const moodOptions = [
  { icon: Laugh, label: 'Great', value: 'happy' },
  { icon: Smile, label: 'Good', value: 'okay' },
  { icon: Meh, label: 'Okay', value: 'tired' },
  { icon: Frown, label: 'Tired', value: 'overwhelmed' }
] as const;

const scheduleToClock = (schedule: SchedulePeriod[]) => {
  const mapping: Record<SchedulePeriod, string> = {
    Morning: '08:00',
    Afternoon: '14:00',
    Night: '21:00'
  };

  return schedule.map((slot) => mapping[slot]).join(' / ') || mapping.Morning;
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Unable to read file.'));
    reader.readAsDataURL(file);
  });

const isPdfDocument = (file: File | null) =>
  Boolean(
    file &&
      (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))
  );

function ModalFrame({
  title,
  children,
  onClose,
  onSave
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-md p-4 flex items-center justify-center">
      <div className="w-full max-w-2xl rounded-3xl bg-surface-container-lowest p-6 shadow-2xl">
        <h3 className="text-2xl font-black mb-4">{title}</h3>
        {children}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-surface-container-low font-black text-xs uppercase">
            Cancel
          </button>
          <button onClick={onSave} className="px-4 py-2 rounded-xl bg-primary text-white font-black text-xs uppercase">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function WhatsAppConnectModal({
  status,
  error,
  loading,
  qrKey,
  onClose,
  onRefresh
}: {
  status: WhatsappStatus | null;
  error: string | null;
  loading: boolean;
  qrKey: number;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const showQr = Boolean(status?.qrAvailable && !status?.connected);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-md p-4 flex items-center justify-center">
      <div className="w-full max-w-4xl rounded-[32px] border border-white/60 bg-surface-container-lowest shadow-2xl overflow-hidden">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-7 md:p-8 bg-gradient-to-br from-[#f4fffa] via-surface-container-lowest to-[#e8f6ff]">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#25D366]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-[#075E54]">
              <MessageSquare className="w-4 h-4" />
              WhatsApp Link
            </div>
            <h3 className="mt-5 text-3xl font-black tracking-tight">Scan and link WhatsApp</h3>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-secondary">
              Open WhatsApp on the caregiver phone, tap <span className="font-black text-on-surface">Linked devices</span>, and scan this QR code to connect the reminder bot.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: 'Connection',
                  value: status?.connected ? 'Connected' : showQr ? 'Ready to scan' : 'Starting',
                  tone: status?.connected ? 'text-emerald-700' : 'text-[#075E54]'
                },
                {
                  label: 'QR updated',
                  value: status?.qrUpdatedAt ? new Date(status.qrUpdatedAt).toLocaleTimeString() : 'Waiting',
                  tone: 'text-on-surface'
                },
                {
                  label: 'Last linked',
                  value: status?.lastConnectedAt ? new Date(status.lastConnectedAt).toLocaleString() : 'Not yet',
                  tone: 'text-on-surface'
                }
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">{item.label}</p>
                  <p className={cn('mt-3 text-sm font-black', item.tone)}>{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-3xl bg-white/70 border border-white/60 p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-secondary">How to scan</p>
              <div className="mt-4 space-y-3 text-sm text-secondary">
                <p>1. Open WhatsApp on the phone that should receive reminders.</p>
                <p>2. Go to Settings or the three-dot menu, then choose <span className="font-black text-on-surface">Linked devices</span>.</p>
                <p>3. Tap <span className="font-black text-on-surface">Link a device</span> and point the camera at this QR.</p>
              </div>
            </div>

            {error && (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {error}
              </div>
            )}
          </div>

          <div className="bg-[#075E54] p-7 md:p-8 text-white flex flex-col">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/70">Bot status</p>
                <h4 className="mt-3 text-2xl font-black">
                  {status?.connected ? 'Linked and ready' : showQr ? 'Scan this QR code' : 'Preparing QR code'}
                </h4>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-white transition hover:bg-white/20"
              >
                Close
              </button>
            </div>

            <div className="mt-8 flex-1 rounded-[32px] bg-white p-6 text-center text-on-surface shadow-2xl flex flex-col items-center justify-center">
              {showQr ? (
                <>
                  <img
                    key={qrKey}
                    src={`${getWhatsappQrUrl()}?t=${qrKey}`}
                    alt="WhatsApp QR code"
                    className="h-64 w-64 rounded-3xl bg-white object-contain shadow-sm"
                  />
                  <p className="mt-5 text-base font-black text-[#075E54]">Scan from WhatsApp to connect</p>
                  <p className="mt-2 text-sm text-secondary">The code refreshes automatically while this dialog is open.</p>
                </>
              ) : (
                <>
                  <div className={cn(
                    'flex h-64 w-64 items-center justify-center rounded-3xl border-2 border-dashed',
                    status?.connected ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'
                  )}>
                    <div className="space-y-4 text-center">
                      <div className={cn(
                        'mx-auto flex h-16 w-16 items-center justify-center rounded-2xl',
                        status?.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      )}>
                        <Link2 className="h-8 w-8" />
                      </div>
                      <p className="px-6 text-sm font-black text-on-surface">
                        {status?.connected ? 'WhatsApp is already linked.' : loading ? 'Fetching the latest QR...' : 'Waiting for the bot to expose a fresh QR.'}
                      </p>
                    </div>
                  </div>
                  <p className="mt-5 text-sm text-secondary">
                    {status?.connected
                      ? 'You can close this dialog. Scheduled reminders and reply actions are available now.'
                      : 'If the QR does not appear yet, keep the bot running and refresh once.'}
                  </p>
                </>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-[#075E54] shadow-sm transition hover:-translate-y-0.5"
              >
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
                Refresh QR
              </button>
              <a
                href={getWhatsappQrUrl()}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:bg-white/10"
              >
                <Link2 className="w-4 h-4" />
                Open image
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const {
    patient,
    vitals,
    medications,
    alerts,
    logs,
    burnoutInsight,
    setPatient,
    setVitals,
    saveMedication,
    setMedicationStatus,
    addImportedMedications,
    dismissAlert,
    pushAlert,
    runBurnoutCheck
  } = useCare();
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [prescriptionPreview, setPrescriptionPreview] = useState<string | null>(null);
  const [parsedPrescription, setParsedPrescription] = useState<ParsedPrescriptionItem[]>([]);
  const [scanSummary, setScanSummary] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedMood, setSelectedMood] = useState(1);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [isMedicationModalOpen, setIsMedicationModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppStatus, setWhatsAppStatus] = useState<WhatsappStatus | null>(null);
  const [whatsAppError, setWhatsAppError] = useState<string | null>(null);
  const [isWhatsAppLoading, setIsWhatsAppLoading] = useState(false);
  const [whatsAppQrKey, setWhatsAppQrKey] = useState(Date.now());
  const [callingMedicationId, setCallingMedicationId] = useState<string | number | null>(null);
  const [callReminderFeedback, setCallReminderFeedback] = useState<{
    tone: 'success' | 'error';
    text: string;
  } | null>(null);
  const [editingMedicationId, setEditingMedicationId] = useState<string | number | null>(null);
  const [patientDraft, setPatientDraft] = useState<PatientProfile>(patient);
  const [vitalsDraft, setVitalsDraft] = useState<VitalsSnapshot>(vitals);
  const [medicationDraft, setMedicationDraft] = useState<Omit<Medication, 'id'>>({
    name: '',
    dose: '',
    time: '08:00',
    status: 'PENDING',
    quantity: 1,
    stockDays: 1,
    notes: ''
  });
  const [medicationScheduleDraft, setMedicationScheduleDraft] = useState<SchedulePeriod[]>(['Morning']);
  const isPrescriptionPdf = isPdfDocument(prescriptionFile);

  const adherence = useMemo(() => {
    const takenCount = medications.filter((medication) => medication.status === 'TAKEN').length;
    return {
      takenCount,
      percent: Math.round((takenCount / Math.max(medications.length, 1)) * 100)
    };
  }, [medications]);

  const lowStockMedications = useMemo(
    () => medications.filter((medication) => medication.stockDays < 3),
    [medications]
  );

  const chartData = useMemo(() => getDashboardHeartRateTrend(vitals, logs), [logs, vitals]);

  const refreshWhatsAppStatus = async () => {
    setIsWhatsAppLoading(true);
    setWhatsAppError(null);

    try {
      const nextStatus = await getWhatsappHealth();
      setWhatsAppStatus(nextStatus);
      setWhatsAppQrKey(Date.now());
    } catch (error) {
      setWhatsAppError(error instanceof Error ? error.message : 'Unable to reach WhatsApp bot.');
    } finally {
      setIsWhatsAppLoading(false);
    }
  };

  const openWhatsAppModal = () => {
    setIsWhatsAppModalOpen(true);
    void refreshWhatsAppStatus();
  };

  useEffect(() => {
    if (!isWhatsAppModalOpen) {
      return;
    }

    const interval = window.setInterval(() => {
      void refreshWhatsAppStatus();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [isWhatsAppModalOpen]);

  useEffect(() => {
    return () => {
      if (prescriptionPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(prescriptionPreview);
      }
    };
  }, [prescriptionPreview]);

  const handleAiSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!aiQuery.trim()) {
      return;
    }

    setIsAiLoading(true);
    setAiResponse(null);

    try {
      const query = aiQuery.trim();
      const looksLikeInstruction =
        /\b(take|give|tablet|capsule|after|before|every|night|morning|dinner|breakfast|days?)\b/i.test(query);

      if (looksLikeInstruction) {
        const response = await parseReminderText({
          text: query,
          userContext: {
            meal_times: {
              breakfast: '08:00',
              lunch: '13:00',
              dinner: '20:00'
            }
          }
        });

        setAiResponse(`${response.data.insight.title}. ${response.data.insight.details}`);
      } else if (/\b(vital|bp|blood pressure|heart|oxygen|temperature)\b/i.test(query)) {
        setAiResponse(
          `${patient.name}'s vitals are HR ${vitals.heartRate} bpm, BP ${vitals.bloodPressure}, O₂ ${vitals.oxygen}% and temperature ${vitals.temp}°F.`
        );
      } else {
        const response = await voiceQuery({
          userId: patient.userId,
          query,
          reminders: medications.map((medication) => ({
            medicine: medication.name,
            dosage: medication.dose,
            time: medication.time,
            quantity: medication.quantity
          }))
        });

        setAiResponse(response.text);
      }
    } catch (error) {
      setAiResponse(error instanceof Error ? error.message : 'Unable to answer right now.');
    } finally {
      setIsAiLoading(false);
      setAiQuery('');
    }
  };

  const handleScanPrescription = async () => {
    if (!prescriptionFile) {
      return;
    }

    if (isPdfDocument(prescriptionFile)) {
      setParsedPrescription([]);
      setScanSummary('PDF preview is supported, but the AI scanner currently works best with JPG or PNG prescription images.');
      return;
    }

    setIsScanning(true);

    try {
      const image = await fileToDataUrl(prescriptionFile);
      const response = await scanPrescription({ image });
      setParsedPrescription(
        response.data.scan.detectedMedicines.map((item) => ({
          name: item.name,
          dose: item.dosage,
          schedule: item.time,
          durationDays: Math.max(item.stock ?? 10, 1),
          notes: 'Imported from backend AI scan'
        }))
      );
      setScanSummary(response.data.scan.summary);
    } catch (error) {
      setParsedPrescription([]);
      setScanSummary(error instanceof Error ? error.message : 'Prescription scan failed.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleDownloadDoctorReport = () => {
    generatePDF(
      'Doctor-Ready Care Summary',
      [
        `Patient: ${patient.name}`,
        `Age: ${patient.age}`,
        `Condition: ${patient.condition}`,
        `Phone: ${patient.phone}`,
        '',
        `Heart Rate: ${vitals.heartRate} bpm`,
        `Blood Pressure: ${vitals.bloodPressure}`,
        `Oxygen: ${vitals.oxygen}%`,
        `Temperature: ${vitals.temp}°F`,
        '',
        `Medication Adherence: ${adherence.percent}%`,
        '',
        ...medications.map(
          (medication) =>
            `${medication.name} | ${medication.dose} | ${medication.time} | ${medication.status} | ${medication.quantity} units`
        )
      ],
      `Doctor_Summary_${patient.name.replace(/\s+/g, '_')}`
    );
  };

  const openAddMedication = () => {
    setEditingMedicationId(null);
    setMedicationScheduleDraft(['Morning']);
    setMedicationDraft({
      name: '',
      dose: '',
      time: '08:00',
      status: 'PENDING',
      quantity: 1,
      stockDays: 1,
      notes: ''
    });
    setIsMedicationModalOpen(true);
  };

  const openEditMedication = (medication: Medication) => {
    setEditingMedicationId(medication.id);
    setMedicationDraft({
      ...medication
    });
    setMedicationScheduleDraft(
      (['Morning', 'Afternoon', 'Night'] as SchedulePeriod[]).filter((slot) =>
        medication.time.toLowerCase().includes(slot.toLowerCase())
      ) || ['Morning']
    );
    setIsMedicationModalOpen(true);
  };

  const toggleMedicationSchedule = (slot: SchedulePeriod) => {
    setMedicationScheduleDraft((current) => {
      if (current.includes(slot)) {
        return current.length === 1 ? current : current.filter((item) => item !== slot);
      }

      return [...current, slot];
    });
  };

  const handleTriggerCallReminder = async (medication: Medication) => {
    setCallingMedicationId(medication.id);
    setCallReminderFeedback(null);

    try {
      await triggerCallReminderNow({
        userId: patient.userId,
        phone: patient.phone,
        medicine: medication.name,
        dosage: medication.dose,
        customScript: `Hello. This is a medicine reminder for ${patient.name}. It is time to take ${medication.name}${medication.dose ? `, ${medication.dose}` : ''}. After the beep, say taken, later, or skip.`
      });

      const successMessage = `Deepgram call reminder started for ${medication.name}.`;
      setCallReminderFeedback({
        tone: 'success',
        text: successMessage
      });
      pushAlert({
        id: crypto.randomUUID(),
        title: 'Voice reminder started',
        desc: `${medication.name} call reminder was triggered for ${patient.phone}.`,
        type: 'system',
        severity: 'INFO',
        time: 'just now',
        location: 'Deepgram Call Flow'
      });
    } catch (error) {
      setCallReminderFeedback({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Unable to start Deepgram call reminder.'
      });
    } finally {
      setCallingMedicationId(null);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="grid grid-cols-12 gap-6">
        <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="col-span-12 lg:col-span-8 care-panel p-8">
          <div className="flex flex-col md:flex-row gap-6 justify-between">
            <div className="flex gap-5">
              <img src={patient.photo} alt={patient.name} className="w-28 h-28 rounded-3xl object-cover shadow-lg" referrerPolicy="no-referrer" />
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-primary">Live patient profile</p>
                  <h1 className="text-4xl font-black tracking-tight">{patient.name}</h1>
                  <p className="text-secondary font-medium">{patient.age} years • {patient.condition}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => { setPatientDraft(patient); setIsPatientModalOpen(true); }} className="px-4 py-2 rounded-xl bg-surface-container-low border border-surface-container-high text-xs font-black uppercase tracking-widest">Edit Patient</button>
                  <button onClick={() => { setVitalsDraft(vitals); setIsVitalsModalOpen(true); }} className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-xs font-black uppercase tracking-widest">Update Vitals</button>
                  <button onClick={openWhatsAppModal} className="px-4 py-2 rounded-xl bg-[#25D366]/10 text-[#075E54] text-xs font-black uppercase tracking-widest flex items-center gap-2 border border-[#25D366]/20">
                    <MessageSquare className="w-4 h-4" />
                    Link WhatsApp
                  </button>
                  <button onClick={handleDownloadDoctorReport} className="px-4 py-2 rounded-xl bg-on-surface text-white text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Doctor PDF
                  </button>
                </div>
              </div>
            </div>

            <div className="text-white rounded-3xl px-6 py-5 min-w-[250px] shadow-xl bg-gradient-to-br from-[#0a6f7f] to-[#1a8ca1]">
              <p className="text-xs font-black uppercase tracking-[0.25em] opacity-80">Today's adherence</p>
              <p className="text-5xl font-black mt-2">{adherence.percent}%</p>
              <p className="text-sm mt-3 opacity-85">{adherence.takenCount}/{medications.length || 1} doses completed</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              { icon: Heart, label: 'Heart Rate', value: `${vitals.heartRate} bpm`, color: 'text-rose-500' },
              { icon: Activity, label: 'Blood Pressure', value: vitals.bloodPressure, color: 'text-primary' },
              { icon: Wind, label: 'Oxygen', value: `${vitals.oxygen}%`, color: 'text-sky-500' },
              { icon: Thermometer, label: 'Temperature', value: `${vitals.temp}°F`, color: 'text-orange-500' }
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-surface-container-low border border-surface-container-high p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <item.icon className={cn('w-4 h-4', item.color)} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-secondary">{item.label}</span>
                </div>
                <p className="text-2xl font-black mt-3">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-3xl bg-surface-container-low p-5 border border-surface-container-high shadow-inner">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black tracking-tight">Heart rate trend</h2>
              <span className="care-pill bg-primary/10 text-primary">Manual + live dashboard</span>
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="dashboardHeartRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0c6a76" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#0c6a76" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d7e3ea" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="bpm" stroke="#0c6a76" strokeWidth={4} fill="url(#dashboardHeartRate)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-8">
            {callReminderFeedback && (
              <div
                className={cn(
                  'mb-4 rounded-2xl border px-4 py-3 text-sm font-medium',
                  callReminderFeedback.tone === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-rose-200 bg-rose-50 text-rose-700'
                )}
              >
                {callReminderFeedback.text}
              </div>
            )}
            <MedicineTable
              medications={medications}
              onAddMedicine={openAddMedication}
              onEditMedicine={openEditMedication}
              onRefillNow={(medication) => void setMedicationStatus(medication, 'LATER', `Refill requested for ${medication.name}.`)}
              onCallReminder={(medication) => void handleTriggerCallReminder(medication)}
              callingMedicationId={callingMedicationId}
              onStatusChange={(medication, status) => void setMedicationStatus(medication, status)}
            />
          </div>
        </motion.section>

        <div className="col-span-12 xl:col-span-4 space-y-6">
          <section className="care-panel p-7">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-2xl bg-primary/10"><Sparkles className="w-5 h-5 text-primary" /></div>
              <div>
                <h2 className="text-xl font-black tracking-tight">Care Assistant AI</h2>
                <p className="text-xs text-secondary">Backend AI module + medicine query endpoint</p>
              </div>
            </div>
            {aiResponse && <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 mb-4"><p className="text-sm font-medium leading-relaxed">{aiResponse}</p></div>}
            <form onSubmit={handleAiSubmit} className="relative">
              <input className="w-full rounded-2xl bg-surface-container-low px-5 py-4 pr-14 text-sm font-bold focus:ring-2 focus:ring-primary" placeholder={isAiLoading ? 'Analyzing...' : 'Ask about meds or paste a reminder'} value={aiQuery} onChange={(event) => setAiQuery(event.target.value)} disabled={isAiLoading} />
              <button type="submit" disabled={isAiLoading || !aiQuery.trim()} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center disabled:opacity-50">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </section>

          <section className="care-panel relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-[#f5fffd] via-white to-[#e8f7fb] p-8 shadow-[0_24px_70px_-36px_rgba(12,106,118,0.55)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-primary/15 via-cyan-400/10 to-transparent" />
            <div className="relative flex items-center justify-between mb-6">
              <div>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-primary">
                  Main feature
                </span>
                <h2 className="mt-3 text-2xl font-black tracking-tight">Prescription Scanner</h2>
                <p className="text-xs text-secondary mt-1">Highlighting the fastest path from uploaded prescription to structured medicines.</p>
              </div>
              <div className="rounded-2xl bg-white/85 p-3 shadow-sm ring-1 ring-primary/10">
                <Upload className="w-6 h-6 text-primary" />
              </div>
            </div>
            <label className="relative block cursor-pointer rounded-[28px] border-2 border-dashed border-primary/35 bg-white/75 p-7 text-center shadow-sm transition hover:border-primary/50 hover:bg-white">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-on-surface">Upload prescription</p>
              <p className="text-xs text-secondary mt-2">JPG and PNG scan best. PDFs now get a full preview too.</p>
              <input type="file" accept="image/*,.pdf,application/pdf" className="hidden" onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                if (!file) return;
                if (prescriptionPreview?.startsWith('blob:')) URL.revokeObjectURL(prescriptionPreview);
                setPrescriptionFile(file);
                setParsedPrescription([]);
                setScanSummary(null);
                setPrescriptionPreview(URL.createObjectURL(file));
              }} />
            </label>
            {prescriptionPreview && (
              <div className="mt-5 overflow-hidden rounded-[28px] border border-primary/10 bg-white p-3 shadow-inner">
                {isPrescriptionPdf ? (
                  <iframe
                    src={`${prescriptionPreview}#toolbar=0&navpanes=0&scrollbar=0&zoom=page-fit`}
                    title="Prescription PDF preview"
                    className="h-[520px] w-full rounded-[22px] bg-white"
                  />
                ) : (
                  <img
                    src={prescriptionPreview}
                    alt="Prescription preview"
                    className="h-[520px] w-full rounded-[22px] bg-white object-contain"
                  />
                )}
              </div>
            )}
            {prescriptionFile && (
              <button
                onClick={handleScanPrescription}
                disabled={isScanning || isPrescriptionPdf}
                className="w-full mt-5 py-4 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-[0.24em] disabled:opacity-60"
              >
                {isScanning ? 'Scanning...' : isPrescriptionPdf ? 'Convert PDF page to image to scan' : 'Scan with backend AI'}
              </button>
            )}
            {isPrescriptionPdf && (
              <p className="mt-3 text-xs font-medium text-secondary">
                Full PDF preview is enabled here. For OCR scanning, upload the prescription as a JPG or PNG so the AI parser can read it reliably.
              </p>
            )}
            {scanSummary && <div className="rounded-2xl bg-surface-container-low border border-surface-container-high p-4 mt-4"><p className="text-sm text-secondary leading-relaxed">{scanSummary}</p></div>}
            {parsedPrescription.length > 0 && (
              <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 mt-4">
                <div className="space-y-2">
                  {parsedPrescription.map((item) => (
                    <div key={`${item.name}-${item.schedule}`} className="text-sm">
                      <span className="font-black">{item.name}</span> • {item.dose} • {item.schedule}
                    </div>
                  ))}
                </div>
                <button onClick={() => void addImportedMedications(parsedPrescription.map((item) => ({
                  name: item.name,
                  dose: item.dose,
                  time: item.schedule,
                  status: 'PENDING',
                  quantity: Math.max(item.durationDays, 1),
                  stockDays: item.durationDays,
                  notes: item.notes
                })))} className="w-full mt-4 py-3 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest">
                  Add scanned medicines
                </button>
              </div>
            )}
          </section>

          <section className="care-panel p-7">
            <div className="flex justify-between items-start gap-4 mb-5">
              <div>
                <h2 className="text-xl font-black tracking-tight">Caregiver Wellness</h2>
                <p className="text-xs text-secondary">Connected to `/api/burnout`</p>
              </div>
              <div className="rounded-2xl bg-primary/10 p-2"><Heart className="w-5 h-5 text-primary" /></div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {moodOptions.map((option, index) => (
                <button key={option.label} onClick={() => { setSelectedMood(index); void runBurnoutCheck(option.value); }} className={cn('py-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all', selectedMood === index ? 'bg-primary text-white border-primary' : 'bg-surface-container-low border-surface-container-high text-secondary')}>
                  <option.icon className="w-5 h-5" />
                  <span className="text-[9px] font-black uppercase tracking-widest">{option.label}</span>
                </button>
              ))}
            </div>
            {burnoutInsight && <div className="rounded-2xl bg-surface-container-low border border-surface-container-high p-4 mt-5"><p className="text-xs font-black uppercase tracking-widest text-primary">Burnout level: {burnoutInsight.burnoutLevel}</p><p className="text-sm text-secondary mt-2 leading-relaxed">{burnoutInsight.suggestion}</p></div>}
          </section>

          <section className="rounded-3xl p-7 shadow-xl bg-gradient-to-br from-[#9f5f76] to-[#8a4b5d] text-white">
            <h2 className="text-xl font-black tracking-tight mb-5">Priority alerts</h2>
            <div className="space-y-3">
              {alerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="rounded-2xl bg-white/14 border border-white/20 p-4 flex justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/80">{alert.severity}</p>
                    <p className="font-black mt-2">{alert.title}</p>
                    <p className="text-sm text-white/80 mt-1">{alert.desc}</p>
                  </div>
                  <button onClick={() => dismissAlert(alert.id)} className="px-3 py-2 rounded-xl bg-white text-[#8a4b5d] text-[10px] font-black uppercase tracking-widest h-fit">Dismiss</button>
                </div>
              ))}
              {lowStockMedications.length > 0 && <p className="text-xs text-white/80">Low stock: {lowStockMedications.map((item) => item.name).join(', ')}</p>}
            </div>
          </section>
        </div>
      </div>

      {isPatientModalOpen && (
        <ModalFrame title="Edit Patient" onClose={() => setIsPatientModalOpen(false)} onSave={() => { setPatient(patientDraft); setIsPatientModalOpen(false); }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="rounded-2xl bg-surface-container-low px-4 py-3" value={patientDraft.name} onChange={(event) => setPatientDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Patient name" />
            <input className="rounded-2xl bg-surface-container-low px-4 py-3" type="number" value={patientDraft.age} onChange={(event) => setPatientDraft((current) => ({ ...current, age: Number(event.target.value) }))} placeholder="Age" />
            <input className="rounded-2xl bg-surface-container-low px-4 py-3 md:col-span-2" value={patientDraft.condition} onChange={(event) => setPatientDraft((current) => ({ ...current, condition: event.target.value }))} placeholder="Condition" />
            <input className="rounded-2xl bg-surface-container-low px-4 py-3" value={patientDraft.location} onChange={(event) => setPatientDraft((current) => ({ ...current, location: event.target.value }))} placeholder="Location" />
            <input className="rounded-2xl bg-surface-container-low px-4 py-3" value={patientDraft.phone} onChange={(event) => setPatientDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="Phone" />
            <input className="rounded-2xl bg-surface-container-low px-4 py-3 md:col-span-2" value={patientDraft.photo} onChange={(event) => setPatientDraft((current) => ({ ...current, photo: event.target.value }))} placeholder="Profile image URL" />
          </div>
        </ModalFrame>
      )}

      {isVitalsModalOpen && (
        <ModalFrame title="Update Vitals" onClose={() => setIsVitalsModalOpen(false)} onSave={() => { setVitals(vitalsDraft); setIsVitalsModalOpen(false); }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="rounded-2xl bg-surface-container-low px-4 py-3" type="number" value={vitalsDraft.heartRate} onChange={(event) => setVitalsDraft((current) => ({ ...current, heartRate: Number(event.target.value) }))} placeholder="Heart rate" />
            <input className="rounded-2xl bg-surface-container-low px-4 py-3" value={vitalsDraft.bloodPressure} onChange={(event) => setVitalsDraft((current) => ({ ...current, bloodPressure: event.target.value }))} placeholder="Blood pressure" />
            <input className="rounded-2xl bg-surface-container-low px-4 py-3" type="number" step="0.1" value={vitalsDraft.oxygen} onChange={(event) => setVitalsDraft((current) => ({ ...current, oxygen: Number(event.target.value) }))} placeholder="Oxygen" />
            <input className="rounded-2xl bg-surface-container-low px-4 py-3" type="number" step="0.1" value={vitalsDraft.temp} onChange={(event) => setVitalsDraft((current) => ({ ...current, temp: Number(event.target.value) }))} placeholder="Temperature" />
          </div>
        </ModalFrame>
      )}

      {isMedicationModalOpen && (
        <ModalFrame title={editingMedicationId ? 'Edit Medication' : 'Add Medication'} onClose={() => setIsMedicationModalOpen(false)} onSave={() => { void saveMedication({ ...medicationDraft, time: scheduleToClock(medicationScheduleDraft), quantity: Number(medicationDraft.quantity), stockDays: Number(medicationDraft.stockDays) }, editingMedicationId); setIsMedicationModalOpen(false); }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="rounded-2xl bg-surface-container-low px-4 py-3" value={medicationDraft.name} onChange={(event) => setMedicationDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Medicine name" />
            <input className="rounded-2xl bg-surface-container-low px-4 py-3" value={medicationDraft.dose} onChange={(event) => setMedicationDraft((current) => ({ ...current, dose: event.target.value }))} placeholder="Dosage" />
            <div className="md:col-span-2">
              <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-2">Schedule</p>
              <div className="flex flex-wrap gap-2">
                {(['Morning', 'Afternoon', 'Night'] as SchedulePeriod[]).map((slot) => (
                  <button type="button" key={slot} onClick={() => toggleMedicationSchedule(slot)} className={cn('px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest border', medicationScheduleDraft.includes(slot) ? 'bg-primary text-white border-primary' : 'bg-surface-container-low text-secondary border-surface-container-high')}>
                    {slot}
                  </button>
                ))}
              </div>
            </div>
            <input className="rounded-2xl bg-surface-container-low px-4 py-3" type="number" value={medicationDraft.quantity} onChange={(event) => setMedicationDraft((current) => ({ ...current, quantity: Number(event.target.value) }))} placeholder="Quantity" />
            <input className="rounded-2xl bg-surface-container-low px-4 py-3" type="number" value={medicationDraft.stockDays} onChange={(event) => setMedicationDraft((current) => ({ ...current, stockDays: Number(event.target.value) }))} placeholder="Stock days" />
            <select className="rounded-2xl bg-surface-container-low px-4 py-3" value={medicationDraft.status} onChange={(event) => setMedicationDraft((current) => ({ ...current, status: event.target.value as MedicationStatus }))}>
              <option value="PENDING">PENDING</option>
              <option value="TAKEN">TAKEN</option>
              <option value="MISSED">MISSED</option>
            </select>
            <textarea className="rounded-2xl bg-surface-container-low px-4 py-3 min-h-24 md:col-span-2" value={medicationDraft.notes ?? ''} onChange={(event) => setMedicationDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Notes" />
          </div>
        </ModalFrame>
      )}

      {isWhatsAppModalOpen && (
        <WhatsAppConnectModal
          status={whatsAppStatus}
          error={whatsAppError}
          loading={isWhatsAppLoading}
          qrKey={whatsAppQrKey}
          onClose={() => setIsWhatsAppModalOpen(false)}
          onRefresh={() => void refreshWhatsAppStatus()}
        />
      )}

      <button onClick={openAddMedication} className="fixed bottom-8 right-8 w-16 h-16 rounded-3xl bg-primary text-white shadow-2xl flex items-center justify-center hover:scale-110 transition-transform">
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
}
