import React from 'react';
import { 
  QrCode, 
  Link as LinkIcon, 
  HelpCircle, 
  ShieldCheck, 
  Wifi, 
  Smartphone 
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function PairDevice() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 pt-24">
      <div className="w-full max-w-2xl text-center mb-12">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-headline text-4xl font-extrabold text-on-background tracking-tight mb-4"
        >
          Pair Your Device
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-secondary max-w-md mx-auto text-lg leading-relaxed"
        >
          Scan the code on your Remote Care monitor or enter the unique Device ID manually to begin synchronization.
        </motion.p>
      </div>

      {/* Connection Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-surface-container-low rounded-xl w-full max-w-md overflow-hidden relative shadow-xl"
      >
        <div className="p-8 flex flex-col items-center">
          {/* Status Badge */}
          <div className="mb-8 flex items-center gap-2 px-4 py-1.5 bg-secondary-container text-on-secondary-container rounded-full text-xs font-semibold tracking-wide uppercase">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Waiting for Connection
          </div>

          {/* QR Code Section */}
          <div className="relative mb-10 group cursor-pointer" onClick={() => navigate('/dashboard')}>
            <div className="absolute inset-0 -m-2 border-4 border-primary rounded-xl opacity-20 animate-ping"></div>
            <div className="relative z-10 w-64 h-64 bg-surface-container-lowest rounded-xl p-6 shadow-sm flex items-center justify-center">
              <QrCode className="w-full h-full text-primary opacity-90" />
            </div>
          </div>

          {/* Device ID Display */}
          <div className="w-full text-center mb-8">
            <p className="text-xs text-outline font-medium uppercase tracking-widest mb-1">Device ID</p>
            <p className="font-headline text-2xl font-bold text-on-surface tracking-[0.2em]">RC-8824-X9</p>
          </div>

          {/* Divider */}
          <div className="w-full flex items-center gap-4 mb-8">
            <div className="h-px bg-outline-variant flex-1"></div>
            <span className="text-xs font-bold text-outline uppercase tracking-wider">or</span>
            <div className="h-px bg-outline-variant flex-1"></div>
          </div>

          {/* Manual Input */}
          <div className="w-full space-y-4">
            <div className="relative">
              <input 
                className="w-full bg-surface-container-high border-none rounded-lg py-4 px-5 text-on-surface placeholder:text-outline/50 focus:ring-2 focus:ring-primary transition-all font-medium" 
                placeholder="Enter 10-digit code" 
                type="text"
              />
            </div>
            <button 
              onClick={() => {
                console.log('Connecting manually...');
                navigate('/dashboard');
              }}
              className="w-full bg-primary text-on-primary py-4 px-6 rounded-full font-bold text-base hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <LinkIcon className="w-5 h-5" />
              Connect Manually
            </button>
          </div>
        </div>

        {/* Contextual Footer Help */}
        <div className="bg-surface-container-highest/50 px-8 py-4 flex items-center justify-center gap-2 text-xs text-secondary font-medium border-t border-outline-variant/10">
          <HelpCircle className="w-4 h-4" />
          <span>Having trouble scanning? Check our connection guide.</span>
        </div>
      </motion.div>

      {/* Supportive Info Section */}
      <div className="mt-16 w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: ShieldCheck, title: 'Secure Link', desc: 'End-to-end encrypted connection between your hub and patient devices.' },
          { icon: Wifi, title: 'Auto-Sync', desc: 'Once paired, data logs will sync automatically every 15 minutes.' },
          { icon: Smartphone, title: 'Multi-Device', desc: 'Connect up to 5 vital signs monitors under a single profile.' },
        ].map((info, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            className="bg-surface-container-lowest p-6 rounded-xl shadow-sm"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-4">
              <info.icon className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-headline font-bold text-on-surface mb-2">{info.title}</h3>
            <p className="text-sm text-secondary leading-relaxed">{info.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
