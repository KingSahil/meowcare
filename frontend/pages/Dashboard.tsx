import React, { useMemo, useState } from 'react';
import {
  Activity,
  Download,
  Frown,
  Heart,
  Laugh,
  Meh,
  Plus,
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
import { parseReminderText, scanPrescription, voiceQuery } from '../lib/api';
import { generatePDF } from '../lib/pdfGenerator';
import { cn } from '../lib/utils';

type SchedulePeriod = 'Morning' | 'Afternoon' | 'Night';

type ParsedPrescriptionItem = {
  name: string;
  dose: string;
  schedule: string;
  durationDays: number;
  notes?: string;
};

const moodOptions = [
  { icon: Laugh, label: 'Great', value: 'happy' },
  { icon: Smile, label: 'Good', value: 'okay' },
  { icon: Meh, label: 'Okay', value: 'tired' },
  { icon: Frown, label: 'Tired', value: 'overwhelmed' }
] as const;

const chartDataForVitals = (heartRate: number) => [
  { time: '08:00', bpm: Math.max(heartRate - 4, 60) },
  { time: '10:00', bpm: Math.max(heartRate - 1, 60) },
  { time: '12:00', bpm: heartRate + 3 },
  { time: '14:00', bpm: heartRate },
  { time: '16:00', bpm: Math.max(heartRate - 2, 60) },
  { time: '18:00', bpm: heartRate + 1 }
];

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
    <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center">
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

export default function Dashboard() {
  const {
    patient,
    vitals,
    medications,
    alerts,
    burnoutInsight,
    setPatient,
    setVitals,
    saveMedication,
    setMedicationStatus,
    addImportedMedications,
    dismissAlert,
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

  const chartData = useMemo(() => chartDataForVitals(vitals.heartRate), [vitals.heartRate]);

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

  return (
    <div className="space-y-8 pb-20">
      <div className="grid grid-cols-12 gap-6">
        <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="col-span-12 lg:col-span-8 bg-surface-container-lowest border border-emerald-100 rounded-3xl p-8 shadow-sm">
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
                  <button onClick={handleDownloadDoctorReport} className="px-4 py-2 rounded-xl bg-on-surface text-white text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Doctor PDF
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-primary text-white rounded-3xl px-6 py-5 min-w-[250px] shadow-xl">
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
              <div key={item.label} className="rounded-2xl bg-surface-container-low border border-surface-container-high p-4">
                <div className="flex items-center gap-2">
                  <item.icon className={cn('w-4 h-4', item.color)} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-secondary">{item.label}</span>
                </div>
                <p className="text-2xl font-black mt-3">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-3xl bg-surface-container-low p-5 border border-surface-container-high">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black tracking-tight">Heart rate trend</h2>
              <span className="text-xs font-black uppercase tracking-widest text-primary">Manual + live dashboard</span>
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
            <MedicineTable
              medications={medications}
              onAddMedicine={openAddMedication}
              onEditMedicine={openEditMedication}
              onRefillNow={(medication) => void setMedicationStatus(medication, 'LATER', `Refill requested for ${medication.name}.`)}
              onStatusChange={(medication, status) => void setMedicationStatus(medication, status)}
            />
          </div>
        </motion.section>

        <div className="col-span-12 xl:col-span-4 space-y-6">
          <section className="bg-surface-container-lowest border border-emerald-100 rounded-3xl p-7 shadow-sm">
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

          <section className="bg-surface-container-lowest border border-emerald-100 rounded-3xl p-7 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-black tracking-tight">Prescription Scan</h2>
                <p className="text-xs text-secondary">Runs through backend OCR + AI parser</p>
              </div>
              <Upload className="w-5 h-5 text-primary" />
            </div>
            <label className="block border-2 border-dashed border-primary/30 rounded-2xl p-6 text-center cursor-pointer bg-primary/5">
              <p className="text-sm font-black">Upload prescription image</p>
              <p className="text-xs text-secondary mt-2">PNG or JPG works best</p>
              <input type="file" accept="image/*" className="hidden" onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                if (!file) return;
                if (prescriptionPreview?.startsWith('blob:')) URL.revokeObjectURL(prescriptionPreview);
                setPrescriptionFile(file);
                setParsedPrescription([]);
                setScanSummary(null);
                setPrescriptionPreview(URL.createObjectURL(file));
              }} />
            </label>
            {prescriptionPreview && <img src={prescriptionPreview} alt="Prescription preview" className="w-full h-40 object-cover rounded-2xl mt-4" />}
            {prescriptionFile && <button onClick={handleScanPrescription} disabled={isScanning} className="w-full mt-4 py-3 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest disabled:opacity-60">{isScanning ? 'Scanning...' : 'Scan with backend AI'}</button>}
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

          <section className="bg-surface-container-lowest border border-emerald-100 rounded-3xl p-7 shadow-sm">
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

          <section className="bg-surface-container-low border border-surface-container-high rounded-3xl p-7 shadow-inner">
            <h2 className="text-xl font-black tracking-tight mb-5">Priority alerts</h2>
            <div className="space-y-3">
              {alerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="rounded-2xl bg-white/70 border border-white p-4 flex justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">{alert.severity}</p>
                    <p className="font-black mt-2">{alert.title}</p>
                    <p className="text-sm text-secondary mt-1">{alert.desc}</p>
                  </div>
                  <button onClick={() => dismissAlert(alert.id)} className="text-[10px] font-black uppercase tracking-widest text-primary">Dismiss</button>
                </div>
              ))}
              {lowStockMedications.length > 0 && <p className="text-xs text-secondary">Low stock: {lowStockMedications.map((item) => item.name).join(', ')}</p>}
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

      <button onClick={openAddMedication} className="fixed bottom-8 right-8 w-16 h-16 rounded-3xl bg-primary text-white shadow-2xl flex items-center justify-center hover:scale-110 transition-transform">
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
}
