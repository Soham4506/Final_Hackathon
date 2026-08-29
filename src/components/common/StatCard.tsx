import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  variant?: 'emerald' | 'amber' | 'crimson' | 'blue' | 'slate';
  trend?: string;
  trendPositive?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  variant = 'slate',
  trend,
  trendPositive = true,
}) => {
  const variantStyles = {
    emerald: 'border-emerald-800/40 bg-emerald-950/20 text-emerald-400',
    amber: 'border-amber-800/40 bg-amber-950/20 text-amber-400',
    crimson: 'border-red-800/40 bg-red-950/20 text-red-400',
    blue: 'border-blue-800/40 bg-blue-950/20 text-blue-400',
    slate: 'border-slate-800 bg-slate-900/60 text-slate-400',
  }[variant];

  return (
    <div className={`p-4 rounded-xl border shadow-sm transition-all hover:border-slate-700 bg-slate-900/80`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-lg border ${variantStyles}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-extrabold text-white tracking-tight font-mono">{value}</span>
        {trend && (
          <span
            className={`text-xs font-medium ${
              trendPositive ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {trend}
          </span>
        )}
      </div>
      {subtext && <p className="mt-1 text-xs text-slate-400 leading-normal">{subtext}</p>}
    </div>
  );
};
