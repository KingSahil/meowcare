import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Link as LinkIcon,
  Lock,
  MessageSquare,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useCare } from '../context/CareContext';
import { frontendConfig, getWhatsappHealth, getWhatsappQrUrl } from '../lib/api';

type WhatsappStatus = {
  ok: boolean;
  connected?: boolean;
  qrAvailable?: boolean;
  qrUpdatedAt?: string | null;
};

export default function WhatsAppGuardian() {
  const { patient, medications } = useCare();
  const [status, setStatus] = useState<WhatsappStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [qrKey, setQrKey] = useState(Date.now());

  const refreshStatus = async () => {
    setRefreshing(true);
    setError(null);

    try {
      const nextStatus = await getWhatsappHealth();
      setStatus(nextStatus);
      setQrKey(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach WhatsApp bot.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void refreshStatus();
    const interval = window.setInterval(() => {
      void refreshStatus();
    }, 15000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="bg-surface min-h-screen py-16">
      <section className="max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#25D366]/10 text-[#075E54] text-sm font-black tracking-wide">
            <MessageSquare className="w-4 h-4" />
            WHATSAPP INTEGRATION
          </div>

          <div>
            <h1 className="text-5xl font-black tracking-tight leading-tight">
              The <span className="text-[#25D366]">WhatsApp Guardian</span>
            </h1>
            <p className="text-lg text-secondary mt-5 leading-relaxed max-w-2xl">
              This page now reads the live bot health endpoint and QR server so the caregiver UI can pair
              with the WhatsApp automation running in the `Whatsapp/` service.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: ShieldCheck, title: 'User Sync', desc: `Uses shared user ${patient.userId}` },
              { icon: Smartphone, title: 'Phone Sync', desc: patient.phone },
              { icon: Clock, title: 'Reminder Feed', desc: `${medications.length} medicine(s) available` }
            ].map((item) => (
              <div key={item.title} className="rounded-3xl bg-surface-container-lowest border border-emerald-100 p-5 shadow-sm">
                <div className="w-10 h-10 rounded-2xl bg-[#25D366]/10 flex items-center justify-center text-[#075E54]">
                  <item.icon className="w-5 h-5" />
                </div>
                <h2 className="font-black mt-4">{item.title}</h2>
                <p className="text-sm text-secondary mt-2 break-all">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="rounded-3xl bg-surface-container-lowest border border-emerald-100 p-7 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Bot status</p>
                <h2 className="text-3xl font-black mt-2">
                  {status?.connected ? 'Connected' : status?.qrAvailable ? 'Waiting for QR scan' : 'Starting up'}
                </h2>
                <p className="text-secondary mt-3">
                  {status?.qrUpdatedAt
                    ? `QR updated at ${new Date(status.qrUpdatedAt).toLocaleString()}`
                    : 'Polling the WhatsApp health endpoint every 15 seconds.'}
                </p>
                {error && <p className="text-sm text-tertiary mt-3">{error}</p>}
              </div>
              <button
                onClick={() => void refreshStatus()}
                className="px-4 py-3 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={getWhatsappQrUrl()}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-3 rounded-2xl bg-[#25D366] text-white text-xs font-black uppercase tracking-widest flex items-center gap-2"
              >
                <QrCode className="w-4 h-4" />
                Open QR Image
              </a>
              <a
                href={frontendConfig.whatsappBaseUrl}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-3 rounded-2xl bg-surface-container-low text-on-surface text-xs font-black uppercase tracking-widest flex items-center gap-2"
              >
                <LinkIcon className="w-4 h-4" />
                Open Bot Server
              </a>
              <Link
                to="/dashboard"
                className="px-5 py-3 rounded-2xl border border-surface-container-high text-on-surface text-xs font-black uppercase tracking-widest"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#075E54] rounded-[40px] p-8 shadow-2xl">
          <div className="bg-white rounded-[30px] overflow-hidden border-8 border-slate-900 min-h-[620px]">
            <div className="bg-[#075E54] px-5 py-4 text-white flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="font-black">HealthCare Bot</p>
                <p className="text-[11px] opacity-80">{status?.connected ? 'Online • Encrypted' : 'Awaiting QR pairing'}</p>
              </div>
            </div>

            <div className="p-5 bg-[#e5ddd5] space-y-4 h-[540px] overflow-y-auto">
              <div className="bg-white rounded-2xl rounded-tl-none p-4 shadow-sm">
                <p className="text-xs font-black text-primary mb-1">Backend reminder sync</p>
                <p className="text-sm text-slate-700">
                  The bot uses the same demo user and phone number as the dashboard, so reminder data created in the UI can be used by the WhatsApp scheduler.
                </p>
              </div>

              {status?.qrAvailable && !status.connected ? (
                <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
                  <img
                    key={qrKey}
                    src={`${getWhatsappQrUrl()}?t=${qrKey}`}
                    alt="WhatsApp QR code"
                    className="w-56 h-56 object-contain mx-auto rounded-2xl bg-white"
                  />
                  <p className="text-sm font-black mt-4 text-[#075E54]">Scan this QR in WhatsApp Web</p>
                </div>
              ) : (
                <div className="bg-[#dcf8c6] rounded-2xl rounded-tr-none p-4 shadow-sm ml-auto max-w-[80%]">
                  <p className="text-sm text-slate-700">
                    {status?.connected
                      ? 'WhatsApp is connected. The reminder bot can now send scheduled messages and accept taken / later / skip / sos replies.'
                      : 'Waiting for the bot to expose a fresh QR code.'}
                  </p>
                </div>
              )}

              <div className="bg-white rounded-2xl rounded-tl-none p-4 shadow-sm">
                <p className="text-xs font-black text-[#25D366] mb-1">Patient summary</p>
                <p className="text-sm text-slate-700">Patient: {patient.name}</p>
                <p className="text-sm text-slate-700">Phone: {patient.phone}</p>
                <p className="text-sm text-slate-700">Medicines: {medications.map((item) => item.name).join(', ') || 'None yet'}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="max-w-7xl mx-auto px-8 mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: Lock, title: 'Protected Bridge', desc: 'The frontend only reads the bot health and QR image endpoints.' },
          { icon: CheckCircle2, title: 'Shared Demo User', desc: 'Dashboard reminders use the same fallback user ID that the WhatsApp scheduler expects.' },
          { icon: MessageSquare, title: 'Command Support', desc: 'Patients can reply with `taken`, `later`, `skip`, `sos`, `help`, or medicine questions.' }
        ].map((item) => (
          <div key={item.title} className="rounded-3xl bg-surface-container-lowest border border-emerald-100 p-6 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-[#25D366]/10 flex items-center justify-center text-[#075E54]">
              <item.icon className="w-5 h-5" />
            </div>
            <h2 className="font-black mt-4">{item.title}</h2>
            <p className="text-sm text-secondary mt-2">{item.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
