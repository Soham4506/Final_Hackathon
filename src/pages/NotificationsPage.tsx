import React from 'react';
import { useCivic } from '../context/CivicContext';
import { Bell, CheckCircle2, MessageSquare, Phone, Mail, Clock, MapPin, Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const NotificationsPage: React.FC = () => {
  const { notifications, markNotificationAsRead, t } = useCivic();
  const navigate = useNavigate();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <Bell size={12} /> Municipal Alerts & Broadcast Feed
            </span>
            <span className="text-xs text-muted-foreground">Citizen In-App Notifications</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            {t.notifications}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time in-app civic status updates, stage progressions, and work order dispatch notices.
          </p>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs divide-y divide-[#76777d]/15 text-xs">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No operational alerts in feed.</div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => markNotificationAsRead(n.id)}
              className={`p-5 transition-colors flex items-start gap-4 cursor-pointer hover:bg-slate-50 ${
                n.isRead ? 'opacity-60 bg-muted/30 dark:bg-slate-900/60' : 'bg-card'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-slate-100 text-[#131b2e] shrink-0 mt-0.5">
                <Bell size={18} />
              </div>

              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-foreground text-sm">{n.title}</span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                  </span>
                </div>

                <p className="text-muted-foreground leading-relaxed text-xs">{n.message}</p>

                {n.ticketNumber && (
                  <div className="flex items-center gap-3 pt-1">
                    <span className="font-mono text-[11px] text-[#131b2e] font-bold">
                      Ticket: {n.ticketNumber}
                    </span>
                    <span className="text-slate-400">•</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/issues?selected=${n.issueId}`);
                      }}
                      className="text-xs text-blue-700 hover:underline font-bold"
                    >
                      View in Queue →
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;

