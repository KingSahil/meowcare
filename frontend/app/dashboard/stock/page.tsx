'use client';

import { AlertCircle, Boxes } from 'lucide-react';
import { useCareStore } from '@/store/useCareStore';

export default function StockPage() {
  const { medicines } = useCareStore();

  return (
    <section className="card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-white/60">Stock</h3>
          <p className="mt-2 text-body text-white/45">Complete medicine inventory with current remaining quantities.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg bg-[#141b19] px-3 py-2 text-xs font-semibold text-[#68dbae]">
          <Boxes className="h-4 w-4" aria-hidden="true" />
          {medicines.length} medicines
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {medicines.length ? (
          medicines.map((medicine) => (
            <article key={medicine.id} className="rounded-2xl bg-[#141b19] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-label font-semibold text-ink">{medicine.name}</p>
                  <p className="mt-1 text-body text-white/45">
                    {medicine.dosage} | {medicine.time}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {medicine.stock <= 6 ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
                      <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      Refill soon
                    </span>
                  ) : null}
                  <div className="min-w-[92px] rounded-lg bg-[#1b2421] px-3 py-2 text-right">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">In stock</p>
                    <p className="mt-1 text-lg font-bold text-ink">{medicine.stock}</p>
                  </div>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl bg-[#141b19] p-6 text-body text-white/45">No medicines available yet. Add reminders from Refills to populate stock.</div>
        )}
      </div>
    </section>
  );
}
