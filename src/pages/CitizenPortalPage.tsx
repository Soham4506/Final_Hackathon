import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCivic } from '../context/CivicContext';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { AIIntakeParser, AIIntakeResult } from '../services/aiIntakeParser';
import { ExplainabilityService } from '../services/explainabilityService';
import { UrgencyLevel, ResourceType } from '../types';
import {
  PlusCircle,
  Search,
  CheckCircle2,
  Sparkles,
  Camera,
  MapPin,
  ShieldCheck,
  Send,
  UploadCloud,
  X,
  Mic,
  MicOff,
  Sliders,
  Wrench,
  Users,
  AlertTriangle,
  Building,
  Layers,
  Cpu,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const CitizenPortalPage: React.FC = () => {
  const { zones, departments, categories, submitIssue, issues, currentUser, t, language } = useCivic();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeTab = searchParams.get('tab') || 'submit';

  // Submission Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState<string>(zones[0]?.id || 'a0000000-0000-0000-0000-000000000001');

  // Real Uploaded Photo State
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoFileName, setPhotoFileName] = useState<string>('');
  const [isAnalyzingImage, setIsAnalyzingImage] = useState<boolean>(false);

  // AI-Detected & User-Editable Form Parameters (SDDS Style)
  const [selectedDeptId, setSelectedDeptId] = useState<string>(departments[0]?.id || 'b0000000-0000-0000-0000-000000000001');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0]?.id || 'c0000000-0000-0000-0000-000000000001');
  const [selectedUrgency, setSelectedUrgency] = useState<UrgencyLevel>('medium');
  const [requiredEquipment, setRequiredEquipment] = useState<ResourceType | 'none'>('jetting_machine');
  const [requiredStaffCount, setRequiredStaffCount] = useState<number>(3);
  const [affectedPop, setAffectedPop] = useState<number>(150);

  // User Manual Override Tracking Flags
  const [isDeptOverridden, setIsDeptOverridden] = useState<boolean>(false);
  const [isCategoryOverridden, setIsCategoryOverridden] = useState<boolean>(false);
  const [isUrgencyOverridden, setIsUrgencyOverridden] = useState<boolean>(false);
  const [isEquipmentOverridden, setIsEquipmentOverridden] = useState<boolean>(false);
  const [isStaffOverridden, setIsStaffOverridden] = useState<boolean>(false);

  // AI Analysis Feedback
  const [aiResult, setAiResult] = useState<AIIntakeResult | null>(null);

  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Voice Simulation State
  const [isRecording, setIsRecording] = useState(false);

  // Tracking Search State
  const [trackQuery, setTrackQuery] = useState<string>('');
  const [trackedIssue, setTrackedIssue] = useState<any>(null);

  // Trigger Multimodal Vision & Text Analysis
  useEffect(() => {
    let active = true;
    const runAnalysis = async () => {
      if (!description.trim() && !title.trim() && !photoDataUrl) {
        setAiResult(null);
        return;
      }

      setIsAnalyzingImage(true);
      try {
        const result = await AIIntakeParser.parseComplaintAsync(
          title,
          description,
          Boolean(photoDataUrl),
          Boolean(address.trim()),
          photoDataUrl || undefined
        );

        if (!active) return;
        setAiResult(result);

        // Auto-populate fields that haven't been manually overridden
        if (!isCategoryOverridden && result.categoryIdSuggested) {
          setSelectedCategoryId(result.categoryIdSuggested);
          const matchedCat = categories.find((c) => c.id === result.categoryIdSuggested);
          if (matchedCat && !isDeptOverridden) {
            setSelectedDeptId(matchedCat.departmentId);
          }
        }

        if (!isUrgencyOverridden && result.suggestedUrgency) {
          setSelectedUrgency(result.suggestedUrgency);
        }

        if (!isEquipmentOverridden && result.requiredEquipment) {
          setRequiredEquipment(result.requiredEquipment);
        }

        if (!isStaffOverridden && result.requiredStaffCount) {
          setRequiredStaffCount(result.requiredStaffCount);
        }

        if (result.affectedPopulationEstimate) {
          setAffectedPop(result.affectedPopulationEstimate);
        }
      } catch (err) {
        console.warn('AI analysis error:', err);
      } finally {
        if (active) setIsAnalyzingImage(false);
      }
    };

    const timer = setTimeout(() => {
      runAnalysis();
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [title, description, photoDataUrl, address]);

  // Handle Real File Upload
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFileName(file.name);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setPhotoDataUrl(base64);

      if (isSupabaseConfigured) {
        try {
          const fileExt = file.name.split('.').pop();
          const filePath = `grievances/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          await supabase.storage.from('issue-attachments').upload(filePath, file);
        } catch {
          // Silent catch for storage upload
        }
      }
    };

    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoDataUrl(null);
    setPhotoFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !address.trim()) return;

    setIsSubmitting(true);
    try {
      const newIssue = await submitIssue({
        title: title.trim(),
        description: description.trim(),
        address: address.trim(),
        zoneId: selectedZoneId,
        categoryId: selectedCategoryId,
        photoUrls: photoDataUrl ? [photoDataUrl] : [],
        affectedPopulation: affectedPop,
      });

      setSubmittedTicket(newIssue.ticketNumber);
      setTrackedIssue(newIssue);
      setTitle('');
      setDescription('');
      setAddress('');
      removePhoto();
      setIsDeptOverridden(false);
      setIsCategoryOverridden(false);
      setIsUrgencyOverridden(false);
      setIsEquipmentOverridden(false);
      setIsStaffOverridden(false);
    } catch (err) {
      console.error('Submission failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoiceIntake = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    setIsRecording(true);
    setTimeout(() => {
      if (language === 'mr') {
        setTitle('सिव्हिल हॉस्पिटलजवळ मुख्य रस्त्यावर खोल खड्डा पडून वाहतुकीस अडथळा निर्माण झाला आहे');
        setDescription('मागील ४ तासांपासून कोपरगाव सिव्हिल हॉस्पिटल मुख्य रस्त्यावर डांबरीकरण खचून २ फूट खोल खड्डा पडला असून अपघात घडण्याचा गंभीर धोका आहे.');
        setAddress('सिव्हिल हॉस्पिटल चौक, स्टेशन रोड, प्रभाग ४');
        setSelectedZoneId('a0000000-0000-0000-0000-000000000004');
      } else {
        setTitle('Critical deep crater cave-in on Station Road near Civil Hospital');
        setDescription('A large 2-foot asphalt crater has caved in on Station Road near Civil Hospital entrance creating immediate road accident and ambulance blockage risk.');
        setAddress('Civil Hospital Junction, Station Road, Ward 4');
        setSelectedZoneId('a0000000-0000-0000-0000-000000000004');
      }
      setIsRecording(false);
    }, 1500);
  };

  const handleTrackSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const found = issues.find(
      (i) => i.ticketNumber.toLowerCase() === trackQuery.trim().toLowerCase()
    );
    setTrackedIssue(found || null);
  };

  useEffect(() => {
    if (activeTab === 'track' && !trackedIssue && issues.length > 0) {
      setTrackedIssue(issues[0]);
    }
  }, [activeTab, issues]);

  const filteredCategories = categories.filter((c) => c.departmentId === selectedDeptId);

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white border border-[#76777d]/20 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <Cpu size={12} /> Multimodal AI Gateway
            </span>
            <span className="text-xs text-[#76777d]">Kopargaon Citizen Service Portal</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1b1b1d] tracking-tight">
            Citizen Grievance & Tracking Portal
          </h1>
          <p className="text-xs sm:text-sm text-[#57657b] mt-1">
            Upload incident photos to auto-detect Department, Severity, Machine & Crew requirements, with full freedom to review and correct.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-[#f0edef] p-1 rounded-xl border border-[#76777d]/15 flex items-center text-xs shrink-0">
          <button
            onClick={() => setSearchParams({ tab: 'submit' })}
            className={`px-4 py-2 rounded-lg font-bold uppercase text-[11px] tracking-wider transition-all flex items-center gap-1.5 ${
              activeTab === 'submit'
                ? 'bg-[#131b2e] text-white shadow-xs'
                : 'text-[#57657b] hover:text-[#1b1b1d]'
            }`}
          >
            <PlusCircle size={14} />
            <span>{t.reportIssue}</span>
          </button>
          <button
            onClick={() => setSearchParams({ tab: 'track' })}
            className={`px-4 py-2 rounded-lg font-bold uppercase text-[11px] tracking-wider transition-all flex items-center gap-1.5 ${
              activeTab === 'track'
                ? 'bg-[#131b2e] text-white shadow-xs'
                : 'text-[#57657b] hover:text-[#1b1b1d]'
            }`}
          >
            <Search size={14} />
            <span>{t.trackTicket}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SUBMISSION & INTERACTIVE SDDS CORRECTION WIZARD */}
      {activeTab === 'submit' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Form (2 Cols) */}
          <div className="lg:col-span-2 bg-white border border-[#76777d]/20 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#76777d]/15 pb-3">
              <h2 className="font-bold text-[#1b1b1d] text-sm uppercase tracking-wider flex items-center gap-2">
                <PlusCircle size={16} className="text-[#131b2e]" />
                <span>{t.reportIssue}</span>
              </h2>

              {/* Voice Complaint Intake Button */}
              <button
                type="button"
                onClick={handleVoiceIntake}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all ${
                  isRecording
                    ? 'bg-red-100 text-red-800 border-red-300 animate-pulse'
                    : 'bg-[#f6f3f5] hover:bg-slate-100 text-[#131b2e] border-[#76777d]/20'
                }`}
              >
                {isRecording ? <MicOff size={14} className="text-red-600" /> : <Mic size={14} className="text-[#131b2e]" />}
                <span>{isRecording ? 'Listening...' : 'Voice Complaint (AI)'}</span>
              </button>
            </div>

            {submittedTicket && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs space-y-1">
                <div className="font-bold text-emerald-800 text-sm flex items-center gap-1.5">
                  <CheckCircle2 size={16} />
                  <span>Issue Registered Successfully!</span>
                </div>
                <p>
                  Your ticket number is <strong className="font-mono text-[#131b2e]">{submittedTicket}</strong>. The deterministic priority engine has calculated its priority score and queued it for municipal planning.
                </p>
                <button
                  onClick={() => setSearchParams({ tab: 'track' })}
                  className="mt-2 text-emerald-800 font-bold underline text-[11px]"
                >
                  Click here to view live tracking status →
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Photo Upload Area First */}
              <div className="space-y-2">
                <label className="block text-[#1b1b1d] font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera size={14} className="text-[#131b2e]" />
                    <span>Upload Site Photo (AI Vision Auto-Assessment)</span>
                  </span>
                  {photoDataUrl && (
                    <span className="text-[10px] text-emerald-700 font-mono font-bold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Image Attached (100% Confidence)
                    </span>
                  )}
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />

                {!photoDataUrl ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#76777d]/30 hover:border-[#131b2e] bg-[#fcf8fa] hover:bg-slate-50 p-6 rounded-2xl text-center cursor-pointer transition-all space-y-2"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-[#131b2e] flex items-center justify-center mx-auto">
                      <UploadCloud size={20} />
                    </div>
                    <div className="text-xs font-bold text-[#1b1b1d]">
                      Click to upload photo from camera / gallery
                    </div>
                    <p className="text-[10px] text-[#76777d]">
                      Gemini Vision will automatically identify the defect, department, machinery, and crew size.
                    </p>
                  </div>
                ) : (
                  <div className="relative bg-[#fcf8fa] border border-[#76777d]/20 rounded-2xl p-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={photoDataUrl}
                        alt="Uploaded preview"
                        className="w-16 h-16 object-cover rounded-xl border border-slate-300"
                      />
                      <div>
                        <div className="font-bold text-[#1b1b1d] truncate max-w-[220px] text-xs">
                          {photoFileName || 'Attached Site Photo'}
                        </div>
                        <div className="text-[10px] text-emerald-700 flex items-center gap-1 mt-0.5 font-bold">
                          <CheckCircle2 size={11} /> Photo Loaded • Vision Assessment Ready
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="p-1.5 rounded-lg bg-white hover:bg-red-50 text-slate-500 hover:text-red-700 border border-slate-200 transition-colors"
                      title="Remove Photo"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-[#1b1b1d] font-bold mb-1">
                  Issue Summary / Title <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Drinking water pipeline smelling of sewage near Civil Hospital"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#f6f3f5] border border-[#76777d]/20 rounded-xl px-3 py-2 text-[#1b1b1d] placeholder:text-[#76777d]/70 focus:outline-none focus:border-[#131b2e] font-medium"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[#1b1b1d] font-bold mb-1">
                  Detailed Description <span className="text-red-600">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe the problem, nearby landmarks (school, hospital), and risk to residents..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#f6f3f5] border border-[#76777d]/20 rounded-xl p-3 text-[#1b1b1d] placeholder:text-[#76777d]/70 focus:outline-none focus:border-[#131b2e] font-medium leading-relaxed"
                />
              </div>

              {/* Ward & Address Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#1b1b1d] font-bold mb-1">
                    Kopargaon Ward / Zone <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={selectedZoneId}
                    onChange={(e) => setSelectedZoneId(e.target.value)}
                    className="w-full bg-[#f6f3f5] border border-[#76777d]/20 rounded-xl px-3 py-2 text-[#1b1b1d] focus:outline-none focus:border-[#131b2e] font-semibold"
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.code} - {z.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#1b1b1d] font-bold mb-1">
                    Street / Landmark Address <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lane 3, Behind Kopargaon Civil Hospital"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-[#f6f3f5] border border-[#76777d]/20 rounded-xl px-3 py-2 text-[#1b1b1d] placeholder:text-[#76777d]/70 focus:outline-none focus:border-[#131b2e] font-medium"
                  />
                </div>
              </div>

              {/* SDDS Interactive Review & Correction Card */}
              <div className="bg-[#fcf8fa] border border-blue-200 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#76777d]/15 pb-3">
                  <div className="flex items-center gap-2">
                    <Sliders size={16} className="text-[#131b2e]" />
                    <span className="font-bold text-[#1b1b1d] text-xs uppercase tracking-wider">
                      Municipal Parameter Review & Manual Correction (SDDS)
                    </span>
                  </div>
                  <span className="text-[10px] text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-mono font-bold">
                    ⚡ Auto-Filled by AI • Click to edit
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Department */}
                  <div>
                    <label className="block text-[#1b1b1d] font-bold mb-1 flex items-center justify-between">
                      <span>Target Department</span>
                      {isDeptOverridden ? (
                        <span className="text-[10px] text-amber-700 font-mono font-bold">(User Adjusted)</span>
                      ) : (
                        <span className="text-[10px] text-emerald-700 font-mono font-bold">(AI Detected)</span>
                      )}
                    </label>
                    <select
                      value={selectedDeptId}
                      onChange={(e) => {
                        setSelectedDeptId(e.target.value);
                        setIsDeptOverridden(true);
                        const firstCat = categories.find((c) => c.departmentId === e.target.value);
                        if (firstCat) setSelectedCategoryId(firstCat.id);
                      }}
                      className="w-full bg-white border border-[#76777d]/20 rounded-xl px-3 py-2 text-[#1b1b1d] font-bold text-xs focus:outline-none focus:border-[#131b2e]"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.code}: {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-[#1b1b1d] font-bold mb-1 flex items-center justify-between">
                      <span>Hazard Category</span>
                      {isCategoryOverridden ? (
                        <span className="text-[10px] text-amber-700 font-mono font-bold">(User Adjusted)</span>
                      ) : (
                        <span className="text-[10px] text-emerald-700 font-mono font-bold">(AI Detected)</span>
                      )}
                    </label>
                    <select
                      value={selectedCategoryId}
                      onChange={(e) => {
                        setSelectedCategoryId(e.target.value);
                        setIsCategoryOverridden(true);
                      }}
                      className="w-full bg-white border border-[#76777d]/20 rounded-xl px-3 py-2 text-[#1b1b1d] font-bold text-xs focus:outline-none focus:border-[#131b2e]"
                    >
                      {filteredCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Severity */}
                  <div>
                    <label className="block text-[#1b1b1d] font-bold mb-1.5 flex items-center justify-between">
                      <span>Severity / Urgency Level</span>
                      {isUrgencyOverridden ? (
                        <span className="text-[10px] text-amber-700 font-mono font-bold">(User Adjusted)</span>
                      ) : (
                        <span className="text-[10px] text-emerald-700 font-mono font-bold">(AI Detected)</span>
                      )}
                    </label>
                    <div className="grid grid-cols-4 gap-1.5 text-xs">
                      {(['critical', 'high', 'medium', 'low'] as UrgencyLevel[]).map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => {
                            setSelectedUrgency(lvl);
                            setIsUrgencyOverridden(true);
                          }}
                          className={`py-1.5 rounded-lg font-bold uppercase text-[10px] transition-all ${
                            selectedUrgency === lvl
                              ? lvl === 'critical'
                                ? 'bg-[#ba1a1a] text-white shadow-xs'
                                : lvl === 'high'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : lvl === 'medium'
                                ? 'bg-blue-700 text-white shadow-xs'
                                : 'bg-slate-700 text-white shadow-xs'
                              : 'bg-white text-[#57657b] border border-[#76777d]/20 hover:border-[#131b2e]'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Machinery */}
                  <div>
                    <label className="block text-[#1b1b1d] font-bold mb-1 flex items-center justify-between">
                      <span>Required Fleet Machinery</span>
                      {isEquipmentOverridden ? (
                        <span className="text-[10px] text-amber-700 font-mono font-bold">(User Adjusted)</span>
                      ) : (
                        <span className="text-[10px] text-emerald-700 font-mono font-bold">(AI Detected)</span>
                      )}
                    </label>
                    <select
                      value={requiredEquipment}
                      onChange={(e) => {
                        setRequiredEquipment(e.target.value as ResourceType);
                        setIsEquipmentOverridden(true);
                      }}
                      className="w-full bg-white border border-[#76777d]/20 rounded-xl px-3 py-2 text-[#1b1b1d] font-bold text-xs focus:outline-none focus:border-[#131b2e] capitalize"
                    >
                      <option value="jetting_machine">Jetting Machine (Suction Vacuum)</option>
                      <option value="road_roller">Road Roller (Asphalt Compactor)</option>
                      <option value="hydraulic_bucket_truck">Hydraulic Bucket Lift Truck</option>
                      <option value="tipper_truck">Tipper Refuse Truck</option>
                      <option value="fogging_machine">Fogging Vector Machine</option>
                      <option value="none">Standard Hand Toolset (No Fleet Vehicle)</option>
                    </select>
                  </div>

                  {/* Crew Needed */}
                  <div>
                    <label className="block text-[#1b1b1d] font-bold mb-1 flex items-center justify-between">
                      <span>Crew Size (Technicians)</span>
                      {isStaffOverridden ? (
                        <span className="text-[10px] text-amber-700 font-mono font-bold">(User Adjusted)</span>
                      ) : (
                        <span className="text-[10px] text-emerald-700 font-mono font-bold">(AI Detected)</span>
                      )}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={requiredStaffCount}
                        onChange={(e) => {
                          setRequiredStaffCount(Number(e.target.value));
                          setIsStaffOverridden(true);
                        }}
                        className="w-full bg-white border border-[#76777d]/20 rounded-xl px-3 py-2 text-[#1b1b1d] font-mono text-xs focus:outline-none focus:border-[#131b2e] font-bold"
                      />
                      <span className="text-[#76777d] text-xs shrink-0">Staff</span>
                    </div>
                  </div>

                  {/* Affected Population */}
                  <div>
                    <label className="block text-[#1b1b1d] font-bold mb-1">
                      Estimated Affected Residents
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={20000}
                      value={affectedPop}
                      onChange={(e) => setAffectedPop(Number(e.target.value))}
                      className="w-full bg-white border border-[#76777d]/20 rounded-xl px-3 py-2 text-[#1b1b1d] font-mono text-xs focus:outline-none focus:border-[#131b2e] font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-[#131b2e] hover:bg-[#1e2a47] text-white rounded-xl font-bold text-xs shadow-md flex items-center gap-2 transition-all uppercase tracking-wider"
                >
                  <Send size={15} />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit to Municipal Decision Engine'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* AI Multimodal Vision Analysis Output (1 Col) */}
          <div className="bg-white border border-[#76777d]/20 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#76777d]/15 pb-3">
              <h3 className="font-bold text-[#1b1b1d] text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#131b2e]" />
                <span>AI Vision & Defect Recognition</span>
              </h3>
              {isAnalyzingImage ? (
                <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-mono font-bold animate-pulse">
                  Analyzing...
                </span>
              ) : (
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                  {aiResult?.modelUsed || 'Gemini Vision'}
                </span>
              )}
            </div>

            {aiResult ? (
              <div className="space-y-3 text-xs">
                {/* Confidence Bar */}
                <div className="bg-[#fcf8fa] p-3 rounded-xl border border-[#76777d]/15 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[#57657b]">Vision Verification Confidence:</span>
                    <span className="font-mono text-emerald-700 font-bold">
                      {(aiResult.confidenceScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#eae7e9] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full"
                      style={{ width: `${aiResult.confidenceScore * 100}%` }}
                    />
                  </div>
                </div>

                {/* Visual Findings Rationale */}
                {aiResult.visualFindings && (
                  <div className="bg-[#fcf8fa] p-3 rounded-xl border border-[#76777d]/15 space-y-1">
                    <span className="text-[10px] font-bold text-[#76777d] uppercase tracking-wider block">
                      Visual Findings
                    </span>
                    <p className="text-[#1b1b1d] text-xs leading-relaxed">
                      {aiResult.visualFindings}
                    </p>
                  </div>
                )}

                {/* Auto-detected Breakdown Cards */}
                <div className="bg-[#fcf8fa] p-3 rounded-xl border border-[#76777d]/15 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#57657b]">Auto Department:</span>
                    <span className="font-mono font-bold text-[#1b1b1d]">
                      {aiResult.departmentCodeSuggested}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#57657b]">Assessed Urgency:</span>
                    <span className="font-mono text-amber-700 font-bold uppercase">
                      {aiResult.suggestedUrgency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#57657b]">Fleet Machinery:</span>
                    <span className="font-mono text-[#1b1b1d] capitalize">
                      {aiResult.requiredEquipment?.replace('_', ' ') || 'Standard Toolset'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#57657b]">Crew Deployment:</span>
                    <span className="font-mono text-[#1b1b1d]">{aiResult.requiredStaffCount} staff</span>
                  </div>
                </div>

                <div className="text-[11px] text-blue-900 bg-blue-50 p-2.5 rounded-xl border border-blue-200 leading-relaxed">
                  💡 <strong>SDDS Dynamic Override:</strong> All detected parameters above are pre-selected in the form. You can adjust any parameter on the left if conditions require it.
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-[#76777d] text-xs leading-relaxed">
                Upload a site photo or write a description. Gemini Vision will analyze physical damage and auto-fill Department, Category, Severity, Machinery, and Crew requirements.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CITIZEN TICKET TRACKING */}
      {activeTab === 'track' && (
        <div className="space-y-5">
          <div className="bg-white border border-[#76777d]/20 rounded-2xl p-5 shadow-xs">
            <form onSubmit={handleTrackSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-3 text-[#76777d]" />
                <input
                  type="text"
                  placeholder="Enter Municipal Ticket Number (e.g. KMC-2026-00101)..."
                  value={trackQuery}
                  onChange={(e) => setTrackQuery(e.target.value)}
                  className="w-full bg-[#f6f3f5] border border-[#76777d]/20 rounded-xl pl-10 pr-3 py-2.5 text-xs text-[#1b1b1d] placeholder:text-[#76777d]/70 focus:outline-none focus:border-[#131b2e] font-mono font-medium"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#131b2e] hover:bg-[#1e2a47] text-white font-bold rounded-xl text-xs transition-colors shadow-xs uppercase tracking-wider"
              >
                Track Status
              </button>
            </form>
          </div>

          {trackedIssue ? (
            <div className="bg-white border border-[#76777d]/20 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#76777d]/15 pb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[#131b2e] font-bold text-sm">
                      {trackedIssue.ticketNumber}
                    </span>
                    <span className="text-[#76777d]">•</span>
                    <span className="text-xs text-[#76777d]">
                      Reported on {new Date(trackedIssue.reportedAt).toLocaleString()}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-[#1b1b1d]">{trackedIssue.title}</h2>
                  <div className="text-xs text-[#57657b] mt-1 flex items-center gap-1">
                    <MapPin size={13} className="text-[#131b2e]" />
                    <span>{trackedIssue.locationAddress}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <PriorityBadge
                    score={trackedIssue.priorityScore?.finalScore}
                    confidence={trackedIssue.confidenceScore}
                    size="lg"
                  />
                  <StatusBadge status={trackedIssue.status} />
                </div>
              </div>

              {/* Photo Evidence */}
              {trackedIssue.photoUrls && trackedIssue.photoUrls.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-[#76777d] uppercase tracking-wider block">
                    Citizen Photo Evidence
                  </span>
                  <div className="flex gap-2">
                    {trackedIssue.photoUrls.map((url: string, idx: number) => (
                      <img
                        key={idx}
                        src={url}
                        alt="Evidence"
                        className="w-24 h-24 object-cover rounded-xl border border-slate-200"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Progress Stage Timeline */}
              <div>
                <h3 className="text-xs font-bold uppercase text-[#76777d] tracking-wider mb-3">
                  Municipal Action Timeline
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {[
                    { key: 'submitted', label: '1. Registered', desc: 'Received by council' },
                    { key: 'prioritized', label: '2. Scored & Queued', desc: 'Evaluated by priority engine' },
                    { key: 'scheduled', label: '3. Work Dispatched', desc: 'Crew & equipment assigned' },
                    { key: 'resolved', label: '4. Rectified', desc: 'Closed and inspected' },
                  ].map((stage) => {
                    const isDone =
                      (stage.key === 'submitted') ||
                      (stage.key === 'prioritized' && trackedIssue.status !== 'submitted') ||
                      (stage.key === 'scheduled' && (trackedIssue.status === 'scheduled' || trackedIssue.status === 'in_progress' || trackedIssue.status === 'resolved')) ||
                      (stage.key === 'resolved' && trackedIssue.status === 'resolved');

                    return (
                      <div
                        key={stage.key}
                        className={`p-3.5 rounded-xl border text-xs transition-all ${
                          isDone
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                            : 'bg-[#fcf8fa] border-[#76777d]/15 text-[#76777d]'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1.5 mb-1 text-[#1b1b1d]">
                          <CheckCircle2
                            size={14}
                            className={isDone ? 'text-emerald-700' : 'text-slate-400'}
                          />
                          <span>{stage.label}</span>
                        </div>
                        <div className="text-[11px] opacity-80">{stage.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Citizen Reassuring Explanation Banner */}
              {(() => {
                const expl = ExplainabilityService.generateCitizenExplanation(trackedIssue);
                return (
                  <div className="bg-[#fcf8fa] border border-[#76777d]/20 rounded-xl p-4 text-xs space-y-2">
                    <div className="font-bold text-emerald-800 text-sm flex items-center gap-2">
                      <ShieldCheck size={16} />
                      <span>{expl.statusHeadline}</span>
                    </div>
                    <p className="text-[#1b1b1d] leading-relaxed">{expl.detail}</p>
                    <div className="text-[11px] text-amber-800 font-bold">
                      Next Step: {expl.expectedAction}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="p-12 text-center text-[#76777d] text-xs bg-white border border-[#76777d]/20 rounded-2xl">
              No tickets found. Submit an issue to view real-time stage progression.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
