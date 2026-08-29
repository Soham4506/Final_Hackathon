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
  Search,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, Tooltip as LeafletTooltip } from 'react-leaflet';
import L from 'leaflet';

// Custom Marker Icons
const createCustomIcon = (score: number, urgency: string) => {
  let color = '#22c55e'; // green
  if (score >= 80 || urgency === 'critical') color = '#ba1a1a'; // red
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
    html: `<div style="background-color: #131b2e; border: 2px solid #38bdf8; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.3);">${emoji}</div>`,
    className: 'custom-leaflet-poi',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

// Geographic Boundaries for Kopargaon Wards 1 to 8
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
    color: '#ba1a1a',
    coords: [
      [19.8900, 74.4880],
      [19.8940, 74.4920],
      [19.8860, 74.4930],
      [19.8840, 74.4870],
    ],
  },
  {
    id: 'z-05',
    ward: 'Ward 5',
    name: 'Indira Nagar & School Zone',
    color: '#8b5cf6',
    coords: [
      [19.8940, 74.4920],
      [19.8980, 74.4970],
      [19.8920, 74.4980],
      [19.8890, 74.4940],
    ],
  },
  {
    id: 'z-06',
    ward: 'Ward 6',
    name: 'Mahatma Phule Colony',
    color: '#06b6d4',
    coords: [
      [19.8860, 74.4770],
      [19.8900, 74.4830],
      [19.8840, 74.4840],
      [19.8810, 74.4790],
    ],
  },
  {
    id: 'z-07',
    ward: 'Ward 7',
    name: 'Kopargaon Railway Colony',
    color: '#ec4899',
    coords: [
      [19.8840, 74.4890],
      [19.8880, 74.4960],
      [19.8800, 74.4970],
      [19.8780, 74.4910],
    ],
  },
  {
    id: 'z-08',
    ward: 'Ward 8',
    name: 'Gautam Nagar & Bus Stand Approach',
    color: '#eab308',
    coords: [
      [19.8910, 74.4780],
      [19.8940, 74.4840],
      [19.8870, 74.4830],
      [19.8850, 74.4790],
    ],
  },
];

// Critical Infrastructure POIs in Kopargaon
const KOPARGAON_POIS = [
  { id: 'poi-1', name: 'Kopargaon Rural Hospital (Civil)', type: 'hospital', coords: [19.8878, 74.4891] as [number, number], emoji: '🏥' },
  { id: 'poi-2', name: 'KMC Municipal Council HQ', type: 'admin', coords: [19.8915, 74.4849] as [number, number], emoji: '🏛️' },
  { id: 'poi-3', name: 'Kopargaon MSRTC Central Bus Station', type: 'transit', coords: [19.8898, 74.4816] as [number, number], emoji: '🚌' },
  { id: 'poi-4', name: 'Kopargaon Railway Station (CR)', type: 'transit', coords: [19.8824, 74.4942] as [number, number], emoji: '🚆' },
  { id: 'poi-5', name: 'Godavari Water Pumping Station', type: 'water', coords: [19.8948, 74.4789] as [number, number], emoji: '💧' },
];

// Godavari River High Flood Inundation Buffer Zone
const GODAVARI_FLOOD_BUFFER_ZONE: [number, number][] = [
  [19.8995, 74.4720],
  [19.9020, 74.4780],
  [19.8960, 74.4830],
  [19.8900, 74.4810],
  [19.8870, 74.4760],
  [19.8910, 74.4710],
];

