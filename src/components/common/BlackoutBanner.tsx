import React from 'react';
import { AlertTriangle, RefreshCw, Eye } from 'lucide-react';
import { useResilience } from '../../context/ResilienceContext';

export const BlackoutBanner: React.FC = () => {
  const {
    isBlackout,
    isWiped,
    inFlightCount,
    shadowDocCount,
    recoveryLoading,
    runRecovery,
    setModalOpen,
  } = useResilience();

  if (!isBlackout) return null;

  return (
    <div className="bg-gradient-to-r from-amber-600 via-red-600 to-rose-700 text-white px-4 py-2.5 shadow-md relative z-40 border-b border-amber-400/40">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-black/30 border border-white/20 flex items-center justify-center shrink-0 animate-pulse">
            <AlertTriangle className="h-5 w-5 text-amber-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider bg-black/40 px-2 py-0.5 rounded border border-white/20">
                {isWiped ? '⚡ LIVE BLACKOUT PROTOCOL ENGAGED' : '⚠️ BIT-ROT CORRUPTION DETECTED'}
              </span>
              <span className="text-xs font-semibold">
                Primary Data Store Wiped/Unreadable Mid-Operation
              </span>
            </div>
            <p className="text-xs text-white/90 mt-0.5">
              Active Failover: Operating on <strong>Decentralized Shadow Ledger</strong> ({shadowDocCount} municipal checkpoints, {inFlightCount} in-flight outbox actions preserved). Zero data loss.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-xs font-bold border border-white/30 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Telemetry Console</span>
          </button>

          <button
            type="button"
            onClick={runRecovery}
            disabled={recoveryLoading}
            className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-900 text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-900 ${recoveryLoading ? 'animate-spin' : ''}`} />
            <span>{recoveryLoading ? 'Reconciling Ledger...' : 'Run Autonomous Phoenix Rebuild'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
