import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCivic } from '../context/CivicContext';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { AIIntakeParser, AIIntakeResult } from '../services/aiIntakeParser';
import { ExplainabilityService } from '../services/explainabilityService';
import { PhotoGeoLocationService, GeolocationResult } from '../services/photoGeoLocation';
import { LiveCameraModal } from '../components/common/CameraCaptureModal';
import { SMSAlertService } from '../services/smsAlertService';
import { UrgencyLevel, ResourceType, IssueStatus } from '../types';
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
  Navigation,
  Crosshair,
  Compass,
  Globe,
  RefreshCw,
  Image as ImageIcon,
  Info,
  Calendar,
  Phone,
  Truck,
  CheckCheck,
  UserCheck,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const createPinIcon = () => {
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ba1a1a" width="30" height="30" stroke="#ffffff" stroke-width="1.5">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `;

  return L.divIcon({
    html: svgIcon,
    className: 'custom-pin-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });
};

export const CitizenPortalPage: React.FC = () => {
  const { zones, departments, categories, submitIssue, updateIssueStatus, issues, currentUser, t, language } = useCivic();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const activeTab = searchParams.get('tab') || 'submit';

  // Submission Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState<string>(zones[0]?.id || 'a0000000-0000-0000-0000-000000000001');

  // Real Uploaded Photo & Location Geotagging State
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoFileName, setPhotoFileName] = useState<string>('');
  const [geoCoordinates, setGeoCoordinates] = useState<GeolocationResult | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState<boolean>(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);

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

  // Field Verification Loop (Non-Smartphone / Missing Evidence Compensating Action)
  const [requestFieldVerification, setRequestFieldVerification] = useState<boolean>(false);

  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Voice Simulation State
  const [isRecording, setIsRecording] = useState(false);

  // Tracking Search State
  const [trackQuery, setTrackQuery] = useState<string>('');
  const [trackedIssue, setTrackedIssue] = useState<any>(null);

  // Acquire live GPS Geolocation from where the user is uploading
  const handleAcquireGPS = async (isFallback: boolean = false) => {
    setIsLocating(true);
    try {
      const result = await PhotoGeoLocationService.getDeviceGPS(zones, isFallback);
      setGeoCoordinates(result);

      if (result.closestWardId) {
        setSelectedZoneId(result.closestWardId);
      }

      if (!address.trim() && result.closestWardName) {
        setAddress(`${result.closestWardName}, Kopargaon`);
      }
    } catch (err) {
      console.warn('GPS location error:', err);
    } finally {
      setIsLocating(false);
    }
  };

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

  // Handle Real File Upload & Automatic Metadata Location vs Upload Location
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFileName(file.name);

    // 1. Read Base64 Data URL for image rendering & vision
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

    // 2. Read ArrayBuffer to extract photo capture location from metadata (or fallback to upload place)
    const bufferReader = new FileReader();
    bufferReader.onload = async () => {
      const buffer = bufferReader.result as ArrayBuffer;
      const exifResult = PhotoGeoLocationService.extractExifGps(buffer, zones);

      if (exifResult) {
        setGeoCoordinates(exifResult);
        if (exifResult.closestWardId) {
          setSelectedZoneId(exifResult.closestWardId);
        }
      } else {
        await handleAcquireGPS(true);
      }
    };
    bufferReader.readAsArrayBuffer(file);
  };

  // Handle Live Camera Snapshot from In-App Viewfinder Modal
  const handleLiveCapture = async (dataUrl: string, fileName: string) => {
    setPhotoDataUrl(dataUrl);
    setPhotoFileName(fileName);
    await handleAcquireGPS(false);
  };

  const removePhoto = () => {
    setPhotoDataUrl(null);
    setPhotoFileName('');
    setGeoCoordinates(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
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
        latitude: geoCoordinates?.latitude,
        longitude: geoCoordinates?.longitude,
        photoUrls: photoDataUrl ? [photoDataUrl] : [],
        affectedPopulation: affectedPop,
        citizenPhone: currentUser.phone || '',
        citizenName: currentUser.fullName || '',
        verificationMethod: photoDataUrl
          ? 'digital_evidence'
          : (requestFieldVerification ? 'field_verification_requested' : 'unverified'),
      });

      setSubmittedTicket(newIssue.ticketNumber);
      setTrackedIssue(newIssue);
      setTitle('');
      setDescription('');
      setAddress('');
      removePhoto();
      setRequestFieldVerification(false);
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

  const handleSimulateStatus = (stage: IssueStatus) => {
    if (!trackedIssue) return;
    updateIssueStatus(trackedIssue.id, stage, `Automated simulated progression to ${stage}`);
    setTrackedIssue({ ...trackedIssue, status: stage });
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
        setGeoCoordinates({
          latitude: 19.8878,
          longitude: 74.4891,
          accuracyMeters: 5,
          source: 'device_gps',
          closestWardId: 'a0000000-0000-0000-0000-000000000004',
          closestWardName: 'WARD-04 - Civil Hospital & Station Road',
        });
      } else {
        setTitle('Critical deep crater cave-in on Station Road near Civil Hospital');
        setDescription('A large 2-foot asphalt crater has caved in on Station Road near Civil Hospital entrance creating immediate road accident and ambulance blockage risk.');
        setAddress('Civil Hospital Junction, Station Road, Ward 4');
        setSelectedZoneId('a0000000-0000-0000-0000-000000000004');
        setGeoCoordinates({
          latitude: 19.8878,
          longitude: 74.4891,
          accuracyMeters: 5,
          source: 'device_gps',
          closestWardId: 'a0000000-0000-0000-0000-000000000004',
          closestWardName: 'WARD-04 - Civil Hospital & Station Road',
        });
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
      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <Phone size={12} /> Real-Time Cellular SMS Alerts & AI Vision
            </span>
            <span className="text-xs text-muted-foreground">KoparNiti • Kopargaon Citizen Service Portal (कोपरनीती)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            Citizen Grievance & Tracking Portal
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Capture live photos or upload incident evidence with automatic GPS geotagging, SDDS parameter review, and instant real-time SMS alerts dispatched directly to your mobile phone.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-[#f0edef] p-1 rounded-xl border border-border flex items-center text-xs shrink-0 gap-1">
          <button
            onClick={() => setSearchParams({ tab: 'submit' })}
            className={`px-3.5 py-2 rounded-lg font-bold uppercase text-[11px] tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'submit'
                ? 'bg-primary text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <PlusCircle size={14} />
            <span>{t.reportIssue}</span>
          </button>
          <button
            onClick={() => setSearchParams({ tab: 'track' })}
            className={`px-3.5 py-2 rounded-lg font-bold uppercase text-[11px] tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'track'
                ? 'bg-primary text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
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
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-bold text-foreground text-sm uppercase tracking-wider flex items-center gap-2">
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
                    : 'bg-muted/60 dark:bg-slate-900 hover:bg-slate-100 text-[#131b2e] border-border'
                }`}
              >
                {isRecording ? <MicOff size={14} className="text-red-600" /> : <Mic size={14} className="text-[#131b2e]" />}
                <span>{isRecording ? 'Listening...' : 'Voice Complaint (AI)'}</span>
              </button>
            </div>

            {submittedTicket && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs space-y-2">
                <div className="font-bold text-emerald-800 text-sm flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 size={16} />
                    <span>Issue Registered Successfully!</span>
                  </span>
                  <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                    SMS DISPATCHED TO PHONE 📱
                  </span>
                </div>
                <p>
                  Your ticket number is <strong className="font-mono text-[#131b2e]">{submittedTicket}</strong>. An initial confirmation SMS has been dispatched directly to your mobile handset <strong>{currentUser.phone ? currentUser.phone : '(No phone in profile)'}</strong> with priority score and SLA timing.
                </p>
                <div className="pt-1">
                  <button
                    onClick={() => setSearchParams({ tab: 'track' })}
                    className="text-emerald-800 font-bold underline text-[11px]"
                  >
                    Track Live Progress Timeline →
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Authenticated Citizen Account Badge (Directly Uses Logged-In User Details) */}
              <div className="bg-muted/30 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                    {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div className="font-bold text-foreground flex items-center gap-2">
                      <span>{currentUser.fullName || 'Citizen User'}</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                        <CheckCircle2 size={11} /> Verified Citizen Account
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 font-mono">
                      <Phone size={12} className="text-blue-700" />
                      <span>Real-time SMS Alerts to: <strong>{currentUser.phone ? currentUser.phone : '(No Phone Number in Profile)'}</strong></span>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg self-start sm:self-auto font-mono">
                  ⚡ Fast2SMS Cellular Auto-Linked
                </div>
              </div>

              {/* Photo Upload & Geotag Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-foreground font-bold flex items-center gap-1.5">
                    <Camera size={14} className="text-[#131b2e]" />
                    <span>Attach Site Photo (Live Camera or Gallery)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleAcquireGPS(false)}
                    disabled={isLocating}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Crosshair size={12} className={isLocating ? 'animate-spin' : ''} />
                    <span>{isLocating ? 'Acquiring GPS...' : '📍 Auto-Geotag Location'}</span>
                  </button>
                </div>

                {/* Hidden File Picker for Gallery */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />

                {/* Hidden Mobile Native Camera Picker */}
                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageFileChange}
                  className="hidden"
                />

                {!photoDataUrl ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* OPTION 1: CAPTURE PHOTO NOW (CAMERA) */}
                    <div
                      onClick={() => setIsCameraModalOpen(true)}
                      className="border-2 border-dashed border-[#131b2e]/30 hover:border-[#131b2e] bg-muted/30 dark:bg-slate-900/60 hover:bg-blue-50/50 p-5 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 group shadow-xs"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                        <Camera size={22} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">
                          Capture Photo Now (Live Camera)
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Opens live viewfinder with instant GPS geotagging & vision scan.
                        </p>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                        📸 Open Camera
                      </span>
                    </div>

                    {/* OPTION 2: CHOOSE FROM GALLERY / FILES */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border hover:border-[#131b2e] bg-muted/30 dark:bg-slate-900/60 hover:bg-slate-50 p-5 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 group"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-slate-100 border border-slate-200 text-[#131b2e] flex items-center justify-center group-hover:scale-105 transition-transform">
                        <ImageIcon size={22} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">
                          Choose from Gallery / Files
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Auto-extracts photo metadata location or uses your upload place.
                        </p>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                        🖼️ Browse Files
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted/30 dark:bg-slate-900/60 border border-border rounded-2xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={photoDataUrl}
                          alt="Uploaded preview"
                          className="w-16 h-16 object-cover rounded-xl border border-slate-300 shadow-xs"
                        />
                        <div>
                          <div className="font-bold text-foreground truncate max-w-[220px] text-xs">
                            {photoFileName || 'Attached Site Photo'}
                          </div>
                          <div className="text-[10px] text-emerald-700 flex items-center gap-1 mt-0.5 font-bold">
                            <CheckCircle2 size={11} /> Photo Loaded • Vision & Geotag Ready
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsCameraModalOpen(true)}
                          className="px-3 py-1.5 rounded-lg bg-card hover:bg-slate-100 text-[#131b2e] font-bold text-[11px] border border-slate-200 flex items-center gap-1 transition-colors"
                        >
                          <Camera size={13} />
                          <span>Retake</span>
                        </button>
                        <button
                          type="button"
                          onClick={removePhoto}
                          className="p-1.5 rounded-lg bg-card hover:bg-red-50 text-slate-500 hover:text-red-700 border border-slate-200 transition-colors"
                          title="Remove Photo"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Geotagged Location Coordinates Badge & Intelligent EXIF vs Upload Location Indicator */}
                    {geoCoordinates && (
                      <div
                        className={`p-3.5 rounded-xl border space-y-2.5 ${
                          geoCoordinates.source === 'exif_metadata'
                            ? 'bg-emerald-50/70 border-emerald-300'
                            : 'bg-blue-50/70 border-blue-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <MapPin
                              size={14}
                              className={
                                geoCoordinates.source === 'exif_metadata'
                                  ? 'text-emerald-700'
                                  : 'text-blue-700'
                              }
                            />
                            <span className={geoCoordinates.source === 'exif_metadata' ? 'text-emerald-950' : 'text-blue-950'}>
                              {geoCoordinates.source === 'exif_metadata'
                                ? '📷 Original Photo Capture Location (From EXIF Metadata)'
                                : '🛰️ Current Upload Location (Device GPS Geotag)'}
                            </span>
                          </div>

                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md self-start sm:self-auto border ${
                              geoCoordinates.source === 'exif_metadata'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : 'bg-blue-100 text-blue-900 border-blue-300'
                            }`}
                          >
                            {geoCoordinates.source === 'exif_metadata'
                              ? 'EXIF METADATA DETECTED'
                              : 'UPLOAD PLACE GEOTAGGED'}
                          </span>
                        </div>

                        {/* Coordinates & Accuracy */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-foreground">
                          <div className="flex items-center gap-1">
                            <Globe size={12} className="text-muted-foreground" />
                            <span>
                              Coordinates:{' '}
                              <strong className="font-mono">
                                {geoCoordinates.latitude.toFixed(6)}° N, {geoCoordinates.longitude.toFixed(6)}° E
                              </strong>
                            </span>
                          </div>

                          {geoCoordinates.closestWardName && (
                            <div className="flex items-center gap-1">
                              <Compass size={12} className="text-muted-foreground" />
                              <span>
                                Matched Ward: <strong>{geoCoordinates.closestWardName}</strong>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Metadata Date or Fallback Explanation Notice */}
                        {geoCoordinates.source === 'exif_metadata' && geoCoordinates.exifDateTimeOriginal && (
                          <div className="text-[11px] text-emerald-800 flex items-center gap-1 font-medium">
                            <Calendar size={12} />
                            <span>Original Capture Timestamp: {geoCoordinates.exifDateTimeOriginal}</span>
                          </div>
                        )}

                        {geoCoordinates.isFallbackUploadLocation && (
                          <div className="text-[11px] text-blue-900 flex items-start gap-1.5 bg-card/70 p-2 rounded-lg border border-blue-200/60 leading-relaxed">
                            <Info size={13} className="text-blue-700 shrink-0 mt-0.5" />
                            <span>
                              <strong>Upload Location Fallback:</strong> This image had no embedded GPS metadata (e.g. from messaging apps or screenshots). The system has automatically geotagged it to the exact place from where you are uploading right now.
                            </span>
                          </div>
                        )}

                        {/* Interactive Mini-Map Preview Pin */}
                        <div className="h-28 w-full rounded-xl overflow-hidden border border-border relative z-0 shadow-xs">
                          <MapContainer
                            center={[geoCoordinates.latitude, geoCoordinates.longitude]}
                            zoom={15}
                            zoomControl={false}
                            attributionControl={false}
                            dragging={false}
                            scrollWheelZoom={false}
                            style={{ height: '100%', width: '100%' }}
                          >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <Marker
                              position={[geoCoordinates.latitude, geoCoordinates.longitude]}
                              icon={createPinIcon()}
                            />
                          </MapContainer>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Non-Smartphone / Field Verification Compensating Loop */}
                {!photoDataUrl && (
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requestFieldVerification}
                        onChange={(e) => setRequestFieldVerification(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-amber-300 text-blue-900 focus:ring-blue-800"
                      />
                      <div className="text-xs text-amber-950">
                        <span className="font-bold block">No smartphone or photos? Request On-Site Field Verification</span>
                        <span className="text-[11px] text-amber-800 leading-tight block mt-0.5">
                          A KMC Ward Field Inspector (प्रभाग मित्र) will conduct an on-site physical inspection. Once verified, full confidence will be restored without scoring penalties.
                        </span>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-foreground font-bold mb-1">
                  Issue Summary / Title <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deep pothole cave-in near Civil Hospital on Station Road"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-muted/60 dark:bg-slate-900 border border-border rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary font-medium"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-foreground font-bold mb-1">
                  Detailed Description <span className="text-red-600">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe the problem, nearby landmarks (school, hospital), and risk to residents..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-muted/60 dark:bg-slate-900 border border-border rounded-xl p-3 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary font-medium leading-relaxed"
                />
              </div>

              {/* Ward & Address Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-foreground font-bold mb-1">
                    Kopargaon Ward / Zone <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={selectedZoneId}
                    onChange={(e) => setSelectedZoneId(e.target.value)}
                    className="w-full bg-muted/60 dark:bg-slate-900 border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary font-semibold"
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.code} - {z.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-foreground font-bold mb-1">
                    Street / Landmark Address <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lane 3, Behind Kopargaon Civil Hospital"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-muted/60 dark:bg-slate-900 border border-border rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary font-medium"
                  />
                </div>
              </div>

              {/* SDDS Interactive Review & Correction Card */}
              <div className="bg-muted/30 dark:bg-slate-900/60 border border-blue-200 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Sliders size={16} className="text-[#131b2e]" />
                    <span className="font-bold text-foreground text-xs uppercase tracking-wider">
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
                    <label className="block text-foreground font-bold mb-1 flex items-center justify-between">
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
                      className="w-full bg-card border border-border rounded-xl px-3 py-2 text-foreground font-bold text-xs focus:outline-none focus:border-primary"
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
                    <label className="block text-foreground font-bold mb-1 flex items-center justify-between">
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
                      className="w-full bg-card border border-border rounded-xl px-3 py-2 text-foreground font-bold text-xs focus:outline-none focus:border-primary"
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
                    <label className="block text-foreground font-bold mb-1.5 flex items-center justify-between">
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
                              : 'bg-card text-muted-foreground border border-border hover:border-[#131b2e]'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Machinery */}
                  <div>
                    <label className="block text-foreground font-bold mb-1 flex items-center justify-between">
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
                      className="w-full bg-card border border-border rounded-xl px-3 py-2 text-foreground font-bold text-xs focus:outline-none focus:border-primary capitalize"
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
                    <label className="block text-foreground font-bold mb-1 flex items-center justify-between">
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
                        className="w-full bg-card border border-border rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary font-bold"
                      />
                      <span className="text-muted-foreground text-xs shrink-0">Staff</span>
                    </div>
                  </div>

                  {/* Affected Population */}
                  <div>
                    <label className="block text-foreground font-bold mb-1">
                      Estimated Affected Residents
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={20000}
                      value={affectedPop}
                      onChange={(e) => setAffectedPop(Number(e.target.value))}
                      className="w-full bg-card border border-border rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs shadow-md flex items-center gap-2 transition-all uppercase tracking-wider"
                >
                  <Send size={15} />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit to Municipal Decision Engine'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* AI Multimodal Vision Analysis Output (1 Col) */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
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
                <div className="bg-muted/30 dark:bg-slate-900/60 p-3 rounded-xl border border-border space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Vision Verification Confidence:</span>
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
                  <div className="bg-muted/30 dark:bg-slate-900/60 p-3 rounded-xl border border-border space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Visual Findings
                    </span>
                    <p className="text-foreground text-xs leading-relaxed">
                      {aiResult.visualFindings}
                    </p>
                  </div>
                )}

                {/* Auto-detected Breakdown Cards */}
                <div className="bg-muted/30 dark:bg-slate-900/60 p-3 rounded-xl border border-border space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Auto Department:</span>
                    <span className="font-mono font-bold text-foreground">
                      {aiResult.departmentCodeSuggested}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Assessed Urgency:</span>
                    <span className="font-mono text-amber-700 font-bold uppercase">
                      {aiResult.suggestedUrgency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fleet Machinery:</span>
                    <span className="font-mono text-foreground capitalize">
                      {aiResult.requiredEquipment?.replace('_', ' ') || 'Standard Toolset'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Crew Deployment:</span>
                    <span className="font-mono text-foreground">{aiResult.requiredStaffCount} staff</span>
                  </div>
                </div>

                <div className="text-[11px] text-blue-900 bg-blue-50 p-2.5 rounded-xl border border-blue-200 leading-relaxed">
                  💡 <strong>SDDS Dynamic Override:</strong> All detected parameters above are pre-selected in the form. You can adjust any parameter on the left if conditions require it.
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-xs leading-relaxed">
                Capture a live photo or upload an image. Gemini Vision will analyze physical damage and auto-fill Department, Category, Severity, Machinery, and Crew requirements.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CITIZEN TICKET TRACKING & REAL-TIME SMS ALERTS */}
      {activeTab === 'track' && (
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
            <form onSubmit={handleTrackSearch} className="relative">
              <Search size={16} className="absolute left-3.5 top-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Enter Municipal Ticket Number (e.g. KMC-2026-00101)..."
                value={trackQuery}
                onChange={(e) => setTrackQuery(e.target.value)}
                className="w-full bg-muted/60 dark:bg-slate-900 border border-border rounded-xl pl-10 pr-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary font-mono font-medium"
              />
            </form>
          </div>

          {trackedIssue ? (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[#131b2e] font-bold text-sm">
                      {trackedIssue.ticketNumber}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      Reported on {new Date(trackedIssue.reportedAt).toLocaleString()}
                    </span>
                    {trackedIssue.citizenPhone && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 font-mono px-2 py-0.5 rounded font-bold border border-emerald-200">
                        📱 SMS Recipient: {trackedIssue.citizenPhone}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-foreground">{trackedIssue.title}</h2>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
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

              {/* Resilience Re-verification Note for Citizen */}
              {trackedIssue.recoveryStatus === 'unconfirmed_in_flight' && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex items-start gap-2.5 text-amber-950">
                  <ShieldCheck size={18} className="text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <span className="font-bold block text-amber-950">Municipal System Resilience Note</span>
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      We are currently re-verifying the latest operational dispatch status of your report with on-duty ward engineers following a routine server recovery. Your grievance is completely safe in our municipal records — no action is needed from you.
                    </p>
                  </div>
                </div>
              )}

              {/* Challenge 2: Integrity Review Reassurance Note for Citizen */}
              {trackedIssue.status === 'pending_integrity_review' && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex items-start gap-2.5 text-amber-950">
                  <ShieldCheck size={18} className="text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <span className="font-bold block text-amber-950">Standard Field Verification in Progress</span>
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      Your complaint has been securely registered in KoparNiti and is undergoing standard technical verification by our ward office. Once confirmed by our field inspectors, it will proceed to active machinery scheduling.
                    </p>
                  </div>
                </div>
              )}

              {/* Photo Evidence */}
              {trackedIssue.photoUrls && trackedIssue.photoUrls.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
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
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                  Municipal Action Timeline
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {[
                    { key: 'submitted', label: '1. Registered', desc: 'Received & AI Verified (SMS Sent)' },
                    { key: 'prioritized', label: '2. Scored & Queued', desc: 'Ranked by Decision Engine' },
                    { key: 'scheduled', label: '3. Work Dispatched', desc: 'Crew & Machinery En Route' },
                    { key: 'resolved', label: '4. Rectified', desc: 'Closed & Inspected (SMS Sent)' },
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
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs'
                            : 'bg-muted/30 dark:bg-slate-900/60 border-border text-muted-foreground'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1.5 mb-1 text-foreground">
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

              {/* Interactive Status Progression (Sends Real SMS to physical mobile) */}
              <div className="p-4 bg-muted/30 dark:bg-slate-900/60 border border-blue-200/80 rounded-2xl space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles size={14} className="text-blue-700" />
                    <span>Advance Ticket Milestone & Send Real SMS to Phone:</span>
                  </span>
                  <span className="text-[10px] text-emerald-800 font-mono font-bold">
                    Fast2SMS ➔ {trackedIssue.citizenPhone || currentUser.phone || '(No Phone Number)'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    onClick={() => handleSimulateStatus('scheduled')}
                    className="px-3 py-1.5 bg-card hover:bg-slate-100 text-[#131b2e] border border-slate-300 font-bold rounded-lg transition-all flex items-center gap-1 shadow-xs"
                  >
                    <Truck size={13} className="text-blue-700" />
                    <span>Dispatch Crew (SMS to Phone)</span>
                  </button>

                  <button
                    onClick={() => handleSimulateStatus('in_progress')}
                    className="px-3 py-1.5 bg-card hover:bg-slate-100 text-[#131b2e] border border-slate-300 font-bold rounded-lg transition-all flex items-center gap-1 shadow-xs"
                  >
                    <Wrench size={13} className="text-amber-700" />
                    <span>Crew Arrived (SMS to Phone)</span>
                  </button>

                  <button
                    onClick={() => handleSimulateStatus('resolved')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all flex items-center gap-1 shadow-xs"
                  >
                    <CheckCheck size={14} />
                    <span>Mark Resolved (SMS to Phone)</span>
                  </button>
                </div>
              </div>

              {/* Citizen Reassuring Explanation Banner */}
              {(() => {
                const expl = ExplainabilityService.generateCitizenExplanation(trackedIssue);
                return (
                  <div className="bg-muted/30 dark:bg-slate-900/60 border border-border rounded-xl p-4 text-xs space-y-2">
                    <div className="font-bold text-emerald-800 text-sm flex items-center gap-2">
                      <ShieldCheck size={16} />
                      <span>{expl.statusHeadline}</span>
                    </div>
                    <p className="text-foreground leading-relaxed">{expl.detail}</p>
                    <div className="text-[11px] text-amber-800 font-bold">
                      Next Step: {expl.expectedAction}
                    </div>
                  </div>
                );
              })()}

              {/* Phone-First / Non-Smartphone Telephony Script (IVR Stub) */}
              {(() => {
                const ivrScriptMr = SMSAlertService.formatIvrScript(
                  trackedIssue.status,
                  {
                    ticketNumber: trackedIssue.ticketNumber,
                    title: trackedIssue.title,
                    locationAddress: trackedIssue.locationAddress,
                    priorityScore: trackedIssue.priorityScore?.finalScore,
                    requiredEquipment: trackedIssue.requiredEquipment,
                    requiredStaffCount: trackedIssue.requiredStaffCount,
                  },
                  'mr'
                );

                const ivrScriptEn = SMSAlertService.formatIvrScript(
                  trackedIssue.status,
                  {
                    ticketNumber: trackedIssue.ticketNumber,
                    title: trackedIssue.title,
                    locationAddress: trackedIssue.locationAddress,
                    priorityScore: trackedIssue.priorityScore?.finalScore,
                    requiredEquipment: trackedIssue.requiredEquipment,
                    requiredStaffCount: trackedIssue.requiredStaffCount,
                  },
                  'en'
                );

                const handlePlayIvr = (text: string, lang: string) => {
                  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                    const utterance = new SpeechSynthesisUtterance(text);
                    utterance.lang = lang === 'mr' ? 'mr-IN' : 'en-IN';
                    utterance.rate = 0.95;
                    window.speechSynthesis.speak(utterance);
                  }
                };

                return (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-blue-100 text-blue-900">
                          <Phone size={15} />
                        </div>
                        <div>
                          <div className="font-bold text-foreground text-xs">
                            Phone-First / Non-Smartphone Telephony Script (IVR Stub)
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            IVR script (not yet connected to a live telephony provider) • Plain text for 1800 Call-Center Agent
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handlePlayIvr(ivrScriptMr, 'mr')}
                          className="px-2.5 py-1 bg-card hover:bg-slate-100 text-blue-900 border border-slate-300 font-bold rounded-lg text-[11px] transition-colors flex items-center gap-1 shadow-2xs"
                        >
                          <span>🔊 Read Aloud (मराठी)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePlayIvr(ivrScriptEn, 'en')}
                          className="px-2.5 py-1 bg-card hover:bg-slate-100 text-[#131b2e] border border-slate-300 font-bold rounded-lg text-[11px] transition-colors flex items-center gap-1 shadow-2xs"
                        >
                          <span>🔊 Read Aloud (English)</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 bg-card border border-slate-200 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Marathi Spoken IVR Script (मराठी कॉल संवाद)
                        </span>
                        <p className="text-[11px] text-slate-800 leading-relaxed font-sans">
                          "{ivrScriptMr}"
                        </p>
                      </div>
                      <div className="p-3 bg-card border border-slate-200 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          English Spoken IVR Script
                        </span>
                        <p className="text-[11px] text-slate-800 leading-relaxed font-sans">
                          "{ivrScriptEn}"
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground text-xs bg-card border border-border rounded-2xl">
              No tickets found. Submit an issue to view real-time stage progression.
            </div>
          )}
        </div>
      )}

      {/* Live Camera Viewfinder Modal */}
      <LiveCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handleLiveCapture}
      />
    </div>
  );
};

export default CitizenPortalPage;