export const CivicMapPage: React.FC = () => {
  const { issues, damTelemetry } = useCivic();
  const [selectedIssue, setSelectedIssue] = useState<CivicIssue | null>(null);
  const [explainIssue, setExplainIssue] = useState<CivicIssue | null>(null);
  const [mapSearch, setMapSearch] = useState('');

  // Layer toggles matching KMC Operational Intelligence UI
  const [showIncidents, setShowIncidents] = useState(true);
  const [showFloodZones, setShowFloodZones] = useState(true);
  const [showWaterSCADA, setShowWaterSCADA] = useState(true);
  const [showWasteHotspots, setShowWasteHotspots] = useState(true);
  const [showLiveFleet, setShowLiveFleet] = useState(true);
  const [showEmergencyHubs, setShowEmergencyHubs] = useState(true);

  const kopargaonCenter: [number, number] = [19.8915, 74.4849];

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              GIS Spatial Node #08
            </span>
            <span className="text-xs text-muted-foreground">EPSG:4326 Sensor Infrastructure</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            GIS Command Map
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Spatial telemetry & municipal sensor infrastructure with live SCADA overlays and defect hot-spots.
          </p>
        </div>

        {/* Search Bar in Map Header */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            value={mapSearch}
            onChange={(e) => setMapSearch(e.target.value)}
            placeholder="Search Ward, Pipeline, Unit..."
            className="w-full bg-muted/60 dark:bg-slate-900 border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary font-medium"
          />
        </div>
      </div>

      {/* Main Map Container & Overlay Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Left Sidebar: Active Overlays & Sensors */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
          <div className="border-b border-border pb-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-2">
              <Layers size={14} className="text-[#131b2e]" />
              <span>Active Overlays & Sensors</span>
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-2 rounded-xl bg-muted/30 dark:bg-slate-900/60 hover:bg-slate-100 cursor-pointer transition-colors border border-[#76777d]/10">
              <span className="flex items-center gap-2 font-medium text-foreground">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a]"></span>
                <span>Critical Incidents</span>
              </span>
              <input
                type="checkbox"
                checked={showIncidents}
                onChange={(e) => setShowIncidents(e.target.checked)}
                className="w-4 h-4 text-[#131b2e] rounded focus:ring-0"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-xl bg-rose-50/70 hover:bg-rose-100/70 cursor-pointer transition-colors border border-rose-200">
              <span className="flex items-center gap-2 font-medium text-rose-900">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
                <span>Godavari Flood Hazard ({damTelemetry.currentDischargeCusecs.toLocaleString()} Cusecs)</span>
              </span>
              <input
                type="checkbox"
                checked={showFloodZones}
                onChange={(e) => setShowFloodZones(e.target.checked)}
                className="w-4 h-4 text-rose-600 rounded focus:ring-0"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-xl bg-muted/30 dark:bg-slate-900/60 hover:bg-slate-100 cursor-pointer transition-colors border border-[#76777d]/10">
              <span className="flex items-center gap-2 font-medium text-foreground">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <span>Water Pipeline SCADA</span>
              </span>
              <input
                type="checkbox"
                checked={showWaterSCADA}
                onChange={(e) => setShowWaterSCADA(e.target.checked)}
                className="w-4 h-4 text-[#131b2e] rounded focus:ring-0"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-xl bg-muted/30 dark:bg-slate-900/60 hover:bg-slate-100 cursor-pointer transition-colors border border-[#76777d]/10">
              <span className="flex items-center gap-2 font-medium text-foreground">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Waste Hotspots</span>
              </span>
              <input
                type="checkbox"
                checked={showWasteHotspots}
                onChange={(e) => setShowWasteHotspots(e.target.checked)}
                className="w-4 h-4 text-[#131b2e] rounded focus:ring-0"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-xl bg-muted/30 dark:bg-slate-900/60 hover:bg-slate-100 cursor-pointer transition-colors border border-[#76777d]/10">
              <span className="flex items-center gap-2 font-medium text-foreground">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                <span>Live Fleet Units</span>
              </span>
              <input
                type="checkbox"
                checked={showLiveFleet}
                onChange={(e) => setShowLiveFleet(e.target.checked)}
                className="w-4 h-4 text-[#131b2e] rounded focus:ring-0"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-xl bg-muted/30 dark:bg-slate-900/60 hover:bg-slate-100 cursor-pointer transition-colors border border-[#76777d]/10">
              <span className="flex items-center gap-2 font-medium text-foreground">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                <span>Hospitals & Hubs</span>
              </span>
              <input
                type="checkbox"
                checked={showEmergencyHubs}
                onChange={(e) => setShowEmergencyHubs(e.target.checked)}
                className="w-4 h-4 text-[#131b2e] rounded focus:ring-0"
              />
            </label>
          </div>

          {/* Selected Incident Drawer on Left */}
          {selectedIssue && (
            <div className="pt-3 border-t border-border space-y-2 text-xs">
              <span className="font-bold text-[10px] uppercase text-muted-foreground tracking-wider block">
                Selected Incident Telemetry
              </span>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <span className="font-mono font-bold text-xs text-[#131b2e]">
                  {selectedIssue.ticketNumber}
                </span>
                <h4 className="font-bold text-xs text-foreground">{selectedIssue.title}</h4>
                <p className="text-[11px] text-muted-foreground">{selectedIssue.locationAddress}</p>
                <div className="pt-1 flex justify-between items-center">
                  <PriorityBadge score={selectedIssue.priorityScore?.finalScore} size="sm" />
                  <button
                    onClick={() => setExplainIssue(selectedIssue)}
                    className="text-blue-700 font-bold underline text-[11px]"
                  >
                    Explain Score →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 3 Cols: Interactive GIS Map Canvas */}
        <div className="lg:col-span-3 bg-card border border-border rounded-2xl overflow-hidden shadow-xs flex flex-col min-h-[550px]">
          <div className="flex-1 relative z-0">
            <MapContainer
              center={kopargaonCenter}
              zoom={14}
              scrollWheelZoom={true}
              style={{ height: '100%', minHeight: '520px', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Ward Polygons */}
              {KOPARGAON_WARD_POLYGONS.map((wp) => (
                <Polygon
                  key={wp.id}
                  positions={wp.coords}
                  pathOptions={{
                    color: wp.color,
                    weight: 2,
                    fillOpacity: 0.1,
                    dashArray: '4, 4',
                  }}
                >
                  <LeafletTooltip sticky>
                    <div className="text-xs font-bold font-sans">
                      {wp.ward}: {wp.name}
                    </div>
                  </LeafletTooltip>
                </Polygon>
              ))}

              {/* Godavari Flood Inundation Buffer Zone */}
              {showFloodZones && (
                <Polygon
                  positions={GODAVARI_FLOOD_BUFFER_ZONE}
                  pathOptions={{
                    color: '#e11d48',
                    weight: 3,
                    fillColor: '#f43f5e',
                    fillOpacity: damTelemetry.currentDischargeCusecs >= 25000 ? 0.35 : 0.15,
                    dashArray: '6, 6',
                  }}
                >
                  <LeafletTooltip sticky>
                    <div className="text-xs font-bold font-sans text-rose-700">
                      🌊 Godavari High Flood Plain (Discharge: {damTelemetry.currentDischargeCusecs.toLocaleString()} Cusecs)
                    </div>
                  </LeafletTooltip>
                </Polygon>
              )}

              {/* POI Markers */}
              {showEmergencyHubs &&
                KOPARGAON_POIS.map((poi) => (
                  <Marker
                    key={poi.id}
                    position={poi.coords}
                    icon={createPOIIcon(poi.emoji)}
                  >
                    <Popup>
                      <div className="p-1 font-sans text-xs">
                        <strong>{poi.name}</strong>
                        <div className="text-[10px] text-slate-500 capitalize">Critical POI ({poi.type})</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

              {/* Civic Incidents */}
              {showIncidents &&
                issues.map((issue) => {
                  const lat = issue.latitude || 19.8915;
                  const lng = issue.longitude || 74.4849;
                  const score = issue.priorityScore?.finalScore || 50;

                  return (
                    <Marker
                      key={issue.id}
                      position={[lat, lng]}
                      icon={createCustomIcon(score, issue.urgency)}
                      eventHandlers={{
                        click: () => setSelectedIssue(issue),
                      }}
                    >
                      <Popup>
                        <div className="p-1 font-sans text-xs space-y-1">
                          <div className="font-mono font-bold text-slate-900">{issue.ticketNumber}</div>
                          <div className="font-bold text-slate-800">{issue.title}</div>
                          <div className="text-[10px] text-slate-500">{issue.locationAddress}</div>
                          <div className="text-red-700 font-bold text-[11px]">
                            Priority Score: {score.toFixed(1)} / 100
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
            </MapContainer>
          </div>

          {/* Bottom Telemetry Status Bar */}
          <div className="px-5 py-3 bg-muted/30 dark:bg-slate-900/60 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground font-mono">
            <span>Kopargaon GIS Node #08</span>
            <span>EPSG:4326 • SCADA Grid Active</span>
          </div>
        </div>
      </div>

      {/* Explainability Modal */}
      {explainIssue && (
        <ExplainabilityModal
          issue={explainIssue}
          onClose={() => setExplainIssue(null)}
        />
      )}
    </div>
  );
};

export default CivicMapPage;

