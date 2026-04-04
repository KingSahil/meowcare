import React from 'react';
import {
  BadgeCheck,
  Download,
  Lock,
  Mail,
  MapPin,
  Phone,
  Shield,
  Wifi
} from 'lucide-react';
import { useCare } from '../context/CareContext';
import { frontendConfig } from '../lib/api';
import { generatePDF } from '../lib/pdfGenerator';

export default function Settings() {
  const { notifications, toggleNotification, patient, backendStatus } = useCare();

  const exportProfile = () => {
    generatePDF(
      'Caregiver_Profile_Export',
      [
        `Patient profile currently attached: ${patient.name}`,
        `Backend online: ${backendStatus.online ? 'Yes' : 'No'}`,
        `Backend mode: ${backendStatus.mode}`,
        `Backend note: ${backendStatus.note}`,
        '',
        ...notifications.map(
          (notification) =>
            `${notification.label}: ${notification.enabled ? 'Enabled' : 'Disabled'} (${notification.desc})`
        ),
        '',
        `API Base URL: ${frontendConfig.apiBaseUrl}`,
        `Socket URL: ${frontendConfig.socketUrl}`,
        `WhatsApp URL: ${frontendConfig.whatsappBaseUrl}`
      ],
      'Caregiver_Profile_Export'
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      <header>
        <h1 className="text-4xl font-black tracking-tight">Settings</h1>
        <p className="text-secondary font-medium mt-2">
          Frontend runtime status, notification preferences, and integration endpoints.
        </p>
      </header>

      <section className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm border border-emerald-100">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-lg">
            <img
              src="https://cdn.pixabay.com/photo/2017/05/23/17/12/doctor-2337835_1280.jpg"
              alt="Coordinator"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <h2 className="text-3xl font-black">Dr. Rhen Dsouza</h2>
              <BadgeCheck className="w-5 h-5 text-primary" />
            </div>
            <p className="text-secondary mt-2">Senior Care Coordinator • Shared caregiver console</p>
          </div>
          <button
            onClick={exportProfile}
            className="px-5 py-3 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Settings
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          {[
            { icon: Mail, label: 'Contact', value: 'dr.rhen@healthcare.org' },
            { icon: Phone, label: 'Phone', value: '+91 98765 43210' },
            { icon: MapPin, label: 'Region', value: 'Mumbai Region - Unit B' }
          ].map((item) => (
            <div key={item.label} className="rounded-2xl bg-surface-container-low p-5 border border-surface-container-high">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <item.icon className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-secondary mt-4">{item.label}</p>
              <p className="font-black mt-2">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm border border-emerald-100">
        <div className="p-8 border-b border-surface-container-high">
          <h2 className="text-xl font-black flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Notification Preferences
          </h2>
        </div>
        {notifications.map((notification) => (
          <div key={notification.id} className="p-6 flex items-center justify-between border-t border-surface-container-high">
            <div>
              <p className="font-black">{notification.label}</p>
              <p className="text-sm text-secondary mt-1">{notification.desc}</p>
            </div>
            <button
              onClick={() => toggleNotification(notification.id)}
              className={`w-14 h-8 rounded-full relative ${notification.enabled ? 'bg-primary' : 'bg-surface-container-high'}`}
            >
              <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${notification.enabled ? 'right-1' : 'left-1'}`} />
            </button>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Wifi, label: 'Backend API', value: `${backendStatus.online ? 'Online' : 'Offline'} • ${frontendConfig.apiBaseUrl}` },
          { icon: Wifi, label: 'Socket Server', value: frontendConfig.socketUrl },
          { icon: Lock, label: 'WhatsApp Bridge', value: frontendConfig.whatsappBaseUrl }
        ].map((item) => (
          <div key={item.label} className="rounded-3xl bg-surface-container-low p-6 border border-surface-container-high">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <item.icon className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-secondary mt-4">{item.label}</p>
            <p className="font-black mt-2 break-all">{item.value}</p>
            {item.label === 'Backend API' && <p className="text-sm text-secondary mt-3">{backendStatus.note}</p>}
          </div>
        ))}
      </section>
    </div>
  );
}
