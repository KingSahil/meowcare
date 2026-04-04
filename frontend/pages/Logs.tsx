import React, { useMemo, useState } from 'react';
import {
  Activity,
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
    () => [
      { date: 'Mon', hr: Math.max(vitals.heartRate - 3, 60), oxygen: vitals.oxygen - 0.2 },
      { date: 'Tue', hr: Math.max(vitals.heartRate - 1, 60), oxygen: vitals.oxygen },
      { date: 'Wed', hr: vitals.heartRate + 4, oxygen: vitals.oxygen - 0.3 },
      { date: 'Thu', hr: vitals.heartRate, oxygen: vitals.oxygen },
      { date: 'Fri', hr: Math.max(vitals.heartRate - 2, 60), oxygen: vitals.oxygen + 0.1 },
      { date: 'Sat', hr: vitals.heartRate + 1, oxygen: vitals.oxygen },
      { date: 'Sun', hr: vitals.heartRate, oxygen: vitals.oxygen + 0.2 }
    ],
    [vitals]
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
        <button onClick={exportPdf} className="bg-on-surface text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export PDF
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-surface-container-lowest rounded-3xl p-8 border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black">Vital Trends</h2>
            <span className="text-xs font-black uppercase tracking-widest text-primary">7-day pulse snapshot</span>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="logsHr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0c6a76" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#0c6a76" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d7e3ea" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="hr" stroke="#0c6a76" strokeWidth={4} fill="url(#logsHr)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-primary text-white rounded-3xl p-8 shadow-xl">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Medication Adherence</p>
            <p className="text-5xl font-black mt-3">{adherence}%</p>
            <p className="text-sm mt-4 opacity-80">{takenCount}/{medications.length || 1} doses completed today.</p>
          </div>

          {[
            { icon: Heart, label: 'Current Heart Rate', value: `${vitals.heartRate} bpm`, color: 'text-rose-500' },
            { icon: Activity, label: 'Current Blood Pressure', value: vitals.bloodPressure, color: 'text-primary' },
            { icon: TrendingUp, label: 'Logged Events', value: String(logs.length), color: 'text-sky-500' }
          ].map((item) => (
            <div key={item.label} className="bg-surface-container-low rounded-3xl p-6 border border-surface-container-high">
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

      <div className="bg-surface-container-lowest border border-emerald-100 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-8 border-b border-surface-container-high flex flex-col md:flex-row justify-between gap-4">
          <h2 className="text-xl font-black">Activity Logs</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-secondary absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search logs"
                className="pl-11 pr-4 py-3 rounded-2xl bg-surface-container-low text-sm font-bold"
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
