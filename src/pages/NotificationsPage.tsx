import React from 'react';
import { useCivic } from '../context/CivicContext';
import { Bell, CheckCircle2, MessageSquare, Phone, Mail, Clock, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const NotificationsPage: React.FC = () => {
  const { notifications, markNotificationAsRead } = useCivic();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <Bell size={12} /> Dispatch Broadcasts
            </span>
            <span className="text-xs text-slate-400">Citizen SMS / App Feed</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Notifications & Civic Dispatch Feed
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time automated status updates sent to citizens and technical work crews.
          </p>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-800 text-xs">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No notifications in feed.</div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => markNotificationAsRead(n.id)}
              className={`p-5 transition-colors flex items-start gap-4 cursor-pointer hover:bg-slate-850 ${
                n.isRead ? 'opacity-70 bg-slate-900/40' : 'bg-slate-900'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 shrink-0 mt-0.5">
                {n.channel === 'sms' ? <Phone size={18} /> : <Bell size={18} />}
              </div>

              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-white text-sm">{n.title}</span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                  </span>
                </div>

                <p className="text-slate-300 leading-relaxed text-xs">{n.message}</p>

                {n.ticketNumber && (
                  <div className="flex items-center gap-3 pt-1">
                    <span className="font-mono text-[11px] text-emerald-400 font-semibold">
                      Ticket: {n.ticketNumber}
                    </span>
                    <span className="text-slate-600">•</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/issues?selected=${n.issueId}`);
                      }}
                      className="text-xs text-blue-400 hover:underline font-medium"
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
