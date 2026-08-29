import React, { useState } from 'react';
import { useCivic } from '../../context/CivicContext';
import { 
  Building2, 
  Bell, 
  Radio, 
  Languages, 
  Menu, 
  X, 
  Database, 
  LogOut, 
  User, 
  ChevronDown 
} from 'lucide-react';
import { UserRole } from '../../types';
import { EmergencyBroadcastModal } from '../common/EmergencyBroadcastModal';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { 
    userRole, 
    currentUser, 
    notifications, 
    markNotificationAsRead,
    language,
    setLanguage,
    t,
    isSupabaseLive,
    logout,
  } = useCivic();

  const navigate = useNavigate();

  const [showNotifs, setShowNotifs] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const unreadNotifs = notifications.filter((n) => !n.isRead);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'mr' : 'en');
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md">
      {/* Top Municipal Banner */}
      <div className="bg-slate-950 px-4 py-1 text-xs flex justify-between items-center text-slate-400 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {t.councilName} ({language === 'en' ? 'कोपरगाव नगरपरिषद' : 'Kopargaon Municipal Council'})
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="hidden sm:inline">{t.subTitle}</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {/* Supabase Live Indicator */}
          {isSupabaseLive ? (
            <span
              className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-mono font-semibold flex items-center gap-1"
              title="Connected to live Supabase PostgreSQL backend"
            >
              <Database size={10} />
              <span>Supabase Live</span>
            </span>
          ) : (
            <span
              className="bg-slate-900 text-slate-300 border border-slate-800 px-2 py-0.5 rounded text-[10px] font-mono font-semibold flex items-center gap-1"
              title="Operating in Local Offline Storage mode"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Local Storage</span>
            </span>
          )}

          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors"
          >
            <Languages size={12} />
            <span>{language === 'en' ? 'मराठी' : 'English'}</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={() => navigate(userRole === 'citizen' ? '/citizen-portal' : '/')}
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-700 flex items-center justify-center text-white shadow-inner font-bold text-xl border border-emerald-500/30">
              <Building2 size={22} className="text-emerald-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">CivicPulse</span>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded hidden sm:inline">
                  KMC Council
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                {t.tagline}
              </p>
            </div>
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-3">
          {/* Emergency Ward Broadcast Button for Officers */}
          {(userRole === 'officer' || userRole === 'admin') && (
            <button
              onClick={() => setShowBroadcastModal(true)}
              className="hidden sm:flex items-center gap-1.5 text-xs bg-amber-950/80 hover:bg-amber-900/90 text-amber-300 border border-amber-800 px-3 py-1.5 rounded-lg transition-colors font-medium"
              title="Broadcast alert to ward residents"
            >
              <Radio size={14} className="text-amber-400 animate-pulse" />
              <span>{t.broadcastAlert}</span>
            </button>
          )}

          {/* Notifications Center */}
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Bell size={19} />
              {unreadNotifs.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                  {unreadNotifs.length}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden text-xs">
                <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                  <span className="font-semibold text-white">{t.notifications}</span>
                  <span className="text-slate-400">{unreadNotifs.length} unread</span>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-800">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-slate-500">No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markNotificationAsRead(n.id)}
                        className={`p-3.5 hover:bg-slate-800/80 cursor-pointer transition-colors ${
                          n.isRead ? 'opacity-70' : 'bg-slate-850'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <span className="font-semibold text-slate-200">{n.title}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">{n.message}</p>
                        {n.ticketNumber && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            {n.ticketNumber}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Card & Sign Out */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-2 border-l border-slate-800 text-xs hover:opacity-90"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-800 flex items-center justify-center text-white font-bold text-xs border border-emerald-600/40">
                {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden lg:block leading-tight text-left">
                <div className="font-semibold text-white truncate max-w-[130px]">
                  {currentUser.fullName || 'Active User'}
                </div>
                <div className="text-[10px] text-emerald-400 capitalize font-mono font-medium">
                  {userRole}
                </div>
              </div>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-xs">
                <div className="px-3 py-2 border-b border-slate-800">
                  <div className="font-bold text-white truncate">{currentUser.fullName}</div>
                  <div className="text-[11px] text-slate-400 capitalize font-mono">
                    Role: {userRole}
                  </div>
                  {currentUser.phone && (
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Phone: {currentUser.phone}
                    </div>
                  )}
                </div>

                <div className="pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-rose-400 hover:bg-rose-950/50 flex items-center gap-1.5 font-semibold transition-colors"
                  >
                    <LogOut size={13} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Emergency Broadcast Modal */}
      {showBroadcastModal && (
        <EmergencyBroadcastModal onClose={() => setShowBroadcastModal(false)} />
      )}
    </header>
  );
};
