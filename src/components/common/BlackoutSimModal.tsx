import React from 'react';
import { X, Zap, RotateCcw } from 'lucide-react';
import { useResilience } from '../../context/ResilienceContext';
import { DisasterRecoveryConsole } from './DisasterRecoveryConsole';

export const BlackoutSimModal: React.FC = () => {
  const { modalOpen, setModalOpen } = useResilience();

  if (!modalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[92vh] my-4">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center shadow-md">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-white tracking-tight">
                  Disaster Recovery & Tamper-Evident Ledger Sentry
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40">
                  Challenge 1
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                KoparNiti (कोपरनीती) Autonomous Resilience & Deterministic State Reconstruction
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50">
          <DisasterRecoveryConsole />
        </div>
      </div>
    </div>
  );
};
