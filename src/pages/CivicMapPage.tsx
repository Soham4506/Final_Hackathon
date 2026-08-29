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
  Hospital,
  Shield,
  Truck,
  Bus,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, Tooltip as LeafletTooltip } from 'react-leaflet';
import L from 'leaflet';

// Custom Marker Icons
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

const createPOIIcon = (emoji: string) => {
  return L.divIcon({
    html: `<div style="background-color: #0f172a; border: 2px solid #38bdf8; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.5);">${emoji}</div>`,
    className: 'custom-leaflet-poi',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

// Authentic Geographic Boundaries for Kopargaon Wards 1 to 8
const KOPARGAON_WARD_POLYGONS: { id: string; name: string; ward: string; coords: [number, number][]; color: string }[] = [
  {
    id: 'z-01',
    ward: 'Ward 1',
    name: 'Godavari Ghat & Temple Sector',
    color: '#3b82f6',
    coords: [
      [19.8970, 74.4740],
      [19.8990, 74.4810],
      [19.8920, 74.4820],
      [19.8910, 74.4750],
    ],
  },
  {
    id: 'z-02',
    ward: 'Ward 2',
    name: 'Shivaji Nagar North',
    color: '#10b981',
    coords: [
      [19.8990, 74.4810],
      [19.9040, 74.4840],
      [19.9010, 74.4890],
      [19.8960, 74.4850],
    ],
  },
  {
    id: 'z-03',
    ward: 'Ward 3',
    name: 'Subhash Chowk & Market Center',
    color: '#f59e0b',
    coords: [
      [19.8920, 74.4820],
      [19.8960, 74.4850],
      [19.8900, 74.4880],
      [19.8880, 74.4840],
    ],
  },
  {
    id: 'z-04',
    ward: 'Ward 4',
    name: 'Civil Hospital & Station Road Corridor',
    color: '#ef4444',
    coords: [
      [19.8900, 74.4880],
      [19.8930, 74.4940],
      [19.8840, 74.4950],
      [19.8830, 74.4870],
    ],
  },
  {
    id: 'z-05',
    ward: 'Ward 5',
    name: 'Indira Nagar & School Cluster',
    color: '#8b5cf6',
    coords: [
      [19.8960, 74.4890],
      [19.9010, 74.4960],
      [19.8940, 74.4980],
      [19.8930, 74.4910],
    ],
  },
  {
    id: 'z-08',
    ward: 'Ward 8',
    name: 'Gautam Nagar & Bus Terminal Route',
    color: '#ec4899',
    coords: [
      [19.8880, 74.4780],
      [19.8910, 74.4840],
      [19.8850, 74.4860],
      [19.8830, 74.4800],
    ],
  },
];

const CRITICAL_POIS = [
  { name: 'Kopargaon Civil Hospital & Maternity Unit', type: 'Hospital', coords: [19.8878, 74.4891] as [number, number], emoji: '🏥' },
  { name: 'Shri Balaji Mandir & Godavari Ghats', type: 'Temple', coords: [19.8948, 74.4789] as [number, number], emoji: '🛕' },
  { name: 'Subhash Chowk Central Market Yard', type: 'Market', coords: [19.8915, 74.4849] as [number, number], emoji: '🛒' },
  { name: 'Kopargaon MSRTC Bus Terminal', type: 'Transit', coords: [19.8898, 74.4816] as [number, number], emoji: '🚌' },
  { name: 'Kopargaon Railway Junction', type: 'Station', coords: [19.8824, 74.4942] as [number, number], emoji: '🚆' },
];

export const CivicMapPage: React.FC = () => {
  const { issues, zones, departments, resources, t } = useCivic();
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [showBoundaries, setShowBoundaries] = useState<boolean>(true);
  const [showPOIs, setShowPOIs] = useState<boolean>(true);
  const [selectedIssue, setSelectedIssue] = useState<CivicIssue | null>(null);
  const [explainIssue, setExplainIssue] = useState<CivicIssue | null>(null);

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
            <span className="text-xs text-slate-400">Kopargaon Municipal Boundaries</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {t.civicMap}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Geo-spatial mapping of competing civic emergencies overlaid on hospital, school, and flood risk zones.
          </p>
        </div>

        {/* Layer Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowBoundaries(!showBoundaries)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              showBoundaries
                ? 'bg-blue-950 text-blue-300 border-blue-800'
                : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}
          >
            Ward Polygons
          </button>
          <button
            onClick={() => setShowPOIs(!showPOIs)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              showPOIs
                ? 'bg-purple-950 text-purple-300 border-purple-800'
                : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}
          >
            Landmarks & POIs
          </button>
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 font-medium"
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
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Ward Geographic Boundaries */}
            {showBoundaries &&
              KOPARGAON_WARD_POLYGONS.map((wp) => (
                <Polygon
                  key={wp.id}
                  positions={wp.coords}
                  pathOptions={{
                    color: wp.color,
                    weight: 2,
                    fillColor: wp.color,
                    fillOpacity: 0.12,
                    dashArray: '3, 6',
                  }}
                >
                  <LeafletTooltip sticky direction="center">
                    <div className="text-[11px] font-bold text-slate-900">
                      {wp.ward}: {wp.name}
                    </div>
                  </LeafletTooltip>
                </Polygon>
              ))}

            {/* Critical Landmark POIs */}
            {showPOIs &&
              CRITICAL_POIS.map((poi, idx) => (
                <Marker key={idx} position={poi.coords} icon={createPOIIcon(poi.emoji)}>
                  <Popup>
                    <div className="p-1 text-slate-900 text-xs font-bold">
                      {poi.emoji} {poi.name}
                      <span className="block text-[10px] text-slate-500 font-normal">
                        Critical Municipal Landmark Anchor
                      </span>
                    </div>
                  </Popup>
                </Marker>
              ))}

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
                  <Popup>
                    <div className="p-2 space-y-1 text-slate-900 text-xs">
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

          {/* Map Legend */}
          <div className="absolute bottom-4 left-4 z-[1000] bg-slate-950/90 border border-slate-800 p-3 rounded-xl shadow-xl text-[11px] text-slate-300 space-y-1.5 backdrop-blur-sm">
            <div className="font-bold text-white uppercase text-[10px] tracking-wider mb-1">
              GIS Layer Map Legend
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              <span>Critical Emergency (P0 ≥ 80)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>High Priority (P1 65-79)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Medium Scheduled (P2 45-64)</span>
            </div>
          </div>
        </div>

        {/* Selected Point Inspector (1 Col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <MapPin size={16} className="text-emerald-400" />
              <span>Spatial Point Inspector</span>
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
