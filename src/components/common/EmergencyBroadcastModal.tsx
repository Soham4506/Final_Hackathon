import React, { useState } from 'react';
import { useCivic } from '../../context/CivicContext';
import { X, Send, Radio, AlertTriangle, Users, CheckCircle2 } from 'lucide-react';

interface EmergencyBroadcastModalProps {
  onClose: () => void;
}

export const EmergencyBroadcastModal: React.FC<EmergencyBroadcastModalProps> = ({ onClose }) => {
  const { zones, departments, currentUser, users } = useCivic();

  const [selectedWardId, setSelectedWardId] = useState<string>(zones[0]?.id || 'all');
  const [broadcastTitle, setBroadcastTitle] = useState<string>('Drinking Water Pipeline Maintenance Alert');
  const [broadcastMessage, setBroadcastMessage] = useState<string>(
    'Municipal water supply will be paused in Ward 4 today from 2:00 PM to 6:00 PM for emergency trunk pipeline rectification near Civil Hospital. Drinking water tankers are stationed at Subhash Chowk.'
  );
  const [channel, setChannel] = useState<'sms' | 'app' | 'all'>('all');
  const [sentSuccess, setSentSuccess] = useState<boolean>(false);

  const targetZone = zones.find((z) => z.id === selectedWardId);
  const estimatedReach = selectedWardId === 'all' ? 48500 : 5400;

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;

    setSentSuccess(true);
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-950 border border-amber-800 text-amber-400">
              <Radio size={20} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Emergency Ward Advisory Broadcast</h3>
              <p className="text-xs text-slate-400">Kopargaon Municipal Citizen Notification Service</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        {sentSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} />
            </div>
            <h4 className="text-base font-bold text-white">Civic Advisory Dispatched!</h4>
            <p className="text-xs text-slate-300">
              Broadcast successfully transmitted to ~{estimatedReach.toLocaleString()} residents in {targetZone?.name || 'All Kopargaon Wards'} via SMS & App Feed.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSendBroadcast} className="p-6 space-y-4 text-xs">
            {/* Target Ward */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Target Citizen Ward / Area</label>
              <select
                value={selectedWardId}
                onChange={(e) => setSelectedWardId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:ring-1 focus:ring-amber-500"
              >
                <option value="all">All Kopargaon Municipal Wards (Entire City)</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.code}: {z.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Advisory Headline</label>
              <input
                type="text"
                required
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">SMS / App Alert Content</label>
              <textarea
                required
                rows={3}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:ring-1 focus:ring-amber-500 leading-relaxed"
              />
            </div>

            {/* Estimated Reach Callout */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2 text-slate-400">
                <Users size={14} className="text-emerald-400" />
                <span>Estimated Citizen Reach:</span>
              </div>
              <span className="font-mono font-bold text-white">~{estimatedReach.toLocaleString()} Registered Citizens</span>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-amber-950"
              >
                <Send size={14} />
                <span>Broadcast Alert</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
