import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  SlidersHorizontal,
  Activity,
  User,
  ShieldCheck,
  CheckCircle2,
  Menu,
  X,
  LogOut,
  Languages,
  Database,
  ChevronDown,
} from 'lucide-react';
import { useCivic } from '../../context/CivicContext';
import { OperationalStatusModal } from '../modals/OperationalStatusModal';

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

  const [searchQuery, setSearchQuery] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const unreadNotifs = notifications.filter((n) => !n.isRead);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'mr' : 'en');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/issues?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex justify-between items-center w-full px-4 sm:px-6 h-16 bg-[#fcf8fa] border-b border-[#76777d]/15 shadow-xs">
        {/* Left: Mobile hamburger & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle navigation drawer"
            className="md:hidden p-2 rounded-lg text-[#45464d] hover:text-[#131b2e] hover:bg-[#f0edef] transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => navigate(userRole === 'citizen' ? '/citizen-portal' : '/')}
          >
            <div className="w-8 h-8 rounded-lg bg-[#131b2e] flex items-center justify-center text-white font-black text-xs shadow-sm md:hidden">
              KMC
            </div>
            <h1 className="text-base sm:text-lg font-bold text-[#1b1b1d] tracking-tight truncate flex items-center gap-2">
              <span>KoparNiti</span>
              <span className="text-xs text-[#76777d] font-normal hidden lg:inline">कोपरनीती • KMC</span>
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {isSupabaseLive ? 'LIVE SCADA' : 'LOCAL ENGINE'}
            </span>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search input with submit handler */}
          <form onSubmit={handleSearchSubmit} className="relative hidden md:block w-48 lg:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#76777d] w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID, Ward, Fleet..."
              className="w-full bg-[#f6f3f5] border border-[#76777d]/20 rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#1b1b1d] placeholder:text-[#76777d]/80 focus:outline-none focus:border-[#131b2e] focus:ring-1 focus:ring-[#131b2e] transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#76777d] hover:text-black"
              >
                ×
              </button>
            )}
          </form>

          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#f0edef] hover:bg-[#eae7e9] text-[#131b2e] border border-[#76777d]/20 transition-colors"
            title="Switch Language"
          >
            <Languages size={13} />
            <span>{language === 'en' ? 'मराठी' : 'EN'}</span>
          </button>

          {/* Notification bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              aria-label="View notifications"
              className="relative w-9 h-9 rounded-full hover:bg-[#f0edef] flex items-center justify-center transition-colors text-[#45464d] hover:text-[#131b2e]"
              title="Operational Alerts"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifs.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#ba1a1a] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                  {unreadNotifs.length}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center rounded-t-2xl">
                  <span className="font-bold text-slate-900">{t.notifications}</span>
                  <span className="text-slate-500 font-mono text-[11px]">{unreadNotifs.length} unread</span>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">No operational alerts</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markNotificationAsRead(n.id)}
                        className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                          n.isRead ? 'opacity-60' : 'bg-blue-50/30'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <span className="font-bold text-slate-800">{n.title}</span>
                          <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Settings button */}
          <button
            onClick={() => navigate('/settings')}
            aria-label="Open System Settings"
            className="w-9 h-9 rounded-full hover:bg-[#f0edef] flex items-center justify-center transition-colors text-[#45464d] hover:text-[#131b2e]"
            title="Command Settings"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* Operational Status Pill button */}
          <button
            onClick={() => setShowStatusModal(true)}
            className="px-3 py-1.5 bg-[#131b2e] text-white rounded-lg text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 hover:bg-[#1e2a47] transition-all shadow-xs active:scale-95 shrink-0"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Operational Status</span>
            <span className="sm:hidden">Status</span>
          </button>

          {/* User Profile Avatar with Read-Only Security Details */}
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-1.5 p-1 rounded-full hover:ring-2 hover:ring-[#131b2e]/20 transition-all ml-1"
              title="User Profile"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden border border-[#76777d]/30 bg-[#131b2e] flex items-center justify-center text-white font-bold text-xs">
                {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Security Profile
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold uppercase">
                      {userRole}
                    </span>
                  </div>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{currentUser.fullName}</p>
                  {currentUser.phone && (
                    <p className="text-[11px] text-slate-500 mt-0.5 font-mono">{currentUser.phone}</p>
                  )}
                </div>

                <div className="p-2">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl font-bold flex items-center gap-2 transition-colors"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>

                <div className="px-4 py-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between font-mono">
                  <span>RLS Security Active</span>
                  <span>Kopargaon Node #08</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Operational Status Modal */}
      <OperationalStatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
      />
    </>
  );
};
