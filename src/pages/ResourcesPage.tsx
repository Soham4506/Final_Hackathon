import React, { useState } from 'react';
import { useCivic } from '../context/CivicContext';
import { MunicipalResource, ResourceType } from '../types';
import {
  Truck,
  Users,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Clock,
  IndianRupee,
  PlusCircle,
  Activity,
  Layers,
} from 'lucide-react';

export const ResourcesPage: React.FC = () => {
  const { resources, departments, updateResource } = useCivic();

  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

  const filteredResources = resources.filter((res) => {
    if (selectedDeptFilter !== 'all' && res.departmentId !== selectedDeptFilter) return false;
    if (selectedTypeFilter !== 'all' && res.resourceType !== selectedTypeFilter) return false;
    return true;
  });

  const operationalCount = resources.filter((r) => r.isOperational).length;
  const inUseCount = resources.filter((r) => r.currentStatus === 'allocated').length;

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="bg-white border border-[#76777d]/20 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <Truck size={12} /> Municipal Fleet Telematics
            </span>
            <span className="text-xs text-[#76777d]">Shift 1 Inventory & Status</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1b1b1d] tracking-tight">
            Fleet & Machinery Inventory
          </h1>
          <p className="text-xs sm:text-sm text-[#57657b] mt-1">
            Track operational readiness, daily deployment costs, and maintenance statuses of heavy civic machinery.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold font-mono">
            {operationalCount} / {resources.length} Units Ready
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#76777d]/20 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#76777d]">Total Heavy Units</span>
            <div className="text-2xl font-bold text-[#1b1b1d] font-mono mt-1">{resources.length} Vehicles</div>
          </div>
          <div className="p-2 rounded-xl bg-slate-100 text-[#131b2e]">
            <Truck size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#76777d]/20 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#76777d]">Operational Readiness</span>
            <div className="text-2xl font-bold text-emerald-700 font-mono mt-1">
              {Math.round((operationalCount / (resources.length || 1)) * 100)}%
            </div>
          </div>
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#76777d]/20 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#76777d]">Currently Dispatched</span>
            <div className="text-2xl font-bold text-blue-700 font-mono mt-1">{inUseCount} Units</div>
          </div>
          <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
            <Activity size={20} />
          </div>
        </div>
      </div>

      {/* Resources Table */}
      <div className="bg-white border border-[#76777d]/20 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#76777d]/15 flex justify-between items-center bg-[#fcf8fa]">
          <h2 className="font-bold text-xs uppercase tracking-wider text-[#1b1b1d]">
            Municipal Equipment Register
          </h2>
          <div className="flex gap-2 text-xs">
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="bg-white border border-[#76777d]/20 rounded-lg px-2.5 py-1 text-[#1b1b1d] font-medium"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.code}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="divide-y divide-[#76777d]/15">
          {filteredResources.map((res) => {
            const dept = departments.find((d) => d.id === res.departmentId);

            return (
              <div
                key={res.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#131b2e]">{res.identifierCode}</span>
                    <span className="text-[#76777d]">•</span>
                    <span className="text-blue-700 font-bold">{dept?.code || 'KMC'}</span>
                  </div>
                  <h3 className="font-bold text-sm text-[#1b1b1d]">{res.name}</h3>
                  <p className="text-[#57657b] text-xs">{res.capacityDescription}</p>
                </div>

                <div className="flex items-center gap-4 shrink-0 font-mono">
                  <div className="text-right">
                    <div className="font-bold text-[#1b1b1d]">₹{res.dailyCostRate.toLocaleString()}</div>
                    <div className="text-[10px] text-[#76777d]">daily rate</div>
                  </div>

                  <button
                    onClick={() => updateResource(res.id, { isOperational: !res.isOperational })}
                    className={`px-3 py-1.5 rounded-lg font-bold uppercase text-[10px] transition-colors ${
                      res.isOperational
                        ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                        : 'bg-red-100 hover:bg-red-200 text-red-800'
                    }`}
                  >
                    {res.isOperational ? 'Operational' : 'In Maintenance'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
