import React, { useEffect, useState } from 'react';
import { 
  Phone, 
  MessageSquare, 
  AlertCircle, 
  Upload,
  Sparkles, 
  Send, 
  Plus, 
  Heart, 
  Thermometer, 
  Wind, 
  Moon,
  Download,
  TrendingUp,
  Activity,
  Laugh,
  Smile,
  Meh,
  Frown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { cn } from '../lib/utils';
import { generatePDF } from '../lib/pdfGenerator';
import MedicineTable, { type Medication, type MedicationStatus } from '../components/MedicineTable';

// Simulated historical data for the chart
const initialHeartRateData = [
  { time: '08:00', bpm: 72 },
  { time: '09:00', bpm: 75 },
  { time: '10:00', bpm: 98 }, // The alert spike
  { time: '11:00', bpm: 82 },
  { time: '12:00', bpm: 74 },
  { time: '13:00', bpm: 71 },
  { time: '14:00', bpm: 73 },
];

type SchedulePeriod = 'Morning' | 'Afternoon' | 'Night';

type ParsedPrescriptionItem = {
  name: string;
  dose: string;
  schedule: string;
  durationDays: number;
  notes?: string;
};

type PatientProfile = {
  name: string;
  age: number;
  condition: string;
  location: string;
  photo: string;
};

type VitalsSnapshot = {
  heartRate: number;
  bloodPressure: string;
  oxygen: number;
  temp: number;
};

const defaultPatient: PatientProfile = {
  name: 'Ramen disuza',
  age: 78,
  condition: 'Hypertension & Type 2 Diabetes',
  location: 'Kitchen',
  photo: 'https://cdn.pixabay.com/photo/2016/11/21/12/54/man-1845259_1280.jpg'
};

const defaultVitals: VitalsSnapshot = {
  heartRate: 72,
  bloodPressure: '118/79',
  oxygen: 98.2,
  temp: 72.4
};

const defaultMedications: Medication[] = [
  { id: 1, name: 'Crocin 500mg', dose: '1-0-1', time: 'Morning / Night', status: 'TAKEN', quantity: 12, stockDays: 4, notes: 'After food' },
  { id: 2, name: 'BP Tablet', dose: '1-0-0', time: 'Morning', status: 'MISSED', quantity: 6, stockDays: 2, notes: 'Before breakfast' },
  { id: 3, name: 'Insulin', dose: '10 units', time: 'Afternoon', status: 'PENDING', quantity: 10, stockDays: 3, notes: 'Post-lunch' },
  { id: 4, name: 'Vitamin D', dose: '0-0-1', time: 'Night', status: 'PENDING', quantity: 18, stockDays: 6 },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([
    { id: 1, title: 'Missed Dose: Metformin', desc: 'Scheduled for 8:00 AM', type: 'missed' },
    { id: 2, title: 'Refill Follow-up Needed', desc: 'Lisinopril refill request pending since yesterday', type: 'refill' }
  ]);
  const [sentiment, setSentiment] = useState(1);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [patient, setPatient] = useState<PatientProfile>(() => {
    const stored = localStorage.getItem('dashboard_patient_profile');
    return stored ? JSON.parse(stored) : defaultPatient;
  });
  const [vitals, setVitals] = useState<VitalsSnapshot>(() => {
    const stored = localStorage.getItem('dashboard_vitals_snapshot');
    return stored ? JSON.parse(stored) : defaultVitals;
  });
  const [medications, setMedications] = useState<Medication[]>(() => {
    const stored = localStorage.getItem('dashboard_medications');
    return stored ? JSON.parse(stored) : defaultMedications;
  });
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [isMedicationModalOpen, setIsMedicationModalOpen] = useState(false);
  const [editingMedicationId, setEditingMedicationId] = useState<number | null>(null);
  const [patientDraft, setPatientDraft] = useState<PatientProfile>(defaultPatient);
  const [vitalsDraft, setVitalsDraft] = useState<VitalsSnapshot>(defaultVitals);
  const [medicationDraft, setMedicationDraft] = useState<Omit<Medication, 'id'>>({
    name: '',
    dose: '',
    time: 'Morning',
    status: 'PENDING',
    quantity: 0,
    stockDays: 0,
    notes: '',
  });
  const [medicationScheduleDraft, setMedicationScheduleDraft] = useState<SchedulePeriod[]>(['Morning']);
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [prescriptionPreview, setPrescriptionPreview] = useState<string | null>(null);
  const [parsedPrescription, setParsedPrescription] = useState<ParsedPrescriptionItem[]>([]);
  const [isScanningPrescription, setIsScanningPrescription] = useState(false);

  useEffect(() => {
    localStorage.setItem('dashboard_patient_profile', JSON.stringify(patient));
  }, [patient]);

  useEffect(() => {
    localStorage.setItem('dashboard_vitals_snapshot', JSON.stringify(vitals));
  }, [vitals]);

  useEffect(() => {
    localStorage.setItem('dashboard_medications', JSON.stringify(medications));
  }, [medications]);

  useEffect(() => {
    return () => {
      if (prescriptionPreview && prescriptionPreview.startsWith('blob:')) {
        URL.revokeObjectURL(prescriptionPreview);
      }
    };
  }, [prescriptionPreview]);

  const dismissAlert = (id: number) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    setIsAiLoading(true);
    setAiResponse(null);

    try {
      const query = aiQuery.toLowerCase();
      const lowStockMeds = medications.filter((med) => med.stockDays < 3);

      let response = `Current home log for ${patient.name}: HR ${vitals.heartRate} bpm, BP ${vitals.bloodPressure}, O₂ ${vitals.oxygen}%, Temp ${vitals.temp}°F.`;

      if (query.includes('stock') || query.includes('refill')) {
        response = lowStockMeds.length
          ? `Low stock warning: ${lowStockMeds.map((m) => `${m.name} (${m.stockDays} day${m.stockDays === 1 ? '' : 's'} left)`).join(', ')}. Please arrange refill today.`
          : 'All medicines currently have sufficient stock.';
      } else if (query.includes('bp') || query.includes('blood pressure')) {
        response = `Latest blood pressure for ${patient.name} is ${vitals.bloodPressure} mmHg from manual caregiver entry.`;
      } else if (query.includes('heartbeat') || query.includes('heart rate') || query.includes('pulse')) {
        response = `Latest heartbeat is ${vitals.heartRate} bpm. Continue periodic manual checks every 4-6 hours.`;
      } else if (query.includes('schedule') || query.includes('medicine') || query.includes('medication')) {
        response = `Today's schedule: ${medications
          .map((m) => `${m.name} ${m.dose} at ${m.time} (${m.status})`)
          .join('; ')}.`;
      }

      setAiResponse(response);
    } catch (error) {
      console.error('AI Error:', error);
      setAiResponse('Unable to process at the moment. Please try again.');
    } finally {
      setIsAiLoading(false);
      setAiQuery('');
    }
  };

  const handleDownloadDoctorReport = () => {
    const takenCount = medications.filter((med) => med.status === 'TAKEN').length;
    const missedDoses = medications.filter((med) => med.status === 'MISSED');
    const lowStockMeds = medications.filter((med) => med.stockDays < 3);
    const adherence = medications.length ? Math.round((takenCount / medications.length) * 100) : 0;
    const exportTime = new Date().toLocaleString();

    const content: string[] = [
      `Patient: ${patient.name}`,
      `Age: ${patient.age} years`,
      `Condition: ${patient.condition}`,
      `Current Location: ${patient.location}`,
      `Snapshot Time: ${exportTime}`,
      '',
      'Latest Vitals:',
      `- Heart Rate: ${vitals.heartRate} bpm`,
      `- Blood Pressure: ${vitals.bloodPressure} mmHg`,
      `- Oxygen Level: ${vitals.oxygen}%`,
      `- Temperature: ${vitals.temp}°F`,
      '',
      `Medication Adherence (Today): ${adherence}%`,
      '',
      'Missed Doses:',
    ];

    if (missedDoses.length === 0) {
      content.push('- None');
    } else {
      missedDoses.forEach((med) => {
        content.push(`- ${med.name} ${med.dose} at ${med.time}`);
      });
    }

    content.push('', 'Low-Stock Medicines:');

    if (lowStockMeds.length === 0) {
      content.push('- None');
    } else {
      lowStockMeds.forEach((med) => {
        content.push(`- ${med.name}: ${med.quantity} units, ~${med.stockDays} day(s) left`);
      });
    }

    content.push('', 'Generated from caregiver dashboard manual entries.');

    generatePDF(
      'Doctor-Ready Care Summary',
      content,
      `Doctor_Summary_${patient.name.replace(/\s+/g, '_')}`
    );
  };

  const handleDownloadAlert = (alert: { id: number; title: string; desc: string; type: string }) => {
    generatePDF(
      'Alert Incident Record',
      [
        `Alert ID: #${alert.id}`,
        `Title: ${alert.title}`,
        `Description: ${alert.desc}`,
        `Type: ${alert.type}`,
        `Patient: ${patient.name}`,
        '',
        'This incident has been recorded in the dashboard.',
        'Generated on: ' + new Date().toLocaleString()
      ],
      `Alert_Record_${alert.id}`
    );
  };

  const openPatientEditor = () => {
    setPatientDraft(patient);
    setIsPatientModalOpen(true);
  };

  const savePatientProfile = () => {
    setPatient(patientDraft);
    setIsPatientModalOpen(false);
  };

  const openVitalsEditor = () => {
    setVitalsDraft(vitals);
    setIsVitalsModalOpen(true);
  };

  const saveVitals = () => {
    setVitals({
      ...vitalsDraft,
      heartRate: Number(vitalsDraft.heartRate),
      oxygen: Number(vitalsDraft.oxygen),
      temp: Number(vitalsDraft.temp),
    });
    setIsVitalsModalOpen(false);
  };

  const openAddMedication = () => {
    setEditingMedicationId(null);
    setMedicationDraft({
      name: '',
      dose: '',
      time: 'Morning',
      status: 'PENDING',
      quantity: 0,
      stockDays: 0,
      notes: '',
    });
    setMedicationScheduleDraft(['Morning']);
    setIsMedicationModalOpen(true);
  };

  const openEditMedication = (medication: Medication) => {
    const derivedSchedule = (['Morning', 'Afternoon', 'Night'] as SchedulePeriod[]).filter((slot) => medication.time.includes(slot));
    setEditingMedicationId(medication.id);
    setMedicationDraft({
      name: medication.name,
      dose: medication.dose,
      time: medication.time,
      status: medication.status,
      quantity: medication.quantity,
      stockDays: medication.stockDays,
      notes: medication.notes || '',
    });
    setMedicationScheduleDraft(derivedSchedule.length ? derivedSchedule : ['Morning']);
    setIsMedicationModalOpen(true);
  };

  const handleRefillNow = (med: Medication) => {
    generatePDF(
      'Urgent Refill Request',
      [
        `Medication: ${med.name}`,
        `Dosage: ${med.dose}`,
        `Current Stock: ${med.quantity} units, ${med.stockDays} day(s) left`,
        `Patient: ${patient.name}`,
        '',
        'URGENT: Stock is below safety threshold.',
        'Please process this refill immediately.'
      ],
      `Urgent_Refill_${med.name.replace(/\s+/g, '_')}`
    );
  };

  const saveMedication = () => {
    if (!medicationDraft.name.trim() || !medicationDraft.dose.trim()) return;

    const scheduleText = medicationScheduleDraft.length ? medicationScheduleDraft.join(' / ') : 'Morning';
    const normalizedMedication = {
      ...medicationDraft,
      time: scheduleText,
      quantity: Number(medicationDraft.quantity),
      stockDays: Number(medicationDraft.stockDays),
    };

    if (editingMedicationId !== null) {
      setMedications((prev) =>
        prev.map((med) =>
          med.id === editingMedicationId
            ? { ...med, ...normalizedMedication }
            : med
        )
      );
    } else {
      setMedications((prev) => [
        ...prev,
        {
          id: Date.now(),
          ...normalizedMedication,
        },
      ]);
    }
    setIsMedicationModalOpen(false);
  };

  const toggleMedicationSchedule = (slot: SchedulePeriod) => {
    setMedicationScheduleDraft((prev) => {
      if (prev.includes(slot)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== slot);
      }
      return [...prev, slot];
    });
  };

  const takenCount = medications.filter((med) => med.status === 'TAKEN').length;
  const adherenceRatio = `${takenCount}/${medications.length}`;
  const adherencePercent = medications.length ? Math.round((takenCount / medications.length) * 100) : 0;

  const handlePrescriptionFile = (file: File | null) => {
    if (!file) return;

    if (prescriptionPreview && prescriptionPreview.startsWith('blob:')) {
      URL.revokeObjectURL(prescriptionPreview);
    }

    setPrescriptionFile(file);
    setParsedPrescription([]);

    if (file.type.startsWith('image/')) {
      setPrescriptionPreview(URL.createObjectURL(file));
    } else {
      setPrescriptionPreview(null);
    }
  };

  const handleScanPrescription = async () => {
    if (!prescriptionFile) return;

    setIsScanningPrescription(true);
    await new Promise((resolve) => setTimeout(resolve, 900));

    const fileName = prescriptionFile.name.toLowerCase();
    const extracted: ParsedPrescriptionItem[] = [];

    if (fileName.includes('insulin')) {
      extracted.push({ name: 'Insulin', dose: '10 units', schedule: 'Afternoon', durationDays: 14, notes: 'Post-lunch' });
    }
    if (fileName.includes('crocin') || fileName.includes('paracetamol')) {
      extracted.push({ name: 'Crocin 500mg', dose: '1-0-1', schedule: 'Morning / Night', durationDays: 5, notes: 'After food' });
    }
    if (fileName.includes('bp') || fileName.includes('amlodipine')) {
      extracted.push({ name: 'BP Tablet', dose: '1-0-0', schedule: 'Morning', durationDays: 30, notes: 'Before breakfast' });
    }

    if (extracted.length === 0) {
      extracted.push(
        { name: 'Vitamin D', dose: '0-0-1', schedule: 'Night', durationDays: 30, notes: 'After dinner' },
        { name: 'Paracetamol', dose: '650mg', schedule: 'Morning / Night', durationDays: 3, notes: 'If fever persists' }
      );
    }

    setParsedPrescription(extracted);
    setIsScanningPrescription(false);
  };

  const handleAutoAddPrescription = () => {
    if (parsedPrescription.length === 0) return;

    const additions: Medication[] = parsedPrescription.map((item, index) => ({
      id: Date.now() + index,
      name: item.name,
      dose: item.dose,
      time: item.schedule,
      status: 'PENDING',
      quantity: Math.max(item.durationDays, 1),
      stockDays: item.durationDays,
      notes: item.notes || 'Imported from prescription scan',
    }));

    setMedications((prev) => [...prev, ...additions]);
    setAlerts((prev) => [
      {
        id: Date.now(),
        title: 'Prescription imported',
        desc: `${additions.length} medicine(s) added to schedule`,
        type: 'prescription',
      },
      ...prev,
    ]);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Dashboard Top Row: Patient Vitals & Critical Alerts */}
      <div className="grid grid-cols-12 gap-6">
        {/* Patient Overview Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-12 lg:col-span-8 bg-surface-container-lowest border border-emerald-100 rounded-2xl p-8 shadow-sm flex flex-col md:flex-row gap-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Activity className="w-32 h-32 text-primary" />
          </div>
          
          <div className="relative w-40 h-40 flex-shrink-0 mx-auto md:mx-0 group">
            <img 
              alt="Patient Avatar" 
              className="w-full h-full object-cover rounded-2xl shadow-lg group-hover:scale-105 transition-transform duration-500" 
              src={patient.photo}
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-3 -right-3 bg-primary text-on-primary px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest shadow-xl animate-bounce">STABLE</div>
          </div>
          
          <div className="flex-1">
            <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4">
              <div>
                <h2 className="text-3xl font-black text-on-surface tracking-tight">{patient.name}</h2>
                <p className="text-secondary font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  {patient.age} years • {patient.condition}
                </p>
              </div>
              <div className="text-left md:text-right">
                <span className="text-xs font-bold text-outline uppercase tracking-widest">Last Activity</span>
                <p className="text-lg font-black text-primary">14 mins ago <span className="text-sm font-medium text-secondary">in {patient.location}</span></p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-5">
              <button
                onClick={openPatientEditor}
                className="px-4 py-2 rounded-xl bg-surface-container-low border border-surface-variant/30 text-[11px] font-black uppercase tracking-widest hover:bg-surface-container transition-colors"
              >
                Edit Patient
              </button>
              <button
                onClick={openVitalsEditor}
                className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-[11px] font-black uppercase tracking-widest hover:bg-primary/20 transition-colors"
              >
                Update BP / Heartbeat
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Heart Rate', value: vitals.heartRate, unit: 'bpm', icon: Heart, color: 'text-tertiary' },
                { label: 'Blood Pressure', value: vitals.bloodPressure, unit: 'mmHg', icon: Activity, color: 'text-primary' },
                { label: 'Oxygen', value: vitals.oxygen, unit: '%', icon: Wind, color: 'text-blue-500' },
                { label: 'Temp', value: vitals.temp, unit: '°F', icon: Thermometer, color: 'text-orange-500' },
              ].map((v, i) => (
                <div key={i} className="bg-surface-container-low p-3 rounded-xl border border-surface-variant/20">
                  <div className="flex items-center gap-2 mb-1">
                    <v.icon className={cn("w-3 h-3", v.color)} />
                    <span className="text-[10px] font-bold text-secondary uppercase">{v.label}</span>
                  </div>
                  <p className="text-lg font-black">{v.value}<span className="text-[10px] ml-0.5 opacity-50">{v.unit}</span></p>
                </div>
              ))}
            </div>

            <div className="mb-6 bg-surface-container-low p-4 rounded-xl border border-surface-variant/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-secondary">Today's adherence</span>
                <span className="text-xs font-black text-primary">{adherenceRatio}</span>
              </div>
              <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${adherencePercent}%` }}></div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button 
                onClick={() => console.log('Initiating call...')}
                className="py-3 bg-primary text-on-primary rounded-xl font-black flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 text-sm"
              >
                <Phone className="w-4 h-4" /> CALL NOW
              </button>
              <button 
                onClick={() => console.log('Opening message center...')}
                className="py-3 bg-secondary-container text-on-secondary-container rounded-xl font-black flex items-center justify-center gap-2 hover:bg-emerald-200 transition-all text-sm active:scale-95"
              >
                <MessageSquare className="w-4 h-4" /> MESSAGE
              </button>
              <button
                onClick={() => navigate('/logs')}
                className="py-3 bg-surface-container-low border border-surface-variant/30 text-on-surface rounded-xl font-black flex items-center justify-center gap-2 hover:bg-surface-container transition-all text-sm active:scale-95"
              >
                <AlertCircle className="w-4 h-4" /> SOS HISTORY
              </button>
            </div>
          </div>
        </motion.div>

        {/* Alerts Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="col-span-12 lg:col-span-4 bg-tertiary-container text-white rounded-2xl p-8 relative overflow-hidden flex flex-col justify-between shadow-xl"
        >
          <div className="absolute -top-4 -right-4 p-4 opacity-10">
            <AlertCircle className="w-32 h-32" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-white/20 rounded-lg animate-pulse">
                <AlertCircle className="w-6 h-6 fill-white/20" />
              </div>
              <h3 className="font-black text-xl tracking-tight">Active Alerts</h3>
            </div>
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {alerts.length > 0 ? (
                  alerts.map((alert) => (
                    <motion.div 
                      key={alert.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-lg"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <p className="text-sm font-black mb-0.5">{alert.title}</p>
                          <p className="text-xs opacity-70 leading-relaxed">{alert.desc}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => dismissAlert(alert.id)}
                            className="text-[10px] bg-white text-tertiary px-3 py-1.5 rounded-lg font-black hover:bg-red-50 transition-colors shadow-sm"
                          >
                            DISMISS
                          </button>
                          <button 
                            onClick={() => handleDownloadAlert(alert)}
                            className="text-[10px] bg-white/20 px-3 py-1.5 rounded-lg hover:bg-white/30 transition-colors flex items-center justify-center"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8"
                  >
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-sm font-bold opacity-70 italic">All systems normal.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <button 
            onClick={handleDownloadDoctorReport}
            className="mt-8 w-full bg-white text-tertiary font-black py-4 rounded-xl hover:bg-red-50 transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-xl"
          >
            <Download className="w-5 h-5" />
            DOCTOR EXPORT PDF
          </button>
        </motion.div>
      </div>

      {/* Bento Grid Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Medicine & Charts */}
        <div className="col-span-12 xl:col-span-8 space-y-6">
          {/* Heart Rate Chart */}
          <div className="bg-surface-container-lowest border border-emerald-100 rounded-2xl p-8 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-black text-on-surface tracking-tight">Heart Rate Trends</h3>
                <p className="text-xs text-secondary font-medium">Based on manually entered home logs</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-container/10 rounded-lg">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-xs font-black text-primary">+2.4% <span className="opacity-50 font-medium">vs yesterday</span></span>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={initialHeartRateData}>
                  <defs>
                    <linearGradient id="colorBpm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#006d4e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#006d4e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="time" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#666' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#666' }}
                    domain={['dataMin - 10', 'dataMax + 10']}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      fontWeight: 800
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="bpm" 
                    stroke="#006d4e" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorBpm)" 
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Medicine Table */}
          <MedicineTable
            medications={medications}
            onAddMedicine={openAddMedication}
            onEditMedicine={openEditMedication}
            onRefillNow={handleRefillNow}
          />
        </div>

        {/* Right Column: Support, Stats & AI */}
        <div className="col-span-12 xl:col-span-4 space-y-6">
          {/* Care Assistant AI */}
          <div className="bg-surface-container-lowest border border-emerald-100 rounded-2xl p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Sparkles className="w-24 h-24 text-primary" />
            </div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-black text-xl text-on-surface tracking-tight">Care Assistant AI</h3>
            </div>
            
            <AnimatePresence mode="wait">
              {aiResponse ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-primary/5 rounded-2xl p-5 mb-6 border border-primary/10"
                >
                  <p className="text-sm text-on-surface leading-relaxed font-medium">
                    {aiResponse}
                  </p>
                  <button 
                    onClick={() => setAiResponse(null)}
                    className="mt-4 text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                  >
                    Ask another question
                  </button>
                </motion.div>
              ) : (
                <div className="bg-surface-container-low rounded-2xl p-5 mb-6 border border-surface-variant/20 italic">
                  <p className="text-xs text-secondary leading-relaxed">
                    {`I can summarize ${patient.name}'s vitals, medicine schedule, and refill risks from your manual entries.`}
                  </p>
                </div>
              )}
            </AnimatePresence>

            <form onSubmit={handleAiSubmit} className="relative">
              <input 
                className="w-full bg-surface-container-low border-none rounded-2xl py-4 px-6 pr-14 text-sm font-bold focus:ring-2 focus:ring-primary shadow-inner" 
                placeholder={isAiLoading ? "Analyzing data..." : "Ask me anything..."} 
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                disabled={isAiLoading}
              />
              <button 
                type="submit" 
                disabled={isAiLoading || !aiQuery.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary text-on-primary rounded-xl flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50 disabled:scale-100"
              >
                {isAiLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>

          {/* Prescription Upload */}
          <div className="bg-surface-container-lowest border border-emerald-100 rounded-2xl p-8 shadow-sm">
            <h3 className="font-black text-xl text-on-surface tracking-tight mb-5">Prescription Scan</h3>

            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handlePrescriptionFile(e.dataTransfer.files?.[0] || null);
              }}
              className="block border-2 border-dashed border-primary/50 rounded-2xl p-6 text-center cursor-pointer bg-primary/5 hover:bg-primary/10 transition-colors"
            >
              <Upload className="w-8 h-8 text-primary mx-auto mb-3" />
              <p className="text-sm font-black text-on-surface">Upload prescription image or PDF</p>
              <p className="text-[11px] text-secondary mt-1">Click or drag file here</p>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => handlePrescriptionFile(e.target.files?.[0] || null)}
              />
            </label>

            {prescriptionFile && (
              <div className="mt-4 bg-surface-container-low rounded-xl p-4 border border-surface-variant/20">
                {prescriptionPreview ? (
                  <img src={prescriptionPreview} alt="Prescription preview" className="w-full h-40 object-cover rounded-lg mb-3" />
                ) : (
                  <p className="text-xs font-bold text-secondary mb-3">Selected file: {prescriptionFile.name}</p>
                )}

                <button
                  onClick={handleScanPrescription}
                  disabled={isScanningPrescription}
                  className="w-full py-2.5 rounded-xl bg-primary text-on-primary text-xs font-black uppercase tracking-widest disabled:opacity-60"
                >
                  {isScanningPrescription ? 'Scanning...' : 'Scan with AI'}
                </button>
              </div>
            )}

            {parsedPrescription.length > 0 && (
              <div className="mt-4 bg-primary/5 rounded-xl p-4 border border-primary/20">
                <p className="text-xs font-black uppercase tracking-wider text-primary mb-2">AI Insight</p>
                <div className="space-y-2">
                  {parsedPrescription.map((item, idx) => (
                    <div key={idx} className="text-xs text-on-surface">
                      <span className="font-black">{item.name}</span> • {item.dose} • {item.schedule} • {item.durationDays} day(s)
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleAutoAddPrescription}
                  className="mt-4 w-full py-2.5 rounded-xl bg-primary text-on-primary text-xs font-black uppercase tracking-widest"
                >
                  Auto-Add Medications
                </button>
              </div>
            )}
          </div>

          {/* Caregiver Wellness */}
          <div className="bg-surface-container-lowest border border-emerald-100 rounded-2xl p-8 shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-black text-xl text-on-surface tracking-tight">Caregiver Wellness</h3>
                <p className="text-xs text-secondary font-medium">Monitoring your personal fatigue levels</p>
              </div>
              <div className="p-2 bg-primary/10 rounded-xl">
                <Heart className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="mb-8">
              <p className="text-sm font-black mb-4">How are you feeling today?</p>
              <div className="flex justify-between gap-3">
                {[
                  { icon: Laugh, label: 'Great' },
                  { icon: Smile, label: 'Good' },
                  { icon: Meh, label: 'Okay' },
                  { icon: Frown, label: 'Tired' }
                ].map((s, i) => (
                  <button 
                    key={i}
                    onClick={() => setSentiment(i)}
                    className={cn(
                      "flex-1 py-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 border-2",
                      sentiment === i 
                        ? "bg-primary text-on-primary border-primary shadow-lg shadow-primary/20" 
                        : "bg-surface-container-low border-transparent hover:border-primary/20"
                    )}
                  >
                    <s.icon className="w-6 h-6" />
                    <span className="text-[8px] font-black uppercase tracking-widest">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* Chart Placeholder */}
            <div className="h-24 w-full flex items-end justify-between gap-1.5 px-2">
              {[0.5, 0.75, 0.66, 0.8, 0.5, 0.9, 0.75].map((h, i) => (
                <motion.div 
                  key={i} 
                  initial={{ height: 0 }}
                  animate={{ height: `${h * 100}%` }}
                  transition={{ delay: i * 0.1, duration: 1 }}
                  className="w-full bg-primary/20 rounded-t-lg relative group"
                >
                  <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg"></div>
                </motion.div>
              ))}
            </div>
            <div className="flex justify-between text-[9px] font-black text-outline mt-3 uppercase tracking-widest px-1">
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>
          </div>

          {/* Room Environment */}
          <div className="bg-surface-container-low rounded-2xl p-8 shadow-inner">
            <h3 className="font-black text-xl text-on-surface tracking-tight mb-6">Room Environment</h3>
            <div className="space-y-6">
              {[
                { icon: Thermometer, label: 'Temperature', value: '72°F', status: 'Optimal', color: 'text-orange-500' },
                { icon: Wind, label: 'Air Quality', value: 'Excellent', status: 'Clean', color: 'text-primary' },
                { icon: Moon, label: 'Last Sleep Cycle', value: '7h 20m', status: 'Deep', color: 'text-blue-500' },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center bg-white/50 p-3 rounded-xl border border-white">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg bg-white shadow-sm", item.color)}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-secondary uppercase tracking-widest">{item.label}</p>
                      <p className="text-sm font-black">{item.value}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-black px-2 py-1 bg-primary/10 text-primary rounded-lg uppercase tracking-widest">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isPatientModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-surface-container-lowest rounded-2xl p-6 border border-surface-variant/30 shadow-2xl">
            <h3 className="text-xl font-black mb-4">Edit Patient Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="bg-surface-container-low rounded-xl px-4 py-3 text-sm font-medium" placeholder="Patient Name" value={patientDraft.name} onChange={(e) => setPatientDraft((prev) => ({ ...prev, name: e.target.value }))} />
              <input className="bg-surface-container-low rounded-xl px-4 py-3 text-sm font-medium" placeholder="Age" type="number" value={patientDraft.age} onChange={(e) => setPatientDraft((prev) => ({ ...prev, age: Number(e.target.value) }))} />
              <input className="bg-surface-container-low rounded-xl px-4 py-3 text-sm font-medium md:col-span-2" placeholder="Condition" value={patientDraft.condition} onChange={(e) => setPatientDraft((prev) => ({ ...prev, condition: e.target.value }))} />
              <input className="bg-surface-container-low rounded-xl px-4 py-3 text-sm font-medium" placeholder="Current Location" value={patientDraft.location} onChange={(e) => setPatientDraft((prev) => ({ ...prev, location: e.target.value }))} />
              <input className="bg-surface-container-low rounded-xl px-4 py-3 text-sm font-medium" placeholder="Profile Image URL" value={patientDraft.photo} onChange={(e) => setPatientDraft((prev) => ({ ...prev, photo: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="px-4 py-2 rounded-xl bg-surface-container-low font-black text-xs uppercase" onClick={() => setIsPatientModalOpen(false)}>Cancel</button>
              <button className="px-4 py-2 rounded-xl bg-primary text-on-primary font-black text-xs uppercase" onClick={savePatientProfile}>Save</button>
            </div>
          </div>
        </div>
      )}

      {isVitalsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface-container-lowest rounded-2xl p-6 border border-surface-variant/30 shadow-2xl">
            <h3 className="text-xl font-black mb-4">Update Vitals</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="bg-surface-container-low rounded-xl px-4 py-3 text-sm font-medium" placeholder="Heart Rate (bpm)" type="number" value={vitalsDraft.heartRate} onChange={(e) => setVitalsDraft((prev) => ({ ...prev, heartRate: Number(e.target.value) }))} />
              <input className="bg-surface-container-low rounded-xl px-4 py-3 text-sm font-medium" placeholder="Blood Pressure" value={vitalsDraft.bloodPressure} onChange={(e) => setVitalsDraft((prev) => ({ ...prev, bloodPressure: e.target.value }))} />
              <input className="bg-surface-container-low rounded-xl px-4 py-3 text-sm font-medium" placeholder="Oxygen (%)" type="number" step="0.1" value={vitalsDraft.oxygen} onChange={(e) => setVitalsDraft((prev) => ({ ...prev, oxygen: Number(e.target.value) }))} />
              <input className="bg-surface-container-low rounded-xl px-4 py-3 text-sm font-medium" placeholder="Temperature (°F)" type="number" step="0.1" value={vitalsDraft.temp} onChange={(e) => setVitalsDraft((prev) => ({ ...prev, temp: Number(e.target.value) }))} />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="px-4 py-2 rounded-xl bg-surface-container-low font-black text-xs uppercase" onClick={() => setIsVitalsModalOpen(false)}>Cancel</button>
              <button className="px-4 py-2 rounded-xl bg-primary text-on-primary font-black text-xs uppercase" onClick={saveVitals}>Save</button>
            </div>
          </div>
        </div>
      )}

      {isMedicationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-surface-container-lowest rounded-2xl p-6 border border-surface-variant/30 shadow-2xl">
            <h3 className="text-xl font-black mb-4">{editingMedicationId ? 'Edit Medicine' : 'Add Medicine'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="bg-surface-container-low rounded-xl px-4 py-3 text-sm font-medium" placeholder="Medicine Name" value={medicationDraft.name} onChange={(e) => setMedicationDraft((prev) => ({ ...prev, name: e.target.value }))} />
              <input className="bg-surface-container-low rounded-xl px-4 py-3 text-sm font-medium" placeholder="Dosage (e.g. 500mg / 1-0-1)" value={medicationDraft.dose} onChange={(e) => setMedicationDraft((prev) => ({ ...prev, dose: e.target.value }))} />
              <div className="md:col-span-2">
                <p className="text-[11px] font-black text-secondary uppercase tracking-wider mb-2">Schedule</p>
                <div className="flex flex-wrap gap-2">
                  {(['Morning', 'Afternoon', 'Night'] as SchedulePeriod[]).map((slot) => {
                    const selected = medicationScheduleDraft.includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => toggleMedicationSchedule(slot)}
                        className={cn(
                          'px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-colors',
                          selected
                            ? 'bg-primary text-on-primary border-primary'
                            : 'bg-surface-container-low text-secondary border-surface-variant/30 hover:bg-surface-container'
                        )}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
              <input className="bg-surface-container-low rounded-xl px-4 py-3 text-sm font-medium" type="number" placeholder="Quantity" value={medicationDraft.quantity} onChange={(e) => setMedicationDraft((prev) => ({ ...prev, quantity: Number(e.target.value) }))} />
              <input className="bg-surface-container-low rounded-xl px-4 py-3 text-sm font-medium" type="number" placeholder="Duration in days" value={medicationDraft.stockDays} onChange={(e) => setMedicationDraft((prev) => ({ ...prev, stockDays: Number(e.target.value) }))} />
              <select className="bg-surface-container-low rounded-xl px-4 py-3 text-sm font-medium" value={medicationDraft.status} onChange={(e) => setMedicationDraft((prev) => ({ ...prev, status: e.target.value as MedicationStatus }))}>
                <option value="PENDING">PENDING</option>
                <option value="TAKEN">TAKEN</option>
                <option value="MISSED">MISSED</option>
              </select>
              <textarea className="bg-surface-container-low rounded-xl px-4 py-3 text-sm font-medium md:col-span-2 min-h-24" placeholder="Notes" value={medicationDraft.notes || ''} onChange={(e) => setMedicationDraft((prev) => ({ ...prev, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="px-4 py-2 rounded-xl bg-surface-container-low font-black text-xs uppercase" onClick={() => setIsMedicationModalOpen(false)}>Cancel</button>
              <button className="px-4 py-2 rounded-xl bg-primary text-on-primary font-black text-xs uppercase" onClick={saveMedication}>Add to Schedule</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Contextual FAB */}
      <button 
        onClick={openAddMedication}
        className="fixed bottom-8 right-8 w-16 h-16 bg-primary text-on-primary rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 hover:rotate-90 active:scale-95 transition-all z-50 group"
      >
        <Plus className="w-8 h-8 group-hover:scale-110 transition-transform" />
      </button>
    </div>
  );
}
