'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Upload,
  RefreshCw,
  SwitchCamera,
  Sparkles,
  Volume2,
  VolumeX,
  PhoneCall,
  PhoneOff,
  CheckCircle2,
  AlertTriangle,
  Info,
  Scan,
  Maximize2,
  Minimize2,
  RotateCw,
  Zap,
  Globe2,
  Copy,
  Check,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Heart,
  HeartCrack,
  Activity,
  BadgeCheck,
  XCircle,
  Send,
  X,
  Smartphone,
} from 'lucide-react';
import VoiceAiOrb from './VoiceAiOrb';
import { BolnaVoiceController, VoiceStatus, VoiceLanguage } from '@/lib/bolnaVoiceController';

export interface HealthVerdict {
  classification: 'HEALTHY' | 'MODERATE' | 'UNHEALTHY' | 'NOT_APPLICABLE';
  reason: string;
  risk_factors: string[];
  safety_warnings: string[];
}

export interface CrossVerification {
  verified: boolean;
  source: string;
  notes: string;
}

export interface AnalyzedObjectItem {
  id: string;
  object_title: string;
  category: 'PACKAGED_FOOD' | 'MEDICINE' | 'TEXTBOOK_EDUCATION' | 'FORM_DOCUMENT' | 'PLANT_BOTANY' | 'GENERAL_OBJECT';
  confidence: number;
  bounding_box: { x: number; y: number; width: number; height: number };
  headline_summary: string;
  extracted_text_ocr: string;
  health_verdict: HealthVerdict;
  cross_verification: CrossVerification;
  structured_attributes: Array<{
    label: string;
    value: string;
    status: 'good' | 'warning' | 'neutral';
  }>;
  actionable_insights: string[];
}

export interface ComparativeAnalysis {
  is_multi_object: boolean;
  comparison_summary: string;
  winner_recommendation: string;
  key_tradeoffs: string[];
}

export interface AnalyzedObject {
  object_detected: boolean;
  total_objects_count: number;
  detected_objects?: AnalyzedObjectItem[];
  comparative_analysis?: ComparativeAnalysis;
  category: 'PACKAGED_FOOD' | 'MEDICINE' | 'TEXTBOOK_EDUCATION' | 'FORM_DOCUMENT' | 'PLANT_BOTANY' | 'GENERAL_OBJECT';
  object_title: string;
  confidence: number;
  bounding_box: { x: number; y: number; width: number; height: number };
  headline_summary: string;
  extracted_text_ocr: string;
  health_verdict: HealthVerdict;
  cross_verification: CrossVerification;
  structured_attributes: Array<{
    label: string;
    value: string;
    status: 'good' | 'warning' | 'neutral';
  }>;
  actionable_insights: string[];
  initial_voice_greeting_hinglish: string;
}

// Health classification badge configs
const healthBadgeConfig = {
  HEALTHY: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    text: 'text-emerald-800',
    icon: ShieldCheck,
    iconColor: 'text-emerald-600',
    label: '✅ HEALTHY',
    glow: 'shadow-emerald-200/60',
  },
  MODERATE: {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-800',
    icon: Shield,
    iconColor: 'text-amber-600',
    label: '⚠️ MODERATE',
    glow: 'shadow-amber-200/60',
  },
  UNHEALTHY: {
    bg: 'bg-rose-50',
    border: 'border-rose-300',
    text: 'text-rose-800',
    icon: ShieldAlert,
    iconColor: 'text-rose-600',
    label: '🚫 UNHEALTHY',
    glow: 'shadow-rose-200/60',
  },
  NOT_APPLICABLE: {
    bg: 'bg-slate-50',
    border: 'border-slate-300',
    text: 'text-slate-700',
    icon: Info,
    iconColor: 'text-slate-500',
    label: 'ℹ️ N/A',
    glow: '',
  },
};

