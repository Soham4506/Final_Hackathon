import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCivic } from '../context/CivicContext';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  Truck,
  Cpu,
  Layers,
  MapPin,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Zap,
  Activity,
  Gavel,
  Sliders,
  Waves,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { issues, resources, departments, zones, activePlans, damTelemetry, language } = useCivic();

  const totalIssues = issues.length;
  const activeIssues = issues.filter((i) => i.status !== 'resolved' && i.status !== 'rejected');
  const criticalIssues = issues.filter((i) => i.urgency === 'critical' && i.status !== 'resolved');
  const resolvedIssues = issues.filter((i) => i.status === 'resolved');

  const operationalResources = resources.filter((r) => r.isOperational);
  const allocatedResources = resources.filter((r) => r.currentStatus === 'allocated');
  const resourceUtilizationRate = operationalResources.length > 0 
    ? Math.round((allocatedResources.length / operationalResources.length) * 100) 
    : 0;

  // Chart data: Issues per Department
  const deptData = departments.map((dept) => {
    const count = issues.filter((i) => i.departmentId === dept.id).length;
    const resolved = issues.filter((i) => i.departmentId === dept.id && i.status === 'resolved').length;
    return {
      name: dept.code,
      fullName: dept.name,
      total: count,
      active: count - resolved,
      resolved,
    };
  });

  // Highest priority critical queue
  const topCriticalQueue = [...issues]
    .sort((a, b) => (b.priorityScore?.finalScore ?? 0) - (a.priorityScore?.finalScore ?? 0))
    .slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-xs transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-muted text-foreground border border-border text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <Activity size={12} className="text-emerald-500" />
              Shift 1 • Real-time Operations
            </span>
            <span className="text-xs text-muted-foreground">Ahilyanagar District, Kopargaon</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            KoparNiti: Municipal Command & Operational Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
            कोपरनीती — Deterministic prioritization and multi-strategy optimization for constrained municipal fleet, workforce, and departmental budgets.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            onClick={() => navigate('/flood-priority')}
            className="flex items-center gap-2 bg-gradient-to-r from-rose-700 to-red-700 hover:from-rose-600 hover:to-red-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all tracking-wider uppercase border border-rose-500/30 cursor-pointer"
          >
            <Waves size={14} className="animate-pulse" />
            <span>Flood Alert Dispatch</span>
          </button>
          <button
            onClick={() => navigate('/priority-engine')}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all tracking-wider uppercase cursor-pointer"
          >
            <Gavel size={14} />
            <span>Decision Workbench</span>
          </button>
          <button
            onClick={() => navigate('/citizen-portal')}
            className="flex items-center gap-1.5 bg-card hover:bg-muted text-foreground border border-border text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-xs transition-all uppercase tracking-wider cursor-pointer"
          >
            <span>Citizen Portal</span>
          </button>
        </div>
      </div>

      {/* Flood Early Warning Telemetry Card */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950 via-slate-900 to-slate-950 border border-rose-800/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-rose-600 text-white shadow-md">
            <Waves size={20} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">Godavari River Flood Inflow & Dam Surge Telemetry</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-rose-900 text-rose-200 border border-rose-700">
                {damTelemetry.alertLevel.replace('_', ' ')}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Upstream Dam Discharge: <strong className="text-rose-400 font-mono">{damTelemetry.currentDischargeCusecs.toLocaleString()} Cusecs</strong> • Gauge Level: <strong className="text-white font-mono">{damTelemetry.waterLevelMeters} m</strong> (Danger: 498.5 m)
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/flood-priority')}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shrink-0 shadow-sm cursor-pointer"
        >
          <span>Resource Sequence →</span>
        </button>
      </div>

      {/* Top KPI Strip (6 Cards in Modern Blackout / Light Theme Style) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1 */}
        <div className="bg-card p-4 rounded-xl border border-border shadow-xs flex flex-col justify-between transition-colors">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Active Issues
          </span>
          <div className="flex items-end justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight font-mono">
              {activeIssues.length}
            </span>
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* KPI 2 - Critical Priority */}
        <div className="bg-card p-4 rounded-xl border border-destructive/30 shadow-xs flex flex-col justify-between relative overflow-hidden transition-colors">
          <div className="absolute inset-0 bg-destructive/5 border-l-4 border-destructive"></div>
          <div className="relative z-10 flex flex-col justify-between h-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-destructive mb-2">
              Critical Urgency
            </span>
            <div className="flex items-end justify-between">
              <span className="text-2xl sm:text-3xl font-bold text-destructive tracking-tight font-mono">
                {criticalIssues.length}
              </span>
              <div className="p-1.5 rounded-lg bg-destructive/10 text-destructive">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* KPI 3 - Resources Deployed */}
        <div className="bg-card p-4 rounded-xl border border-border shadow-xs flex flex-col justify-between transition-colors">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Fleet Deployed
          </span>
          <div className="flex items-end justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight font-mono">
              {resourceUtilizationRate}%
            </span>
            <div className="w-12 h-2 bg-muted rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${resourceUtilizationRate}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-card p-4 rounded-xl border border-border shadow-xs flex flex-col justify-between transition-colors">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Workforce Units
          </span>
          <div className="flex items-end justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight font-mono">
              {operationalResources.length} / {resources.length}
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Truck className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* KPI 5 */}
        <div className="bg-card p-4 rounded-xl border border-border shadow-xs flex flex-col justify-between transition-colors">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Resolved Today
          </span>
          <div className="flex items-end justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight font-mono">
              {resolvedIssues.length}
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* KPI 6 */}
        <div className="bg-card p-4 rounded-xl border border-border shadow-xs flex flex-col justify-between transition-colors">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Shift Plans
          </span>
          <div className="flex items-end justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight font-mono">
              {activePlans.length > 0 ? activePlans.length : '1 Draft'}
            </span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Priority Ranked Competing Issues + Department Allocations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: High-Priority Competing Issues */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-destructive/10 text-destructive">
                <Flame size={16} />
              </div>
              <div>
                <h2 className="font-bold text-sm text-foreground uppercase tracking-wider">
                  Top Priority Ranked Competing Grievances
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Prioritized by deterministic multi-factor algorithm
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/issues')}
              className="text-xs text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All ({issues.length})</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          {topCriticalQueue.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-xs space-y-2">
              <p>No civic issues currently queued in the system.</p>
              <button
                onClick={() => navigate('/citizen-portal')}
                className="text-primary font-bold underline cursor-pointer"
              >
                Submit a new grievance to initiate engine →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {topCriticalQueue.map((issue, idx) => (
                <div
                  key={issue.id}
                  onClick={() => navigate('/issues')}
                  className="p-3.5 bg-muted/40 hover:bg-muted border border-border rounded-xl cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-primary">
                        #{idx + 1} • {issue.ticketNumber}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-[11px] text-muted-foreground truncate">
                        {issue.locationAddress}
                      </span>
                    </div>
                    <h3 className="font-bold text-xs text-foreground group-hover:text-primary truncate">
                      {issue.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <PriorityBadge
                      score={issue.priorityScore?.finalScore}
                      confidence={issue.confidenceScore}
                      size="sm"
                    />
                    <StatusBadge status={issue.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Department Daily Budgets & Readiness */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4 transition-colors">
          <div className="border-b border-border pb-3">
            <h2 className="font-bold text-sm text-foreground uppercase tracking-wider">
              Department Daily Budgets
            </h2>
            <p className="text-[11px] text-muted-foreground">Shift 1 Financial & Resource Limits</p>
          </div>

          <div className="space-y-3 text-xs">
            {departments.map((dept) => {
              const deptIssues = issues.filter((i) => i.departmentId === dept.id);
              const estBudgetSpent = deptIssues.reduce((acc, curr) => acc + (curr.estimatedCost || 0), 0);
              const pct = Math.min(100, Math.round((estBudgetSpent / dept.dailyBudgetLimit) * 100));

              return (
                <div key={dept.id} className="space-y-1 p-2.5 bg-muted/40 rounded-xl border border-border">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-foreground">{dept.name}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      ₹{estBudgetSpent.toLocaleString()} / ₹{dept.dailyBudgetLimit.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct > 80 ? 'bg-destructive' : 'bg-primary'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Heavy Fleet Summary Card */}
          <div className="pt-2 border-t border-border">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-xs text-foreground uppercase tracking-wider">
                Heavy Fleet Readiness
              </span>
              <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                {operationalResources.length} Units Available
              </span>
            </div>
            <div className="space-y-1.5 text-xs">
              {resources.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-2 bg-muted/40 rounded-lg border border-border text-[11px]"
                >
                  <span className="font-medium text-foreground truncate max-w-[180px]">{r.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                      r.isOperational
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-destructive/15 text-destructive'
                    }`}
                  >
                    {r.isOperational ? 'Ready' : 'Maintenance'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
