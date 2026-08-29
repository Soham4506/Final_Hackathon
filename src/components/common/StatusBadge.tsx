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
  let color = 'bg-slate-800 text-slate-300 border-slate-700';
  let label = status.replace('_', ' ');
  let Icon = Clock;

  switch (status) {
    case 'submitted':
      color = 'bg-slate-800 text-slate-300 border-slate-700';
      label = 'Submitted';
      Icon = Clock;
      break;
    case 'triaged':
      color = 'bg-blue-950/80 text-blue-300 border-blue-800';
      label = 'AI Triaged';
      Icon = AlertCircle;
      break;
    case 'prioritized':
      color = 'bg-purple-950/80 text-purple-300 border-purple-800';
      label = 'Prioritized';
      Icon = Flame;
      break;
    case 'scheduled':
      color = 'bg-amber-950/80 text-amber-300 border-amber-800';
      label = 'Scheduled';
      Icon = Calendar;
      break;
    case 'in_progress':
      color = 'bg-cyan-950/80 text-cyan-300 border-cyan-800';
      label = 'In Progress';
      Icon = PlayCircle;
      break;
    case 'resolved':
      color = 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
      label = 'Resolved';
      Icon = CheckCircle2;
      break;
    case 'rejected':
      color = 'bg-rose-950/80 text-rose-300 border-rose-800';
      label = 'Rejected';
      Icon = XCircle;
      break;
    case 'approved':
      color = 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
      label = 'Approved';
      Icon = CheckCircle2;
      break;
    case 'deferred':
      color = 'bg-amber-950/80 text-amber-300 border-amber-800';
      label = 'Deferred (Resource Bottleneck)';
      Icon = Clock;
      break;
    case 'overridden':
      color = 'bg-rose-950/80 text-rose-300 border-rose-800';
      label = 'Officer Overridden';
      Icon = AlertCircle;
      break;
    default:
      break;
  }

  const sizeClasses = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border capitalize shadow-sm ${color} ${sizeClasses}`}
    >
      <Icon size={size === 'sm' ? 12 : 14} />
      <span>{label}</span>
    </span>
  );
};