export default function LiveVisionVoiceStudio() {
  // Input Mode: Camera vs Upload
  const [inputMode, setInputMode] = useState<'camera' | 'upload'>('camera');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [analysisCount, setAnalysisCount] = useState<number>(0);

  // Video / Photo state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(false);

  // Fullscreen, Phone Rotation & Device Hardware state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [rotationAngle, setRotationAngle] = useState<0 | 90 | 180 | 270>(0);
  const [viewFitMode, setViewFitMode] = useState<'cover' | 'contain'>('cover');
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);

  // Detection & Analysis state
  const [analyzedData, setAnalyzedData] = useState<AnalyzedObject | null>(null);
  const [selectedObjectIndex, setSelectedObjectIndex] = useState<number>(0);
  const lastAnalyzedTimeRef = useRef<number>(0);
  const autoDetectActiveRef = useRef<boolean>(true);
  const analysisQueueRef = useRef<boolean>(false);

  // Voice AI Controller state
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const [voiceVolume, setVoiceVolume] = useState<number>(0);
  const [frequencyData, setFrequencyData] = useState<Uint8Array | undefined>(undefined);
  const [language, setLanguage] = useState<VoiceLanguage>('hinglish');
  const [userTranscript, setUserTranscript] = useState<string>('');
  const [assistantTranscript, setAssistantTranscript] = useState<string>('');

  // Quick typed query state
  const [typedQuery, setTypedQuery] = useState<string>('');

  const voiceControllerRef = useRef<BolnaVoiceController | null>(null);

  // Stable refs for auto-detection loop to prevent React effect tearing
  const isAnalyzingRef = useRef<boolean>(false);
  const analyzedDataRef = useRef<AnalyzedObject | null>(null);
  const analysisCountRef = useRef<number>(0);

  useEffect(() => {
    isAnalyzingRef.current = isAnalyzing;
  }, [isAnalyzing]);

  useEffect(() => {
    analyzedDataRef.current = analyzedData;
  }, [analyzedData]);

  useEffect(() => {
    analysisCountRef.current = analysisCount;
  }, [analysisCount]);

  // 1. Initialize Voice Controller
  useEffect(() => {
    const controller = new BolnaVoiceController({
      onStatusChange: (st) => setVoiceStatus(st),
      onVolumeChange: (vol) => setVoiceVolume(vol),
      onFrequencyData: (data) => setFrequencyData(data),
      onUserTranscript: (t) => {
        const cleanUserText = (t || '').split(/[\r\n]+/)[0].trim().replace(/[\u2014\u2013—–]/g, '-');
        if (cleanUserText) {
          setUserTranscript(cleanUserText);
          setAssistantTranscript(''); // Clear previous answer while awaiting new response
        }
      },
      onAssistantTranscript: (t) => {
        const singleLine = (t || '').split(/[\r\n]+/)[0].trim().replace(/[\u2014\u2013—–]/g, '-');
        if (singleLine) {
          setAssistantTranscript(singleLine);
        }
      },
    });

    controller.setLanguage(language);
    voiceControllerRef.current = controller;

    return () => {
      controller.stopSession();
    };
  }, []);

  // Sync language with controller
  useEffect(() => {
    if (voiceControllerRef.current) {
      voiceControllerRef.current.setLanguage(language);
    }
  }, [language]);

  // Listen for ESC key and document fullscreenchange
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    const handleFullscreenChange = () => {
      const isDocFs = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement
      );
      if (!isDocFs && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen]);

  // 2. Camera Stream Lifecycle with Progressive Fallback Constraints
  const startCameraStream = useCallback(async () => {
    if (inputMode !== 'camera') {
      setInputMode('camera');
    }
    setCameraError(null);
    setIsCameraLoading(true);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera API not accessible. Ensure your browser is using HTTPS or localhost, or switch to Upload Photo mode.');
      setCameraActive(false);
      setIsCameraLoading(false);
      return;
    }

    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }

    let stream: MediaStream | null = null;
    const constraintLevels: MediaStreamConstraints[] = [
      {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      },
      {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      },
      {
        video: { facingMode },
        audio: false,
      },
      {
        video: true,
        audio: false,
      },
    ];

    let lastErr: any = null;
    for (const constraints of constraintLevels) {
      try {
        if (navigator?.mediaDevices?.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (stream) break;
        }
      } catch (err: any) {
        lastErr = err;
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          break;
        }
      }
    }

    if (stream) {
      activeStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {}
      }
      setCameraActive(true);
      setCameraError(null);

      // Inspect torch support on mobile devices
      try {
        const track = stream.getVideoTracks()[0];
        const caps = (track?.getCapabilities?.() as any) || {};
        setTorchSupported(!!caps.torch);
      } catch {
        setTorchSupported(false);
      }
    } else {
      console.warn('Camera access issue:', lastErr);
      if (lastErr?.name === 'NotAllowedError' || lastErr?.name === 'PermissionDeniedError') {
        setCameraError(
          'Camera permission was denied. Tap "Grant Camera Permission" below or allow camera in your browser address bar.'
        );
      } else if (lastErr?.name === 'NotFoundError' || lastErr?.name === 'DevicesNotFoundError') {
        setCameraError('No camera detected on this device. Switch to Upload Photo mode to test with an image.');
      } else if (lastErr?.name === 'NotReadableError' || lastErr?.name === 'TrackStartError') {
        setCameraError('Camera is in use by another application. Please close other camera apps and retry.');
      } else {
        setCameraError('Could not start camera. Tap "Grant Camera Permission" or switch to Upload mode.');
      }
      setCameraActive(false);
    }
    setIsCameraLoading(false);
  }, [inputMode, facingMode]);

  useEffect(() => {
    if (inputMode === 'camera') {
      startCameraStream();
    } else {
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((track) => track.stop());
        activeStreamRef.current = null;
      }
      setCameraActive(false);
    }

    return () => {
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [inputMode, facingMode, startCameraStream]);

  // Fullscreen toggle handler
  const toggleFullscreen = useCallback(async () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      try {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any)?.webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        }
      } catch {
        // Smooth CSS fixed fallback for iOS Safari
      }
    } else {
      setIsFullscreen(false);
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitFullscreenElement && (document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      } catch {}
    }
  }, [isFullscreen]);

  // Mobile phone screen rotation handler (0 -> 90 -> 180 -> 270)
  const handleRotate = useCallback(() => {
    setRotationAngle((prev) => {
      const next = ((prev + 90) % 360) as 0 | 90 | 180 | 270;
      try {
        if (next === 90 || next === 270) {
          (screen.orientation as any)?.lock?.('landscape').catch(() => {});
        } else {
          (screen.orientation as any)?.lock?.('portrait').catch(() => {});
        }
      } catch {}
      return next;
    });
  }, []);

  const handleFlipCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  }, []);

  const toggleTorch = useCallback(async () => {
    if (!activeStreamRef.current) return;
    const track = activeStreamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextTorch = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setIsTorchOn(nextTorch);
    } catch (e) {
      console.warn('Torch toggle error:', e);
    }
  }, [isTorchOn]);

  // Listen for global activate-camera-studio event (triggered from navbar, hero, or Rose section)
  useEffect(() => {
    const handleActivateCamera = () => {
      setInputMode('camera');
      setCameraError(null);
      startCameraStream();
    };

    window.addEventListener('activate-camera-studio', handleActivateCamera);
    return () => {
      window.removeEventListener('activate-camera-studio', handleActivateCamera);
    };
  }, [startCameraStream]);

  // Helper: Grab Base64 from active video frame (respecting phone rotation and mirror)
  const captureCurrentFrameBase64 = useCallback((): string | null => {
    if (inputMode === 'camera' && videoRef.current && videoRef.current.videoWidth > 0) {
      try {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        const rawW = video.videoWidth;
        const rawH = video.videoHeight;

        // When rotated 90 or 270 on phone, swap width/height so AI vision receives upright frame
        const isSwapped = rotationAngle === 90 || rotationAngle === 270;
        const targetWidth = Math.min(isSwapped ? rawH : rawW, 768);
        const targetHeight = Math.round((targetWidth / (isSwapped ? rawH : rawW)) * (isSwapped ? rawW : rawH));

        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((rotationAngle * Math.PI) / 180);
          if (facingMode === 'user') {
            ctx.scale(-1, 1);
          }
          const drawW = isSwapped ? targetHeight : targetWidth;
          const drawH = isSwapped ? targetWidth : targetHeight;
          ctx.drawImage(video, -drawW / 2, -drawH / 2, drawW, drawH);
          return canvas.toDataURL('image/jpeg', 0.84);
        }
      } catch (e) {
        console.warn('Frame capture error:', e);
      }
    } else if (inputMode === 'upload' && uploadedImageSrc) {
      return uploadedImageSrc;
    }
    return null;
  }, [inputMode, uploadedImageSrc, rotationAngle, facingMode]);

  // 3. Vision Analyze Executor
  const runVisionAnalysis = useCallback(
    async (providedBase64?: string) => {
      const base64 = providedBase64 || captureCurrentFrameBase64();
      if (!base64 || isAnalyzing) return;

      setIsAnalyzing(true);
      lastAnalyzedTimeRef.current = Date.now();

      try {
        const response = await fetch('/api/vision-analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64 }),
        });

        const contentType = response.headers.get('content-type') || '';
        if (!response.ok || contentType.includes('text/html')) {
          const errorMsg = contentType.includes('text/html')
            ? 'API route returned HTML instead of JSON. Ensure site environment variables are set in Netlify.'
            : `Analysis server returned status ${response.status}`;
          throw new Error(errorMsg);
        }

        const data: AnalyzedObject = await response.json();
        setAnalyzedData(data);
        setSelectedObjectIndex(0);
        setAnalysisCount(prev => prev + 1);

        // Sync visual context with active Voice AI session (Voice AI remains silent until user speaks)
        if (voiceControllerRef.current) {
          voiceControllerRef.current.setVisualContext(data);
        }
      } catch (err: any) {
        console.error('Vision analysis error:', err);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [captureCurrentFrameBase64, isAnalyzing, voiceStatus]
  );

  // 4. STABLE, HIGH-PERFORMANCE AUTO-DETECT RAF LOOP - Instant Detection, No Manual Trigger Needed
  useEffect(() => {
    if (inputMode !== 'camera' || !cameraActive) return;
    autoDetectActiveRef.current = true;

    let animFrameId: number;
    let prevData: ImageData | null = null;
    let stableFrameCount = 0;
    let motionDetected = false;
    let lastCheckTime = 0;
    const cameraStartTime = Date.now();

    const diffCanvas = document.createElement('canvas');
    diffCanvas.width = 48;
    diffCanvas.height = 48;
    const diffCtx = diffCanvas.getContext('2d');

    const checkFrame = (timestamp: number) => {
      if (!autoDetectActiveRef.current) return;

      // Fast checking every 180ms for instant millisecond response
      if (timestamp - lastCheckTime < 180) {
        animFrameId = requestAnimationFrame(checkFrame);
        return;
      }
      lastCheckTime = timestamp;

      if (!videoRef.current || videoRef.current.readyState < 2 || isAnalyzingRef.current) {
        animFrameId = requestAnimationFrame(checkFrame);
        return;
      }
      if (!diffCtx) {
        animFrameId = requestAnimationFrame(checkFrame);
        return;
      }

      diffCtx.drawImage(videoRef.current, 0, 0, 48, 48);
      const currData = diffCtx.getImageData(0, 0, 48, 48);

      if (prevData) {
        let diffScore = 0;
        for (let i = 0; i < currData.data.length; i += 4) {
          const rDiff = Math.abs(currData.data[i] - prevData.data[i]);
          const gDiff = Math.abs(currData.data[i + 1] - prevData.data[i + 1]);
          const bDiff = Math.abs(currData.data[i + 2] - prevData.data[i + 2]);
          diffScore += rDiff + gDiff + bDiff;
        }

        const avgDiff = diffScore / (48 * 48 * 3);
        const now = Date.now();
        const timeSinceLastScan = now - lastAnalyzedTimeRef.current;
        const timeSinceCameraStart = now - cameraStartTime;

        // Motion detection
        if (avgDiff > 16) {
          motionDetected = true;
          stableFrameCount = 0;
        } else {
          stableFrameCount++;
        }

        // TRIGGER CONDITIONS (Accelerated for instant millisecond optical scanning):
        // 1. Initial scan: Camera steady for 2 intervals (~360ms) after hardware startup (400ms)
        const isInitialScan =
          analysisCountRef.current === 0 &&
          !analyzedDataRef.current &&
          timeSinceCameraStart > 400 &&
          stableFrameCount >= 2;

        // 2. Motion settled: User showed/changed product, steady for 2 intervals (~360ms) after 1.5s
        const isMotionSettled = motionDetected && stableFrameCount >= 2 && timeSinceLastScan > 1500;

        // 3. Periodic sanity rescan: stationary camera, every 8 seconds
        const isPeriodicRescan = timeSinceLastScan > 8000 && stableFrameCount >= 3;

        if (isInitialScan || isMotionSettled || isPeriodicRescan) {
          motionDetected = false;
          stableFrameCount = 0;
          runVisionAnalysis();
        }
      }

      prevData = currData;
      animFrameId = requestAnimationFrame(checkFrame);
    };

    animFrameId = requestAnimationFrame(checkFrame);

    return () => {
      autoDetectActiveRef.current = false;
      cancelAnimationFrame(animFrameId);
    };
  }, [inputMode, cameraActive, runVisionAnalysis]);

  // 5. Handle Photo Upload - auto-analyze immediately
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setUploadedImageSrc(base64);
      runVisionAnalysis(base64);
    };
    reader.readAsDataURL(file);
  };

  // Text question submit handler - stops previous audio to prevent multiple voices overlap
  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedQuery.trim() || !voiceControllerRef.current) return;
    const q = typedQuery.trim();
    setTypedQuery('');
    const isIndic = /[\u0900-\u097F]/.test(q) || /\b(kya|ye|yeh|hai|kaunsa|kaunsi|kaisa|kaisi|batao|suno|khao|nahi|acha|achhi|kitna|kitni|dono)\b/i.test(q);
    setUserTranscript(isIndic ? 'Translating query to English...' : q);
    setAssistantTranscript('');
    voiceControllerRef.current.stopAllAudio();
    await voiceControllerRef.current.askQuestion(q);
  };

  // 6. Voice Session Toggle
  const handleToggleVoiceSession = async () => {
    if (!voiceControllerRef.current) return;

    if (voiceStatus !== 'idle') {
      await voiceControllerRef.current.stopSession();
      setUserTranscript('');
      setAssistantTranscript('');
    } else {
      setUserTranscript('');
      setAssistantTranscript('');
      // AudioContext & SpeechSynthesis mobile user-gesture unlock
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        } catch {}
      }
      // Instant Connection: Never block voice session on optical analysis
      if (!analyzedData && !isAnalyzingRef.current) {
        runVisionAnalysis();
      }
      await voiceControllerRef.current.startSession(analyzedData);
    }
  };

  const activeDisplayObject =
    analyzedData?.detected_objects && analyzedData.detected_objects.length > 0
      ? (analyzedData.detected_objects[selectedObjectIndex] || analyzedData.detected_objects[0])
      : analyzedData;

  const handleCopyOcr = () => {
    const ocrText = activeDisplayObject?.extracted_text_ocr || analyzedData?.extracted_text_ocr;
    if (ocrText) {
      navigator.clipboard.writeText(ocrText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Get health badge config for actively selected product
  const healthBadge = activeDisplayObject?.health_verdict
    ? healthBadgeConfig[activeDisplayObject.health_verdict.classification] || healthBadgeConfig.NOT_APPLICABLE
    : null;

  return (
    <section id="studio" className="relative w-full py-12 px-4 md:px-8 max-w-7xl mx-auto flex flex-col gap-8 scroll-mt-24">
      {/* Studio Section Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
        <div className="flex flex-col gap-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50/90 border border-blue-200/80 text-xs font-mono font-bold text-blue-700 uppercase tracking-wider w-fit shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
            <Scan className="w-3.5 h-3.5" />
            <span>Live Spatial Studio · Auto-Detection Active</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-950 font-sans">
            Universal Vision &amp; Live Voice Symphony
          </h2>
          <p className="text-sm text-slate-600 font-sans max-w-2xl">
            Point any medicine strip, food packet, document, or plant leaf - IRA auto-detects and classifies instantly with strict health assessment. Zero hallucination guaranteed.
          </p>
        </div>

        {/* Voice AI Orb Live HUD in Studio Header */}
        <div className="flex items-center gap-3">
          <VoiceAiOrb
            status={voiceStatus}
            volume={voiceVolume}
            frequencyData={frequencyData}
            onClick={handleToggleVoiceSession}
          />
        </div>
      </div>

      {/* Control Bar: Dual Input Mode Switcher + Camera Tools + Language Pill */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/90 backdrop-blur-xl shadow-[0_12px_36px_-6px_rgba(15,23,42,0.06),inset_0_1px_1.5px_rgba(255,255,255,0.95)] border border-slate-200/90">
        {/* Mode Switcher: 3D Segmented Pill */}
        <div className="inline-flex p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 shadow-inner">
          <button
            onClick={() => setInputMode('camera')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              inputMode === 'camera'
                ? 'bg-white text-slate-950 shadow-sm border border-slate-200/60 font-bold'
                : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-blue-600" />
            <span>Live Camera Mode</span>
          </button>

          <button
            onClick={() => setInputMode('upload')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              inputMode === 'upload'
                ? 'bg-white text-slate-950 shadow-sm border border-slate-200/60 font-bold'
                : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-emerald-600" />
            <span>Upload Photo Mode</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {inputMode === 'camera' && (
            <>
              {/* Fullscreen Button in Toolbar */}
              <button
                onClick={toggleFullscreen}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer select-none hover:scale-105 active:scale-95"
                title="Open Fullscreen Live Showcase & Voice AI"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Fullscreen</span>
              </button>

              {/* Rotate View Button (for Phones & Laptops) */}
              <button
                onClick={handleRotate}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs transition-all cursor-pointer select-none hover:scale-105 active:scale-95"
                title={`Rotate Camera Feed (Currently ${rotationAngle}°)`}
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Rotate</span>
                <span className="text-[10px] font-mono font-bold text-slate-600">{rotationAngle}°</span>
              </button>

              {/* Switch Camera (Front/Back) */}
              <button
                onClick={handleFlipCamera}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs transition-all cursor-pointer select-none hover:scale-105 active:scale-95"
                title="Switch Front/Rear Camera"
              >
                <SwitchCamera className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">{facingMode === 'environment' ? 'Rear' : 'Front'} Camera</span>
              </button>

              {/* Live Auto-Detection Status Indicator */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50/90 border border-emerald-300 text-xs font-semibold text-emerald-800 shadow-xs">
                <Zap className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span>Auto-Detect</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              </div>
            </>
          )}

          {/* Language Selector */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs shadow-xs">
            <Globe2 className="w-3.5 h-3.5 text-blue-600" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as VoiceLanguage)}
              className="bg-transparent text-slate-800 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="hinglish">Hinglish</option>
              <option value="hi">हिंदी (Hindi)</option>
              <option value="en">English</option>
            </select>
          </div>

          {/* Upload mode: Manual trigger still available */}
          {inputMode === 'upload' && (
            <button
              onClick={() => runVisionAnalysis()}
              disabled={isAnalyzing || !uploadedImageSrc}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer select-none"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Analyzing...' : 'Re-Analyze'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main 2-Column Live Stage: Left Viewport (Camera/Photo) + Right 3D Analysis Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (7 Cols): 3D VisionOS Optical Viewfinder Chassis */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div
            ref={containerRef}
            className={
              isFullscreen
                ? 'fixed inset-0 z-[100] w-screen h-screen bg-slate-950 flex flex-col justify-between overflow-hidden select-none transition-all duration-300'
                : 'relative w-full aspect-video sm:aspect-[16/9] rounded-3xl overflow-hidden bg-slate-900 border-2 border-slate-200/90 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.15),inset_0_1px_2px_rgba(255,255,255,0.8)] group select-none transition-all duration-300'
            }
          >
            {/* Mode A: Live Video */}
            {inputMode === 'camera' && (
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className={`transition-opacity duration-300 ${
                    cameraActive ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={{
                    transform: `rotate(${rotationAngle}deg) ${facingMode === 'user' ? 'scaleX(-1)' : ''} ${
                      !isFullscreen && (rotationAngle === 90 || rotationAngle === 270) ? 'scale(0.5625)' : ''
                    }`,
                    width: (rotationAngle === 90 || rotationAngle === 270) && isFullscreen ? '100dvh' : '100%',
                    height: (rotationAngle === 90 || rotationAngle === 270) && isFullscreen ? '100dvw' : '100%',
                    maxWidth: (rotationAngle === 90 || rotationAngle === 270) && isFullscreen ? '100dvh' : '100%',
                    maxHeight: (rotationAngle === 90 || rotationAngle === 270) && isFullscreen ? '100dvw' : '100%',
                    objectFit: isFullscreen ? viewFitMode : 'cover',
                  }}
                />

                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-slate-50 to-blue-50/40 text-slate-700 z-20">
                    <div className="relative w-16 h-16 rounded-3xl bg-white border border-blue-200/90 shadow-[0_8px_24px_rgba(37,99,235,0.15)] flex items-center justify-center mb-3.5">
                      <Camera className="w-8 h-8 text-blue-600" />
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-950 font-sans">
                      {cameraError ? 'Camera Permission Required' : 'Starting Live Optical Camera...'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md leading-relaxed font-medium">
                      {cameraError || 'Please allow your browser camera permission to showcase products live with zero-latency spatial tracking.'}
                    </p>

                    {/* Quick Guidance Box */}
                    <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-white/90 border border-slate-200 text-[11px] sm:text-xs text-slate-600 max-w-md text-left flex items-start gap-2 shadow-xs">
                      <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>
                        Tap <strong>Grant Camera Permission</strong> below. If previously blocked, click the lock icon <strong>🔒</strong> in your browser address bar to allow camera access.
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                      <button
                        type="button"
                        onClick={startCameraStream}
                        disabled={isCameraLoading}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 select-none disabled:opacity-50"
                      >
                        <Camera className="w-4 h-4" />
                        <span>{isCameraLoading ? 'Requesting...' : 'Grant Camera Permission'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setInputMode('upload')}
                        className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all select-none"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Photo Mode</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mode B: Photo Upload Viewport */}
            {inputMode === 'upload' && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 w-full h-full flex flex-col items-center justify-center cursor-pointer bg-slate-50 hover:bg-slate-100/70 transition-colors p-6 text-center"
              >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {uploadedImageSrc ? (
                <img
                  src={uploadedImageSrc}
                  alt="Uploaded user object"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-4">
                  {/* Live 3D Voice AI Animation integrated right in Photo Upload center */}
                  <div className="flex items-center gap-2">
                    <VoiceAiOrb
                      status={voiceStatus}
                      volume={voiceVolume}
                      frequencyData={frequencyData}
                      size={64}
                      compact
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 font-sans">
                      Click or Drag &amp; Drop any photo here
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      JPEG, PNG, WEBP of medicine strip, food label, KYC form, or plant leaf
                    </p>
                  </div>
                  <span className="px-4 py-2 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300">
                    Browse Device Files
                  </span>
                </div>
              )}
              </div>
            )}

            {/* OPTICAL VIEWFINDER HUD OVERLAYS (Tactile Apple VisionOS / Leica Reticle) */}
            <div className="absolute inset-0 pointer-events-none z-10">
              {/* Tactical Corner Brackets */}
              <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-white/80 rounded-tl-sm drop-shadow-[0_0_4px_rgba(0,0,0,0.5)]" />
              <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-white/80 rounded-tr-sm drop-shadow-[0_0_4px_rgba(0,0,0,0.5)]" />
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-white/80 rounded-bl-sm drop-shadow-[0_0_4px_rgba(0,0,0,0.5)]" />
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-white/80 rounded-br-sm drop-shadow-[0_0_4px_rgba(0,0,0,0.5)]" />

              {/* Optical Precision Center Reticle (subtle crosshair when camera is active) */}
              {cameraActive && inputMode === 'camera' && (
                <div className="absolute inset-0 flex items-center justify-center opacity-40">
                  <div className="relative w-24 h-24 rounded-full border border-dashed border-white/70 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    <div className="absolute w-8 h-[1px] bg-white/60 -left-5" />
                    <div className="absolute w-8 h-[1px] bg-white/60 -right-5" />
                    <div className="absolute h-8 w-[1px] bg-white/60 -top-5" />
                    <div className="absolute h-8 w-[1px] bg-white/60 -bottom-5" />
                  </div>
                </div>
              )}
            </div>

            {/* STANDARD (NON-FULLSCREEN) TOP CONTROLS: Fullscreen (Left) and IRA Voice AI (Right) */}
            {!isFullscreen && (
              <>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-slate-900 text-xs font-bold backdrop-blur-xl border border-white/80 shadow-md transition-all cursor-pointer select-none group hover:scale-105 active:scale-95"
                  title="Open Fullscreen Live Showcase & Voice AI"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline">Fullscreen</span>
                </button>

                <motion.div
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleToggleVoiceSession}
                  className="absolute top-4 right-4 z-20 flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-xl border border-white/80 shadow-[0_8px_20px_rgba(0,0,0,0.12)] cursor-pointer select-none transition-all"
                  title={voiceStatus === 'idle' ? 'Click to Start Voice AI' : 'Click to End Voice Session'}
                >
                  <VoiceAiOrb
                    status={voiceStatus}
                    volume={voiceVolume}
                    frequencyData={frequencyData}
                    size={28}
                    compact
                  />
                  <div className="flex flex-col pr-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1">
                      <span>IRA Voice AI</span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          voiceStatus === 'speaking'
                            ? 'bg-blue-600 animate-ping'
                            : voiceStatus === 'listening'
                            ? 'bg-emerald-500 animate-pulse'
                            : 'bg-emerald-500'
                        }`}
                      />
                    </span>
                    <span className="text-[9px] font-sans text-slate-500 font-medium -mt-0.5">
                      {voiceStatus === 'idle' ? 'Tap to Speak' : voiceStatus}
                    </span>
                  </div>
                </motion.div>
              </>
            )}

            {/* FULLSCREEN MODE FLOATING TOP 3D LIQUID MORPHISM HUD */}
            {isFullscreen && (
              <div className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 z-30 flex items-center justify-between gap-1.5 sm:gap-2.5 pointer-events-auto">
                {/* Left: Exit Fullscreen & Mode Badge */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={toggleFullscreen}
                    className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-bold backdrop-blur-xl border border-white/25 shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
                    title="Exit Fullscreen (or press ESC)"
                  >
                    <Minimize2 className="w-4 h-4 text-cyan-400" />
                    <span className="hidden sm:inline">Exit Fullscreen</span>
                  </button>
                  <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white/90 text-xs font-mono border border-white/15">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live 60 FPS</span>
                  </div>
                </div>

                {/* Right: Phone & Hardware Controls (Scan, Rotate, Flip, Aspect, Torch) */}
                <div className="flex items-center gap-1 sm:gap-2">
                  {/* Scan Live Frame button */}
                  <button
                    onClick={() => runVisionAnalysis()}
                    disabled={isAnalyzing}
                    className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold backdrop-blur-xl border border-blue-400/40 shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
                    title="Scan Current Live Frame"
                  >
                    <Scan className={`w-3.5 h-3.5 text-cyan-200 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    <span className="hidden md:inline">{isAnalyzing ? 'Scanning...' : 'Scan Frame'}</span>
                  </button>

                  {/* Rotate View for Phone horizontal/vertical full size */}
                  <button
                    onClick={handleRotate}
                    className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-semibold backdrop-blur-xl border border-white/25 shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
                    title={`Rotate Camera Feed (Currently ${rotationAngle}°)`}
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Rotate</span>
                    <span className="text-[10px] font-mono font-bold text-amber-300">{rotationAngle}°</span>
                  </button>

                  {/* Switch Front/Rear Camera */}
                  <button
                    onClick={handleFlipCamera}
                    className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-semibold backdrop-blur-xl border border-white/25 shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
                    title="Switch Front/Rear Camera"
                  >
                    <SwitchCamera className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="hidden sm:inline">{facingMode === 'environment' ? 'Rear' : 'Front'}</span>
                  </button>

                  {/* Fill vs Fit Aspect Ratio Toggle in Fullscreen */}
                  <button
                    onClick={() => setViewFitMode((prev) => (prev === 'cover' ? 'contain' : 'cover'))}
                    className="hidden sm:flex items-center gap-1 px-2.5 py-2 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-semibold backdrop-blur-xl border border-white/25 shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
                    title={viewFitMode === 'cover' ? 'Switch to Fit (Whole Frame)' : 'Switch to Fill (Full Size)'}
                  >
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] font-mono uppercase">{viewFitMode === 'cover' ? 'Full' : 'Fit'}</span>
                  </button>

                  {/* Torch / Flashlight (if supported on mobile) */}
                  {torchSupported && (
                    <button
                      onClick={toggleTorch}
                      className={`p-2 rounded-full backdrop-blur-xl border border-white/25 shadow-xl transition-all cursor-pointer ${
                        isTorchOn ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-900/90 text-white'
                      }`}
                      title="Toggle Flashlight / Torch"
                    >
                      <Zap className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* FULLSCREEN MODE BOTTOM ACTION BAR & SOLE WORKING IRA VOICE AI BUTTON */}
            {isFullscreen && (
              <div className="absolute bottom-5 sm:bottom-7 left-4 right-4 z-30 flex flex-col items-center gap-3 pointer-events-auto max-w-lg mx-auto w-full pb-[env(safe-area-inset-bottom,0px)]">
                {/* Live Transcript Banner in Fullscreen */}
                {(userTranscript || assistantTranscript) && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full p-2.5 sm:p-3 rounded-2xl bg-slate-950/90 backdrop-blur-2xl border border-white/25 shadow-2xl flex flex-col gap-1.5 font-sans text-xs text-white"
                  >
                    {userTranscript && (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] font-bold text-cyan-300 bg-cyan-950/90 px-2 py-0.5 rounded-full border border-cyan-700/80 shrink-0">
                          YOU
                        </span>
                        <span className="text-slate-200 font-medium truncate">{userTranscript}</span>
                      </div>
                    )}
                    {assistantTranscript && (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] font-bold text-emerald-300 bg-emerald-950/90 px-2 py-0.5 rounded-full border border-emerald-700/80 shrink-0">
                          IRA
                        </span>
                        <span className="text-white font-bold truncate">{assistantTranscript}</span>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Sole Ira Voice AI Working Button at Bottom of Fullscreen */}
                <motion.div
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleToggleVoiceSession}
                  className={`flex items-center gap-3 px-6 py-3 rounded-full backdrop-blur-2xl border shadow-[0_12px_40px_rgba(0,0,0,0.5)] cursor-pointer select-none transition-all ${
                    voiceStatus === 'speaking'
                      ? 'bg-blue-600/95 border-blue-400 text-white shadow-blue-600/40 ring-4 ring-blue-500/25'
                      : voiceStatus === 'listening'
                      ? 'bg-emerald-600/95 border-emerald-400 text-white shadow-emerald-600/40 ring-4 ring-emerald-500/25'
                      : voiceStatus === 'thinking'
                      ? 'bg-amber-600/95 border-amber-400 text-white shadow-amber-600/40 ring-4 ring-amber-500/25'
                      : 'bg-white/95 border-white text-slate-900 hover:bg-white hover:shadow-2xl'
                  }`}
                  title={voiceStatus === 'idle' ? 'Tap to Speak with IRA Voice AI' : 'Tap to Stop Session'}
                >
                  <VoiceAiOrb
                    status={voiceStatus}
                    volume={voiceVolume}
                    frequencyData={frequencyData}
                    size={36}
                    compact
                  />
                  <div className="flex flex-col pr-1 text-left">
                    <span className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <span>IRA VOICE AI</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          voiceStatus === 'speaking'
                            ? 'bg-blue-200 animate-ping'
                            : voiceStatus === 'listening'
                            ? 'bg-emerald-200 animate-pulse'
                            : voiceStatus === 'thinking'
                            ? 'bg-amber-200 animate-pulse'
                            : 'bg-emerald-500'
                        }`}
                      />
                    </span>
                    <span className={`text-[10px] sm:text-[11px] font-sans font-medium -mt-0.5 whitespace-nowrap ${
                      voiceStatus !== 'idle' ? 'text-white/90' : 'text-slate-600'
                    }`}>
                      {voiceStatus === 'idle'
                        ? 'Tap to Speak'
                        : voiceStatus === 'listening'
                        ? 'Listening to you...'
                        : voiceStatus === 'speaking'
                        ? 'IRA Speaking...'
                        : 'Thinking...'}
                    </span>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Full-Frame Multi-Object 3D Glass Bounding Boxes & Floating Pills (Edge-to-Edge) */}
            {analyzedData && (
              <div
                className="absolute inset-0 pointer-events-none z-10 transition-transform duration-300"
                style={{
                  transform: rotationAngle !== 0 ? `rotate(${rotationAngle}deg)` : undefined,
                  transformOrigin: 'center center',
                }}
              >
                {(analyzedData.detected_objects && analyzedData.detected_objects.length > 0
                  ? analyzedData.detected_objects
                  : analyzedData.bounding_box
                  ? [
                      {
                        id: 'primary',
                        object_title: analyzedData.object_title,
                        category: analyzedData.category,
                        confidence: analyzedData.confidence,
                        bounding_box: analyzedData.bounding_box,
                        health_verdict: analyzedData.health_verdict,
                      },
                    ]
                  : []
                ).map((obj: any, idx: number) => {
                  const box = obj.bounding_box;
                  if (!box) return null;

                  const colorStyles = [
                    { border: 'border-cyan-400', glow: 'shadow-[0_0_24px_rgba(6,182,212,0.55)]', badge: 'bg-cyan-600' },
                    { border: 'border-amber-400', glow: 'shadow-[0_0_24px_rgba(245,158,11,0.55)]', badge: 'bg-amber-600' },
                    { border: 'border-emerald-400', glow: 'shadow-[0_0_24px_rgba(16,185,129,0.55)]', badge: 'bg-emerald-600' },
                    { border: 'border-purple-400', glow: 'shadow-[0_0_24px_rgba(168,85,247,0.55)]', badge: 'bg-purple-600' },
                  ][idx % 4];

                  const objHealth = obj.health_verdict
                    ? healthBadgeConfig[obj.health_verdict.classification as keyof typeof healthBadgeConfig]
                    : null;

                  const isSelected = selectedObjectIndex === idx;

                  return (
                    <motion.div
                      key={obj.id || idx}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: isSelected ? 1.02 : 1 }}
                      onClick={() => setSelectedObjectIndex(idx)}
                      className={`absolute pointer-events-auto cursor-pointer transition-all duration-300 z-10 ${
                        isSelected ? 'ring-2 ring-white/90 shadow-2xl' : ''
                      }`}
                      style={{
                        left: `${box.x}%`,
                        top: `${box.y}%`,
                        width: `${box.width}%`,
                        height: `${box.height}%`,
                      }}
                    >
                      {/* 3D Glass Bounding Box Outline */}
                      <div className={`relative w-full h-full border-2 ${colorStyles.border} rounded-2xl ${colorStyles.glow} backdrop-blur-[1px]`}>
                        {/* Floating Identification Pill */}
                        <div className={`absolute -top-3.5 left-2 px-2.5 py-0.5 rounded-full ${colorStyles.badge} text-white text-[10px] font-mono font-bold tracking-wide uppercase shadow-md flex items-center gap-1.5`}>
                          <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                          <span className="truncate max-w-[130px]">{obj.object_title || obj.category.replace('_', ' ')}</span>
                          <span className="text-white/80 font-normal">
                            {(obj.confidence * 100).toFixed(0)}%
                          </span>
                        </div>

                        {/* Health Verdict Badge on Bounding Box */}
                        {objHealth && obj.health_verdict.classification !== 'NOT_APPLICABLE' && (
                          <div className={`absolute -bottom-3.5 right-2 px-2 py-0.5 rounded-full ${objHealth.bg} ${objHealth.border} border text-[10px] font-bold ${objHealth.text} shadow-sm flex items-center gap-1`}>
                            <span>{objHealth.label}</span>
                          </div>
                        )}

                        {/* Corner Accent Marks */}
                        <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-white rounded-tl-sm" />
                        <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-white rounded-tr-sm" />
                        <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-white rounded-bl-sm" />
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-white rounded-br-sm" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Viewport Floating Status Bar (Pure White Porcelain Glass - only in non-fullscreen) */}
            {!isFullscreen && (
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
                <div className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-slate-800 border border-white/80 shadow-sm text-xs font-mono flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{inputMode === 'camera' ? 'Auto-Detect Active' : 'Upload Mode'}</span>
                </div>

                {isAnalyzing && (
                  <div className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-mono font-semibold flex items-center gap-2 shadow-sm animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Analyzing...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Voice Session Trigger Bar + Live Transcript */}
          <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/90 shadow-[0_10px_30px_-5px_rgba(15,23,42,0.05)] flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleToggleVoiceSession}
                  className={`px-5 py-3 rounded-2xl font-sans text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer select-none ${
                    voiceStatus !== 'idle'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/25 animate-pulse'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
                  }`}
                >
                  {voiceStatus !== 'idle' ? (
                    <>
                      <PhoneOff className="w-4 h-4" />
                      <span>End Voice Session</span>
                    </>
                  ) : (
                    <>
                      <PhoneCall className="w-4 h-4" />
                      <span>Tap to Speak with IRA</span>
                    </>
                  )}
                </button>

                <div className="flex flex-col justify-center">
                  <span className="text-xs font-bold text-slate-950 font-sans flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      voiceStatus === 'speaking' ? 'bg-blue-600 animate-ping' :
                      voiceStatus === 'listening' ? 'bg-emerald-500 animate-pulse' :
                      voiceStatus === 'thinking' ? 'bg-amber-500 animate-pulse' :
                      'bg-slate-400'
                    }`} />
                    <span>
                      {voiceStatus === 'idle'
                        ? 'IRA Voice AI'
                        : voiceStatus === 'listening'
                        ? 'Listening...'
                        : voiceStatus === 'speaking'
                        ? 'Speaking...'
                        : 'Thinking...'}
                    </span>
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-600 font-medium mt-1">
                    <span className="text-blue-700 font-semibold">&lt;180ms Latency</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-700">Multilingual Indic</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-emerald-700 font-semibold">Zero-Hallucination Grounded</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Clean Single-Exchange Voice AI Dialogue: Strictly 1 Line User, 1 Line Voice AI (Hidden When Empty) */}
            {(userTranscript || assistantTranscript) && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full p-3 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xs flex flex-col gap-2 font-sans"
              >
                {userTranscript && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 shrink-0">
                      YOU
                    </span>
                    <span className="text-slate-800 font-medium truncate">
                      {userTranscript}
                    </span>
                  </div>
                )}
                {assistantTranscript && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                      IRA
                    </span>
                    <span className="text-slate-950 font-bold truncate">
                      {assistantTranscript}
                    </span>
                  </div>
                )}
              </motion.div>
            )}

            {/* Liquid Morphism Floating Query Capsule with Dual-Side Ambient Glow */}
            <div className="mt-2 flex flex-col gap-2">
              <form onSubmit={handleTextSubmit} className="w-full">
                <div className="liquid-glass-input-capsule p-3 sm:p-3.5 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-slate-400 font-mono text-sm pl-1 select-none">|</span>
                    <input
                      type="text"
                      value={typedQuery}
                      onChange={(e) => setTypedQuery(e.target.value)}
                      placeholder="Ask IRA anything live about the scanned product..."
                      className="flex-1 bg-transparent text-white text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none font-sans"
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="liquid-glass-chip text-[10px] py-1 px-2.5 hidden sm:flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span>Live Voice AI</span>
                    </span>
                    <button
                      type="submit"
                      disabled={!typedQuery.trim() || voiceStatus === 'thinking' || voiceStatus === 'speaking'}
                      className="liquid-glass-send-btn shrink-0"
                      title="Send question to Voice AI"
                    >
                      <Send className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column (5 Cols): 3D Tilting White Cards for Detected Object */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {analyzedData ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-4"
            >
              {/* Card 00: Multi-Product Comparative Analysis Card (When 2+ Products Detected) */}
              {analyzedData.comparative_analysis?.is_multi_object && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-5 rounded-3xl liquid-glass-card border-2 border-blue-400/80 shadow-[0_16px_40px_rgba(37,99,235,0.15)] flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-blue-600 text-white text-[11px] font-mono font-bold tracking-wider uppercase shadow-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Multi-Product Comparison ({analyzedData.detected_objects?.length || 2} Detected)</span>
                    </span>
                    <span className="text-[11px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Zero-Hallucination
                    </span>
                  </div>

                  {/* Winner Recommendation Banner */}
                  {analyzedData.comparative_analysis.winner_recommendation && (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-300/80 shadow-xs flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                        <BadgeCheck className="w-5 h-5 text-amber-300" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800">
                          Recommended Better Option
                        </span>
                        <p className="text-xs font-bold text-slate-900 leading-snug mt-0.5">
                          {analyzedData.comparative_analysis.winner_recommendation}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Comparison Summary */}
                  {analyzedData.comparative_analysis.comparison_summary && (
                    <p className="text-xs text-slate-700 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                      {analyzedData.comparative_analysis.comparison_summary}
                    </p>
                  )}

                  {/* Key Tradeoffs */}
                  {analyzedData.comparative_analysis.key_tradeoffs && analyzedData.comparative_analysis.key_tradeoffs.length > 0 && (
                    <div className="flex flex-col gap-1.5 pt-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500">
                        Key Trade-Offs &amp; Evidence
                      </span>
                      {analyzedData.comparative_analysis.key_tradeoffs.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
              {/* Multi-Product Selector Tabs (When 2+ Products are in camera view) */}
              {analyzedData.detected_objects && analyzedData.detected_objects.length > 1 && (
                <div className="p-3 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-xs flex flex-col gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    Detected Items in Camera Frame ({analyzedData.detected_objects.length}):
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {analyzedData.detected_objects.map((item, idx) => {
                      const isSelected = selectedObjectIndex === idx;
                      const hBadge = item.health_verdict
                        ? healthBadgeConfig[item.health_verdict.classification as keyof typeof healthBadgeConfig]
                        : null;
                      return (
                        <button
                          key={item.id || idx}
                          type="button"
                          onClick={() => setSelectedObjectIndex(idx)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]'
                              : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-cyan-400" />
                          <span className="truncate max-w-[140px]">{item.object_title || `Item ${idx + 1}`}</span>
                          {hBadge && item.health_verdict?.classification !== 'NOT_APPLICABLE' && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                              isSelected ? 'bg-white/20 text-white' : `${hBadge.bg} ${hBadge.text} border ${hBadge.border}`
                            }`}>
                              {item.health_verdict.classification}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Card 0: Health Verdict Banner */}
              {activeDisplayObject?.health_verdict && activeDisplayObject.health_verdict.classification !== 'NOT_APPLICABLE' && healthBadge && (
                <motion.div
                  key={`health-${selectedObjectIndex}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-4 rounded-3xl border-2 ${healthBadge.border} ${healthBadge.bg} shadow-lg ${healthBadge.glow} flex flex-col gap-2.5`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                        activeDisplayObject.health_verdict.classification === 'HEALTHY' ? 'bg-emerald-100' :
                        activeDisplayObject.health_verdict.classification === 'MODERATE' ? 'bg-amber-100' :
                        'bg-rose-100'
                      }`}>
                        <healthBadge.icon className={`w-5 h-5 ${healthBadge.iconColor}`} />
                      </div>
                      <div>
                        <span className={`text-sm font-bold ${healthBadge.text}`}>
                          {healthBadge.label}
                        </span>
                        <p className="text-[11px] text-slate-600 font-medium leading-snug mt-0.5 max-w-xs">
                          {activeDisplayObject.health_verdict.reason}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Risk Factors */}
                  {activeDisplayObject.health_verdict.risk_factors.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500">Risk Factors</span>
                      {activeDisplayObject.health_verdict.risk_factors.map((risk, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-[11px] text-rose-700 font-medium">
                          <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />
                          <span>{risk}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Safety Warnings */}
                  {activeDisplayObject.health_verdict.safety_warnings.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500">Safety Warnings</span>
                      {activeDisplayObject.health_verdict.safety_warnings.map((warning, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-[11px] text-amber-800 font-medium bg-amber-100/50 px-2 py-1 rounded-lg">
                          <ShieldAlert className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                          <span>{warning}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Card 1: Object Overview */}
              <div key={`overview-${selectedObjectIndex}`} className="p-5 rounded-3xl glass-white border border-slate-200/80 shadow-glass-card flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-mono font-bold text-blue-700">
                    {(activeDisplayObject?.category || 'GENERAL_OBJECT').replace('_', ' ')}
                  </span>
                  <span className="text-xs font-mono text-slate-500 font-medium">
                    Confidence: {((activeDisplayObject?.confidence || 0) * 100).toFixed(0)}%
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-ink-primary font-sans leading-tight">
                    {activeDisplayObject?.object_title || 'Detected Object'}
                  </h3>
                  <p className="text-xs font-medium text-slate-600 mt-1 leading-relaxed">
                    {activeDisplayObject?.headline_summary}
                  </p>
                </div>

                {/* Cross-Verification Badge */}
                {activeDisplayObject?.cross_verification && (
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-medium ${
                    activeDisplayObject.cross_verification.verified
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-slate-50 border border-slate-200 text-slate-600'
                  }`}>
                    {activeDisplayObject.cross_verification.verified ? (
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Info className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span>
                      {activeDisplayObject.cross_verification.verified ? 'Verified' : 'Unverified'} via {activeDisplayObject.cross_verification.source}
                    </span>
                  </div>
                )}
              </div>

              {/* Card 2: Structured Attributes */}
              {activeDisplayObject?.structured_attributes && activeDisplayObject.structured_attributes.length > 0 && (
                <div key={`attrs-${selectedObjectIndex}`} className="p-5 rounded-3xl glass-white border border-slate-200/80 shadow-glass-card flex flex-col gap-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-500">
                    Key Structured Attributes
                  </h4>

                  <div className="flex flex-col gap-2">
                    {activeDisplayObject.structured_attributes.map((attr, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs"
                      >
                        <span className="font-medium text-slate-600">{attr.label}</span>
                        <span
                          className={`font-semibold font-mono px-2 py-0.5 rounded-md ${
                            attr.status === 'good'
                              ? 'bg-emerald-100 text-emerald-800'
                              : attr.status === 'warning'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {attr.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Card 3: Actionable Insights */}
              {activeDisplayObject?.actionable_insights && activeDisplayObject.actionable_insights.length > 0 && (
                <div key={`insights-${selectedObjectIndex}`} className="p-5 rounded-3xl glass-white border border-slate-200/80 shadow-glass-card flex flex-col gap-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-500 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Actionable Guidance</span>
                  </h4>

                  <ul className="flex flex-col gap-2">
                    {activeDisplayObject.actionable_insights.map((insight, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Card 4: OCR Verbatim Extracted Text */}
              {activeDisplayObject?.extracted_text_ocr && (
                <div key={`ocr-${selectedObjectIndex}`} className="p-5 rounded-3xl glass-white border border-slate-200/80 shadow-glass-card flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-500">
                      Extracted Text / OCR Evidence
                    </h4>
                    <button
                      onClick={handleCopyOcr}
                      className="flex items-center gap-1 text-[11px] font-mono text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <p className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                    {activeDisplayObject.extracted_text_ocr}
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            /* Empty State Awaiting First Scan - 3D Optical Sensor Target Display */
            <div className="p-8 rounded-3xl bg-white/90 backdrop-blur-xl border border-slate-200/90 shadow-[0_20px_50px_-10px_rgba(15,23,42,0.08),inset_0_1px_2px_rgba(255,255,255,1)] flex flex-col items-center justify-center text-center gap-5 min-h-[440px]">
              {/* 3D Optical Radar Ring */}
              <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-500/10 via-indigo-500/10 to-emerald-500/10 border border-blue-200/80 flex items-center justify-center shadow-inner group">
                <div className="absolute inset-2 rounded-2xl border border-dashed border-blue-400/60 animate-spin" style={{ animationDuration: '18s' }} />
                <Scan className="w-8 h-8 text-blue-600 drop-shadow-sm" />
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
              </div>

              <div className="flex flex-col gap-1 max-w-sm">
                <h4 className="text-base font-bold text-slate-950 font-sans tracking-tight">
                  Auto-Detection Active
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {inputMode === 'camera'
                    ? 'Hold any physical item in front of your live camera - IRA will detect and analyze it automatically within seconds. No button needed!'
                    : 'Upload a photo to activate zero-hallucination spatial guidance with strict health classification.'}
                </p>
              </div>

              {/* 4 Interactive Showcase Category Chips */}
              <div className="grid grid-cols-2 gap-2 w-full max-w-sm text-left">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 transition-colors">
                  <span className="text-[11px] font-bold text-slate-900 block font-sans">💊 Medicine Strips</span>
                  <span className="text-[10px] text-slate-500 font-sans">Safety &amp; Interactions</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-emerald-300 transition-colors">
                  <span className="text-[11px] font-bold text-slate-900 block font-sans">🥫 Packaged Food</span>
                  <span className="text-[10px] text-slate-500 font-sans">Health Classification</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-amber-300 transition-colors">
                  <span className="text-[11px] font-bold text-slate-900 block font-sans">📄 KYC Documents</span>
                  <span className="text-[10px] text-slate-500 font-sans">Field Guidance</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-emerald-300 transition-colors">
                  <span className="text-[11px] font-bold text-slate-900 block font-sans">🌿 Botany &amp; Leaves</span>
                  <span className="text-[10px] text-slate-500 font-sans">Disease Diagnosis</span>
                </div>
              </div>

              {isAnalyzing && (
                <div className="flex items-center gap-2 text-blue-700 text-xs font-semibold animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Scanning and analyzing object...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
