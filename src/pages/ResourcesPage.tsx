import React, { useState } from 'react';
import { useCivic } from '../context/CivicContext';
import { MunicipalResource, ResourceType } from '../types';
import {
  Truck,
  Wrench,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  Users,
  Plus,
  RefreshCw,
  Sliders,
  Building2,
} from 'lucide-react';

export const ResourcesPage: React.FC = () => {
  const { resources, departments, updateResource, userRole } = useCivic();
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');

  const filteredResources = resources.filter(
    (r) => selectedDeptFilter === 'all' || r.departmentId === selectedDeptFilter
  );

  const operationalCount = resources.filter((r) => r.isOperational).length;
  const allocatedCount = resources.filter((r) => r.currentStatus === 'allocated').length;
  const maintenanceCount = resources.filter((r) => !r.isOperational || r.currentStatus === 'maintenance').length;

  const handleToggleOperational = (resource: MunicipalResource) => {
    const nextOperational = !resource.isOperational;
    updateResource(resource.id, {
      isOperational: nextOperational,
      currentStatus: nextOperational ? 'available' : 'maintenance',
    });
  };

  const handleStatusChange = (resourceId: string, status: 'available' | 'allocated' | 'maintenance') => {
    updateResource(resourceId, {
      currentStatus: status,
      isOperational: status !== 'maintenance',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <Truck size={12} /> Municipal Fleet & Assets
            </span>
            <span className="text-xs text-slate-400">KMC Central Workshop & Depot</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Municipal Resource & Equipment Inventory
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track operational status of jetting machines, road rollers, tipper trucks, and technician shift capacity.
          </p>
        </div>

        {/* Fleet Summary Stats */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-xl text-xs">
            <div className="text-slate-400 text-[10px]">Operational Fleet</div>
            <div className="text-base font-mono font-bold text-emerald-400">
              {operationalCount} / {resources.length}
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-xl text-xs">
            <div className="text-slate-400 text-[10px]">In Maintenance</div>
            <div className="text-base font-mono font-bold text-amber-400">{maintenanceCount}</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto text-xs pb-1">
        <button
          onClick={() => setSelectedDeptFilter('all')}
          className={`px-3 py-2 rounded-xl font-semibold transition-all ${
            selectedDeptFilter === 'all'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          All Departments ({resources.length})
        </button>
        {departments.map((d) => (
          <button
            key={d.id}
            onClick={() => setSelectedDeptFilter(d.id)}
            className={`px-3 py-2 rounded-xl font-semibold transition-all ${
              selectedDeptFilter === d.id
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {d.code} ({resources.filter((r) => r.departmentId === d.id).length})
          </button>
        ))}
      </div>

      {/* Resource Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredResources.map((res) => {
          const dept = departments.find((d) => d.id === res.departmentId);

          return (
            <div
              key={res.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-700 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {res.identifierCode}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">{dept?.code}</span>
                  </div>
                  <h3 className="font-bold text-white text-sm">{res.name}</h3>
                </div>

                <div className="shrink-0">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border capitalize ${
                      res.currentStatus === 'available'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : res.currentStatus === 'allocated'
                        ? 'bg-blue-950 text-blue-300 border-blue-800'
                        : 'bg-amber-950 text-amber-300 border-amber-800'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        res.currentStatus === 'available'
                          ? 'bg-emerald-400'
                          : res.currentStatus === 'allocated'
                          ? 'bg-blue-400'
                          : 'bg-amber-400'
                      }`}
                    />
                    {res.currentStatus}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                {res.capacityDescription}
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-800/80 pt-3">
                <div>
                  <span className="text-[10px] text-slate-500 block">Daily Cost Rate:</span>
                  <span className="font-mono font-semibold text-white">₹{res.dailyCostRate.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Health / Readiness:</span>
                  <span className={`font-semibold ${res.isOperational ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {res.isOperational ? 'Ready for Dispatch' : 'Workshop Repair'}
                  </span>
                </div>
              </div>

              {/* Status Controls for Officers & Admins */}
              {(userRole === 'officer' || userRole === 'admin') && (
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                  <select
                    value={res.currentStatus}
                    onChange={(e) => handleStatusChange(res.id, e.target.value as any)}
                    className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-medium focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="available">Available in Depot</option>
                    <option value="allocated">Allocated to Shift</option>
                    <option value="maintenance">Under Maintenance</option>
                  </select>

                  <button
                    onClick={() => handleToggleOperational(res)}
                    className={`px-2.5 py-1.5 rounded-lg font-medium text-[11px] transition-colors ${
                      res.isOperational
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {res.isOperational ? 'Mark Down' : 'Mark Ready'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
