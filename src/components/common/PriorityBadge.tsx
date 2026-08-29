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
  // Score tiering: Critical (>=80), High (65-79), Moderate (45-64), Low (<45)
  let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
  let tierLabel = 'Standard';
  let dotColor = 'bg-slate-400';

  if (score >= 80) {
    badgeColor = 'bg-red-950/80 text-red-300 border-red-800/80 hover:border-red-600';
    tierLabel = 'Critical P0';
    dotColor = 'bg-red-500 animate-pulse';
  } else if (score >= 65) {
    badgeColor = 'bg-amber-950/80 text-amber-300 border-amber-800/80 hover:border-amber-600';
    tierLabel = 'High P1';
    dotColor = 'bg-amber-400';
  } else if (score >= 45) {
    badgeColor = 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80 hover:border-emerald-600';
    tierLabel = 'Medium P2';
    dotColor = 'bg-emerald-400';
  } else {
    badgeColor = 'bg-blue-950/80 text-blue-300 border-blue-800/80 hover:border-blue-600';
    tierLabel = 'Low P3';
    dotColor = 'bg-blue-400';
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
        className={`inline-flex items-center font-mono rounded-md border font-semibold tracking-tight transition-all shadow-sm ${badgeColor} ${sizeClasses} ${
          onClick ? 'cursor-pointer hover:scale-105' : ''
        }`}
        title="Deterministic Priority Score (Click to view score breakdown)"
      >
        <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
        <span>{score.toFixed(1)}</span>
        <span className="text-[10px] font-sans font-normal opacity-80 uppercase tracking-wider pl-0.5">
          {tierLabel}
        </span>
      </button>

      {showConfidence && confidence < 0.9 && (
        <span
          className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded font-mono"
          title={`Confidence: ${(confidence * 100).toFixed(0)}% (Missing evidence applied score penalty)`}
        >
          {(confidence * 100).toFixed(0)}% conf
        </span>
      )}
    </div>
  );
};
