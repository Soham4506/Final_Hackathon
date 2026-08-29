import React, { useState } from 'react';
import { useCivic } from '../context/CivicContext';
import { VerifiedClarification } from '../types';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  Plus,
  Search,
  Filter,
  Pin,
  Calendar,
  Building2,
  Share2,
  Sparkles,
  PhoneCall,
  Languages,
  X,
} from 'lucide-react';

export const VerifiedAnswersPage: React.FC = () => {
  const {
    clarifications,
    addVerifiedClarification,
    userRole,
    currentUser,
    zones,
    departments,
    language,
    setLanguage,
  } = useCivic();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showAuthorModal, setShowAuthorModal] = useState(false);

  // Author Modal Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Water Supply (पाणी पुरवठा)');
  const [wardId, setWardId] = useState(zones[0]?.id || '');
  const [topic, setTopic] = useState('');
  const [circulatingRumor, setCirculatingRumor] = useState('');
  const [verifiedFact, setVerifiedFact] = useState('');
  const [statementEn, setStatementEn] = useState('');
  const [statementMr, setStatementMr] = useState('');
  const [department, setDepartment] = useState('Water Supply & Sanitation Department');

  const filteredClarifications = clarifications.filter((c) => {
    if (selectedCategory !== 'all' && !c.category.toLowerCase().includes(selectedCategory.toLowerCase())) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        c.title.toLowerCase().includes(q) ||
        c.topic.toLowerCase().includes(q) ||
        c.verifiedFactSummary.toLowerCase().includes(q) ||
        c.referenceNumber.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleSpeak = (c: VerifiedClarification) => {
    if (playingId === c.id) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setPlayingId(null);
      return;
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const textToRead = language === 'mr' ? c.audioIvrScriptMr || c.officialStatementMr : c.audioIvrScriptEn || c.officialStatementEn;
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.lang = language === 'mr' ? 'mr-IN' : 'en-IN';
      utterance.rate = 0.95;
      utterance.onend = () => setPlayingId(null);
      utterance.onerror = () => setPlayingId(null);
      window.speechSynthesis.speak(utterance);
      setPlayingId(c.id);
    }
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !statementEn) return;

    const selectedZone = zones.find((z) => z.id === wardId);

    addVerifiedClarification({
      title,
      category,
      wardId,
      wardName: selectedZone?.name || 'All Wards',
      topic: topic || 'Municipal Clarification',
      circulatingRumorSummary: circulatingRumor,
      verifiedFactSummary: verifiedFact || statementEn,
      officialStatementEn: statementEn,
      officialStatementMr: statementMr || statementEn,
      authorDepartment: department,
      authorOfficerName: `${currentUser.fullName || 'Chief Officer'} (${currentUser.designation || 'Municipal Authority'})`,
      isPinned: false,
      audioIvrScriptEn: statementEn,
      audioIvrScriptMr: statementMr || statementEn,
    });

    setShowAuthorModal(false);
    // Reset form
    setTitle('');
    setCirculatingRumor('');
    setVerifiedFact('');
    setStatementEn('');
    setStatementMr('');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-[#131b2e] via-[#1a243d] to-emerald-950 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg flex items-center gap-1">
                <ShieldCheck size={13} />
                <span>Authoritative Truth Engine</span>
              </span>
              <span className="text-xs text-slate-300">कोपरगाव नगरपरिषद सत्यता पडताळणी</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {language === 'mr' ? 'अधिकृत सत्यता व माहिती केंद्र' : 'Verified Answers & Official Clarifications'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {language === 'mr'
                ? 'सोशल मीडिया किंवा व्हॉट्सअॅपवरील अफवांवर विश्वास ठेवू नका. कोपरगाव नगरपरिषदेचे अधिकृत व प्रमाणित निर्णय येथे तपासा.'
                : 'Direct authoritative clarifications countering viral misinformation, fake tanker schedules, and unverified rumors across Kopargaon municipal wards.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'mr' : 'en')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Languages size={14} className="text-emerald-400" />
              <span>{language === 'en' ? 'मराठी आवृत्ती' : 'English View'}</span>
            </button>

            {(userRole === 'officer' || userRole === 'admin') && (
              <button
                type="button"
                onClick={() => setShowAuthorModal(true)}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Plus size={15} />
                <span>Author New Clarification</span>
              </button>
            )}
          </div>
        </div>

        {/* Ambient glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search verified statements, topics, or wards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Departments</option>
            <option value="Water">Water Supply (पाणी पुरवठा)</option>
            <option value="Health">Public Health (आरोग्य विभाग)</option>
            <option value="Sanitation">Sanitation (स्वच्छता)</option>
            <option value="Roads">Roads & PWD (रस्ते बांधकाम)</option>
          </select>
        </div>
      </div>

      {/* Verified Clarification Cards */}
      <div className="space-y-4">
        {filteredClarifications.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
            <CheckCircle2 size={32} className="mx-auto text-slate-400" />
            <p className="font-bold text-slate-700 text-sm">No clarifications found matching your search.</p>
            <p className="text-xs text-slate-500">All current municipal civic operations are proceeding under verified standard schedules.</p>
          </div>
        ) : (
          filteredClarifications.map((c) => {
            const isPlaying = playingId === c.id;

            return (
              <div
                key={c.id}
                className={`bg-white border rounded-2xl p-5 sm:p-6 shadow-xs transition-all space-y-4 ${
                  c.isPinned ? 'border-emerald-400/80 ring-2 ring-emerald-500/10' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Card Top Metadata */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    {c.isPinned && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                        <Pin size={10} className="fill-emerald-800" /> PINNED
                      </span>
                    )}
                    <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {c.referenceNumber}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {c.category} • {c.wardName || 'Kopargaon Municipal Area'}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">
                    Published: {new Date(c.publishedAt).toLocaleDateString()} at{' '}
                    {new Date(c.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Title & Statement */}
                <div className="space-y-3">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                    {c.title}
                  </h3>

                  {/* Rumor vs Fact Pill Box */}
                  {c.circulatingRumorSummary && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-xl space-y-1">
                        <div className="flex items-center gap-1.5 text-red-900 font-bold text-xs">
                          <AlertCircle size={14} className="text-red-600" />
                          <span>Circulating Claim / Rumor:</span>
                        </div>
                        <p className="text-[11px] text-red-800 leading-relaxed italic">
                          "{c.circulatingRumorSummary}"
                        </p>
                      </div>

                      <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                        <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          <span>Verified Municipal Fact:</span>
                        </div>
                        <p className="text-[11px] text-emerald-900 font-semibold leading-relaxed">
                          {c.verifiedFactSummary}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Official Full Statement */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed font-medium">
                    <p className="font-bold text-[11px] text-slate-500 uppercase tracking-wider mb-1">
                      Official Department Declaration:
                    </p>
                    <p className="text-sm">
                      {language === 'mr' ? c.officialStatementMr : c.officialStatementEn}
                    </p>
                  </div>
                </div>

                {/* Footer Controls: Audio Player & Authority Signature */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSpeak(c)}
                      className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                        isPlaying
                          ? 'bg-emerald-600 text-white animate-pulse shadow-xs'
                          : 'bg-[#131b2e] hover:bg-[#1e2a47] text-white shadow-xs'
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
                    <span className="font-bold text-slate-900 text-xs">{c.authorDepartment}</span>
                    <span className="text-slate-500 text-[11px] block">{c.authorOfficerName}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Author New Clarification Modal */}
      {showAuthorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-emerald-400" />
                <h3 className="font-bold text-sm">Author Verified Municipal Clarification</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthorModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePublish} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Clarification Title (English & Marathi)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Official Clarification: Water Tanker Distribution in Ward 4"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Water Supply (पाणी पुरवठा)">Water Supply (पाणी पुरवठा)</option>
                    <option value="Public Health & Sanitation">Public Health & Sanitation</option>
                    <option value="Roads & Infrastructure">Roads & Infrastructure</option>
                    <option value="Electricity & Power Supply">Electricity & Power Supply</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Ward Area</label>
                  <select
                    value={wardId}
                    onChange={(e) => setWardId(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.code} - {z.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Circulating False Claim / Rumor</label>
                <input
                  type="text"
                  placeholder="e.g. WhatsApp PDF claiming 4-day total water shutdown"
                  value={circulatingRumor}
                  onChange={(e) => setCirculatingRumor(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Verified Municipal Fact Summary</label>
                <input
                  type="text"
                  placeholder="e.g. Regular water tanker rotation maintained at 06:00 AM & 05:00 PM."
                  value={verifiedFact}
                  onChange={(e) => setVerifiedFact(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Official Detailed Statement (English)</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Enter full English statement..."
                  value={statementEn}
                  onChange={(e) => setStatementEn(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">अधिकृत मराठी स्पष्टीकरण (Marathi Statement)</label>
                <textarea
                  rows={2}
                  placeholder="मराठीत अधिकृत स्पष्टीकरण लिहा..."
                  value={statementMr}
                  onChange={(e) => setStatementMr(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAuthorModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
                >
                  Publish Verified Clarification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
