import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  History, 
  Pill, 
  Bell, 
  Settings, 
  LifeBuoy, 
  HelpCircle,
  AlertTriangle,
  Activity,
  User,
  ShieldCheck,
  Wifi,
  Search,
  Menu,
  X
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
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
  const [scrolled, setScrolled] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState('https://cdn.pixabay.com/photo/2017/05/23/17/12/doctor-2337835_1280.jpg');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={cn(
      "fixed top-0 w-full z-50 transition-all duration-500 px-6 py-4 flex justify-between items-center",
      scrolled 
        ? "bg-slate-900/90 backdrop-blur-xl shadow-2xl shadow-black/20 py-3 border-b border-white/10" 
        : "bg-slate-900/80 backdrop-blur-xl border-b border-white/10"
    )}>
      <div className="flex items-center gap-8">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-black text-on-surface tracking-tighter uppercase hidden md:block">
            healtcare
          </span>
        </Link>

        <div className="hidden md:flex items-center relative group">
          <Search className="absolute left-4 w-4 h-4 text-secondary group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search patient records, meds, or alerts..."
            className="pl-12 pr-6 py-2.5 bg-white/10 text-white placeholder:text-slate-300 border border-white/10 rounded-2xl text-xs font-bold w-80 focus:ring-2 focus:ring-primary focus:bg-white/15 transition-all"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-white">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/logs')}
            title="Open health analytics"
            className="p-3 hover:bg-white/10 rounded-xl transition-all relative group"
          >
            <Activity className="w-5 h-5 group-hover:text-primary transition-colors" />
            <span className="absolute top-3 right-3 w-2 h-2 bg-primary rounded-full border-2 border-white"></span>
          </button>
          <button
            onClick={() => navigate('/alerts')}
            title="Open alerts"
            className="p-3 hover:bg-white/10 rounded-xl transition-all relative group"
          >
            <Bell className="w-5 h-5 group-hover:text-primary transition-colors" />
            <span className="absolute top-3 right-3 w-2 h-2 bg-tertiary rounded-full border-2 border-white animate-ping"></span>
            <span className="absolute top-3 right-3 w-2 h-2 bg-tertiary rounded-full border-2 border-white"></span>
          </button>
          <div className="h-8 w-[1px] bg-white/20 mx-2"></div>
          <Link to="/settings" className="flex items-center gap-3 pl-2 group">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black uppercase tracking-widest text-white">Dr. Rhen</p>
              <p className="text-[9px] font-bold text-slate-300 uppercase">Senior Admin</p>
            </div>
            <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white/70 shadow-md group-hover:scale-105 transition-transform bg-slate-700">
              <img 
                src={avatarSrc}
                alt="User"
                onError={() => setAvatarSrc('https://api.dicebear.com/9.x/adventurer/svg?seed=Rhen')}
              />
            </div>
          </Link>
        </div>
        <button className="lg:hidden p-3 bg-surface-container-lowest rounded-xl shadow-md">
          <Menu className="w-6 h-6 text-on-surface" />
        </button>
      </div>
    </header>
  );
}
