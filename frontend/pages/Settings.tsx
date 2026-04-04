import React, { useState } from 'react';
import { 
  BadgeCheck, 
  Camera, 
  Lock, 
  Shield, 
  ChevronRight, 
  Users, 
  Phone,
  Mail,
  MapPin,
  Contact,
  AlertTriangle,
  Download
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { generatePDF } from '../lib/pdfGenerator';

export default function Settings() {
  const [notifications, setNotifications] = useState([
    { id: 1, label: 'Critical Vitals', desc: 'Immediate push & SMS', enabled: true },
    { id: 2, label: 'Medication Logs', desc: 'Daily summary email', enabled: true },
    { id: 3, label: 'System Alerts', desc: 'App notification only', enabled: false },
    { id: 4, label: 'Refill Reminders', desc: '48h before stock out', enabled: true },
  ]);

  const toggleNotification = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, enabled: !n.enabled } : n));
  };

  const handleDownloadProfile = () => {
    generatePDF(
      'Staff Profile Data Export',
      [
        'Staff Name: Dr. Rhoit Dsouza',
        'Role: Senior Care Coordinator',
        'Specialty: Internal Medicine',
        'Staff ID: HC-IN-8829',
        'Email: dr.rhen@healtcare.org',
        'Phone: +91 98765 43210',
        'Work Location: Mumbai Region - Unit B',
        '',
        'Notification Settings:',
        ...notifications.map(n => `- ${n.label}: ${n.enabled ? 'Enabled' : 'Disabled'} (${n.desc})`),
        '',
        'Assigned Patients: 12',
        '',
        'This document contains sensitive staff information.',
        'Generated on: ' + new Date().toLocaleString()
      ],
      'Staff_Profile_Export'
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <header>
        <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Settings</h1>
        <p className="text-secondary">Manage your professional profile and system preferences.</p>
      </header>

      {/* Profile Section */}
      <section className="bg-surface-container-lowest p-8 rounded-xl shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-8 mb-10">
          <div className="relative">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
              <img 
                className="w-full h-full object-cover" 
                src="https://cdn.pixabay.com/photo/2017/05/23/17/12/doctor-2337835_1280.jpg" 
                alt="Doctor"
                referrerPolicy="no-referrer"
              />
            </div>
            <button className="absolute bottom-0 right-0 p-2 bg-primary text-on-primary rounded-full shadow-lg hover:scale-110 transition-transform">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <h2 className="text-2xl font-bold text-on-surface">Dr. Rhen Dsouza</h2>
              <BadgeCheck className="w-5 h-5 text-primary" />
            </div>
            <p className="text-secondary font-medium mb-4">Senior Care Coordinator • Staff ID: HC-IN-8829</p>
            <button 
              onClick={handleDownloadProfile}
              className="flex items-center gap-2 px-4 py-2 bg-surface-container-low text-on-surface text-sm font-bold rounded-lg hover:bg-surface-container-high transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Profile Data
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-secondary uppercase tracking-widest flex items-center gap-2">
              <Contact className="w-4 h-4" />
              Contact Information
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg">
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-sm">dr.rhen@healtcare.org</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg">
                <Phone className="w-4 h-4 text-primary" />
                <span className="text-sm">+91 98765 43210</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-sm">Mumbai Region - Unit B</span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-secondary uppercase tracking-widest flex items-center gap-2">
              <Users className="w-4 h-4" />
              Assigned Circle
            </h3>
            <div className="p-4 bg-primary/5 border border-primary/10 rounded-lg">
              <p className="text-2xl font-bold text-primary mb-1">12 Patients</p>
              <p className="text-xs text-secondary">Active monitoring enabled for all assigned profiles.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Notifications Section */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Notification Preferences
        </h2>
        <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm divide-y divide-outline-variant/10">
          {notifications.map((pref) => (
            <div key={pref.id} className="p-6 flex items-center justify-between hover:bg-surface-container-low transition-colors">
              <div>
                <p className="font-bold text-on-surface mb-1">{pref.label}</p>
                <p className="text-xs text-secondary">{pref.desc}</p>
              </div>
              <button 
                onClick={() => toggleNotification(pref.id)}
                className={cn(
                  "w-12 h-6 rounded-full relative transition-all duration-300",
                  pref.enabled ? "bg-primary" : "bg-outline-variant"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300",
                  pref.enabled ? "right-1" : "left-1"
                )}></div>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Security Section */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" />
          Security & Privacy
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button className="flex items-center justify-between p-6 bg-surface-container-lowest rounded-xl shadow-sm hover:bg-surface-container-low transition-all group">
            <div className="text-left">
              <p className="font-bold text-on-surface mb-1">Change Password</p>
              <p className="text-xs text-secondary">Last changed 3 months ago</p>
            </div>
            <ChevronRight className="w-5 h-5 text-outline group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="flex items-center justify-between p-6 bg-surface-container-lowest rounded-xl shadow-sm hover:bg-surface-container-low transition-all group">
            <div className="text-left">
              <p className="font-bold text-on-surface mb-1">Two-Factor Auth</p>
              <p className="text-xs text-secondary">Currently enabled via SMS</p>
            </div>
            <ChevronRight className="w-5 h-5 text-outline group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
        <div className="bg-tertiary-container/10 p-6 rounded-xl flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-tertiary shrink-0" />
          <div>
            <p className="text-sm font-bold text-on-tertiary-fixed-variant mb-1">Data Privacy Notice</p>
            <p className="text-xs text-secondary leading-relaxed">Your account is compliant with HIPAA standards. All patient data is encrypted end-to-end and access is logged for audit purposes.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
