import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Gavel,
  MapPin,
  ListTodo,
  Truck,
  BarChart3,
  Settings,
  Building2,
  ChevronRight,
  Radio,
  Bell,
  HeartHandshake,
  Recycle,
  Droplets,
} from 'lucide-react';
import { useCivic } from '../../context/CivicContext';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { userRole, issues, resources, notifications } = useCivic();
  const location = useLocation();
  const navigate = useNavigate();

  const criticalCount = issues.filter(
    (i) => i.urgency === 'critical' && i.status !== 'resolved' && i.status !== 'rejected'
  ).length;

  const activeFleetCount = resources.filter((r) => r.isOperational).length;
  const unreadNotifCount = notifications.filter((n) => !n.isRead).length;

  const NAV_ITEMS = [
    {
      to: '/',
      label: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
      allowedRoles: ['officer', 'admin'],
    },
    {
      to: '/priority-engine',
      label: 'Decision',
      icon: <Gavel className="w-4 h-4" />,
      badge: criticalCount > 0 ? criticalCount : undefined,
      badgeColor: 'bg-[#ba1a1a] text-white',
      allowedRoles: ['officer', 'admin'],
    },
    {
      to: '/wastewater-reuse',
      label: 'Circular Waste & Agri',
      icon: <Recycle className="w-4 h-4" />,
      badge: 'AGRI',
      badgeColor: 'bg-teal-700 text-white',
      allowedRoles: ['citizen', 'officer', 'admin'],
    },
    {
      to: '/issues',
      label: 'Issues Queue',
      icon: <ListTodo className="w-4 h-4" />,
      badge: issues.length > 0 ? issues.length : undefined,
      badgeColor: 'bg-[#3f465c] text-white',
      allowedRoles: ['citizen', 'officer', 'admin'],
    },
    {
      to: '/map',
      label: 'Map (GIS)',
      icon: <MapPin className="w-4 h-4" />,
      allowedRoles: ['citizen', 'officer', 'admin'],
    },
    {
      to: '/resources',
      label: 'Fleet & Crews',
      icon: <Truck className="w-4 h-4" />,
      badge: activeFleetCount > 0 ? `${activeFleetCount} Active` : undefined,
      badgeColor: 'bg-sky-700 text-white',
      allowedRoles: ['officer', 'admin'],
    },
    {
      to: '/citizen-portal',
      label: 'Citizen Portal',
      icon: <HeartHandshake className="w-4 h-4" />,
      badge: 'LIVE',
      badgeColor: 'bg-emerald-600 text-white',
      allowedRoles: ['citizen', 'officer', 'admin'],
    },
    {
      to: '/notifications',
      label: 'Alerts',
      icon: <Bell className="w-4 h-4" />,
      badge: unreadNotifCount > 0 ? unreadNotifCount : undefined,
      badgeColor: 'bg-amber-500 text-black',
      allowedRoles: ['citizen', 'officer', 'admin'],
    },
    {
      to: '/analytics',
      label: 'Analytics',
      icon: <BarChart3 className="w-4 h-4" />,
      allowedRoles: ['officer', 'admin'],
    },
  ];

  const visibleItems = NAV_ITEMS.filter((item) => item.allowedRoles.includes(userRole));

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-xs transition-opacity duration-200"
        />
      )}

      {/* Sidebar Container - Extends Full Height on Desktop */}
      <aside
        className={`fixed md:static top-0 left-0 h-full w-64 bg-[#131b2e] border-r border-white/10 flex flex-col py-5 px-3.5 z-50 shrink-0 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Municipal Crest Header */}
        <div
          className="flex items-center gap-3 mb-6 px-2.5 cursor-pointer select-none"
          onClick={() => navigate(userRole === 'citizen' ? '/citizen-portal' : '/')}
        >
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-white/20 shadow-md shrink-0 p-1">
            <Building2 className="w-6 h-6 text-[#131b2e]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white tracking-tight truncate">
              KoparNiti
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              कोपरनीती • KMC
            </p>
          </div>
        </div>

        {/* Navigation Items List */}
        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto pr-1">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-150 group ${
                  isActive
                    ? 'bg-[#3f465c] text-white shadow-sm ring-1 ring-white/20'
                    : 'text-[#7c839b] hover:bg-[#3f465c]/40 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`transition-colors ${
                      isActive ? 'text-white' : 'text-[#7c839b] group-hover:text-white'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                      item.badgeColor || 'bg-white/20 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Settings Link */}
        {userRole === 'admin' && (
          <div className="pt-3 border-t border-white/10 mt-auto">
            <NavLink
              to="/settings"
              onClick={() => setSidebarOpen(false)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-150 ${
                location.pathname === '/settings'
                  ? 'bg-[#3f465c] text-white'
                  : 'text-[#7c839b] hover:bg-[#3f465c]/40 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            </NavLink>
          </div>
        )}
      </aside>
    </>
  );
};
