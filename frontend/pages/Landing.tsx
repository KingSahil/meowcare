import React from 'react';
import {
  ShieldCheck,
  PlayCircle,
  Heart,
  Activity,
  Pill,
  ArrowRight,
  CheckCircle2,
  History
} from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function Landing() {
  return (
    <div className="bg-surface min-h-screen">
      {/* Navigation */}
      <nav className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between rounded-[24px] border border-white/14 bg-slate-950/42 px-4 py-2.5 text-white shadow-xl shadow-slate-950/15 backdrop-blur-xl md:px-5">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-cyan-400 shadow-lg shadow-cyan-950/30 transition-transform group-hover:rotate-6">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="block text-base font-black tracking-[0.12em] uppercase text-white">
                healthcare
              </span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.24em] text-white/60">
                Remote Companion
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="hidden sm:inline-flex rounded-2xl border border-white/8 bg-white/6 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:-translate-y-0.5 hover:bg-white/10">
              Log In
            </Link>
            <Link to="/dashboard" className="rounded-2xl bg-primary px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-on-primary shadow-lg shadow-emerald-950/25 transition-all hover:-translate-y-0.5 hover:opacity-95">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-24">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-8 py-20 flex flex-col lg:flex-row items-center gap-16">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:w-1/2 space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-container/10 text-primary rounded-full text-sm font-semibold tracking-wide">
              <ShieldCheck className="w-4 h-4 fill-primary/20" />
              CAREGIVER HOME LOGGING
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-on-surface leading-[1.1] tracking-tight">
              The <span className="text-primary">Empathetic Guardian</span> for Your Loved Ones
            </h1>
            <p className="text-lg text-secondary leading-relaxed max-w-xl">
              Organize medicines, daily notes, and refill reminders in one place. Support your loved ones with practical home caregiving tools.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link to="/dashboard" className="bg-primary text-on-primary px-8 py-4 rounded-full font-bold text-lg hover:opacity-90 transition-all shadow-lg text-center active:scale-95">
                Get Started for Free
              </Link>
              <button
                onClick={() => console.log('Opening product demo video...')}
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-lg border-2 border-outline-variant hover:bg-surface-container-low transition-all active:scale-95"
              >
                <PlayCircle className="w-6 h-6" />
                See How it Works
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:w-1/2 relative"
          >
            <div className="absolute -top-10 -left-10 w-64 h-64 bg-primary-fixed opacity-20 rounded-full blur-3xl -z-10"></div>
            <div className="bg-surface-container-low p-4 rounded-[32px] shadow-xl">
              <img
                alt="Digital Caregiving"
                className="rounded-[24px] w-full h-[500px] object-cover"
                src="https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&q=80&w=800&h=1000"
                referrerPolicy="no-referrer"
              />
            </div>
            {/* Floating Info Card */}
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute bottom-10 -left-12 hidden xl:block bg-surface-container-lowest p-6 rounded-2xl shadow-2xl max-w-[240px]"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Heart className="w-5 h-5 text-primary fill-primary/20" />
                </div>
                <div>
                  <p className="text-xs text-secondary font-medium">Resting HR</p>
                  <p className="text-xl font-bold text-on-surface">72 BPM</p>
                </div>
              </div>
              <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[70%]"></div>
              </div>
              <p className="text-[10px] text-primary mt-2 font-bold tracking-wider">STABLE STATUS</p>
            </motion.div>

          </motion.div>
        </section>

        {/* Social Proof */}
        <section className="bg-surface-container-low py-12">
          <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-8 opacity-70">
            <p className="text-secondary font-bold text-sm tracking-widest uppercase">Trusted by 5,000+ Caregivers</p>
            <div className="flex flex-wrap justify-center gap-12 grayscale font-headline font-black text-xl text-on-surface">
              <span>CARECORE</span>
              <span>VITALITY+</span>
              <span>HEALTHSYNC</span>
              <span>SAFEHOME</span>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="max-w-7xl mx-auto px-8 py-24">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <h2 className="text-4xl font-extrabold tracking-tight">Everything You Need for Peace of Mind</h2>
            <p className="text-secondary">Comprehensive tools designed for practical home caregiving with clear schedules, notes, and reminders.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Activity, title: 'Daily Care Tracking', desc: 'Log doses, symptoms, and home observations in a simple day-by-day format.' },
              { icon: History, title: 'Smart Care Reminders', desc: 'Get practical reminders for missed doses, refill follow-ups, and caregiver notes.' },
              { icon: Pill, title: 'Medication Management', desc: 'Never miss a dose. Coordinate refills and receive reminders for complex medication schedules.' },
            ].map((feature, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -8 }}
                className="bg-surface-container-lowest p-10 rounded-[32px] shadow-lg group transition-all"
              >
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-primary transition-colors">
                  <feature.icon className="w-7 h-7 text-primary group-hover:text-on-primary transition-colors" />
                </div>
                <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                <p className="text-secondary leading-relaxed text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How it Works */}
        <section className="bg-surface-container py-24">
          <div className="max-w-7xl mx-auto px-8">
            <h2 className="text-4xl font-extrabold text-center mb-16 tracking-tight">Starting the Journey is Simple</h2>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {[
                { step: '01', title: 'Add Care Profile', desc: 'Create your loved one\'s profile with medicines, dose timing, and refill preferences.', dark: false },
                { step: '02', title: 'Invite Caregivers', desc: 'Add family members or professionals to the care circle with customizable access roles.', dark: true },
                { step: '03', title: 'Track Daily Care', desc: 'Record doses, notes, and alerts from home observations in one dashboard.', dark: false },
              ].map((step, i) => (
                <div
                  key={i}
                  className={cn(
                    "md:col-span-4 p-12 rounded-[32px] relative overflow-hidden",
                    step.dark ? "bg-primary text-on-primary" : "bg-surface-container-lowest"
                  )}
                >
                  <div className={cn("text-8xl font-black absolute -top-4 -left-4 opacity-5", step.dark ? "text-white" : "text-primary")}>
                    {step.step}
                  </div>
                  <div className="relative z-10">
                    <h4 className="text-2xl font-bold mb-4">{step.title}</h4>
                    <p className={cn("text-sm leading-relaxed", step.dark ? "opacity-80" : "text-secondary")}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Live Vitals Demo */}
        <section className="px-8 pb-24">
          <div className="max-w-7xl mx-auto rounded-[36px] bg-zinc-950 text-zinc-100 p-8 md:p-12 relative overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-red-500/20 blur-3xl" />
            <div className="absolute -bottom-28 -left-20 w-72 h-72 rounded-full bg-red-600/10 blur-3xl" />

            <div className="relative z-10 flex flex-col lg:flex-row gap-10 lg:items-center lg:justify-between">
              <div className="max-w-xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                  <Heart className="w-4 h-4 text-red-500 fill-red-500/30 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300">Live Vitals</span>
                </div>
                <h3 className="text-3xl md:text-4xl font-black tracking-tight">Stable Heart & BP Monitor</h3>
                <p className="text-zinc-300 text-sm md:text-base leading-relaxed">A real-time sample waveform showing a clinically stable rhythm. Black monitor style with red pulse beats for clear emergency-readiness visuals.</p>
              </div>

              <div className="w-full lg:max-w-[560px] rounded-2xl bg-black/80 border border-white/10 p-4 md:p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">ECG Feed</span>
                  <div className="flex items-center gap-2">
                    <motion.span
                      className="w-2.5 h-2.5 rounded-full bg-red-500"
                      animate={{ opacity: [1, 0.35, 1], scale: [1, 1.25, 1] }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Stable</span>
                  </div>
                </div>

                <div className="rounded-xl bg-black border border-white/10 p-2 md:p-3">
                  <svg viewBox="0 0 640 110" className="w-full h-24 md:h-28" role="img" aria-label="Stable ECG reading">
                    <path
                      d="M0 56 L90 56 L118 56 L132 34 L146 78 L164 56 L250 56 L322 56 L350 56 L364 32 L378 80 L396 56 L498 56 L526 56 L540 36 L554 76 L572 56 L640 56"
                      stroke="#0b0b0b"
                      strokeWidth="4"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M0 56 L90 56 L118 56 L132 34 L146 78 L164 56 L250 56 L322 56 L350 56 L364 32 L378 80 L396 56 L498 56 L526 56 L540 36 L554 76 L572 56 L640 56"
                      stroke="#ef4444"
                      strokeWidth="2.8"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.9"
                    />
                    <motion.path
                      d="M0 56 L90 56 L118 56 L132 34 L146 78 L164 56 L250 56 L322 56 L350 56 L364 32 L378 80 L396 56 L498 56 L526 56 L540 36 L554 76 L572 56 L640 56"
                      stroke="#f87171"
                      strokeWidth="4"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="120 1000"
                      animate={{ strokeDashoffset: [0, -1120] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    />
                  </svg>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <motion.div
                    className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2"
                    animate={{ borderColor: ['#3f3f46', '#b91c1c', '#3f3f46'] }}
                    transition={{ duration: 2.2, repeat: Infinity }}
                  >
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Blood Pressure</p>
                    <p className="text-base font-black text-white">120/80 <span className="text-[10px] text-zinc-400">mmHg</span></p>
                  </motion.div>
                  <motion.div
                    className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2"
                    animate={{ borderColor: ['#3f3f46', '#dc2626', '#3f3f46'] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  >
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Heart Rate</p>
                    <p className="text-base font-black text-white">72 <span className="text-[10px] text-zinc-400">BPM</span></p>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-emerald-50 dark:bg-slate-900 rounded-t-[32px] mt-12">
        <div className="max-w-7xl mx-auto px-12 py-16 flex flex-col md:flex-row gap-12 justify-between items-start">
          <div className="space-y-4 max-w-xs">
            <div className="font-headline font-bold text-emerald-800 text-2xl">Remote Care Companion</div>
            <p className="text-slate-700 text-sm leading-relaxed">
              © 2024 Remote Care Companion. Digital Sanctuary for Health Monitoring. Providing technology with a human touch.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-16">
            <div className="space-y-4">
              <p className="font-bold text-emerald-900 uppercase text-xs tracking-widest">Platform</p>
              <ul className="flex flex-col gap-2 text-sm text-slate-700">
                <li><a href="#" className="transition-colors hover:text-emerald-900 hover:underline">Privacy Policy</a></li>
                <li><a href="#" className="transition-colors hover:text-emerald-900 hover:underline">Terms of Service</a></li>
                <li><a href="#" className="transition-colors hover:text-emerald-900 hover:underline">Medical Disclaimer</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <p className="font-bold text-emerald-900 uppercase text-xs tracking-widest">Company</p>
              <ul className="flex flex-col gap-2 text-sm text-slate-700">
                <li><a href="#" className="transition-colors hover:text-emerald-900 hover:underline">Our Story</a></li>
                <li><a href="#" className="transition-colors hover:text-emerald-900 hover:underline">Careers</a></li>
                <li><a href="#" className="transition-colors hover:text-emerald-900 hover:underline">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="space-y-4">
            <p className="font-bold text-emerald-900 uppercase text-xs tracking-widest">Subscribe</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                console.log('Newsletter subscription submitted');
              }}
              className="flex gap-2"
            >
              <input className="w-48 rounded-lg border border-emerald-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-primary" placeholder="Email address" type="email" required />
              <button type="submit" className="bg-primary text-on-primary p-2 rounded-lg hover:opacity-90 active:scale-95 transition-transform">
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </footer>
    </div>
  );
}
