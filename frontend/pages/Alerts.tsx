import React, { useState } from 'react';
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  Filter, 
  ChevronRight,
  MoreHorizontal,
  Download,
  ShieldAlert,
  Zap,
  Clock,
  MapPin,
  FileText,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { generatePDF } from '../lib/pdfGenerator';

export default function Alerts() {
  const [filter, setFilter] = useState('all');
  const [activeAlerts, setActiveAlerts] = useState([
    { 
      id: 1,
      severity: 'CRITICAL', 
      time: '12 mins ago', 
      location: 'Medication Tray A', 
      title: 'Metformin Stock Critical Low', 
      desc: 'Only 2 tablets left for Metformin 500mg. Please place refill order today to avoid missed doses.',
      icon: AlertCircle,
      color: 'bg-tertiary',
      iconBg: 'bg-tertiary/10',
      actions: ['Escalate', 'Acknowledge']
    },
    { 
      id: 2,
      severity: 'WARNING', 
      time: '48 mins ago', 
      location: 'Dose Schedule', 
      title: 'Medication Dose Not Confirmed', 
      desc: '10:30 AM Lisinopril dose has no confirmation entry. Add manual confirmation or reschedule reminder.',
      icon: AlertTriangle,
      color: 'bg-amber-500',
      iconBg: 'bg-amber-500/10',
      actions: ['Acknowledge']
    },
    { 
      id: 3,
      severity: 'INFO', 
      time: '2 hours ago', 
      location: 'Care Log', 
      title: 'Evening Medication Note Missing', 
      desc: 'No note was added after the 8:00 PM Atorvastatin slot. Add caregiver note for complete medication history.',
      icon: Info,
      color: 'bg-primary',
      iconBg: 'bg-primary/10',
      actions: ['Acknowledge']
    },
  ]);

  const handleAction = (id: number, action: string) => {
    if (action === 'Acknowledge') {
      setActiveAlerts(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleDownloadReport = (alert: any) => {
    generatePDF(
      'Incident Alert Report',
      [
        `Alert ID: #${alert.id}`,
        `Severity: ${alert.severity}`,
        `Title: ${alert.title}`,
        `Time: ${alert.time}`,
        `Location: ${alert.location}`,
        '',
        'Description:',
        alert.desc,
        '',
        'Action Taken: Acknowledged by Caregiver',
        'Patient ID: PT-IN-8821',
        '',
        'This document is a formal record of a health alert and the subsequent response.',
        'Please file this in the patient\'s medical records.'
      ],
      `Alert_Report_${alert.id}`
    );
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-tertiary/10 rounded-2xl flex items-center justify-center text-tertiary shadow-sm">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-on-surface">Alert Center</h1>
          </div>
          <p className="text-secondary font-medium text-lg">Medication, refill, and manual log alerts for trackable caregiver actions.</p>
        </div>
        <div className="flex items-center gap-2 bg-surface-container-low p-1.5 rounded-2xl shadow-inner">
          {[
            { label: 'All Alerts', value: 'all' },
            { label: 'Unread', value: 'unread' },
          ].map((f) => (
            <button 
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                filter === f.value ? "bg-primary text-on-primary shadow-lg shadow-primary/20" : "text-secondary hover:bg-white/50"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Critical', value: '03', desc: 'Immediate Action', color: 'bg-tertiary', icon: ShieldAlert },
          { label: 'Warning', value: '07', desc: 'Monitor Closely', color: 'bg-amber-500', icon: AlertTriangle },
          { label: 'System', value: '12', desc: 'Status Updates', color: 'bg-primary', icon: Info },
        ].map((item, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-surface-container-lowest border border-emerald-100 p-8 rounded-3xl relative overflow-hidden group shadow-sm"
          >
            <div className="relative z-10">
              <span className="font-black text-[10px] uppercase tracking-widest mb-2 block text-secondary">{item.label}</span>
              <p className="text-5xl font-black text-on-surface tracking-tighter">{item.value}</p>
              <div className="mt-4 flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full animate-pulse", item.color)}></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-secondary">{item.desc}</p>
              </div>
            </div>
            <item.icon className="absolute -right-4 -bottom-4 w-24 h-24 opacity-5 group-hover:opacity-10 transition-all group-hover:scale-110 group-hover:-rotate-12" />
          </motion.div>
        ))}
        <div 
          onClick={() => console.log('Opening advanced filters...')}
          className="bg-surface-container-low p-8 rounded-3xl flex flex-col justify-center items-center border-2 border-dashed border-emerald-200 cursor-pointer hover:bg-white hover:border-primary transition-all group shadow-sm"
        >
          <Filter className="w-8 h-8 text-emerald-300 group-hover:text-primary mb-3 transition-colors" />
          <span className="text-xs font-black uppercase tracking-widest text-secondary group-hover:text-primary transition-colors">Advanced Filters</span>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-3 h-3 rounded-full bg-primary animate-pulse"></div>
          <span className="text-xs font-black uppercase tracking-widest text-primary">Current Care Alerts</span>
          <div className="h-[1px] flex-grow bg-emerald-100"></div>
        </div>

        <AnimatePresence mode="popLayout">
          {activeAlerts.length > 0 ? (
            activeAlerts.map((alert, i) => (
              <motion.div 
                key={alert.id}
                layout
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group bg-surface-container-lowest border border-emerald-100 rounded-3xl p-8 transition-all hover:shadow-2xl hover:shadow-emerald-900/5 relative overflow-hidden"
              >
                <div className={cn("absolute left-0 top-0 bottom-0 w-2", alert.color)}></div>
                <div className="flex flex-col lg:flex-row lg:items-start gap-10">
                  <div className="flex-shrink-0">
                    <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg", alert.iconBg)}>
                      <alert.icon className={cn("w-10 h-10", alert.color.replace('bg-', 'text-'))} />
                    </div>
                  </div>
                  <div className="flex-grow">
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                      <span className={cn("px-4 py-1.5 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-sm", alert.color)}>
                        {alert.severity}
                      </span>
                      <div className="flex items-center gap-2 text-secondary font-bold text-xs uppercase tracking-widest">
                        <Clock className="w-4 h-4" />
                        <span>{alert.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-secondary font-bold text-xs uppercase tracking-widest">
                        <MapPin className="w-4 h-4" />
                        <span>{alert.location}</span>
                      </div>
                    </div>
                    <h3 className="text-2xl font-black text-on-surface mb-4 tracking-tight">{alert.title}</h3>
                    <p className="text-secondary leading-relaxed max-w-3xl text-sm font-medium">{alert.desc}</p>
                  </div>
                  <div className="flex flex-row lg:flex-col gap-3 min-w-[180px]">
                    {alert.actions.map((action, j) => (
                      <button 
                        key={j}
                        onClick={() => handleAction(alert.id, action)}
                        className={cn(
                          "flex-1 lg:w-full py-4 px-8 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-sm",
                          action === 'Escalate' 
                            ? "bg-tertiary text-white shadow-tertiary/20 hover:shadow-lg" 
                            : "bg-surface-container-low text-on-surface hover:bg-surface-container-high"
                        )}
                      >
                        {action}
                      </button>
                    ))}
                    <button 
                      onClick={() => handleDownloadReport(alert)}
                      className="flex items-center justify-center gap-3 py-4 px-8 rounded-2xl font-black text-xs uppercase tracking-widest bg-primary/5 text-primary hover:bg-primary hover:text-on-primary transition-all active:scale-95 shadow-sm"
                    >
                      <FileText className="w-4 h-4" />
                      Report
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-surface-container-low p-20 rounded-3xl text-center border-2 border-dashed border-emerald-200"
            >
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-2xl font-black text-on-surface mb-2 uppercase tracking-tight">All Clear!</h3>
              <p className="text-secondary font-medium">No active alerts require your attention right now.</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History Marker */}
        <div className="py-12 flex items-center gap-6">
          <div className="h-[1px] flex-grow bg-emerald-100"></div>
          <span className="text-[10px] font-black text-emerald-300 uppercase tracking-[0.3em] bg-surface px-6">Yesterday - October 24</span>
          <div className="h-[1px] flex-grow bg-emerald-100"></div>
        </div>

        {/* Historical Alert */}
        <div className="group bg-surface-container-low/30 border border-emerald-50 rounded-3xl p-8 opacity-60 transition-all hover:opacity-100 hover:bg-white hover:shadow-xl hover:shadow-emerald-900/5">
          <div className="flex flex-col lg:flex-row lg:items-center gap-10">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center text-secondary">
                <CheckCircle className="w-8 h-8" />
              </div>
            </div>
            <div className="flex-grow">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Oct 24, 4:15 PM</span>
                <div className="h-1 w-1 rounded-full bg-secondary opacity-30"></div>
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Acknowledged by Dr. Rhen</span>
              </div>
              <h3 className="text-xl font-black text-on-surface tracking-tight mb-2">Evening Mobility Update: Ramen Disuza</h3>
              <p className="text-sm text-secondary font-medium leading-relaxed max-w-3xl">Daily step count reached 110% of target goal. No adverse fatigue symptoms reported during the 45-minute active window.</p>
            </div>
            <button className="p-4 rounded-2xl hover:bg-surface-container-low text-secondary transition-all">
              <MoreHorizontal className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
