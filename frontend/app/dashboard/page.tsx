'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CalendarDays, ChevronRight, Filter, HeartPulse, MessageSquare, MoreVertical, PhoneCall, Pill, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { simulateAiParse } from '@/lib/api';
import { useCareStore } from '@/store/useCareStore';

export default function DashboardPage() {
  const router = useRouter();
  const [aiInput, setAiInput] = useState('');
  const [sendingAi, setSendingAi] = useState(false);
  const {
    patient,
    burnout,
    caretakers,
    medicines,
    alerts,
    dismissAlert,
    setParsedInsight,
    updateMedicineStatus
  } = useCareStore();

  if (!patient) {
    return null;
  }

  const previewMedicines = medicines.slice(0, 3);
  const activeAlerts = alerts.filter((alert) => !alert.dismissed);
  const wellbeingBars = burnout.map((item) => item.score);
  const displayedMedicines = useMemo(
    () =>
      previewMedicines.map((medicine) => ({
        ...medicine,
        statusLabel:
          medicine.status === 'taken' ? 'Completed' : medicine.status === 'missed' ? 'Upcoming' : 'Scheduled',
        timeLabel:
          medicine.status === 'taken' ? `Logged: ${medicine.time} | Night Routine` : medicine.status === 'missed' ? `Due: ${medicine.time} | Post Lunch` : `Next: ${medicine.time} | Morning Routine`
      })),
    [previewMedicines]
  );

  const handleAiSend = async () => {
    if (!aiInput.trim()) {
      toast.error('Enter a care instruction first');
      return;
    }

    setSendingAi(true);
    try {
      const parsed = await simulateAiParse(aiInput);
      setParsedInsight(parsed);
      toast.success('AI note parsed');
      router.push('/dashboard/logs');
    } catch {
      toast.error('Unable to parse care note');
    } finally {
      setSendingAi(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-8">
      <section className="col-span-12 space-y-8 lg:col-span-4">
        <div className="glass-panel vital-glow rounded-xl bg-[#1a211f]/40 p-8 shadow-[0_12px_32px_rgba(0,0,0,0.4)]">
          <div className="mb-8 flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-xl bg-[#1f2b26] text-2xl font-bold text-[#68dbae]">
                {patient.avatar}
                <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-4 border-[#0e1513] bg-[#68dbae]" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-ink">{patient.name}</h2>
                <span className="mt-1 inline-flex rounded bg-[#295043]/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#a5d0bf]">
                  Status: Stable
                </span>
              </div>
            </div>
            <button
              type="button"
              className="text-white/40 hover:text-[#68dbae]"
              aria-label="More patient actions"
              onClick={() => toast('Patient controls opened')}
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-8 grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-[#161d1b] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">Adherence</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-2xl font-bold text-[#68dbae]">{patient.adherence}%</span>
              </div>
            </div>
            <div className="rounded-lg bg-[#161d1b] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">Heart Rate</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-2xl font-bold text-ink">
                  72 <span className="text-xs font-normal text-white/45">BPM</span>
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              className="button-primary flex w-full items-center justify-center gap-2 rounded-xl py-3"
              onClick={() => toast.success(`Starting consultation with ${patient.name}`)}
            >
              <Video className="h-4 w-4" />
              Initiate Video Consultation
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="button-secondary flex items-center justify-center gap-2 rounded-xl py-3"
                onClick={() => toast.success(`Calling ${patient.name}`)}
              >
                <PhoneCall className="h-4 w-4" />
                Call
              </button>
              <button
                type="button"
                className="button-secondary flex items-center justify-center gap-2 rounded-xl py-3"
                onClick={() => toast.success('Secure message opened')}
              >
                <MessageSquare className="h-4 w-4" />
                Message
              </button>
            </div>
            <Link href="/dashboard/logs" className="button-secondary flex w-full items-center justify-center rounded-xl py-3">
              Request Vitals Update
            </Link>
          </div>
        </div>

        <div className="card p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-white/60">Caregiver Well-being</h3>
            <span className="rounded bg-[#68dbae]/10 px-2 py-0.5 text-[10px] font-bold text-[#68dbae]">Optimal</span>
          </div>
          <div className="mb-4 flex h-24 items-end gap-1">
            {wellbeingBars.map((score, index) => (
              <div
                key={`${score}-${index}`}
                className="w-full rounded-t-sm bg-[#68dbae]"
                style={{ height: `${Math.max(28, score)}%`, opacity: 0.25 + index * 0.08 }}
              />
            ))}
          </div>
          <p className="text-xs italic leading-relaxed text-white/55">
            &quot;Your mood has remained consistent. Focus on hydration today for better mental clarity.&quot;
          </p>
        </div>

        <div className="card p-6">
          <h3 className="mb-6 text-sm font-bold uppercase tracking-[0.14em] text-white/60">Backup Network</h3>
          <div className="flex -space-x-3 overflow-hidden">
            {caretakers.slice(0, 3).map((caretaker) => (
              <div
                key={caretaker.id}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full ring-4 ring-[#1a211f] bg-[#242b29] text-[10px] font-bold text-[#68dbae]"
                title={caretaker.name}
              >
                {caretaker.name
                  .split(' ')
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)}
              </div>
            ))}
            <div className="flex h-10 w-10 items-center justify-center rounded-full ring-4 ring-[#1a211f] bg-[#2f3634] text-[10px] font-bold text-[#68dbae]">
              +{Math.max(0, caretakers.length - 3)}
            </div>
          </div>
        </div>
      </section>

      <section className="col-span-12 space-y-8 lg:col-span-8">
        <div className="flex items-center justify-between rounded-xl border border-red-500/10 bg-[#2a1313]/30 p-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-red-500 opacity-25 animate-ping" />
              <Bell className="relative z-10 h-8 w-8 text-red-400" />
            </div>
            <div>
              <h3 className="font-bold text-red-200">{activeAlerts.length} High-Priority Alert{activeAlerts.length === 1 ? '' : 's'}</h3>
              <p className="text-xs tracking-tight text-red-200/60">
                {activeAlerts[0]?.message ?? 'No critical issues require immediate action.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-xl border border-red-500/30 bg-red-500/20 px-6 py-2 text-xs font-bold uppercase tracking-[0.16em] text-red-300"
            onClick={() => {
              const firstAlert = activeAlerts[0];
              if (!firstAlert) {
                toast('No active alert to acknowledge');
                return;
              }
              dismissAlert(firstAlert.id);
              toast.success('Alert acknowledged');
            }}
          >
            Acknowledge
          </button>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-[#242b29] p-8">
          <div className="absolute right-4 top-2 opacity-5">
            <span className="text-[120px] font-black text-white">AI</span>
          </div>
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-[#68dbae]">
            <HeartPulse className="h-4 w-4" /> AI Care Assistant
          </h3>
          <div className="relative">
            <input
              value={aiInput}
              onChange={(event) => setAiInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void handleAiSend();
                }
              }}
              className="w-full rounded-xl bg-[#1a211f] py-4 pl-6 pr-16 text-sm text-ink placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#68dbae]/40"
              placeholder="E.g. 'Log 500mg Paracetamol for Elara' or 'Review yesterday's trends'"
              type="text"
            />
            <button
              type="button"
              disabled={sendingAi}
              onClick={() => void handleAiSend()}
              className="button-primary absolute bottom-2 right-3 top-2 flex aspect-square items-center justify-center rounded-lg px-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 flex gap-4 text-[10px] text-white/40">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#68dbae]/40" />
              Natural Language Enabled
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#68dbae]/40" />
              Voice Input Ready
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="text-xl font-extrabold tracking-tight text-ink">Daily Regiment</h3>
              <p className="mt-1 text-xs text-white/45">Current view: today&apos;s live medication schedule</p>
            </div>
            <div className="flex gap-2">
              <Link href="/dashboard/logs" className="rounded-lg bg-[#242b29] p-2 text-white/55 transition hover:text-[#68dbae]">
                <Filter className="h-4 w-4" />
              </Link>
              <Link href="/dashboard/logs" className="rounded-lg bg-[#242b29] p-2 text-white/55 transition hover:text-[#68dbae]">
                <CalendarDays className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            {displayedMedicines.map((medicine) => (
              <article
                key={medicine.id}
                className={`group flex items-center justify-between rounded-xl p-5 transition duration-200 ${
                  medicine.status === 'taken' ? 'bg-[#1a211f]/40 opacity-60' : 'bg-[#1a211f] hover:bg-[#242b29]'
                }`}
              >
                <div className="flex items-center gap-5">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      medicine.status === 'missed'
                        ? 'bg-orange-500/10 text-orange-400'
                        : medicine.status === 'taken'
                          ? 'bg-[#242b29] text-white/35'
                          : 'bg-[#68dbae]/10 text-[#68dbae]'
                    }`}
                  >
                    <Pill className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${medicine.status === 'taken' ? 'line-through' : ''}`}>
                      {medicine.name} <span className="font-normal text-white/35">{medicine.dosage}</span>
                    </h4>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/40">
                      {medicine.timeLabel}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">Status</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      medicine.status === 'taken'
                        ? 'bg-[#68dbae]/10 text-[#68dbae]'
                        : medicine.status === 'missed'
                          ? 'bg-orange-500/10 text-orange-300'
                        : 'bg-[#242b29] text-white/55'
                    }`}
                  >
                    {medicine.statusLabel}
                  </span>
                  {medicine.status !== 'taken' ? (
                    <button
                      type="button"
                      className="rounded-lg bg-[#68dbae] p-2 text-[#003827] opacity-100 transition group-hover:scale-105"
                      onClick={async () => {
                        try {
                          await updateMedicineStatus(medicine.id, 'taken');
                          toast.success(`${medicine.name} marked as completed`);
                        } catch {
                          toast.error('Unable to sync medicine status with backend');
                        }
                      }}
                      aria-label={`Mark ${medicine.name} as completed`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <Link href="/dashboard/logs" className="rounded-lg p-2 text-white/35">
                      <CalendarDays className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="rounded-xl bg-[#161d1b] p-6">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-white/60">Activity Insights</h3>
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-white/55">Sleep Quality</span>
                  <span className="text-xs font-bold text-[#68dbae]">High (8.2h)</span>
                </div>
                <div className="h-1 rounded-full bg-[#1a211f]">
                  <div className="h-1 w-[85%] rounded-full bg-[#68dbae]" />
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-white/55">Movement</span>
                  <span className="text-xs font-bold text-[#68dbae]">Moderate</span>
                </div>
                <div className="h-1 rounded-full bg-[#1a211f]">
                  <div className="h-1 w-[45%] rounded-full bg-[#68dbae]" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-[#68dbae]/10 bg-gradient-to-br from-[#68dbae]/10 to-transparent p-6">
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#68dbae]">Next Scheduled Visit</h3>
              <p className="text-2xl font-bold tracking-tight text-ink">Friday, 14:00</p>
              <p className="mt-1 text-xs text-white/55">Home Physiotherapy Session</p>
            </div>
            <Link href="/dashboard/settings" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#68dbae]">
              Manage appointments <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

