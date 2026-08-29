import React from 'react';
import { ShieldAlert, ShieldCheck, AlertCircle, Info } from 'lucide-react';

interface PriorityBadgeProps {
  score?: number;
  confidence?: number;
  showConfidence?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  score = 50,
  confidence = 1.0,
  showConfidence = true,
  size = 'md',
  onClick,
}) => {
  // Score tiering matching KMC Operational Intelligence UI
  let badgeColor = 'bg-slate-100 text-slate-800 border-slate-200';
  let tierLabel = 'Standard';
  let dotColor = 'bg-slate-500';

  if (score >= 80) {
    badgeColor = 'bg-red-50 text-[#ba1a1a] border-red-200 hover:border-red-400';
    tierLabel = 'Critical P0';
    dotColor = 'bg-[#ba1a1a] animate-pulse';
  } else if (score >= 65) {
    badgeColor = 'bg-amber-50 text-amber-900 border-amber-200 hover:border-amber-400';
    tierLabel = 'High P1';
    dotColor = 'bg-amber-500';
  } else if (score >= 45) {
    badgeColor = 'bg-blue-50 text-blue-900 border-blue-200 hover:border-blue-400';
    tierLabel = 'Medium P2';
    dotColor = 'bg-blue-600';
  } else {
    badgeColor = 'bg-slate-100 text-slate-800 border-slate-200 hover:border-slate-400';
    tierLabel = 'Low P3';
    dotColor = 'bg-slate-500';
  }

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-2',
    lg: 'text-sm px-3.5 py-1.5 gap-2.5 font-bold',
  }[size];

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center font-mono rounded-lg border font-bold tracking-tight transition-all shadow-xs ${badgeColor} ${sizeClasses} ${
          onClick ? 'cursor-pointer hover:scale-105' : ''
        }`}
        title="Deterministic Priority Score (Click to view score breakdown)"
      >
        <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
        <span>{score.toFixed(1)}</span>
        <span className="text-[10px] font-sans font-semibold opacity-90 uppercase tracking-wider pl-0.5">
          {tierLabel}
        </span>
      </button>

      {showConfidence && confidence < 0.9 && (
        <span
          className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold"
          title={`Confidence: ${(confidence * 100).toFixed(0)}% (Missing evidence applied penalty)`}
        >
          {(confidence * 100).toFixed(0)}% conf
        </span>
      )}
    </div>
  );
};
