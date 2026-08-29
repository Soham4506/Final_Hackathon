import React from 'react';
import { IssueStatus, PlanStatus, PlanItemStatus } from '../../types';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  PlayCircle, 
  XCircle, 
  Flame 
} from 'lucide-react';

interface StatusBadgeProps {
  status: IssueStatus | PlanStatus | PlanItemStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  let color = 'bg-slate-100 text-slate-800 border-slate-200';
  let label = status.replace('_', ' ');
  let Icon = Clock;

  switch (status) {
    case 'submitted':
      color = 'bg-slate-100 text-slate-800 border-slate-200';
      label = 'Submitted';
      Icon = Clock;
      break;
    case 'triaged':
      color = 'bg-blue-50 text-blue-800 border-blue-200';
      label = 'AI Triaged';
      Icon = AlertCircle;
      break;
    case 'prioritized':
      color = 'bg-purple-50 text-purple-800 border-purple-200';
      label = 'Prioritized';
      Icon = Flame;
      break;
    case 'scheduled':
      color = 'bg-amber-50 text-amber-900 border-amber-200';
      label = 'Scheduled';
      Icon = Calendar;
      break;
    case 'in_progress':
      color = 'bg-cyan-50 text-cyan-900 border-cyan-200';
      label = 'In Progress';
      Icon = PlayCircle;
      break;
    case 'resolved':
      color = 'bg-emerald-50 text-emerald-900 border-emerald-200';
      label = 'Resolved';
      Icon = CheckCircle2;
      break;
    case 'rejected':
      color = 'bg-red-50 text-red-900 border-red-200';
      label = 'Rejected';
      Icon = XCircle;
      break;
    case 'approved':
      color = 'bg-emerald-50 text-emerald-900 border-emerald-200';
      label = 'Approved';
      Icon = CheckCircle2;
      break;
    case 'deferred':
      color = 'bg-amber-50 text-amber-900 border-amber-200';
      label = 'Deferred (Bottleneck)';
      Icon = Clock;
      break;
    case 'overridden':
      color = 'bg-red-50 text-red-900 border-red-200';
      label = 'Officer Overridden';
      Icon = AlertCircle;
      break;
    default:
      break;
  }

  const sizeClasses = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold rounded-lg border capitalize shadow-xs ${color} ${sizeClasses}`}
    >
      <Icon size={size === 'sm' ? 12 : 14} />
      <span>{label}</span>
    </span>
  );
};
