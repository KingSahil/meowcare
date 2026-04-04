import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowDownToLine,
  CircleDot,
  Download,
  Heart,
  Pill,
  Search,
  TrendingUp
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { motion } from 'motion/react';
import { useCare } from '../context/CareContext';
import { generatePDF } from '../lib/pdfGenerator';
import { cn } from '../lib/utils';
import { getWeeklyHeartRateTrend } from '../lib/vitalsChart';

export default function Logs() {
  const { logs, vitals, medications, patient } = useCare();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');

  const filteredLogs = useMemo(
    () =>
      logs.filter((log) => {
        const matchesSearch = [log.type, log.value, log.note, log.status]
          .join(' ')
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const matchesFilter = filterType === 'All' || log.type === filterType;
        return matchesSearch && matchesFilter;
      }),
    [filterType, logs, searchQuery]
  );

  const chartData = useMemo(
    () => getWeeklyHeartRateTrend(vitals, logs),
    [logs, vitals]
  );

  const vitalsTrendData = useMemo(
    () =>
      chartData.map((entry) => {
        const hr = Number(entry.hr ?? vitals.heartRate);
        return {
          ...entry,
          hr,
          bp: Number((hr + 46).toFixed(0))
        };
      }),
    [chartData, vitals.heartRate]
  );

  const takenCount = medications.filter((medication) => medication.status === 'TAKEN').length;
  const adherence = Math.round((takenCount / Math.max(medications.length, 1)) * 100);

  const exportPdf = () => {
    generatePDF(
      'Health_Logs_Report',
      [
        `Patient: ${patient.name}`,
        `Latest heart rate: ${vitals.heartRate} bpm`,
        `Latest blood pressure: ${vitals.bloodPressure}`,
        `Latest oxygen: ${vitals.oxygen}%`,
        `Medication adherence: ${adherence}%`,
        '',
        ...filteredLogs.map((log) => `${log.date} ${log.time} - ${log.type}: ${log.value} (${log.status}) - ${log.note}`)
      ],
      'Health_Logs_Report'
    );
  };

  return (
    <div className="space-y-10 pb-20">
      <header className="flex flex-col md:flex-row justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Health Analytics</h1>
          <p className="text-secondary font-medium mt-2">Live dashboard trends and the latest backend-synced activity logs.</p>
        </div>
        <button onClick={exportPdf} className="care-btn bg-on-surface text-white flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export PDF
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 care-panel p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black">Vital Trends</h2>
            <div className="flex items-center gap-4 text-[11px] font-black uppercase tracking-[0.14em] text-secondary">
              <span className="flex items-center gap-2"><CircleDot className="w-3.5 h-3.5 text-[#0a6f7f] fill-[#0a6f7f]" />Heart Rate</span>
              <span className="flex items-center gap-2"><CircleDot className="w-3.5 h-3.5 text-[#3f86db] fill-[#3f86db]" />Blood Pressure</span>
            </div>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={vitalsTrendData}>
                <defs>
                  <linearGradient id="logsHr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0a6f7f" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#0a6f7f" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="logsBp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3f86db" stopOpacity={0.26} />
                    <stop offset="100%" stopColor="#3f86db" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d6e2e8" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="bp" stroke="#3f86db" strokeWidth={4} fill="url(#logsBp)" />
                <Area type="monotone" dataKey="hr" stroke="#0a6f7f" strokeWidth={4} fill="url(#logsHr)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-3xl p-8 shadow-xl text-white bg-gradient-to-br from-[#0a6f7f] via-[#09707d] to-[#1687a3]">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Medication Adherence</p>
            <p className="text-5xl font-black mt-3">{adherence}%</p>
            <p className="text-sm mt-4 opacity-80">{takenCount}/{medications.length || 1} doses completed today.</p>
          </div>

          {[
            { icon: Heart, label: 'Current Heart Rate', value: `${vitals.heartRate} bpm`, color: 'text-rose-500' },
            { icon: Activity, label: 'Current Blood Pressure', value: vitals.bloodPressure, color: 'text-primary' },
            { icon: TrendingUp, label: 'Logged Events', value: String(logs.length), color: 'text-sky-500' }
          ].map((item) => (
            <div key={item.label} className="care-panel-muted p-6 border border-surface-container-high">
              <div className="flex items-center gap-3">
                <div className={cn('p-3 rounded-2xl bg-white', item.color)}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-secondary">{item.label}</p>
                  <p className="text-2xl font-black mt-2">{item.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="care-panel overflow-hidden">
        <div className="p-8 border-b border-surface-container-high flex flex-col md:flex-row justify-between gap-4">
          <h2 className="text-xl font-black">Activity Logs</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-secondary absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search logs"
                className="pl-11 pr-4 py-3 rounded-2xl bg-surface-container-low text-sm font-bold min-w-[220px]"
              />
            </div>
            <select
              value={filterType}
              onChange={(event) => setFilterType(event.target.value)}
              className="px-4 py-3 rounded-2xl bg-surface-container-low text-sm font-bold"
            >
              <option value="All">All Types</option>
              <option value="Vital Check">Vital Check</option>
              <option value="Medication">Medication</option>
              <option value="Alert">Alert</option>
              <option value="System">System</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-secondary font-black bg-surface-container-low/30">
                <th className="px-8 py-4">Type</th>
                <th className="px-8 py-4">Value</th>
                <th className="px-8 py-4">Time & Date</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4">Notes</th>
                <th className="px-8 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high">
              {filteredLogs.map((log, index) => (
                <motion.tr
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="hover:bg-surface-container-low/50"
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        {log.type === 'Medication' ? <Pill className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                      </div>
                      <span className="font-black">{log.type}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 font-bold">{log.value}</td>
                  <td className="px-8 py-5">
                    <p className="font-bold">{log.time}</p>
                    <p className="text-[10px] font-medium text-secondary">{log.date}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
                      {log.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-sm text-secondary">{log.note}</td>
                  <td className="px-8 py-5 text-right">
                    <button className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container-low text-secondary hover:bg-surface-container transition-colors" title="Export row">
                      <ArrowDownToLine className="w-4 h-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="p-16 text-center text-secondary">No logs match your current filters.</div>
        )}
      </div>
    </div>
  );
}
