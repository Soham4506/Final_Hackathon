import React from 'react';
import { NavLink } from 'react-router-dom';
import { useCivic } from '../../context/CivicContext';
import {
  LayoutDashboard,
  AlertTriangle,
  Cpu,
  Truck,
  MapPin,
  Users,
  Bell,
  BarChart3,
  Settings,
  PlusCircle,
  FileCheck2,
} from 'lucide-react';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { userRole, issues, notifications } = useCivic();

  const activeIssuesCount = issues.filter((i) => i.status !== 'resolved' && i.status !== 'rejected').length;
  const criticalCount = issues.filter((i) => i.urgency === 'critical' && i.status !== 'resolved').length;
  const unreadNotifs = notifications.filter((n) => !n.isRead).length;

  const navItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['officer', 'admin'],
    },
    {
      to: '/issues',
      label: 'Civic Issues',
      icon: AlertTriangle,
      roles: ['officer', 'admin', 'citizen'],
      badge: activeIssuesCount > 0 ? activeIssuesCount : undefined,
      badgeColor: criticalCount > 0 ? 'bg-red-500' : 'bg-slate-700',
    },
    {
      to: '/priority-engine',
      label: 'Priority Engine & Plan',
      icon: Cpu,
      roles: ['officer', 'admin'],
      highlight: true,
    },
    {
      to: '/resources',
      label: 'Resources & Fleet',
      icon: Truck,
      roles: ['officer', 'admin'],
    },
    {
      to: '/map',
      label: 'Civic Map (GIS)',
      icon: MapPin,
      roles: ['officer', 'admin', 'citizen'],
    },
    {
      to: '/citizen-portal',
      label: 'Citizen Portal',
      icon: Users,
      roles: ['citizen', 'officer', 'admin'],
    },
    {
      to: '/notifications',
      label: 'Notifications',
      icon: Bell,
      roles: ['officer', 'admin', 'citizen'],
      badge: unreadNotifs > 0 ? unreadNotifs : undefined,
      badgeColor: 'bg-emerald-600',
    },
    {
      to: '/analytics',
      label: 'Analytics & SLA',
      icon: BarChart3,
      roles: ['officer', 'admin'],
    },
    {
      to: '/settings',
      label: 'Settings & Audit Logs',
      icon: Settings,
      roles: ['admin', 'officer'],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-30 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 space-y-6">
          {/* Quick Citizen Action */}
          <div className="pt-2">
            <NavLink
              to="/citizen-portal?tab=submit"
              onClick={() => setSidebarOpen(false)}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2.5 px-3 rounded-lg shadow-md shadow-emerald-950/40 transition-all"
            >
              <PlusCircle size={16} />
              <span>Report New Civic Issue</span>
            </NavLink>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 text-xs">
            <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Navigation
            </div>

            {navItems
              .filter((item) => item.roles.includes(userRole))
              .map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-all ${
                        isActive
                          ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/30'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      } ${item.highlight && !isActive ? 'border border-amber-500/20 text-amber-200/90' : ''}`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon size={17} className={item.highlight ? 'text-amber-400' : ''} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span
                        className={`text-[10px] text-white font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
          </nav>
        </div>

        {/* Bottom Council Info Widget */}
        <div className="p-4 border-t border-slate-800 text-slate-400 text-[11px] space-y-2 bg-slate-950/40">
          <div className="flex items-center justify-between text-slate-300">
            <span className="font-semibold">KMC System Status</span>
            <span className="flex items-center gap-1 text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              ONLINE
            </span>
          </div>
          <div className="text-slate-500 leading-tight">
            Deterministic Engine Active
            <br />
            Council Server: Node 1 (Ahilyanagar)
          </div>
        </div>
      </aside>
    </>
  );
};
