import React, { useState } from 'react';
import { useCivic } from '../../context/CivicContext';
import { CropCategory, DistributionMethod } from '../../types/wastewater';
import {
  X,
  Sprout,
  CheckCircle2,
  Calendar,
  User,
  Phone,
  MapPin,
  Droplets,
  Tractor,
  Layers,
} from 'lucide-react';

interface FarmerBookingModalProps {
  onClose: () => void;
}

export const FarmerBookingModal: React.FC<FarmerBookingModalProps> = ({ onClose }) => {
  const { commandZones, submitFarmerBooking, currentUser } = useCivic();

  const [farmerName, setFarmerName] = useState(currentUser.fullName !== 'Citizen User' ? currentUser.fullName : '');
  const [farmerPhone, setFarmerPhone] = useState(currentUser.phone || '');
  const [aadhaarOrKisanId, setAadhaarOrKisanId] = useState('');
  const [wardOrVillage, setWardOrVillage] = useState('');
  const [commandZoneId, setCommandZoneId] = useState(commandZones[0]?.id || 'agri-zone-01');
  const [cropType, setCropType] = useState<CropCategory>('sugarcane');
  const [farmAcreage, setFarmAcreage] = useState<number>(5.0);
  const [preferredDistribution, setPreferredDistribution] = useState<DistributionMethod>('gravity_canal');
  const [preferredDeliveryDate, setPreferredDeliveryDate] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );
  const [soilType, setSoilType] = useState('Medium Black Loam');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successBooking, setSuccessBooking] = useState<string | null>(null);

  // Auto calculate requested volume in KL based on crop water requirement
  // Sugarcane: ~150 KL/acre/cycle, Onion/Veg: ~90 KL/acre, Pomegranate/Orchards: ~110 KL/acre
  const cropWaterFactor: Record<CropCategory, number> = {
    sugarcane: 150,
    onion: 95,
    pomegranate: 115,
    wheat: 80,
    cotton: 90,
    vegetables: 85,
    fodder: 70,
  };

  const calculatedVolumeKLD = Math.round(farmAcreage * (cropWaterFactor[cropType] || 100));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmerName || !farmerPhone) return;

    setIsSubmitting(true);
    try {
      const booking = submitFarmerBooking({
        farmerName,
        farmerPhone,
        aadhaarOrKisanId: aadhaarOrKisanId || `MH-KISAN-${Math.floor(1000 + Math.random() * 9000)}`,
        wardOrVillage: wardOrVillage || 'Kopargaon Agricultural Command',
        commandZoneId,
        cropType,
        farmAcreage,
        requestedVolumeKLD: calculatedVolumeKLD,
        preferredDeliveryDate,
        preferredDistribution,
        soilType,
      });

      setSuccessBooking(booking.bookingNumber);
      setTimeout(() => {
        onClose();
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/70 border-b border-slate-800">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <Sprout size={18} />
            <span>Book Treated Irrigation Water Quota (शेतकरी जल नोंदणी)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        {successBooking ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-bold text-white">Water Quota Registered Successfully!</h3>
            <p className="text-xs text-slate-300">
              Booking Ref:{' '}
              <span className="font-mono font-bold text-emerald-400">{successBooking}</span>
              <br />
              Your request for {calculatedVolumeKLD} KL treated water has been queued for municipal dispatch.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-emerald-300">
              <strong>Subsidized Municipal Rate: ₹15 / 1,000L</strong>
              <span className="block text-[11px] text-emerald-400/80 mt-0.5">
                Certified CPCB Grade A/B treated water enriched with natural N-P-K plant nutrients.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-semibold mb-1 block">Farmer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rameshwar Kolhe"
                  value={farmerName}
                  onChange={(e) => setFarmerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold mb-1 block">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98224 11204"
                  value={farmerPhone}
                  onChange={(e) => setFarmerPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-semibold mb-1 block">Kisan / Aadhaar ID</label>
                <input
                  type="text"
                  placeholder="e.g. MH-KOP-KISAN-8841"
                  value={aadhaarOrKisanId}
                  onChange={(e) => setAadhaarOrKisanId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold mb-1 block">Farm Location / Village</label>
                <input
                  type="text"
                  placeholder="e.g. Kolpewadi, Kopargaon"
                  value={wardOrVillage}
                  onChange={(e) => setWardOrVillage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-semibold mb-1 block">Agricultural Command Zone</label>
                <select
                  value={commandZoneId}
                  onChange={(e) => setCommandZoneId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  {commandZones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-400 font-semibold mb-1 block">Crop Type</label>
                <select
                  value={cropType}
                  onChange={(e) => setCropType(e.target.value as CropCategory)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 capitalize"
                >
                  <option value="sugarcane">Sugarcane (ऊस)</option>
                  <option value="onion">Onion (कांदा)</option>
                  <option value="pomegranate">Pomegranate Orchard (डाळिंब)</option>
                  <option value="wheat">Wheat (गहू)</option>
                  <option value="cotton">Cotton (कापूस)</option>
                  <option value="vegetables">Vegetables (भाजीपाला)</option>
                  <option value="fodder">Green Fodder (चारा)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-semibold mb-1 block">
                  Farm Acreage: <span className="text-emerald-400 font-bold">{farmAcreage} Acres</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="30"
                  step="0.5"
                  value={farmAcreage}
                  onChange={(e) => setFarmAcreage(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold mb-1 block">Preferred Delivery Method</label>
                <select
                  value={preferredDistribution}
                  onChange={(e) => setPreferredDistribution(e.target.value as DistributionMethod)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 capitalize"
                >
                  <option value="gravity_canal">Gravity Canal Gate Release (कालवा)</option>
                  <option value="underground_pipeline">Direct Underground Pipeline (पाइपलाइन)</option>
                  <option value="municipal_tanker">Municipal Tanker Delivery (टँकर)</option>
                </select>
              </div>
            </div>

            {/* Calculated Quota Summary */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Estimated Water Requirement</span>
                <span className="text-sm font-bold text-white">
                  {calculatedVolumeKLD.toLocaleString()} KL (~{(calculatedVolumeKLD * 1000).toLocaleString()} Liters)
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase block">Subsidized Cost</span>
                <span className="text-sm font-bold text-emerald-400">
                  ₹{(calculatedVolumeKLD * 15).toLocaleString()} (Save ₹{(calculatedVolumeKLD * 165).toLocaleString()})
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-5 py-2 rounded-lg shadow-md shadow-emerald-950/40 transition-all disabled:opacity-50"
              >
                <Droplets size={16} />
                <span>{isSubmitting ? 'Registering...' : 'Submit Water Request'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
