import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock3,
  FileText,
  Info,
  MapPin,
  ShieldAlert
} from 'lucide-react';
import { motion } from 'motion/react';
import { useCare } from '../context/CareContext';
import { generatePDF } from '../lib/pdfGenerator';

const severityIcon = {
  CRITICAL: AlertCircle,
  WARNING: AlertTriangle,
  INFO: Info
};

const severityStyles = {
  CRITICAL: {
    rail: 'bg-[#8a4b5d]',
    chip: 'bg-[#8a4b5d]/14 text-[#7a4253]',
    icon: 'bg-[#f7ebef] text-[#8a4b5d]',
    action: 'bg-[#8a4b5d] text-white'
  },
  WARNING: {
    rail: 'bg-[#d0860d]',
    chip: 'bg-[#d0860d]/14 text-[#a16508]',
    icon: 'bg-[#fff3df] text-[#b26f09]',
    action: 'bg-[#d0860d] text-white'
  },
  INFO: {
    rail: 'bg-[#0a6f7f]',
    chip: 'bg-[#0a6f7f]/14 text-[#0a5f6c]',
    icon: 'bg-[#e5f4f6] text-[#0a6f7f]',
    action: 'bg-[#0a6f7f] text-white'
  }
};

export default function Alerts() {
  const { alerts, dismissAlert, sendSos, patient } = useCare();
  const [filter, setFilter] = useState<'all' | 'CRITICAL' | 'WARNING' | 'INFO'>('all');

  const filteredAlerts = useMemo(
    () => alerts.filter((alert) => filter === 'all' || alert.severity === filter),
    [alerts, filter]
  );

  const summary = useMemo(
    () => ({
      critical: alerts.filter((alert) => alert.severity === 'CRITICAL').length,
      warning: alerts.filter((alert) => alert.severity === 'WARNING').length,
      info: alerts.filter((alert) => alert.severity === 'INFO').length
    }),
    [alerts]
  );

  const downloadAlert = (id: string) => {
    const alert = alerts.find((item) => item.id === id);
    if (!alert) {
      return;
    }

    generatePDF(
      'Alert Incident Record',
      [
        `Alert ID: ${alert.id}`,
        `Severity: ${alert.severity}`,
        `Title: ${alert.title}`,
        `Description: ${alert.desc}`,
        `Location: ${alert.location}`,
        `Patient: ${patient.name}`,
        `Generated: ${new Date().toLocaleString()}`
      ],
      `Alert_${alert.id}`
    );
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-tertiary/10 flex items-center justify-center text-tertiary">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-black tracking-tight">Alert Center</h1>
          </div>
          <p className="text-secondary font-medium">
            Live dashboard alerts, backend socket events, and SOS escalations.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {(['all', 'CRITICAL', 'WARNING', 'INFO'] as const).map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`care-btn ${
                filter === value
                  ? 'bg-on-surface text-white shadow-lg shadow-slate-900/15'
                  : 'bg-surface-container-low text-secondary hover:bg-surface-container'
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Critical', value: summary.critical, color: 'bg-[#8a4b5d]' },
          { label: 'Warning', value: summary.warning, color: 'bg-[#cb7a00]' },
          { label: 'Info', value: summary.info, color: 'bg-[#0a6f7f]' }
        ].map((item) => (
          <div key={item.label} className="care-panel p-7 animate-float-in">
            <span className="text-[10px] font-black uppercase tracking-widest text-secondary">{item.label}</span>
            <p className="text-5xl font-black mt-3">{String(item.value).padStart(2, '0')}</p>
            <div className="mt-4 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${item.color}`} />
              <span className="text-[10px] font-black uppercase tracking-widest text-secondary">Current count</span>
            </div>
          </div>
        ))}

        <button
          onClick={() => void sendSos('Manual SOS escalation from Alert Center.')}
          className="care-panel p-7 text-left border-2 border-dashed border-[#8a4b5d]/25 bg-[#8a4b5d]/6 hover:bg-[#8a4b5d]/10 transition-colors"
        >
          <p className="text-xs font-black uppercase tracking-widest text-tertiary">Emergency action</p>
          <h2 className="text-2xl font-black mt-3">Trigger SOS</h2>
          <p className="text-sm text-secondary mt-3">Send an immediate backend SOS alert for this patient.</p>
        </button>
      </div>

      <div className="space-y-4">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert, index) => {
            const Icon = severityIcon[alert.severity];
            const style = severityStyles[alert.severity];
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="care-panel p-0 overflow-hidden"
              >
                <div className="grid grid-cols-[8px_1fr] min-h-[178px]">
                  <div className={style.rail} />
                  <div className="flex flex-col lg:flex-row gap-6 justify-between p-7">
                    <div className="flex gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${style.icon}`}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex flex-wrap gap-3 items-center mb-3">
                          <span className={`care-pill ${style.chip}`}>{alert.severity}</span>
                          <span className="text-[11px] font-black uppercase tracking-[0.14em] text-secondary flex items-center gap-1.5">
                            <Clock3 className="w-3.5 h-3.5" />
                            {alert.time}
                          </span>
                          <span className="text-[11px] font-black uppercase tracking-[0.14em] text-secondary flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            {alert.location}
                          </span>
                        </div>
                        <h2 className="text-4xl md:text-[2.05rem] leading-tight font-black tracking-tight">{alert.title}</h2>
                        <p className="text-secondary mt-3 max-w-3xl text-[17px] leading-relaxed">{alert.desc}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 lg:justify-end lg:items-start">
                      {alert.severity === 'CRITICAL' && (
                        <button
                          onClick={() => void sendSos(`Escalation requested for alert ${alert.id}: ${alert.title}`)}
                          className={`care-btn ${style.action}`}
                        >
                          Escalate
                        </button>
                      )}
                      <button
                        onClick={() => dismissAlert(alert.id)}
                        className="care-btn bg-surface-container-low text-on-surface"
                      >
                        Acknowledge
                      </button>
                      <button
                        onClick={() => downloadAlert(alert.id)}
                        className="care-btn bg-primary/8 text-primary flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Report
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="care-panel-muted border-2 border-dashed border-emerald-200 p-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-black mt-5">All clear</h2>
            <p className="text-secondary mt-2">No alerts match the current filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
