import React, { useState, useEffect } from 'react';
import { useCivic } from '../context/CivicContext';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  Plus,
  Search,
  Pin,
  Calendar,
  Building2,
  Share2,
  Sparkles,
  PhoneCall,
  Languages,
  X,
  FileText,
  Hash,
  History,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { ClaimVerificationService } from '../services/claimVerificationService';
import { OfficialAnswer, CivicClaim, CivicEvidence } from '../types';

export const VerifiedAnswersPage: React.FC = () => {
  const {
    userRole,
    currentUser,
    zones,
    departments,
    language,
    setLanguage,
  } = useCivic();

  const [officialAnswers, setOfficialAnswers] = useState<OfficialAnswer[]>(() =>
    ClaimVerificationService.getAllOfficialAnswers()
  );
  const [evidenceList, setEvidenceList] = useState<CivicEvidence[]>(() =>
    ClaimVerificationService.getAllEvidence()
  );
  const [claimsList, setClaimsList] = useState<CivicClaim[]>(() =>
    ClaimVerificationService.getAllClaims()
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVerdict, setSelectedVerdict] = useState<string>('all');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [expandedEvidenceId, setExpandedEvidenceId] = useState<string | null>(null);

  const filteredAnswers = officialAnswers.filter((a) => {
    if (selectedVerdict !== 'all' && a.verdict !== selectedVerdict) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        a.claimSummary.toLowerCase().includes(q) ||
        a.authority.toLowerCase().includes(q) ||
        a.officialStatementEn.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleSpeak = (a: OfficialAnswer) => {
    if (playingId === a.id) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setPlayingId(null);
      return;
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const textToRead =
        language === 'mr' ? a.officialStatementMr : a.officialStatementEn;
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.lang = language === 'mr' ? 'mr-IN' : 'en-IN';
      utterance.rate = 0.95;
      utterance.onend = () => setPlayingId(null);
      utterance.onerror = () => setPlayingId(null);
      window.speechSynthesis.speak(utterance);
      setPlayingId(a.id);
    }
  };

  return (
    <div className="space-y-6 text-xs text-slate-800">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-[#131b2e] to-indigo-950 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-emerald-400" />
                <span>Authoritative Provenance Engine</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                P1 Misinformation Defense
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {language === 'mr'
                ? 'अधिकृत प्रमाणित उत्तरे व पुरावे'
                : 'Verified Official Answers & Provenance'}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              {language === 'mr'
                ? 'सर्व अधिकृत उत्तरे विभागीय अहवाल, जीपीएस नोंदी व प्रयोगशाळा चाचण्यांवर आधारित आहेत.'
                : 'Direct authoritative clarifications countering viral misinformation, fake tanker schedules, and unverified rumors, backed by immutable evidence hashes.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'mr' : 'en')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Languages size={14} className="text-emerald-400" />
              <span>{language === 'en' ? 'मराठी आवृत्ती' : 'English View'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search claims, authorities, or answer reference IDs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={selectedVerdict}
            onChange={(e) => setSelectedVerdict(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Verdicts</option>
            <option value="VERIFIED_FALSE">VERIFIED FALSE</option>
            <option value="VERIFIED_TRUE">VERIFIED TRUE</option>
            <option value="PARTIALLY_TRUE">PARTIALLY TRUE</option>
            <option value="INSUFFICIENT_EVIDENCE">INSUFFICIENT EVIDENCE</option>
          </select>
        </div>
      </div>

      {/* Official Answer Cards with Provenance */}
      <div className="space-y-5">
        {filteredAnswers.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
            <CheckCircle2 size={32} className="mx-auto text-slate-400" />
            <p className="font-bold text-slate-700 text-sm">No official answers found matching your filter.</p>
          </div>
        ) : (
          filteredAnswers.map((ans) => {
            const isPlaying = playingId === ans.id;

            return (
              <div
                key={ans.id}
                className={`bg-white border rounded-3xl p-6 shadow-sm transition-all space-y-4 ${
                  ans.verdict === 'VERIFIED_FALSE'
                    ? 'border-emerald-300/80 ring-1 ring-emerald-500/10'
                    : ans.verdict === 'VERIFIED_TRUE'
                    ? 'border-blue-300/80'
                    : 'border-slate-200'
                }`}
              >
                {/* Top Metadata Strip */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black bg-slate-900 text-white px-2.5 py-0.5 rounded-lg">
                      {ans.id}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-black uppercase tracking-wider ${
                      ans.verdict === 'VERIFIED_FALSE'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : ans.verdict === 'VERIFIED_TRUE'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {ans.verdict.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Version {ans.version} • Policy: {ans.policyVersion}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                    <span>Valid until: {new Date(ans.validUntil).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Claim Statement */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                    <AlertCircle size={16} className="text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Circulating Claim</span>
                      <p className="font-bold text-xs sm:text-sm text-slate-900">"{ans.claimSummary}"</p>
                    </div>
                  </div>

                  {/* Official Department Declaration */}
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 text-xs space-y-1">
                    <span className="text-[10px] uppercase font-bold text-indigo-700 block">
                      Authoritative Municipal Statement
                    </span>
                    <p className="text-xs sm:text-sm text-slate-900 font-medium leading-relaxed">
                      {language === 'mr' ? ans.officialStatementMr : ans.officialStatementEn}
                    </p>
                  </div>
                </div>

                {/* Supporting Official Evidence Records */}
                {ans.evidence && ans.evidence.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <FileText size={12} className="text-indigo-600" /> Supporting Evidence & Provenance ({ans.evidence.length})
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {ans.evidence.map((ev) => (
                        <div
                          key={ev.id}
                          className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-[11px]"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                              {ev.type}
                            </span>
                            <span className="text-[9px] font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                              ✓ {ev.verificationStatus}
                            </span>
                          </div>

                          <p className="font-bold text-slate-900 leading-tight">{ev.title}</p>
                          <p className="text-[10px] text-slate-500 leading-relaxed">{ev.description}</p>

                          <div className="pt-1 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-400 font-mono">
                            <span>Source: {ev.source}</span>
                            <span className="truncate max-w-[120px]" title={ev.contentHash}>
                              Hash: {ev.contentHash?.substring(0, 12)}...
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Card Footer: Authority Signature & Voice Dispatch */}
                <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSpeak(ans)}
                      className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                        isPlaying
                          ? 'bg-emerald-600 text-white animate-pulse shadow-xs'
                          : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                      }`}
                    >
                      {isPlaying ? <VolumeX size={14} /> : <Volume2 size={14} />}
                      <span>{isPlaying ? 'Stop Reading' : '🔊 Listen via Spoken IVR'}</span>
                    </button>
                    <span className="text-[10px] text-slate-400 font-mono">Bilingual Voice Dispatch</span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                      Authorizing Department
                    </span>
                    <span className="font-bold text-slate-900 text-xs">{ans.authority}</span>
                    <span className="text-slate-500 text-[11px] block">{ans.reviewedBy}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default VerifiedAnswersPage;
