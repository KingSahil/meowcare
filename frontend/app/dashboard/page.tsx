'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, PhoneCall } from 'lucide-react';
import { MedicineTable } from '@/components/MedicineTable';
import { callPatientWithRemainingMedicine } from '@/lib/api';
import { useCareStore } from '@/store/useCareStore';

export default function DashboardPage() {
  const { medicines } = useCareStore();
  const [callingPatient, setCallingPatient] = useState(false);
  const [callStatus, setCallStatus] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  const lowStock = medicines.filter((medicine) => medicine.stock <= 6);
  const medicineAlerts = medicines.flatMap((medicine) => {
    const alerts: Array<{ id: string; title: string; detail: string; tone: 'danger' | 'warning' }> = [];

    if (medicine.status === 'missed') {
      alerts.push({
        id: `${medicine.id}-missed`,
        title: `Missed dose: ${medicine.name}`,
        detail: `${medicine.dosage} was missed at ${medicine.time}.`,
        tone: 'danger'
      });
    }

    if (medicine.stock <= 6) {
      alerts.push({
        id: `${medicine.id}-stock`,
        title: `Low stock: ${medicine.name}`,
        detail: `${medicine.stock} dose${medicine.stock === 1 ? '' : 's'} remaining.`,
        tone: 'warning'
      });
    }

    return alerts;
  });
  return (
    <>
      <div className="grid h-full gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <MedicineTable medicines={medicines} showAddButton={false} />

        <div className="space-y-8">

          <section className="card p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-white/60">Medicine Alerts</h3>
                <p className="mt-2 text-body text-white/45">All medicine-related alerts including missed doses and low stock.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-300/50 bg-gradient-to-r from-sky-500/20 to-cyan-400/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] text-sky-100 shadow-[0_10px_20px_rgba(14,165,233,0.15)] transition hover:from-sky-500/30 hover:to-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={callingPatient}
                  onClick={async () => {
                    setCallingPatient(true);
                    const result = await callPatientWithRemainingMedicine();
                    setCallStatus({
                      tone: result.callSid ? 'success' : 'error',
                      message: result.callSid
                        ? `Call started (${result.status}). Call SID: ${result.callSid}`
                        : `Call status: ${result.status}. ${result.message}`
                    });
                    setCallingPatient(false);
                  }}
                >
                  <PhoneCall className="h-4 w-4" aria-hidden="true" />
                  {callingPatient ? 'Calling Patient...' : 'Call Patient (Remaining Meds)'}
                </button>
              </div>
            </div>

            {callStatus ? (
              <div
                className={`mt-4 rounded-2xl border p-4 ${
                  callStatus.tone === 'success'
                    ? 'border-emerald-300/20 bg-emerald-950/20'
                    : 'border-rose-300/20 bg-rose-950/20'
                }`}
              >
                <p
                  className={`text-[10px] uppercase tracking-[0.16em] ${
                    callStatus.tone === 'success' ? 'text-emerald-200/80' : 'text-rose-200/80'
                  }`}
                >
                  Patient call status
                </p>
                <div className="mt-2 flex items-start gap-2">
                  {callStatus.tone === 'success' ? (
                    <CheckCircle2 className="mt-[1px] h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="mt-[1px] h-4 w-4 shrink-0 text-rose-300" aria-hidden="true" />
                  )}
                  <p className={`text-body ${callStatus.tone === 'success' ? 'text-emerald-100' : 'text-rose-100'}`}>
                    {callStatus.message}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="mt-6 space-y-3">
              {medicineAlerts.length ? (
                medicineAlerts.map((alert) => (
                  <article
                    key={alert.id}
                    className={`rounded-2xl p-4 ${alert.tone === 'danger' ? 'bg-rose-500/10' : 'bg-amber-500/10'}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-label font-semibold text-ink">{alert.title}</p>
                        <p className="mt-1 text-body text-white/55">{alert.detail}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">Priority</p>
                        <p className={`mt-1 text-xs font-bold uppercase ${alert.tone === 'danger' ? 'text-rose-300' : 'text-amber-300'}`}>
                          {alert.tone === 'danger' ? 'High' : 'Medium'}
                        </p>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl bg-[#141b19] p-6 text-body text-white/45">No medicine alerts right now.</div>
              )}
            </div>

            {lowStock.length ? (
              <div className="mt-6 rounded-2xl bg-[#141b19] p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">Low stock count</p>
                <p className="mt-1 text-lg font-bold text-amber-300">{lowStock.length}</p>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </>
  );
}
