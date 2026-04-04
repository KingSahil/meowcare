import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  FileText,
  Info,
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
              className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest ${
                filter === value ? 'bg-primary text-white' : 'bg-surface-container-low text-secondary'
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Critical', value: summary.critical, color: 'bg-tertiary' },
          { label: 'Warning', value: summary.warning, color: 'bg-amber-500' },
          { label: 'Info', value: summary.info, color: 'bg-primary' }
        ].map((item) => (
          <div key={item.label} className="bg-surface-container-lowest rounded-3xl p-7 border border-emerald-100 shadow-sm">
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
          className="rounded-3xl border-2 border-dashed border-tertiary/30 bg-tertiary/5 p-7 text-left"
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
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="bg-surface-container-lowest border border-emerald-100 rounded-3xl p-7 shadow-sm"
              >
                <div className="flex flex-col lg:flex-row gap-6 justify-between">
                  <div className="flex gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-surface-container-low flex items-center justify-center">
                      <Icon className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <div className="flex flex-wrap gap-3 items-center mb-3">
                        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
                          {alert.severity}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-secondary">{alert.time}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-secondary">{alert.location}</span>
                      </div>
                      <h2 className="text-2xl font-black">{alert.title}</h2>
                      <p className="text-secondary mt-2 max-w-3xl">{alert.desc}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 lg:justify-end">
                    <button
                      onClick={() => downloadAlert(alert.id)}
                      className="px-5 py-3 rounded-2xl bg-primary/5 text-primary text-xs font-black uppercase tracking-widest flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Report
                    </button>
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="px-5 py-3 rounded-2xl bg-surface-container-low text-on-surface text-xs font-black uppercase tracking-widest"
                    >
                      Acknowledge
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="rounded-3xl border-2 border-dashed border-emerald-200 bg-surface-container-low p-16 text-center">
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
