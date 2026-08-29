import React, { useState } from 'react';
import { useCivic } from '../context/CivicContext';
import { CivicIssue } from '../types';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { ExplainabilityModal } from '../components/common/ExplainabilityModal';
import {
  MapPin,
  Layers,
  Flame,
  AlertTriangle,
  Building2,
  Navigation,
  CheckCircle2,
  Clock,
  Filter,
  Eye,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';

// Custom Leaflet Pin Icon generator
const createCustomIcon = (score: number, urgency: string) => {
  let color = '#22c55e'; // green
  if (score >= 80 || urgency === 'critical') color = '#ef4444'; // red
  else if (score >= 65 || urgency === 'high') color = '#f59e0b'; // amber
  else if (score < 45) color = '#3b82f6'; // blue

  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="32" height="32" stroke="#ffffff" stroke-width="1.5">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `;

  return L.divIcon({
    html: svgIcon,
    className: 'custom-leaflet-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

export const CivicMapPage: React.FC = () => {
  const { issues, zones, departments } = useCivic();
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [selectedIssue, setSelectedIssue] = useState<CivicIssue | null>(null);
  const [explainIssue, setExplainIssue] = useState<CivicIssue | null>(null);

  // Kopargaon Coordinates: ~19.8920, 74.4850
  const KOPARGAON_CENTER: [number, number] = [19.8920, 74.4850];

  const filteredIssues = issues.filter(
    (i) => selectedDeptFilter === 'all' || i.departmentId === selectedDeptFilter
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <MapPin size={12} /> GIS Spatial Layer
            </span>
            <span className="text-xs text-slate-400">Kopargaon Wards 1 to 8</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Civic Spatial GIS & Vulnerability Map
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Geo-spatial mapping of competing civic emergencies overlaid on hospital, school, and flood risk zones.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 font-medium"
          >
            <option value="all">All Departments ({issues.length})</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} ({issues.filter((i) => i.departmentId === d.id).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Map + Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaflet Map (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm h-[600px] relative">
          <MapContainer
            center={KOPARGAON_CENTER}
            zoom={14}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', backgroundColor: '#020617' }}
          >
            {/* Dark Matter / Standard OpenStreetMap Tiles */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Ward Buffer Zones */}
            {zones.map((zone) => {
              if (!zone.coordinates) return null;
              return (
                <Circle
                  key={zone.id}
                  center={zone.coordinates}
                  radius={450}
                  pathOptions={{
                    color: zone.riskFactor >= 1.4 ? '#ef4444' : '#059669',
                    fillColor: zone.riskFactor >= 1.4 ? '#ef4444' : '#059669',
                    fillOpacity: 0.08,
                    weight: 1,
                    dashArray: '4, 4',
                  }}
                />
              );
            })}

            {/* Issue Markers */}
            {filteredIssues.map((issue) => {
              const score = issue.priorityScore?.finalScore ?? 50;
              const icon = createCustomIcon(score, issue.urgency);

              return (
                <Marker
                  key={issue.id}
                  position={[issue.latitude, issue.longitude]}
                  icon={icon}
                  eventHandlers={{
                    click: () => setSelectedIssue(issue),
                  }}
                >
                  <Popup className="custom-leaflet-popup">
                    <div className="p-2 space-y-1 text-slate-900">
                      <div className="font-mono text-xs font-bold text-emerald-800">
                        {issue.ticketNumber}
                      </div>
                      <div className="font-bold text-xs leading-snug">{issue.title}</div>
                      <div className="text-[11px] text-slate-600">{issue.locationAddress}</div>
                      <div className="pt-1 flex items-center justify-between">
                        <span className="font-mono text-xs font-bold">
                          Score: {score.toFixed(1)}/100
                        </span>
                        <span className="text-[10px] uppercase font-semibold text-slate-500">
                          {issue.urgency}
                        </span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Map Legend Floating Overlay */}
          <div className="absolute bottom-4 left-4 z-[1000] bg-slate-950/90 border border-slate-800 p-3 rounded-xl shadow-xl text-[11px] text-slate-300 space-y-1.5 backdrop-blur-sm">
            <div className="font-bold text-white uppercase text-[10px] tracking-wider mb-1">
              Priority Risk Legend
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              <span>Critical Emergency (Score ≥ 80)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>High Priority (65 - 79)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Medium / Scheduled (45 - 64)</span>
            </div>
          </div>
        </div>

        {/* Selected Point Inspector (1 Col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <MapPin size={16} className="text-emerald-400" />
              <span>Spatial Issue Inspector</span>
            </h3>
            {selectedIssue && (
              <span className="text-xs font-mono text-emerald-400 font-bold">
                {selectedIssue.ticketNumber}
              </span>
            )}
          </div>

          {selectedIssue ? (
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  Location & Ward
                </span>
                <div className="font-semibold text-white mt-0.5">{selectedIssue.locationAddress}</div>
                <div className="font-mono text-[11px] text-slate-400">
                  {selectedIssue.latitude.toFixed(4)}° N, {selectedIssue.longitude.toFixed(4)}° E
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  Issue Title
                </span>
                <div className="font-bold text-white text-sm mt-0.5">{selectedIssue.title}</div>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  {selectedIssue.rawDescription}
                </p>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Priority Score:</span>
                  <PriorityBadge
                    score={selectedIssue.priorityScore?.finalScore}
                    confidence={selectedIssue.confidenceScore}
                    size="sm"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Current Status:</span>
                  <StatusBadge status={selectedIssue.status} size="sm" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Estimated Cost:</span>
                  <span className="font-mono font-semibold text-white">
                    ₹{selectedIssue.estimatedCost.toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setExplainIssue(selectedIssue)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs shadow-md shadow-emerald-950 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Eye size={14} />
                <span>Inspect Deterministic Formula Breakdown</span>
              </button>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 text-xs space-y-2">
              <Navigation size={28} className="mx-auto text-slate-600 opacity-60" />
              <p>Click any map marker pin to view spatial risk analysis and ticket details.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {explainIssue && (
        <ExplainabilityModal issue={explainIssue} onClose={() => setExplainIssue(null)} />
      )}
    </div>
  );
};
