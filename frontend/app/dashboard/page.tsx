'use client';

import Link from 'next/link';
import { MedicineTable } from '@/components/MedicineTable';
import { useCareStore } from '@/store/useCareStore';

export default function DashboardPage() {
  const { medicines } = useCareStore();

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
              <Link href="/dashboard/add-medicine" className="button-primary inline-flex items-center justify-center">
                Go to add medicine
              </Link>
            </div>

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
