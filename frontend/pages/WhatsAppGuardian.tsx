import React from 'react';
import { 
  MessageSquare, 
  ShieldCheck, 
  Smartphone, 
  Zap, 
  ArrowRight,
  CheckCircle2,
  Lock,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export default function WhatsAppGuardian() {
  return (
    <div className="bg-surface min-h-screen">
      <section className="max-w-7xl mx-auto px-8 py-20 flex flex-col lg:flex-row items-center gap-16">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:w-1/2 space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#25D366]/10 text-[#075E54] rounded-full text-sm font-bold tracking-wide">
            <MessageSquare className="w-4 h-4 fill-[#25D366]/20" />
            WHATSAPP INTEGRATION
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-on-surface leading-[1.1] tracking-tight">
            The <span className="text-[#25D366]">WhatsApp Guardian</span>
          </h1>
          <p className="text-lg text-secondary leading-relaxed max-w-xl">
            A seamless bridge between medical data and daily communication. Get critical alerts, medication reminders, and health summaries directly in your family WhatsApp group.
          </p>
          
          <div className="space-y-4">
            {[
              { title: 'Instant Critical Alerts', desc: 'Real-time notifications for abnormal vitals or missed medications.' },
              { title: 'Daily Health Summaries', desc: 'A concise morning report of the previous night\'s sleep and vitals.' },
              { title: 'Interactive AI Assistant', desc: 'Ask questions about patient history via simple text messages.' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="mt-1 p-1 bg-[#25D366]/20 rounded-full">
                  <CheckCircle2 className="w-4 h-4 text-[#075E54]" />
                </div>
                <div>
                  <h4 className="font-bold text-on-surface">{item.title}</h4>
                  <p className="text-sm text-secondary">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button 
              onClick={() => console.log('Initiating WhatsApp connection flow...')}
              className="bg-[#25D366] text-white px-8 py-4 rounded-full font-bold text-lg hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95"
            >
              <MessageSquare className="w-6 h-6" />
              Connect to WhatsApp
            </button>
            <Link to="/dashboard" className="flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-lg border-2 border-outline-variant hover:bg-surface-container-low transition-all active:scale-95">
              Back to Dashboard
            </Link>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:w-1/2 relative"
        >
          <div className="bg-[#075E54] p-8 rounded-[48px] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #25D366 0%, transparent 70%)' }}></div>
            
            {/* Mock Phone UI */}
            <div className="bg-white rounded-[32px] overflow-hidden shadow-inner border-8 border-slate-800 h-[600px] flex flex-col">
              <div className="bg-[#075E54] p-4 text-white flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-sm">healtcare Bot</p>
                  <p className="text-[10px] opacity-70">Online • Encrypted</p>
                </div>
              </div>
              
              <div className="flex-1 p-4 space-y-4 bg-[#e5ddd5] overflow-y-auto">
                <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm max-w-[80%]">
                  <p className="text-xs font-bold text-primary mb-1">Guardian Alert</p>
                  <p className="text-sm text-slate-800">⚠️ Ramen's heart rate has been elevated (98 BPM) for 10 minutes. He is currently in the Living Room.</p>
                  <p className="text-[10px] text-slate-400 text-right mt-1">09:12 AM</p>
                </div>
                
                <div className="bg-[#dcf8c6] p-3 rounded-lg rounded-tr-none shadow-sm max-w-[80%] ml-auto">
                  <p className="text-sm text-slate-800">Is she okay? I'm calling her now.</p>
                  <p className="text-[10px] text-slate-400 text-right mt-1">09:13 AM ✓✓</p>
                </div>

                <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm max-w-[80%]">
                  <p className="text-xs font-bold text-[#25D366] mb-1">Guardian Bot</p>
                  <p className="text-sm text-slate-800">Medication Reminder: It's time for Ramen's 10:30 AM Lisinopril (10mg).</p>
                  <div className="mt-2 flex gap-2">
                    <button className="flex-1 py-1 bg-[#25D366]/10 text-[#075E54] text-[10px] font-bold rounded border border-[#25D366]/20">CONFIRM TAKEN</button>
                    <button className="flex-1 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">SNOOZE 15M</button>
                  </div>
                  <p className="text-[10px] text-slate-400 text-right mt-1">10:30 AM</p>
                </div>
              </div>
              
              <div className="p-3 bg-slate-50 flex gap-2 items-center">
                <div className="flex-1 bg-white rounded-full px-4 py-2 text-xs text-slate-400 border border-slate-200">Type a message...</div>
                <div className="w-8 h-8 bg-[#075E54] rounded-full flex items-center justify-center text-white">
                  <Zap className="w-4 h-4 fill-white" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Security Section */}
      <section className="bg-surface-container-low py-20">
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <Lock className="w-10 h-10 text-[#075E54]" />
            <h3 className="text-xl font-bold">End-to-End Encrypted</h3>
            <p className="text-sm text-secondary leading-relaxed">Your medical data never leaves our secure servers. WhatsApp is used only as a delivery channel for encrypted notifications.</p>
          </div>
          <div className="space-y-4">
            <ShieldCheck className="w-10 h-10 text-[#075E54]" />
            <h3 className="text-xl font-bold">HIPAA Compliant</h3>
            <p className="text-sm text-secondary leading-relaxed">We adhere to the strictest healthcare data privacy standards, ensuring all communication remains confidential.</p>
          </div>
          <div className="space-y-4">
            <Clock className="w-10 h-10 text-[#075E54]" />
            <h3 className="text-xl font-bold">24/7 Monitoring</h3>
            <p className="text-sm text-secondary leading-relaxed">The Guardian Bot never sleeps, providing around-the-clock peace of mind for you and your family.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
