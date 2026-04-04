import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  History, 
  Pill, 
  Bell, 
  MessageSquare,
  Settings, 
  AlertTriangle,
  Activity,
  ShieldCheck,
  Wifi,
  Menu
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useCare } from '../context/CareContext';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: History, label: 'Health Analytics', path: '/logs' },
  { icon: Pill, label: 'Medication', path: '/refills' },
  { icon: Bell, label: 'Alert Center', path: '/alerts' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function Sidebar() {
  const location = useLocation();
  const { backendStatus, sendSos } = useCare();
  const [isEmergency, setIsEmergency] = useState(false);
  const [sosError, setSosError] = useState<string | null>(null);

  const handleSos = async () => {
    setSosError(null);
    setIsEmergency(true);

    try {
      await sendSos('Emergency SOS triggered from the caregiver dashboard.');
    } catch (error) {
      setSosError(error instanceof Error ? error.message : 'Unable to trigger SOS');
      setIsEmergency(false);
      return;
    }

    window.setTimeout(() => setIsEmergency(false), 1800);
  };

  return (
    <aside className="hidden lg:flex flex-col w-72 bg-surface border-r border-outline/20 h-screen sticky top-0 pt-24 px-6 pb-8">
      <div className="mb-10 px-2">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-black text-on-surface tracking-tight uppercase">healtcare</h2>
        </div>
        <p className="text-[10px] text-secondary font-black uppercase tracking-[0.2em]">Remote Companion v2.4</p>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "group flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 relative overflow-hidden",
                isActive 
                  ? "text-on-surface font-black bg-surface-container-lowest shadow-xl shadow-emerald-900/5" 
                  : "text-secondary hover:bg-surface-container-low hover:text-on-surface"
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="activeNav"
                  className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"
                />
              )}
              <item.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive && "text-primary")} />
              <span className="text-sm uppercase tracking-widest">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-6">
        {/* System Status Card */}
        <div className="bg-surface-container rounded-2xl p-4 border border-outline/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Care Status</span>
            <div className="flex items-center gap-1">
              <div className={cn("w-1.5 h-1.5 rounded-full", backendStatus.online ? "bg-primary animate-pulse" : "bg-tertiary")}></div>
              <span className={cn("text-[10px] font-black uppercase", backendStatus.online ? "text-primary" : "text-tertiary")}>
                {backendStatus.online ? backendStatus.mode : 'offline'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary-container rounded-lg">
              <Wifi className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-black text-on-surface">Home Log Active</p>
              <p className="text-[9px] font-medium text-secondary">{backendStatus.note}</p>
            </div>
          </div>
        </div>

        <button 
          onClick={() => void handleSos()}
          className={cn(
            "w-full py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 uppercase tracking-widest text-xs",
            isEmergency 
              ? "bg-tertiary text-white animate-bounce" 
              : "bg-tertiary text-white hover:shadow-tertiary/20"
          )}
        >
          <AlertTriangle className={cn("w-5 h-5", isEmergency ? "animate-pulse" : "fill-white/20")} />
          {isEmergency ? "SOS SENT" : "EMERGENCY SOS"}
        </button>
        {sosError && <p className="text-[10px] font-bold text-tertiary">{sosError}</p>}
      </div>
    </aside>
  );
}

export function Topbar() {
  const navigate = useNavigate();
  const [isHidden, setIsHidden] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState('https://cdn.pixabay.com/photo/2017/05/23/17/12/doctor-2337835_1280.jpg');

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= 24) {
        setIsHidden(false);
      } else {
        setIsHidden(currentScrollY > lastScrollY);
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 px-3 pt-3 transition-all duration-500 md:px-6",
        isHidden ? "pointer-events-none -translate-y-24 opacity-0" : "translate-y-0 opacity-100"
      )}
    >
      <div
        className={cn(
          "mx-auto flex items-center justify-between border text-white transition-all duration-500",
          "max-w-4xl rounded-[24px] border-white/14 bg-slate-950/42 px-4 py-2.5 shadow-xl shadow-slate-950/15 backdrop-blur-xl md:px-5"
        )}
      >
        <div className="flex items-center gap-3 md:gap-5">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-cyan-400 shadow-lg shadow-cyan-950/30 transition-transform group-hover:rotate-6">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="hidden md:block">
              <span className="block text-base font-black tracking-[0.12em] uppercase text-white">
                healthcare
              </span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.24em] text-white/60">
                Remote Companion
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 text-white">
          <Link
            to="/whatsapp"
            title="Open WhatsApp link"
            className="hidden md:inline-flex items-center gap-2 rounded-2xl border border-[#25D366]/20 bg-[#25D366]/14 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:-translate-y-0.5 hover:bg-[#25D366]/22"
          >
            <MessageSquare className="w-4 h-4 text-[#25D366]" />
            WhatsApp
          </Link>
          <button
            onClick={() => navigate('/logs')}
            title="Open health analytics"
            className="relative rounded-2xl border border-white/8 bg-white/6 p-2.5 transition-all hover:-translate-y-0.5 hover:bg-white/12 group"
          >
            <Activity className="w-4.5 h-4.5 group-hover:text-primary transition-colors" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border-2 border-white bg-primary"></span>
          </button>
          <button
            onClick={() => navigate('/alerts')}
            title="Open alerts"
            className="relative rounded-2xl border border-white/8 bg-white/6 p-2.5 transition-all hover:-translate-y-0.5 hover:bg-white/12 group"
          >
            <Bell className="w-4.5 h-4.5 group-hover:text-primary transition-colors" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border-2 border-white bg-tertiary animate-ping"></span>
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border-2 border-white bg-tertiary"></span>
          </button>
          <div className="mx-1 hidden h-7 w-px bg-white/14 sm:block"></div>
          <Link
            to="/settings"
            className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/6 px-2 py-1.5 transition-all hover:bg-white/10 group"
          >
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black uppercase tracking-widest text-white">Dr. Rhen</p>
              <p className="text-[9px] font-bold text-slate-300 uppercase">Senior Admin</p>
            </div>
            <div className="h-9 w-9 rounded-xl overflow-hidden border-2 border-white/70 bg-slate-700 shadow-md transition-transform group-hover:scale-105">
              <img 
                src={avatarSrc}
                alt="User"
                onError={() => setAvatarSrc('https://api.dicebear.com/9.x/adventurer/svg?seed=Rhen')}
              />
            </div>
          </Link>
          <button className="lg:hidden rounded-2xl border border-white/10 bg-white/8 p-2.5 shadow-md">
            <Menu className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </header>
  );
}
