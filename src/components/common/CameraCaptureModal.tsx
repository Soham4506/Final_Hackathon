import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, AlertCircle, FlipHorizontal } from 'lucide-react';

interface LiveCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string, fileName: string) => void;
}

export const LiveCameraModal: React.FC<LiveCameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Initialize camera stream
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    setIsInitializing(true);
    setCameraError(null);
    setCapturedImage(null);

    stopCamera();

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Unable to access camera with facing mode:', facingMode, err);
      // Fallback to any available video stream
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        setStream(fallbackStream);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          await videoRef.current.play();
        }
      } catch (fallbackErr: any) {
        setCameraError(
          fallbackErr.name === 'NotAllowedError'
            ? 'Camera access permission was denied. Please allow camera permissions in your browser.'
            : 'Unable to start camera. Please ensure no other application is using your camera.'
        );
      }
    } finally {
      setIsInitializing(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirmPhoto = () => {
    if (!capturedImage) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `live-camera-${timestamp}.jpg`;
    onCapture(capturedImage, fileName);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-[#76777d]/20 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-[#131b2e] text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider">
              Live Incident Camera Capture
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="p-4 bg-slate-950 flex flex-col items-center justify-center relative min-h-[320px] max-h-[480px] overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center text-white space-y-3">
              <AlertCircle size={40} className="text-red-400 mx-auto" />
              <div className="font-bold text-sm">Camera Not Available</div>
              <p className="text-xs text-slate-300 max-w-sm leading-relaxed">{cameraError}</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20"
              >
                Try Again
              </button>
            </div>
          ) : capturedImage ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={capturedImage}
                alt="Captured Snapshot"
                className="max-h-[400px] w-full object-contain rounded-xl"
              />
              <div className="absolute top-3 left-3 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-md flex items-center gap-1">
                <Check size={12} />
                <span>Photo Captured</span>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="max-h-[400px] w-full object-cover rounded-xl"
              />

              {/* Viewfinder Overlay Guides */}
              <div className="absolute inset-4 border-2 border-white/40 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                <div className="flex justify-between text-[10px] font-mono text-white/80 font-bold drop-shadow">
                  <span>REC [LIVE]</span>
                  <span>KMC SCADA VISION</span>
                </div>
                <div className="w-8 h-8 border-t-2 border-l-2 border-white self-start"></div>
                <div className="w-8 h-8 border-b-2 border-r-2 border-white self-end"></div>
              </div>

              {isInitializing && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold">
                  <RefreshCw size={20} className="animate-spin mr-2" /> Initializing Camera...
                </div>
              )}
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-white border-t border-[#76777d]/15 flex items-center justify-between">
          {capturedImage ? (
            <>
              <button
                type="button"
                onClick={retakePhoto}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#76777d]/20 text-[#131b2e] hover:bg-slate-50 font-bold text-xs uppercase tracking-wider transition-colors"
              >
                <RefreshCw size={14} />
                <span>Retake Photo</span>
              </button>

              <button
                type="button"
                onClick={confirmPhoto}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all"
              >
                <Check size={16} />
                <span>Use This Photo & Geotag</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={toggleFacingMode}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#57657b] hover:text-[#131b2e] hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors"
                title="Switch Camera"
              >
                <FlipHorizontal size={16} />
                <span className="hidden sm:inline">Flip Camera</span>
              </button>

              <button
                type="button"
                onClick={takeSnapshot}
                disabled={Boolean(cameraError) || isInitializing}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#ba1a1a] hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition-all disabled:opacity-50"
              >
                <Camera size={18} />
                <span>Capture Snapshot</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-xl text-xs font-bold text-[#57657b] hover:text-[#131b2e]"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
