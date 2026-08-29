import React from 'react';
import { X, CheckCircle2, ShieldCheck, Activity, Radio, Cpu, Database, Server } from 'lucide-react';
import { useCivic } from '../../context/CivicContext';

interface OperationalStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OperationalStatusModal: React.FC<OperationalStatusModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isSupabaseLive, issues, resources } = useCivic();

  if (!isOpen) return null;

  const SERVICES = [
    { name: 'KMC SCADA Gateway Cluster (Water Telemetry)', status: 'Optimal', latency: '42ms', uptime: '99.99%' },
    { name: 'GIS Spatial Mapping & Sensor Mesh Node', status: 'Optimal', latency: '68ms', uptime: '100%' },
    { name: 'AI Decision & Multi-Strategy Allocation Engine', status: 'Optimal', latency: '110ms', uptime: '99.95%' },
    { name: 'Field Telematics & Heavy Fleet Dispatch', status: `${resources.filter(r => r.isOperational).length}/5 Online`, latency: '85ms', uptime: '99.98%' },
    { name: 'Citizen WhatsApp & Voice Intake Relay', status: 'Optimal', latency: '54ms', uptime: '100%' },
    { name: 'Supabase PostgreSQL Realtime Node', status: isSupabaseLive ? 'Connected (Live)' : 'Local Storage Mode', latency: '12ms', uptime: '100%' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-[#76777d]/20 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 bg-[#131b2e] text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider">
              KMC Municipal Command Node Health
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Status summary banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-emerald-900">All Operational Systems Normal</h4>
              <p className="text-emerald-700 text-xs mt-0.5">
                Kopargaon Civic Telemetry is fully synchronized. Decision & dispatch pipelines active across all 8 wards.
              </p>
            </div>
          </div>

          {/* Services list */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#76777d]">
              Service Subsystems & Endpoints
            </h4>
            <div className="divide-y divide-[#76777d]/10 border border-[#76777d]/15 rounded-xl overflow-hidden bg-[#fcf8fa]">
              {SERVICES.map((srv, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between hover:bg-white transition-colors">
                  <div>
                    <p className="font-bold text-[#1b1b1d]">{srv.name}</p>
                    <p className="text-[10px] text-[#76777d] font-mono">Uptime: {srv.uptime} • Latency: {srv.latency}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                    {srv.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 bg-[#f6f3f5] border-t border-[#76777d]/15 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#131b2e] text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-[#1e2a47]"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};
