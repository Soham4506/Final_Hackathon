import React, { useState } from 'react';
import { CivicIssue } from '../../types';
import { useCivic } from '../../context/CivicContext';
import { X, ShieldAlert, AlertTriangle, CheckCircle, FileText } from 'lucide-react';

interface OfficerOverrideModalProps {
  issue: CivicIssue;
  onClose: () => void;
}

export const OfficerOverrideModal: React.FC<OfficerOverrideModalProps> = ({ issue, onClose }) => {
  const { overridePriority, currentUser } = useCivic();

  const currentScore = issue.priorityScore?.finalScore ?? 50;
  const [newScore, setNewScore] = useState<number>(Math.round(currentScore));
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [officerNotes, setOfficerNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      setError('A mandatory justification is required by municipal audit protocol.');
      return;
    }

    overridePriority(issue.id, Number(newScore), overrideReason.trim(), officerNotes.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-950 border border-rose-800 text-rose-400">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Officer Priority Override</h3>
              <p className="text-xs text-slate-400">
                Ticket {issue.ticketNumber} • {issue.title.slice(0, 32)}...
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
          {/* Audit Notice */}
          <div className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-xl text-amber-200 flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-amber-300">Mandatory Municipal Audit Policy: </span>
              All priority overrides are permanently ledgered into council audit logs under Officer ID:
              <span className="font-mono text-white font-bold ml-1">{currentUser.employeeId || currentUser.fullName}</span>.
            </div>
          </div>

          {/* Current Score vs New Score Slider */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Algorithmic Base Score:</span>
              <span className="font-mono font-bold text-slate-300">{currentScore.toFixed(1)} / 100</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-200">New Target Priority Score:</span>
              <span className="font-mono font-extrabold text-lg text-emerald-400">{newScore} / 100</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={newScore}
              onChange={(e) => setNewScore(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0 (De-prioritized)</span>
              <span>50 (Standard)</span>
              <span>100 (Emergency P0)</span>
            </div>
          </div>

          {/* Mandatory Override Reason */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Mandatory Override Justification <span className="text-red-400">*</span>
            </label>
            <select
              value={overrideReason}
              onChange={(e) => {
                setOverrideReason(e.target.value);
                setError('');
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:ring-1 focus:ring-emerald-500 mb-2"
            >
              <option value="">-- Select standard justification reason --</option>
              <option value="On-site structural risk verified higher by field Junior Engineer">
                On-site structural risk verified higher by field Junior Engineer
              </option>
              <option value="VIP / Collector / District Magistrate emergency inspection route">
                VIP / Collector / District Magistrate emergency inspection route
              </option>
              <option value="Upcoming religious festival / weekly market crowd influx">
                Upcoming religious festival / weekly market crowd influx
              </option>
              <option value="Secondary health hazard verified with local hospital medical officer">
                Secondary health hazard verified with local hospital medical officer
              </option>
              <option value="Temporary materials shortage warrants tactical deferral">
                Temporary materials shortage warrants tactical deferral
              </option>
              <option value="Other field operational necessity">Other field operational necessity</option>
            </select>

            <textarea
              rows={2}
              placeholder="Additional officer operational notes or specific site instructions..."
              value={officerNotes}
              onChange={(e) => setOfficerNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {error && <div className="text-red-400 text-xs font-semibold">{error}</div>}

          {/* Action Buttons */}
          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-950"
            >
              <CheckCircle size={14} />
              <span>Authorize & Log Override</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
