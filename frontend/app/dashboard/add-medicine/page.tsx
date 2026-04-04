'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { AddMedicineForm } from '@/components/AddMedicineForm';
import { PrescriptionUpload } from '@/components/PrescriptionUpload';
import type { ScanResult } from '@/lib/types';
import { useCareStore } from '@/store/useCareStore';

type QueuedMedicine = {
  name: string;
  dosage: string;
  time: string;
  stock: number;
};

export default function AddMedicinePage() {
  const { scanResult, setScanResult, addMedicine } = useCareStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [savingMedicine, setSavingMedicine] = useState(false);
  const [scanQueue, setScanQueue] = useState<QueuedMedicine[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);

  const currentQueuedMedicine = scanQueue[queueIndex] ?? null;

  const startQueueFromScan = (scan: ScanResult) => {
    const queue = (scan.detectedMedicines || [])
      .map((medicine) => ({
        name: medicine.name || '',
        dosage: medicine.dosage || '',
        time: medicine.time || '',
        stock: medicine.stock && medicine.stock > 0 ? medicine.stock : 10
      }))
      .filter((medicine) => medicine.name.trim().length > 0);

    setScanQueue(queue);
    setQueueIndex(0);
    setShowAddForm(queue.length > 0);
  };

  const resetQueue = () => {
    setScanQueue([]);
    setQueueIndex(0);
  };

  return (
    <>
      <div id="add-medicine-tools" className="grid h-full gap-8 xl:grid-cols-[1fr_1fr]">
        <section className="card p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-white/60">Add Medicine</h3>
              <p className="mt-2 text-body text-white/45">Use OCR scan or manual entry to create medicine reminders.</p>
            </div>
            <button
              type="button"
              className="button-primary"
              onClick={() => {
                resetQueue();
                setShowAddForm(true);
              }}
            >
              Add manually
            </button>
          </div>

          <div className="mt-6 rounded-2xl bg-[#141b19] p-4 text-body text-white/55">
            After OCR scan, detected medicines are queued and added one-by-one for review.
          </div>
        </section>

        <PrescriptionUpload
          result={scanResult}
          onScanned={(scan) => {
            setScanResult(scan);
            startQueueFromScan(scan);
          }}
        />
      </div>

      <AddMedicineForm
        open={showAddForm}
        submitting={savingMedicine}
        initialValues={currentQueuedMedicine ?? undefined}
        onClose={() => {
          setShowAddForm(false);
          resetQueue();
        }}
        onSubmit={async (values) => {
          setSavingMedicine(true);
          try {
            await addMedicine(values);

            const hasNextMedicine = queueIndex + 1 < scanQueue.length;

            if (hasNextMedicine) {
              setQueueIndex((previous) => previous + 1);
              toast.success('Reminder added. Loading next medicine...');
              return;
            }

            toast.success('Medicine added successfully');
            setShowAddForm(false);
            resetQueue();
          } catch {
            toast.error('Unable to add reminder');
          } finally {
            setSavingMedicine(false);
          }
        }}
      />
    </>
  );
}
