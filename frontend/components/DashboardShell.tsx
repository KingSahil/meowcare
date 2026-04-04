'use client';

import Link from 'next/link';
import { PropsWithChildren, useEffect, useState } from 'react';
import { LayoutDashboard, PlusCircle, QrCode, Search, TriangleAlert, UserCircle2, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import { SidebarNav } from '@/components/SidebarNav';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { SOSOverlay } from '@/components/SOSOverlay';
import { submitSos } from '@/lib/api';
import { connectCareSocket } from '@/lib/socket';
import { useCareStore } from '@/store/useCareStore';

const pageMeta: Record<string, { eyebrow: string; title: string }> = {
  '/dashboard': { eyebrow: 'Dashboard', title: 'Connected patient overview' },
  '/dashboard/add-medicine': { eyebrow: 'Add Medicine', title: 'Add medicines with OCR or manual entry' },
  '/dashboard/settings': { eyebrow: 'Settings', title: 'Operational preferences and environment' }
};

export function DashboardShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const meta = pageMeta[pathname] ?? pageMeta['/dashboard'];
  const isOverview = pathname === '/dashboard';
  const baileysQrUrl = process.env.NEXT_PUBLIC_BAILEYS_QR_URL ?? 'http://localhost:4012/qr.png';
  const {
    alerts,
    connected,
    demoMode,
    loading,
    patient,
    sosOpen,
    initialize,
    closeSos,
    openSos,
    pushAlert,
    setConnected
  } = useCareStore();
  const [demoNotified, setDemoNotified] = useState(false);
  const [isBaileysQrOpen, setIsBaileysQrOpen] = useState(false);
  const [qrImageFailed, setQrImageFailed] = useState(false);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    const cleanup = connectCareSocket(
      (alert) => {
        pushAlert(alert);
        toast(alert.type === 'sos' ? 'Emergency alert received' : 'New alert received');
      },
      (alert) => {
        pushAlert(alert);
        openSos();
        toast.error('SOS triggered for the patient');
      },
      setConnected
    );

    return cleanup;
  }, [openSos, pushAlert, setConnected]);

  useEffect(() => {
    if (!loading && demoMode && !demoNotified) {
      toast.error('API unavailable. Demo mode loaded from local storage.');
      setDemoNotified(true);
    }
  }, [demoMode, demoNotified, loading]);

  useEffect(() => {
    if (!isBaileysQrOpen) {
      return;
    }

    setQrImageFailed(false);

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsBaileysQrOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isBaileysQrOpen]);

  if (loading || !patient) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="card w-full max-w-md p-8 text-center">
          <p className="text-title font-semibold text-ink">Loading dashboard...</p>
          <p className="mt-2 text-body text-white/50">Preparing patient data, medicine schedule, and live alerts.</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="flex h-screen overflow-hidden bg-background text-ink">
        <div className="hidden md:block">
          <SidebarNav />
        </div>

        <section className="flex min-h-screen flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/5 bg-[#161d1b]/70 px-4 shadow-[0_12px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl md:px-8">
            <div className="flex items-center">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-ink">Aetheris Care</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="hidden items-center gap-2 rounded-full border border-white/10 bg-[#161d1b] px-4 py-2 lg:flex">
                <Search className="h-4 w-4 text-white/45" aria-hidden="true" />
                <input className="bg-transparent text-xs text-ink outline-none placeholder:text-white/30" placeholder="Quick find patient..." />
              </label>
              <button
                type="button"
                onClick={() => setIsBaileysQrOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-emerald-100 transition hover:bg-emerald-400/20"
                aria-label="Open Baileys QR connect"
              >
                <QrCode className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Baileys Connect</span>
              </button>
              <Link href="/dashboard/settings" className="rounded-full p-2 text-white/60 transition hover:text-[#68dbae]" aria-label="Profile">
                <UserCircle2 className="h-5 w-5" />
              </Link>
            </div>
          </header>

          {isOverview ? null : (
            <div className="mx-auto flex w-full max-w-[1600px] items-start justify-between gap-4 px-4 pt-6 md:px-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#68dbae]">{meta.eyebrow}</p>
                <h2 className="mt-2 text-[30px] font-bold tracking-tight text-ink">{meta.title}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <ConnectionStatus state={connected ? 'connected' : 'waiting'} />
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-red-200 transition hover:bg-red-500/20"
                  onClick={async () => {
                    openSos();
                    try {
                      await submitSos();
                    } catch {
                      pushAlert({
                        id: `manual-sos-${Date.now()}`,
                        type: 'sos',
                        title: 'SOS triggered',
                        message: 'Emergency support was triggered from demo mode.',
                        timestamp: new Date().toISOString()
                      });
                      toast.error('Using local emergency simulation');
                    }
                  }}
                >
                  <TriangleAlert className="h-4 w-4" />
                  SOS
                </button>
                <div className="rounded-xl bg-[#141b19] px-4 py-3 text-right">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">Active alerts</p>
                  <p className="text-sm font-bold text-red-100">{alerts.length}</p>
                </div>
              </div>
            </div>
          )}

          <div
            className={`no-scrollbar mx-auto w-full max-w-[1600px] flex-1 overflow-y-auto ${
              isOverview ? 'p-8 pb-24 md:pb-8' : 'px-4 pb-24 pt-6 md:px-8 md:pb-8'
            }`}
          >
            {children}
          </div>
        </section>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-20 items-center justify-around bg-[#161d1b]/80 px-4 backdrop-blur-xl md:hidden">
        <Link href="/dashboard" className={`flex flex-col items-center gap-1 ${pathname === '/dashboard' ? 'font-bold text-[#68dbae]' : 'text-white/60'}`}>
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[10px] uppercase tracking-tight">Dashboard</span>
        </Link>
        <Link
          href="/dashboard/add-medicine"
          className={`flex flex-col items-center gap-1 ${pathname === '/dashboard/add-medicine' ? 'font-bold text-[#68dbae]' : 'text-white/60'}`}
        >
          <PlusCircle className="h-5 w-5" />
          <span className="text-[10px] uppercase tracking-tight">Add</span>
        </Link>
        <Link href="/dashboard/settings" className={`flex flex-col items-center gap-1 ${pathname === '/dashboard/settings' ? 'font-bold text-[#68dbae]' : 'text-white/60'}`}>
          <UserCircle2 className="h-5 w-5" />
          <span className="text-[10px] uppercase tracking-tight">Settings</span>
        </Link>
      </nav>

      <SOSOverlay open={sosOpen} onClose={closeSos} />

      {isBaileysQrOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-md" onClick={() => setIsBaileysQrOpen(false)}>
          <section
            className="w-full max-w-md rounded-3xl border border-white/15 bg-[#0f1614]/95 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.55)]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Baileys WhatsApp QR code"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300/80">WhatsApp Pairing</p>
                <h3 className="mt-2 text-lg font-bold text-ink">Scan to Connect Baileys</h3>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
                onClick={() => setIsBaileysQrOpen(false)}
                aria-label="Close Baileys QR dialog"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white p-4">
              {baileysQrUrl && !qrImageFailed ? (
                <img
                  src={baileysQrUrl}
                  alt="Baileys WhatsApp QR code"
                  className="mx-auto h-64 w-64 rounded-lg object-contain"
                  onError={() => setQrImageFailed(true)}
                />
              ) : (
                <div className="flex h-64 w-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center">
                  <p className="max-w-[210px] text-sm font-semibold text-slate-600">
                    QR not available yet. Start Whatsapp bot and scan from this dialog.
                  </p>
                </div>
              )}
            </div>

            <p className="mt-4 text-sm text-white/65">
              Open WhatsApp on your phone, go to Linked Devices, then scan this QR code.
            </p>
          </section>
        </div>
      ) : null}
    </>
  );
}
