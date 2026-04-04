'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, ShieldCheck, Syringe } from 'lucide-react';
import toast from 'react-hot-toast';
import { verifyBackendConnection } from '@/lib/api';
import { useCareStore } from '@/store/useCareStore';

export default function ConnectPage() {
  const router = useRouter();
  const [manualId, setManualId] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const deviceId = useMemo(() => 'RCC-RK-2204', []);
  const setStoreConnected = useCareStore((state) => state.setConnected);

  const handleVerify = async () => {
    const enteredId = manualId.trim() || deviceId;

    setConnecting(true);
    try {
      await verifyBackendConnection(enteredId);
      setConnected(true);
      setStoreConnected(true);
      toast.success('Backend connected');
      router.push('/dashboard');
    } catch {
      setConnected(false);
      toast.error('Backend is unavailable. Start the API and try again.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-4xl rounded-[32px] border border-[rgba(32,28,22,0.08)] bg-[rgba(255,255,255,0.72)] p-6 shadow-[0_30px_80px_rgba(28,22,15,0.08)] backdrop-blur md:p-10">
        <div className="grid gap-8 md:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col justify-between rounded-[28px] bg-[#f0ebe2] p-8">
            <div>
              <div className="mb-8 flex items-center gap-3 text-[#171411]">
                <Syringe className="h-6 w-6 text-[#1f6b57]" />
                <span className="text-sm font-semibold uppercase tracking-[0.22em]">Aetheris Care</span>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6f685f]">Care Device Pairing</p>
              <h1 className="mt-4 max-w-md text-4xl font-semibold tracking-[-0.04em] text-[#171411] md:text-5xl">
                Minimal connection flow, backed by the live API.
              </h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-[#6f685f]">
                Verify the patient device and confirm the backend is available before entering the dashboard.
              </p>
            </div>

            <div className="mt-10 grid gap-3 text-sm text-[#171411]">
              <div className="flex items-center gap-3 rounded-2xl bg-white/72 px-4 py-3">
                <ShieldCheck className="h-4 w-4 text-[#1f6b57]" />
                <span>Secure verification before dashboard access</span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white/72 px-4 py-3">
                <CheckCircle2 className="h-4 w-4 text-[#1f6b57]" />
                <span>Uses the backend health endpoint instead of a mock click</span>
              </div>
            </div>
          </div>

          <div className="card flex flex-col justify-between rounded-[28px] p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6f685f]">Device</p>
              <div className="mt-3 rounded-3xl border border-[rgba(32,28,22,0.08)] bg-[#fcfbf8] p-5">
                <p className="text-2xl font-semibold tracking-[-0.04em] text-[#171411]">{deviceId}</p>
                <p className="mt-2 text-sm text-[#6f685f]">
                  {connected ? 'Verified and connected to backend' : 'Waiting for verification'}
                </p>
              </div>

              <label className="mt-8 block text-xs font-semibold uppercase tracking-[0.2em] text-[#6f685f]">
                Manual device id
              </label>
              <input
                className="input-base mt-3 rounded-2xl px-4 py-4 text-base font-semibold tracking-[0.24em]"
                value={manualId}
                maxLength={12}
                onChange={(event) => setManualId(event.target.value.toUpperCase())}
                placeholder={deviceId}
                aria-label="Manual device ID"
              />
            </div>

            <div className="mt-8 space-y-3">
              <button
                type="button"
                className="button-primary flex w-full items-center justify-center gap-2 rounded-2xl py-4 uppercase tracking-[0.16em] disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void handleVerify()}
                disabled={connecting}
              >
                <span>{connecting ? 'Connecting...' : 'Verify And Continue'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <p className="text-xs leading-5 text-[#6f685f]">
                If the backend is offline, this button stays blocked and shows an error instead of opening a fake success state.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
