import React from 'react';
import { 
  AlertCircle, 
  ShoppingCart, 
  MoreHorizontal, 
  Pill, 
  Truck, 
  History,
  Phone,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { generatePDF } from '../lib/pdfGenerator';

export default function Refills() {
  const handleRefillRequest = (medName: string, dosage: string) => {
    console.log(`Requesting refill for ${medName}...`);
    generatePDF(
      'Medication Refill Request',
      [
        `Medication: ${medName}`,
        `Dosage: ${dosage}`,
        `Patient ID: PT-IN-8821`,
        `Status: Request Pending`,
        `Pharmacy: Apollo Pharmacy #4412`,
        '',
        'This document serves as a formal request for a medication refill.',
        'Please process this request and notify the caregiver upon completion.'
      ],
      `Refill_Request_${medName.replace(/\s+/g, '_')}`
    );
  };

  const handleDownloadHistory = (item: any) => {
    generatePDF(
      'Refill History Record',
      [
        `Item: ${item.name}`,
        `Description: ${item.desc}`,
        `Date: ${item.date}`,
        `Status: ${item.status}`,
        `Patient ID: PT-IN-8821`,
        '',
        'This is a historical record of a medication refill event.',
        'Keep this for your medical records.'
      ],
      `Refill_History_${item.name.replace(/\s+/g, '_')}`
    );
  };

  return (
    <div className="space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Medication Refills</h1>
        <p className="text-secondary">Manage current prescriptions and inventory levels for Patient ID: PT-IN-8821.</p>
      </header>

      {/* Alerts / Action Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="col-span-1 md:col-span-2 bg-tertiary-container/10 p-6 rounded-xl flex items-start gap-4"
        >
          <div className="p-2 bg-tertiary rounded-full text-on-tertiary">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-on-tertiary-fixed-variant">Refill Needed: 2 Items Low</h3>
            <p className="text-sm text-secondary">Lisinopril and Metformin are below the 5-day safety threshold.</p>
          </div>
        </motion.div>
        <div className="flex items-center justify-end">
          <button 
            onClick={() => {
              console.log('Requesting all low refills...');
              generatePDF(
                'Bulk Refill Request',
                [
                  'Medications Requested:',
                  '- Lisinopril (10mg)',
                  '- Metformin (500mg)',
                  '',
                  'Patient ID: PT-IN-8821',
                  'Urgency: High (Critical Low Stock)',
                  'Pharmacy: Apollo Pharmacy #4412'
                ],
                'Bulk_Refill_Request'
              );
            }}
            className="bg-primary text-on-primary px-8 py-4 rounded-full font-bold shadow-lg hover:shadow-primary/20 transition-all active:scale-95 flex items-center gap-2"
          >
            <ShoppingCart className="w-5 h-5" />
            Request All Low Refills
          </button>
        </div>
      </div>

      {/* Bento Grid - Medication Inventory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
        {/* Main Medication Card 1 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-8 bg-surface-container-lowest p-8 rounded-xl shadow-[0_12px_32px_rgba(0,81,58,0.04)] relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-8">
            <div>
              <span className="text-[10px] uppercase tracking-widest font-bold text-primary mb-1 block">Prescription A-102</span>
              <h2 className="text-2xl font-bold text-on-surface">Lisinopril</h2>
              <p className="text-sm text-secondary">10mg Oral Tablet • Once Daily</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-tertiary-container text-on-tertiary-container rounded-full text-[10px] font-bold">CRITICAL LOW</span>
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-secondary">Current Stock</span>
                <span className="text-tertiary">4 / 30 Tablets</span>
              </div>
              <div className="w-full bg-surface-container-high h-3 rounded-full overflow-hidden">
                <div className="bg-tertiary h-full rounded-full" style={{ width: '13%' }}></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 bg-surface-container-low p-4 rounded-lg">
              <div>
                <p className="text-[10px] text-secondary uppercase font-bold">Last Refill</p>
                <p className="text-sm font-semibold">Oct 12, 2023</p>
              </div>
              <div>
                <p className="text-[10px] text-secondary uppercase font-bold">Estimated Out</p>
                <p className="text-sm font-semibold text-tertiary">In 4 Days</p>
              </div>
            </div>
          </div>
          <div className="mt-8 flex gap-3">
            <button 
              onClick={() => handleRefillRequest('Lisinopril', '10mg Oral Tablet')}
              className="flex-1 bg-primary text-on-primary py-3 rounded-full text-sm font-bold active:scale-95 transition-transform"
            >Request Refill</button>
            <button 
              onClick={() => console.log('Opening more options for Lisinopril...')}
              className="px-4 py-3 border border-outline-variant text-secondary rounded-full hover:bg-surface-container-low transition-colors active:scale-90"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* Secondary Medication Card 2 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-4 bg-surface-container-lowest p-8 rounded-xl shadow-[0_12px_32px_rgba(0,81,58,0.04)]"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-lg font-bold text-on-surface">Metformin</h2>
              <p className="text-xs text-secondary">500mg • Twice Daily</p>
            </div>
          </div>
          <div className="mb-8">
            <div className="flex justify-between text-xs font-bold mb-2">
              <span className="text-secondary">Stock</span>
              <span className="text-on-surface">12 / 60</span>
            </div>
            <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
              <div className="bg-primary-container h-full rounded-full" style={{ width: '20%' }}></div>
            </div>
          </div>
          <button 
            onClick={() => handleRefillRequest('Metformin', '500mg • Twice Daily')}
            className="w-full bg-surface-container-high text-on-surface py-3 rounded-full text-sm font-bold hover:bg-surface-variant transition-colors mb-4 active:scale-95"
          >Request Refill</button>
          <p className="text-center text-[10px] text-secondary">Apollo Pharmacy #4412</p>
        </motion.div>

        {/* Medication Card 3 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-4 bg-surface-container-lowest p-8 rounded-xl shadow-[0_12px_32px_rgba(0,81,58,0.04)]"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-lg font-bold text-on-surface">Atorvastatin</h2>
              <p className="text-xs text-secondary">20mg • Nightly</p>
            </div>
            <span className="px-2 py-0.5 bg-primary-container/20 text-primary text-[10px] font-bold rounded-full">STABLE</span>
          </div>
          <div className="mb-8">
            <div className="flex justify-between text-xs font-bold mb-2">
              <span className="text-secondary">Stock</span>
              <span className="text-on-surface">24 / 30</span>
            </div>
            <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
              <div className="bg-primary h-full rounded-full" style={{ width: '80%' }}></div>
            </div>
          </div>
          <button className="w-full border border-outline-variant text-secondary py-3 rounded-full text-sm font-bold opacity-50 cursor-not-allowed">Stock Sufficient</button>
        </motion.div>

        {/* History Section */}
        <div className="lg:col-span-8 bg-surface-container-low p-8 rounded-xl">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Recent Refill History
          </h3>
          <div className="space-y-4">
            {[
              { name: 'Atorvastatin Refill', desc: 'Confirmed by Pharmacist', date: 'Oct 28', status: 'Delivered', icon: Pill, color: 'bg-secondary-container text-primary' },
              { name: 'Multivitamins', desc: 'Automatic Monthly Supply', date: 'Oct 15', status: 'Archived', icon: Truck, color: 'bg-secondary-container text-primary' },
              { name: 'Insulin Syringes', desc: 'Insurance Review Required', date: 'Oct 02', status: 'Action Needed', icon: AlertCircle, color: 'bg-tertiary-fixed text-tertiary' },
            ].map((item, i) => (
              <div 
                key={i} 
                onClick={() => handleDownloadHistory(item)}
                className="bg-surface-container-lowest p-4 rounded-lg flex items-center justify-between cursor-pointer hover:bg-surface-container-low transition-colors active:scale-[0.99]"
              >
                <div className="flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", item.color)}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">{item.name}</p>
                    <p className="text-[10px] text-secondary">{item.desc}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{item.date}</p>
                  <p className={cn("text-[10px] font-bold", item.status === 'Delivered' ? "text-primary" : item.status === 'Action Needed' ? "text-tertiary" : "text-secondary")}>
                    {item.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pharmacy Information Section */}
      <section className="bg-primary text-on-primary rounded-2xl p-10 flex flex-col md:flex-row justify-between items-center relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-2xl font-bold mb-2">Preferred Pharmacy</h3>
          <p className="font-light opacity-90 max-w-md mb-6">Your prescriptions are currently routed to Apollo Pharmacy, Mumbai. You can change your fulfillment location in settings.</p>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <span className="text-sm font-bold">+91 99887 66554</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-bold">Open until 9:00 PM</span>
            </div>
          </div>
        </div>
        <div className="mt-8 md:mt-0 relative z-10">
          <div className="w-48 h-32 rounded-xl overflow-hidden shadow-2xl rotate-3">
            <img 
              className="w-full h-full object-cover" 
              src="https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&q=80&w=300&h=200" 
              alt="Pharmacy"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
          <Pill className="w-48 h-48" />
        </div>
      </section>
    </div>
  );
}
