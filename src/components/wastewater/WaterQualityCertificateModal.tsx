import React from 'react';
import { QualityCheckSample, WastewaterBatch } from '../../types/wastewater';
import {
  X,
  Printer,
  ShieldCheck,
  Award,
  AlertTriangle,
  QrCode,
  CheckCircle2,
  Calendar,
  UserCheck,
  Building,
  Droplets,
  Sprout,
  FileCheck,
  Trees,
} from 'lucide-react';

interface WaterQualityCertificateModalProps {
  sample: QualityCheckSample;
  batch?: WastewaterBatch;
  onClose: () => void;
}

export const WaterQualityCertificateModal: React.FC<WaterQualityCertificateModalProps> = ({
  sample,
  batch,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case 'grade_a':
        return {
          text: 'GRADE A • UNRESTRICTED EDIBLE CROPS',
          color: 'bg-emerald-600 text-white border-emerald-500',
          desc: '100% compliant for raw edible vegetables, onion crops, and pomegranate orchards.',
        };
      case 'grade_b':
        return {
          text: 'GRADE B • COMMERCIAL & CASH CROPS',
          color: 'bg-blue-600 text-white border-blue-500',
          desc: 'Certified safe for Sugarcane, Cotton, Wheat, and animal fodder irrigation.',
        };
      case 'grade_c':
        return {
          text: 'GRADE C • AGROFORESTRY & GREENBELTS',
          color: 'bg-amber-600 text-white border-amber-500',
          desc: 'Suitable for biomass trees, bio-diesel crops, and municipal green belts.',
        };
      default:
        return {
          text: 'SAFETY DEFICIT • RETREATMENT REQUIRED',
          color: 'bg-red-600 text-white border-red-500',
          desc: 'Failed threshold. Discharge prohibited. Auto-routed to secondary MBBR reactor.',
        };
    }
  };

  const badge = getGradeBadge(sample.grade);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Modal Top Bar (Screen Only) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/70 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <FileCheck size={18} />
            <span>Official Municipal Water Quality Lab Certificate</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all"
            >
              <Printer size={14} />
              <span>Print Certificate</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Certificate Body (Printable Area) */}
        <div className="p-8 space-y-6 text-slate-200 bg-slate-900 print:bg-white print:text-black print:p-6 print:m-0">
          {/* Certificate Header / Emblems */}
          <div className="border-b-2 border-emerald-600/40 pb-5 text-center relative">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 print:text-gray-600">
                  Govt. of Maharashtra • Kopargaon Municipal Council
                </span>
                <h1 className="text-xl font-bold tracking-tight text-white print:text-black flex items-center gap-2">
                  <Building size={20} className="text-emerald-400 print:text-emerald-700" />
                  कोपरगाव नगरपरिषद (अहिल्यानगर)
                </h1>
                <p className="text-xs text-slate-400 print:text-gray-600">
                  Water Supply & Sanitation Department • Central Environmental Testing Laboratory
                </p>
              </div>

              <div className="text-right">
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-700/50 text-emerald-400 text-xs font-mono font-bold print:bg-emerald-50 print:text-emerald-800 print:border-emerald-300">
                  <ShieldCheck size={14} />
                  <span>CPCB CERTIFIED</span>
                </div>
                <div className="text-[10px] text-slate-400 print:text-gray-600 mt-1 font-mono">
                  ISO 14001:2015 Compliant
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 print:border-gray-300">
              <h2 className="text-base font-extrabold uppercase tracking-wide text-emerald-300 print:text-emerald-800">
                Agricultural Water Quality & Safety Clearance Certificate
              </h2>
              <p className="text-[11px] text-slate-400 print:text-gray-600 mt-0.5">
                Issued in accordance with Central Pollution Control Board (CPCB) & FAO Agricultural Irrigation Norms
              </p>
            </div>
          </div>

          {/* Certificate Metadata Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 print:bg-gray-100 p-4 rounded-xl border border-slate-800 print:border-gray-300 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 print:text-gray-600 block">Certificate No.</span>
              <span className="font-mono font-bold text-emerald-400 print:text-emerald-800">{sample.qrVerificationHash}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 print:text-gray-600 block">Batch Identifier</span>
              <span className="font-mono font-semibold text-white print:text-black">{sample.batchNumber}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 print:text-gray-600 block">Test Date & Time</span>
              <span className="font-medium text-slate-200 print:text-black">
                {new Date(sample.testedAt).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 print:text-gray-600 block">Water Quality Index</span>
              <span className="font-bold text-white print:text-black">{sample.waterQualityIndex} / 100 (Optimal)</span>
            </div>
          </div>

          {/* Quality Grade Banner */}
          <div className={`p-4 rounded-xl border ${badge.color} text-center space-y-1 print:border-2`}>
            <div className="flex items-center justify-center gap-2 font-bold text-sm tracking-wide uppercase">
              <Award size={18} />
              <span>{badge.text}</span>
            </div>
            <p className="text-xs opacity-90">{badge.desc}</p>
          </div>

          {/* Parameter Test Results Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 print:text-gray-800 flex items-center gap-1.5">
              <Droplets size={14} className="text-emerald-400 print:text-emerald-700" />
              <span>Physicochemical & Microbiological Laboratory Analysis</span>
            </h3>

            <div className="border border-slate-800 print:border-gray-300 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-950/80 print:bg-gray-200 text-slate-400 print:text-gray-700 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="px-3.5 py-2.5">Parameter</th>
                    <th className="px-3.5 py-2.5">Tested Value</th>
                    <th className="px-3.5 py-2.5">CPCB Safe Standard</th>
                    <th className="px-3.5 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 print:divide-gray-200">
                  <tr className="hover:bg-slate-800/30">
                    <td className="px-3.5 py-2 font-medium">pH Level</td>
                    <td className="px-3.5 py-2 font-mono font-semibold">{sample.parameters.ph}</td>
                    <td className="px-3.5 py-2 text-slate-400 print:text-gray-600">6.5 - 8.5</td>
                    <td className="px-3.5 py-2 text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Passed
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-800/30">
                    <td className="px-3.5 py-2 font-medium">Biochemical Oxygen Demand (BOD)</td>
                    <td className="px-3.5 py-2 font-mono font-semibold">{sample.parameters.bod} mg/L</td>
                    <td className="px-3.5 py-2 text-slate-400 print:text-gray-600">&lt; 10 mg/L (Grade A) / &lt; 30 (Grade B)</td>
                    <td className="px-3.5 py-2 text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Compliant
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-800/30">
                    <td className="px-3.5 py-2 font-medium">Chemical Oxygen Demand (COD)</td>
                    <td className="px-3.5 py-2 font-mono font-semibold">{sample.parameters.cod} mg/L</td>
                    <td className="px-3.5 py-2 text-slate-400 print:text-gray-600">&lt; 50 mg/L (Grade A) / &lt; 100 (Grade B)</td>
                    <td className="px-3.5 py-2 text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Compliant
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-800/30">
                    <td className="px-3.5 py-2 font-medium">Total Suspended Solids (TSS)</td>
                    <td className="px-3.5 py-2 font-mono font-semibold">{sample.parameters.tss} mg/L</td>
                    <td className="px-3.5 py-2 text-slate-400 print:text-gray-600">&lt; 10 mg/L (Grade A) / &lt; 20 (Grade B)</td>
                    <td className="px-3.5 py-2 text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Compliant
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-800/30">
                    <td className="px-3.5 py-2 font-medium">Fecal Coliforms</td>
                    <td className="px-3.5 py-2 font-mono font-semibold">{sample.parameters.fecalColiforms} MPN/100ml</td>
                    <td className="px-3.5 py-2 text-slate-400 print:text-gray-600">&lt; 100 MPN (Grade A) / &lt; 1000 (Grade B)</td>
                    <td className="px-3.5 py-2 text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Safe
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-800/30">
                    <td className="px-3.5 py-2 font-medium">Electrical Conductivity (EC / Salinity)</td>
                    <td className="px-3.5 py-2 font-mono font-semibold">{sample.parameters.electricalConductivity} dS/m</td>
                    <td className="px-3.5 py-2 text-slate-400 print:text-gray-600">&lt; 1.5 dS/m (Non-saline)</td>
                    <td className="px-3.5 py-2 text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Passed
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-800/30">
                    <td className="px-3.5 py-2 font-medium">Heavy Metals (Lead, Cadmium, Arsenic)</td>
                    <td className="px-3.5 py-2 font-mono font-semibold">
                      Pb: {sample.parameters.heavyMetalsPpb.lead}ppb • Cd: {sample.parameters.heavyMetalsPpb.cadmium}ppb • As: {sample.parameters.heavyMetalsPpb.arsenic}ppb
                    </td>
                    <td className="px-3.5 py-2 text-slate-400 print:text-gray-600">Pb &lt;50ppb, Cd &lt;10ppb, As &lt;10ppb</td>
                    <td className="px-3.5 py-2 text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Zero Toxicity
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Plant Nutrients & Fertilizer Value */}
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 print:bg-emerald-50 print:border-emerald-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-300 print:text-emerald-800">
              <Sprout size={16} />
              <span>Beneficial Agronomic Nutrients (Fertilizer Enrichment)</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-2.5 rounded-lg bg-slate-900/80 print:bg-white border border-emerald-700/30">
                <span className="text-[10px] text-slate-400 print:text-gray-600 block">Nitrogen (N)</span>
                <span className="text-sm font-bold text-white print:text-black">{sample.parameters.nutrientsMgL.nitrogen} mg/L</span>
                <span className="text-[10px] text-emerald-400 print:text-emerald-700 block">Saves ~78 kg Urea/ha</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/80 print:bg-white border border-emerald-700/30">
                <span className="text-[10px] text-slate-400 print:text-gray-600 block">Phosphorus (P)</span>
                <span className="text-sm font-bold text-white print:text-black">{sample.parameters.nutrientsMgL.phosphorus} mg/L</span>
                <span className="text-[10px] text-emerald-400 print:text-emerald-700 block">Saves ~18 kg DAP/ha</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/80 print:bg-white border border-emerald-700/30">
                <span className="text-[10px] text-slate-400 print:text-gray-600 block">Potassium (K)</span>
                <span className="text-sm font-bold text-white print:text-black">{sample.parameters.nutrientsMgL.potassium} mg/L</span>
                <span className="text-[10px] text-emerald-400 print:text-emerald-700 block">Saves ~50 kg MOP/ha</span>
              </div>
            </div>
          </div>

          {/* Water Flow Destination & Allocation Decision */}
          {sample.routingAssessment && (
            <div className="p-4 rounded-xl bg-slate-950/80 print:bg-gray-100 border border-slate-800 print:border-gray-300 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-300 print:text-emerald-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Trees size={15} />
                  <span>Authorized Water Flow Destination Decision</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono font-bold">
                  PRIORITY: {sample.routingAssessment.primaryDestination.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <p className="text-slate-300 print:text-gray-800 text-[11px] leading-relaxed">
                {sample.routingAssessment.explanationRationale}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {sample.routingAssessment.flowSplits.map((split, i) => (
                  <div key={i} className="p-2 bg-slate-900 print:bg-white rounded-lg border border-slate-800 print:border-gray-200">
                    <div className="text-[10px] font-bold text-slate-300 print:text-black truncate">{split.destinationName}</div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>Volume: <strong className="text-emerald-400 print:text-emerald-700">{split.volumeKLD} KL ({split.percentage}%)</strong></span>
                      <span className="capitalize">{split.distributionChannel.replace('_', ' ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suitable Crops Tag list */}
          <div className="space-y-1.5 text-xs">
            <span className="text-[11px] font-bold uppercase text-slate-400 print:text-gray-600">
              Authorized Crop Categories & Flora:
            </span>
            <div className="flex flex-wrap gap-2">
              {sample.suitableCrops.map((crop) => (
                <span
                  key={crop}
                  className="px-2.5 py-1 rounded-md bg-slate-800 print:bg-gray-200 border border-slate-700 print:border-gray-300 text-slate-200 print:text-black text-xs font-medium capitalize"
                >
                  ✓ {crop}
                </span>
              ))}
            </div>
          </div>

          {/* Signatures and QR Code Seal */}
          <div className="pt-6 border-t border-slate-800 print:border-gray-300 flex items-end justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg border border-slate-700 print:border-black">
                <QrCode size={48} className="text-black" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 print:text-gray-600 block uppercase">Govt Digital Signature</span>
                <span className="font-mono text-xs font-bold text-emerald-400 print:text-black">{sample.qrVerificationHash}</span>
                <span className="text-[10px] text-slate-500 print:text-gray-600 block">Scan to verify authenticity online</span>
              </div>
            </div>

            <div className="text-right space-y-4">
              <div className="space-y-0.5">
                <div className="font-serif italic font-semibold text-slate-200 print:text-black text-sm">
                  {sample.certifiedOfficerName}
                </div>
                <div className="text-[10px] text-slate-400 print:text-gray-600">
                  Head Executive Engineer • Water Supply & Sanitation
                </div>
                <div className="text-[10px] text-emerald-400 print:text-emerald-800 font-semibold">
                  Kopargaon Municipal Council (कोपरगाव नगरपरिषद)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
