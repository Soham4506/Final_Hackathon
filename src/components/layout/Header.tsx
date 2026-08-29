import React, { useState } from 'react';
import { useCivic } from '../../context/CivicContext';
import { 
  Building2, 
  Bell, 
  Sparkles, 
  ShieldAlert, 
  SlidersHorizontal,
  Radio,
  Languages,
  Menu,
  X,
  RotateCcw
} from 'lucide-react';
import { UserRole } from '../../types';
import { EmergencyBroadcastModal } from '../common/EmergencyBroadcastModal';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { 
    userRole, 
    setUserRole, 
    currentUser, 
    notifications, 
    markNotificationAsRead,
    loadDemoScenario,
    language,
    setLanguage,
    t,
    resetAllDataToDefaults
  } = useCivic();

  const [showNotifs, setShowNotifs] = useState(false);
  const [showScenarioMenu, setShowScenarioMenu] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  const unreadNotifs = notifications.filter((n) => !n.isRead);

  const handleRoleChange = (role: UserRole) => {
    setUserRole(role);
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
          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors"
          >
            <Languages size={12} />
            <span>{language === 'en' ? 'मराठी' : 'English'}</span>
          </button>

          <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-mono font-semibold hidden md:inline">
            v1.2 ACTIVE
          </span>
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

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-700 flex items-center justify-center text-white shadow-inner font-bold text-xl border border-emerald-500/30">
              <Building2 size={22} className="text-emerald-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">CivicPulse</span>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded hidden sm:inline">
                  Municipal Decision System
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
              title="Broadcast SMS / App alert to ward residents"
            >
              <Radio size={14} className="text-amber-400 animate-pulse" />
              <span>{t.broadcastAlert}</span>
            </button>
          )}

          {/* Demo Scenario Presets Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowScenarioMenu(!showScenarioMenu)}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-lg transition-colors font-medium shadow-sm"
              title="Test realistic municipal crisis trade-offs"
            >
              <Sparkles size={14} className="text-amber-400" />
              <span className="hidden md:inline">Scenarios</span>
            </button>

            {showScenarioMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-2 z-50 text-xs">
                <div className="px-3 py-1.5 text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-800">
                  Select Crisis Simulation
                </div>
                <button
                  onClick={() => {
                    loadDemoScenario('monsoon');
                    setShowScenarioMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-200 hover:text-white flex items-start gap-2"
                >
                  <ShieldAlert size={16} className="text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-emerald-400">Monsoon Pipeline Flood</div>
                    <div className="text-[11px] text-slate-400">Sewage contamination vs road repair dilemma</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    loadDemoScenario('deficit_showcase');
                    setShowScenarioMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-200 hover:text-white flex items-start gap-2 border-t border-slate-800/60"
                >
                  <SlidersHorizontal size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-amber-300">Jetting Machine Deficit</div>
                    <div className="text-[11px] text-slate-400">Machinery breakdown & explainable deferral</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    resetAllDataToDefaults();
                    setShowScenarioMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center gap-2 border-t border-slate-800/60"
                >
                  <RotateCcw size={14} className="text-slate-400" />
                  <span>Reset to Fresh Defaults</span>
                </button>
              </div>
            )}
          </div>

          {/* Role Switcher Pills */}
          <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex items-center text-xs">
            <button
              onClick={() => handleRoleChange('citizen')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                userRole === 'citizen'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.citizen}
            </button>
            <button
              onClick={() => handleRoleChange('officer')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                userRole === 'officer'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.officer}
            </button>
            <button
              onClick={() => handleRoleChange('admin')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                userRole === 'admin'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.admin}
            </button>
          </div>

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
        </div>
      </div>

      {/* Emergency Broadcast Modal */}
      {showBroadcastModal && (
        <EmergencyBroadcastModal onClose={() => setShowBroadcastModal(false)} />
      )}
    </header>
  );
};
