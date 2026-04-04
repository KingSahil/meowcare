import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar, Topbar } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Logs from './pages/Logs';
import Refills from './pages/Refills';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';
import Landing from './pages/Landing';
import WhatsAppGuardian from './pages/WhatsAppGuardian';
import PairDevice from './pages/PairDevice';

function AppContent() {
  const location = useLocation();
  useEffect(() => {
    document.title = 'Health Care Companion';
  }, [location.pathname]);

  const isLanding = location.pathname === '/';
  const isWhatsApp = location.pathname === '/whatsapp';
  const showShell = !isLanding && !isWhatsApp;

  return (
    <div className="min-h-screen flex flex-col">
      {showShell && <Topbar />}
      <div className="flex flex-1">
        {showShell && <Sidebar />}
        <main className={showShell ? "flex-1 pt-20 pb-12 px-4 md:px-8" : "flex-1"}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/whatsapp" element={<WhatsAppGuardian />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/refills" element={<Refills />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/pair-device" element={<PairDevice />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
