import React, { useState } from 'react';
import { CivicIssue } from '../../types';
import { useCivic } from '../../context/CivicContext';
import { ExplainabilityService, ComparativeExplanation } from '../../services/explainabilityService';
import { 
  X, 
  HelpCircle, 
  CheckCircle, 
  AlertTriangle, 
  Sliders, 
  Scale, 
  Users, 
  Clock, 
  MapPin, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { PriorityBadge } from './PriorityBadge';

interface ExplainabilityModalProps {
  issue: CivicIssue;
  onClose: () => void;
}

export const ExplainabilityModal: React.FC<ExplainabilityModalProps> = ({ issue, onClose }) => {
  const { issues, weightConfig } = useCivic();
  const [selectedCompareIssueId, setSelectedCompareIssueId] = useState<string>('');

  const score = issue.priorityScore;
  const breakdown = score?.breakdown;

  // Other candidate issues for comparative explainability
  const otherIssues = issues.filter((i) => i.id !== issue.id);
  const compareIssue = otherIssues.find((i) => i.id === selectedCompareIssueId);

  let comparativeResult: ComparativeExplanation | null = null;
  if (compareIssue) {
    comparativeResult = ExplainabilityService.compareIssues(issue, compareIssue);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-8 text-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400">
              <Scale size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-emerald-400 font-bold">{issue.ticketNumber}</span>
                <span className="text-slate-400">•</span>
                <h3 className="text-base font-bold text-white truncate max-w-md">{issue.title}</h3>
              </div>
              <p className="text-xs text-slate-400">
                Deterministic Priority Score & Explainable Factor Breakdown
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
          {/* Top Score Banner */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-center sm:text-left">
                <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                  Deterministic Composite Score
                </div>
                <div className="text-3xl font-extrabold text-white font-mono flex items-center gap-2">
                  <span>{score?.finalScore.toFixed(1) || '50.0'}</span>
                  <span className="text-sm font-normal text-slate-500">/ 100</span>
                </div>
              </div>
              <PriorityBadge score={score?.finalScore} confidence={issue.confidenceScore} size="lg" />
            </div>

            <div className="text-right sm:border-l sm:border-slate-800 sm:pl-4">
              <div className="text-[11px] text-slate-400">Confidence Rating</div>
              <div className="font-mono text-emerald-400 font-semibold text-base">
                {((issue.confidenceScore ?? 1.0) * 100).toFixed(0)}%
              </div>
              <div className="text-[10px] text-slate-500">
                {issue.missingAttributes.length === 0
                  ? 'Complete field validation'
                  : `Missing: ${issue.missingAttributes.join(', ')}`}
              </div>
            </div>
          </div>

          {/* Explainability Summary Callout */}
          <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-xl p-4 text-emerald-200">
            <div className="font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
              <HelpCircle size={15} />
              <span>Municipal Explainability Summary</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {score?.explanationSummary || 'Issue scored based on standard municipal matrix.'}
            </p>
          </div>

          {/* Mathematical Decomposition Grid */}
          <div>
            <h4 className="font-bold text-white uppercase text-xs tracking-wider mb-3 flex items-center gap-2">
              <Sliders size={15} className="text-emerald-400" />
              <span>Deterministic Formula Decomposition</span>
              <span className="text-[10px] font-mono text-slate-500 lowercase font-normal">
                (weights configured by council admin)
              </span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* 1. Severity */}
              <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-red-400" /> Severity (Risk)
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    w = {((weightConfig.weightSeverity) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-slate-400 text-xs">Raw Score:</span>
                  <span className="font-mono font-bold text-white">{breakdown?.rawSeverity}/100</span>
                </div>
                <div className="flex items-baseline justify-between mt-1 text-emerald-400 font-mono font-semibold">
                  <span>Weighted Impact:</span>
                  <span>+{breakdown?.weightedSeverity.toFixed(1)} pts</span>
                </div>
              </div>

              {/* 2. Urgency & SLA */}
              <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Clock size={14} className="text-amber-400" /> SLA Urgency
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    w = {((weightConfig.weightUrgency) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-slate-400 text-xs">SLA Elapsed:</span>
                  <span className="font-mono font-bold text-white">{breakdown?.rawUrgency}%</span>
                </div>
                <div className="flex items-baseline justify-between mt-1 text-emerald-400 font-mono font-semibold">
                  <span>Weighted Impact:</span>
                  <span>+{breakdown?.weightedUrgency.toFixed(1)} pts</span>
                </div>
              </div>

              {/* 3. Affected Population */}
              <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Users size={14} className="text-blue-400" /> Population Spread
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    w = {((weightConfig.weightPopulation) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-slate-400 text-xs">Estimated Count:</span>
                  <span className="font-mono font-bold text-white">
                    {issue.affectedPopulationEstimate.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1 text-emerald-400 font-mono font-semibold">
                  <span>Weighted Impact:</span>
                  <span>+{breakdown?.weightedPopulation.toFixed(1)} pts</span>
                </div>
              </div>

              {/* 4. Location Multiplier */}
              <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <MapPin size={14} className="text-purple-400" /> Ward Risk Multiplier
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    w = {((weightConfig.weightLocation) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-slate-400 text-xs">Ward Weight:</span>
                  <span className="font-mono font-bold text-white">{breakdown?.rawLocationMultiplier}/100</span>
                </div>
                <div className="flex items-baseline justify-between mt-1 text-emerald-400 font-mono font-semibold">
                  <span>Weighted Impact:</span>
                  <span>+{breakdown?.weightedLocation.toFixed(1)} pts</span>
                </div>
              </div>

              {/* 5. Repeat Escalation */}
              <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Layers size={14} className="text-orange-400" /> Escalation Reports
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    w = {((weightConfig.weightEscalation) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-slate-400 text-xs">Report Count:</span>
                  <span className="font-mono font-bold text-white">{issue.escalationCount}</span>
                </div>
                <div className="flex items-baseline justify-between mt-1 text-emerald-400 font-mono font-semibold">
                  <span>Weighted Impact:</span>
                  <span>+{breakdown?.weightedEscalation.toFixed(1)} pts</span>
                </div>
              </div>

              {/* 6. Confidence Penalty Deduction & Field Verification Loop */}
              <div className={`p-3.5 rounded-xl border ${
                issue.fieldVerificationStatus === 'verified'
                  ? 'bg-emerald-950/40 border-emerald-800'
                  : (breakdown?.confidencePenaltyDeduction ?? 0) > 0
                  ? 'bg-slate-950/60 border-red-900/40'
                  : 'bg-slate-950/60 border-slate-800'
              }`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <AlertTriangle size={14} className={issue.fieldVerificationStatus === 'verified' ? 'text-emerald-400' : 'text-red-400'} /> Confidence Penalty
                  </span>
                  <span className={`text-[10px] font-mono font-bold ${issue.fieldVerificationStatus === 'verified' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {issue.fieldVerificationStatus === 'verified' ? 'RESTORED' : 'DEDUCTION'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-slate-400 text-xs">Verification:</span>
                  <span className="font-mono font-bold text-slate-300">
                    {issue.fieldVerificationStatus === 'verified'
                      ? 'Verified On-Site'
                      : issue.fieldVerificationStatus === 'pending'
                      ? 'Field Inspection Pending'
                      : 'Missing Evidence'}
                  </span>
                </div>
                <div className={`flex items-baseline justify-between mt-1 font-mono font-semibold ${issue.fieldVerificationStatus === 'verified' ? 'text-emerald-400' : 'text-red-400'}`}>
                  <span>Score Impact:</span>
                  <span>
                    {issue.fieldVerificationStatus === 'verified'
                      ? '0.0 pts (Restored)'
                      : `-${breakdown?.confidencePenaltyDeduction.toFixed(1)} pts`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Comparative Pairwise Analysis Tool */}
          <div className="border-t border-slate-800 pt-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <h4 className="font-bold text-white uppercase text-xs tracking-wider flex items-center gap-2">
                  <Scale size={15} className="text-amber-400" />
                  <span>Comparative Pairwise Explainability</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Select another civic issue to inspect exactly why one ranks over the other.
                </p>
              </div>

              <select
                value={selectedCompareIssueId}
                onChange={(e) => setSelectedCompareIssueId(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 font-mono focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">-- Select issue to compare --</option>
                {otherIssues.map((oth) => (
                  <option key={oth.id} value={oth.id}>
                    {oth.ticketNumber} ({oth.priorityScore?.finalScore.toFixed(1)} pts) - {oth.title.slice(0, 30)}...
                  </option>
                ))}
              </select>
            </div>

            {comparativeResult && compareIssue && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="p-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 flex items-start gap-2">
                  <ArrowRight size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{comparativeResult.summary}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2 px-3">Decision Factor</th>
                        <th className="py-2 px-3">{issue.ticketNumber} (Current)</th>
                        <th className="py-2 px-3">{compareIssue.ticketNumber}</th>
                        <th className="py-2 px-3">Engine Assessment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {comparativeResult.factors.map((f, i) => (
                        <tr key={i} className="hover:bg-slate-900/50">
                          <td className="py-2 px-3 font-medium text-slate-200">{f.factor}</td>
                          <td
                            className={`py-2 px-3 font-mono font-semibold ${
                              f.winner === 'A' ? 'text-emerald-400' : 'text-slate-400'
                            }`}
                          >
                            {f.issueAValue}
                          </td>
                          <td
                            className={`py-2 px-3 font-mono font-semibold ${
                              f.winner === 'B' ? 'text-emerald-400' : 'text-slate-400'
                            }`}
                          >
                            {f.issueBValue}
                          </td>
                          <td className="py-2 px-3 text-slate-400">{f.impactDescription}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
};
