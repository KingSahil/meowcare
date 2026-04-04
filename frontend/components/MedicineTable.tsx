import React from 'react';
import { Phone } from 'lucide-react';
import { cn } from '../lib/utils';

export type MedicationStatus = 'MISSED' | 'TAKEN' | 'PENDING';

export type Medication = {
  id: string | number;
  name: string;
  dose: string;
  time: string;
  status: MedicationStatus;
  stockDays: number;
  quantity: number;
  notes?: string;
};

type MedicineTableProps = {
  medications: Medication[];
  onAddMedicine: () => void;
  onEditMedicine: (medication: Medication) => void;
  onRefillNow: (medication: Medication) => void;
  onCallReminder?: (medication: Medication) => void;
  callingMedicationId?: string | number | null;
  onStatusChange?: (medication: Medication, status: MedicationStatus | 'LATER') => void;
};

export default function MedicineTable({
  medications,
  onAddMedicine,
  onEditMedicine,
  onRefillNow,
  onCallReminder,
  callingMedicationId,
  onStatusChange
}: MedicineTableProps) {
  return (
    <div className="bg-surface-container-lowest border border-emerald-100 rounded-2xl p-8 shadow-sm">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-black text-on-surface tracking-tight">Medication Schedule</h3>
        <button
          onClick={onAddMedicine}
          className="px-3 py-2 rounded-xl bg-primary text-on-primary text-[10px] font-black uppercase tracking-widest hover:opacity-90"
        >
          + Add Medicine
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[760px]">
          <thead>
            <tr className="text-[10px] text-secondary border-b border-surface-container uppercase tracking-widest font-black">
              <th className="pb-4">Medicine Name</th>
              <th className="pb-4">Dosage</th>
              <th className="pb-4">Time</th>
              <th className="pb-4 text-center">Status</th>
              <th className="pb-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container/50">
            {medications.map((med) => {
              const lowStock = med.stockDays < 3;

              return (
                <tr key={med.id} className="group hover:bg-surface-container-low/30 transition-colors">
                  <td className="py-5">
                    <p className="font-black text-on-surface">{med.name}</p>
                    {lowStock && (
                      <p className="text-[10px] mt-1 text-tertiary font-black uppercase tracking-wider">
                        Low stock warning: only {med.stockDays} day(s) left
                      </p>
                    )}
                  </td>
                  <td className="py-5 font-bold text-sm">{med.dose}</td>
                  <td className="py-5 font-bold text-sm text-secondary">{med.time}</td>
                  <td className="py-5">
                    <div className="flex justify-center">
                      <span
                        className={cn(
                          'px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase',
                          med.status === 'TAKEN' && 'bg-primary text-on-primary shadow-sm',
                          med.status === 'MISSED' && 'bg-tertiary text-on-tertiary shadow-sm',
                          med.status === 'PENDING' && 'bg-surface-container text-secondary'
                        )}
                      >
                        {med.status}
                      </span>
                    </div>
                  </td>
                  <td className="py-5">
                    <div className="flex justify-end gap-2">
                      {onStatusChange && (
                        <>
                          <button
                            onClick={() => onStatusChange(med, 'TAKEN')}
                            className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/15"
                          >
                            Taken
                          </button>
                          <button
                            onClick={() => onStatusChange(med, 'LATER')}
                            className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-secondary-container/70 text-secondary hover:bg-secondary-container"
                          >
                            Later
                          </button>
                          <button
                            onClick={() => onStatusChange(med, 'MISSED')}
                            className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-tertiary/10 text-tertiary hover:bg-tertiary/15"
                          >
                            Skip
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => onEditMedicine(med)}
                        className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-surface-container-low border border-surface-variant/30 hover:bg-surface-container"
                      >
                        Edit
                      </button>
                      {onCallReminder && (
                        <button
                          onClick={() => onCallReminder(med)}
                          disabled={callingMedicationId === med.id}
                          className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-sky-500 text-white hover:opacity-90 disabled:opacity-60 inline-flex items-center gap-1"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          {callingMedicationId === med.id ? 'Calling...' : 'Call'}
                        </button>
                      )}
                      {lowStock && (
                        <button
                          onClick={() => onRefillNow(med)}
                          className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-tertiary text-white hover:opacity-90"
                        >
                          Refill
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
