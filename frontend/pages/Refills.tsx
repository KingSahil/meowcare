import React, { useMemo } from 'react';
import {
  AlertCircle,
  Clock,
  Phone,
  Pill,
  ShoppingCart,
  Truck
} from 'lucide-react';
import { motion } from 'motion/react';
import { useCare } from '../context/CareContext';
import { triggerCallReminderNow } from '../lib/api';
import { generatePDF } from '../lib/pdfGenerator';

export default function Refills() {
  const { medications, patient, sendSos } = useCare();

  const lowStockMedications = useMemo(
    () => medications.filter((medication) => medication.stockDays < 3),
    [medications]
  );

  const requestRefill = async (medicationName: string, dosage: string) => {
    generatePDF(
      'Medication Refill Request',
      [
        `Medication: ${medicationName}`,
        `Dosage: ${dosage}`,
        `Patient: ${patient.name}`,
        `Phone: ${patient.phone}`,
        '',
        'This refill request was generated from the caregiver dashboard.'
      ],
      `Refill_Request_${medicationName.replace(/\s+/g, '_')}`
    );

    try {
      await triggerCallReminderNow({
        userId: patient.userId,
        phone: patient.phone,
        medicine: medicationName,
        dosage,
        customScript: `This is a refill support call for ${patient.name}. The medicine ${medicationName} is running low and needs caregiver attention.`
      });
    } catch {
      // PDF export still succeeds if voice-call integration is unavailable.
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <header>
        <h1 className="text-4xl font-black tracking-tight">Medication Refills</h1>
        <p className="text-secondary font-medium mt-2">
          Inventory is now driven by the shared dashboard medication data and can trigger backend call reminders.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="md:col-span-2 bg-tertiary/10 rounded-3xl p-6 flex gap-4">
          <div className="p-3 rounded-full bg-tertiary text-white h-fit">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-xl">Refill Needed: {lowStockMedications.length} Item(s)</h2>
            <p className="text-secondary mt-2">
              Medicines below the 3-day safety threshold appear here automatically from the dashboard.
            </p>
          </div>
        </motion.div>

        <button
          onClick={() => {
            if (lowStockMedications.length === 0) {
              return;
            }
            void sendSos('Low-stock medication escalation triggered from Refill Center.');
          }}
          className="rounded-3xl bg-primary text-white p-6 text-left shadow-xl"
        >
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Escalate</p>
          <h2 className="text-2xl font-black mt-3">Notify care circle</h2>
          <p className="text-sm mt-3 opacity-80">Send a backend SOS if refill delays become urgent.</p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {medications.map((medication, index) => {
          const percent = Math.max(Math.min(Math.round((medication.quantity / Math.max(medication.stockDays * 2, 1)) * 100), 100), 5);
          const low = medication.stockDays < 3;

          return (
            <motion.div
              key={medication.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`${index === 0 ? 'lg:col-span-8' : 'lg:col-span-4'} bg-surface-container-lowest rounded-3xl p-8 shadow-sm border border-emerald-100`}
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Live medication stock</p>
                  <h2 className="text-2xl font-black mt-2">{medication.name}</h2>
                  <p className="text-secondary text-sm mt-1">{medication.dose} • {medication.time}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${low ? 'bg-tertiary/10 text-tertiary' : 'bg-primary/10 text-primary'}`}>
                  {low ? 'Low' : 'Stable'}
                </span>
              </div>

              <div className="mt-8">
                <div className="flex justify-between text-xs font-black mb-2">
                  <span className="text-secondary">Current stock</span>
                  <span>{medication.quantity} units</span>
                </div>
                <div className="w-full h-3 rounded-full bg-surface-container-high overflow-hidden">
                  <div className={`h-full rounded-full ${low ? 'bg-tertiary' : 'bg-primary'}`} style={{ width: `${percent}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6 bg-surface-container-low rounded-2xl p-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Days left</p>
                  <p className="text-lg font-black mt-2">{medication.stockDays}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Status</p>
                  <p className="text-lg font-black mt-2">{medication.status}</p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => void requestRefill(medication.name, medication.dose)}
                  className="flex-1 py-3 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Request Refill
                </button>
              </div>
            </motion.div>
          );
        })}

        <div className="lg:col-span-12 bg-surface-container-low rounded-3xl p-8">
          <h2 className="text-xl font-black mb-6">Recent Refill Support</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Truck, title: 'Delivery tracking', value: 'Connected to pharmacy ops' },
              { icon: Phone, title: 'Call reminders', value: 'Uses `/api/call-reminder/trigger-now`' },
              { icon: Clock, title: 'Inventory source', value: 'Shared dashboard medication state' }
            ].map((item) => (
              <div key={item.title} className="rounded-2xl bg-surface-container-lowest p-5 border border-surface-container-high">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <item.icon className="w-5 h-5" />
                </div>
                <h3 className="font-black mt-4">{item.title}</h3>
                <p className="text-sm text-secondary mt-2">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
