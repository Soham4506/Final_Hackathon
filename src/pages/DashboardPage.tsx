import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCivic } from '../context/CivicContext';
import { StatCard } from '../components/common/StatCard';
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
  const { issues, resources, departments, zones, activePlans } = useCivic();

  // Metrics computation from real context data
  const totalIssues = issues.length;
  const activeIssues = issues.filter((i) => i.status !== 'resolved' && i.status !== 'rejected');
  const criticalIssues = issues.filter((i) => i.urgency === 'critical' && i.status !== 'resolved');
  const resolvedIssues = issues.filter((i) => i.status === 'resolved');
  const scheduledIssues = issues.filter((i) => i.status === 'scheduled' || i.status === 'in_progress');

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

  // Chart data: Issues per Zone/Ward
  const zoneData = zones.map((z) => ({
    name: z.code,
    fullName: z.name,
    issues: issues.filter((i) => i.zoneId === z.id).length,
  }));

  // Highest priority critical queue
  const topCriticalQueue = [...issues]
    .sort((a, b) => (b.priorityScore?.finalScore ?? 0) - (a.priorityScore?.finalScore ?? 0))
    .slice(0, 5);

  const COLORS = ['#059669', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded">
              Shift 1 • Real-time Operations
            </span>
            <span className="text-xs text-slate-400">Ahilyanagar District, Kopargaon</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Municipal Command & Decision Support Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            AI structured triage and deterministic prioritization for constrained municipal fleet, workforce, and departmental budgets.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            onClick={() => navigate('/priority-engine')}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md shadow-emerald-950/50 transition-all"
          >
            <Cpu size={16} />
            <span>Launch Allocation Engine</span>
          </button>
          <button
            onClick={() => navigate('/map')}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-4 py-2.5 rounded-lg transition-all"
          >
            <MapPin size={16} className="text-emerald-400" />
            <span>Civic GIS Map</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Civic Queue"
          value={activeIssues.length}
          subtext="Under evaluation & rectification"
          icon={AlertTriangle}
          variant="amber"
          trend={`${criticalIssues.length} Critical P0`}
          trendPositive={false}
        />
        <StatCard
          title="Critical Emergencies"
          value={criticalIssues.length}
          subtext="Public health & safety threats"
          icon={Flame}
          variant="crimson"
          trend="Score >= 80"
          trendPositive={false}
        />
        <StatCard
          title="Fleet Utilization"
          value={`${resourceUtilizationRate}%`}
          subtext={`${allocatedResources.length} of ${operationalResources.length} units deployed`}
          icon={Truck}
          variant="blue"
          trend="Jetting, Rollers, Bucket"
        />
        <StatCard
          title="Action Plans Generated"
          value={activePlans.length || '1'}
          subtext="Resource-constrained work batches"
          icon={CheckCircle2}
          variant="emerald"
          trend="Shift 1 Active"
        />
      </div>

      {/* Main Grid: Priority Queue + Fleet & Department Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Priority Queue */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-red-950 border border-red-800 text-red-400">
                <Flame size={18} />
              </div>
              <div>
                <h2 className="font-bold text-white text-base">High-Priority Competing Issues</h2>
                <p className="text-xs text-slate-400">Ranked by deterministic multi-factor mathematical formula</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/issues')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>View All ({issues.length})</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          {/* Queue List */}
          <div className="space-y-3">
            {topCriticalQueue.map((issue, idx) => {
              const zone = zones.find((z) => z.id === issue.zoneId);
              const dept = departments.find((d) => d.id === issue.departmentId);

              return (
                <div
                  key={issue.id}
                  onClick={() => navigate(`/issues?selected=${issue.id}`)}
                  className="p-3.5 bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                      #{idx + 1}
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-mono text-emerald-400 font-bold">
                          {issue.ticketNumber}
                        </span>
                        <span className="text-[11px] text-slate-500">•</span>
                        <span className="text-[11px] font-medium text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded">
                          {dept?.code}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <MapPin size={12} />
                          {zone?.name || 'Kopargaon'}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-semibold text-white group-hover:text-emerald-400 line-clamp-1">
                        {issue.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        {issue.rawDescription}
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 border-slate-800/80 pt-2 sm:pt-0">
                    <PriorityBadge
                      score={issue.priorityScore?.finalScore}
                      confidence={issue.confidenceScore}
                      size="sm"
                    />
                    <StatusBadge status={issue.status} size="sm" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Department Capacity & Resource Availability */}
        <div className="space-y-6">
          {/* Department Capacity */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Department Daily Budgets</h3>
              <span className="text-[11px] text-slate-400">Shift 1 Cap</span>
            </div>

            <div className="space-y-3 text-xs">
              {departments.map((dept) => {
                const deptIssues = issues.filter(
                  (i) => i.departmentId === dept.id && (i.status === 'scheduled' || i.status === 'in_progress')
                );
                const allocatedCost = deptIssues.reduce((sum, i) => sum + (i.estimatedCost || 0), 0);
                const percent = Math.min(100, Math.round((allocatedCost / dept.dailyBudgetLimit) * 100));

                return (
                  <div key={dept.id} className="space-y-1">
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="font-medium">{dept.name}</span>
                      <span className="font-mono text-slate-400">
                        ₹{allocatedCost.toLocaleString()} / ₹{dept.dailyBudgetLimit.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          percent > 85
                            ? 'bg-red-500'
                            : percent > 60
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Equipment Readiness */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Truck size={16} className="text-emerald-400" />
                <span>Heavy Fleet Readiness</span>
              </h3>
              <span className="text-[11px] text-slate-400">{resources.length} units</span>
            </div>

            <div className="divide-y divide-slate-800 text-xs">
              {resources.slice(0, 4).map((r) => (
                <div key={r.id} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-200">{r.name}</div>
                    <div className="text-[10px] font-mono text-slate-500">{r.identifierCode}</div>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border capitalize ${
                      r.currentStatus === 'available'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : r.currentStatus === 'allocated'
                        ? 'bg-blue-950 text-blue-300 border-blue-800'
                        : 'bg-amber-950 text-amber-300 border-amber-800'
                    }`}
                  >
                    {r.currentStatus}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Breakdown Row: Ward & Department Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ward Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">Issue Distribution by Kopargaon Ward</h3>
            <span className="text-xs text-slate-400">Total 8 Wards</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, fontSize: 12 }}
                  formatter={(value: any, name: any, item: any) => [
                    `${value} issues`,
                    item.payload.fullName,
                  ]}
                />
                <Bar dataKey="issues" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Workload */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">Active vs Resolved by Department</h3>
            <span className="text-xs text-slate-400">5 Divisions</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="active" fill="#f59e0b" name="Active" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="resolved" fill="#059669" name="Resolved" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
