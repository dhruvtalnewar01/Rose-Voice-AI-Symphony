'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ArrowRight, Layers, Sparkles } from 'lucide-react';

interface HeroSectionProps {
  onScrollToStudio: () => void;
  onScrollToPetalyx: () => void;
}

// 3D Animated Words Typing/Popping Capsule for "Live Spatial Paradigm"
function SpatialParadigmPoppingBox() {
  const wordsGroup = [
    { text: 'Point', color: 'text-blue-600' },
    { text: 'at', color: 'text-blue-600' },
    { text: 'Anything.', color: 'text-blue-600 font-bold mr-1.5' },
    { text: 'Speak', color: 'text-amber-700' },
    { text: 'in', color: 'text-amber-700' },
    { text: 'Your', color: 'text-amber-700' },
    { text: 'Language.', color: 'text-amber-700 font-bold mr-1.5' },
    { text: 'Experience', color: 'text-emerald-700' },
    { text: 'Live', color: 'text-emerald-700' },
    { text: 'Spatial', color: 'text-emerald-700' },
    { text: 'Voice', color: 'text-emerald-700' },
    { text: 'AI.', color: 'text-emerald-700 font-bold' },
  ];

  const [visibleCount, setVisibleCount] = useState<number>(0);

  useEffect(() => {
    // Reset and pop in words one by one in a continuous smooth loop
    const interval = setInterval(() => {
      setVisibleCount((prev) => {
        if (prev < wordsGroup.length) {
          return prev + 1;
        }
        return prev;
      });
    }, 180);

    const restartTimeout = setInterval(() => {
      setVisibleCount(0);
    }, 8500);

    return () => {
      clearInterval(interval);
      clearInterval(restartTimeout);
    };
  }, [wordsGroup.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, rotateX: 14 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.7, delay: 0.3 }}
      whileHover={{ y: -4, scale: 1.015, rotateX: -1 }}
      style={{ transformStyle: 'preserve-3d', perspective: 1200 }}
      className="relative p-4 sm:p-5 rounded-2xl bg-white/85 backdrop-blur-2xl border border-white/95 shadow-[0_18px_42px_-8px_rgba(15,23,42,0.1),inset_0_1.5px_2px_rgba(255,255,255,1)] flex flex-col gap-2 w-full max-w-xl cursor-default transition-all duration-300 group"
    >
      {/* 3D Glass Light Sweep Refraction */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-700 -translate-x-full group-hover:translate-x-full" />

      {/* Top Telemetry Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
          </span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600 font-bold">
            Live Spatial Paradigm
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100/90 border border-slate-200/80 text-[10px] font-mono text-slate-600 font-semibold">
          <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
          <span>3D WebGPU Engine</span>
        </div>
      </div>

      {/* Popping Typing Words Track */}
      <div className="text-xs sm:text-sm md:text-[0.98rem] font-semibold text-slate-900 leading-relaxed flex flex-wrap items-center min-h-[48px] select-none" style={{ transformStyle: 'preserve-3d' }}>
        {wordsGroup.map((w, idx) => {
          const isVisible = idx < visibleCount;
          return (
            <AnimatePresence key={idx}>
              {isVisible && (
                <motion.span
                  initial={{ opacity: 0, y: 12, scale: 0.65, rotateX: 35, filter: 'blur(3px)' }}
                  animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                  className={`inline-block mr-1.5 ${w.color} transition-transform hover:scale-105`}
                >
                  {w.text}
                </motion.span>
              )}
            </AnimatePresence>
          );
        })}
        {/* Blinking 3D spatial typing cursor */}
        {visibleCount < wordsGroup.length && (
          <motion.span
            animate={{ opacity: [1, 0, 1], scaleY: [1, 0.85, 1] }}
            transition={{ repeat: Infinity, duration: 0.7 }}
            className="inline-block w-1.5 h-4 ml-0.5 rounded-[2px] bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.8)]"
          />
        )}
      </div>
    </motion.div>
  );
}

export default function HeroSection({ onScrollToStudio, onScrollToPetalyx }: HeroSectionProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Video playback watchdog ensuring buttery smooth 60fps hardware-accelerated playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = 1.0;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        video.muted = true;
        video.play().catch(() => {});
      });
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && video.paused) {
        video.play().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleLaunchStudio = () => {
    onScrollToStudio();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('activate-camera-studio'));
    }
  };

  return (
    <section className="relative w-full w-screen min-h-screen flex flex-col justify-between overflow-hidden bg-[#efd0a0] pt-20 pb-6 px-6 sm:px-10 md:px-14 lg:px-16 select-none m-0">
      {/* 
        1. HARDWARE-ACCELERATED EDGE-TO-EDGE HERO VIDEO BACKDROP
        - Direct GPU overlay plane with translate3d(0,0,0) and will-change: transform.
        - 100% width and height, object-cover, zero gap on left, right, top, or bottom.
        - Background seamlessly set to #efd0a0 matching the exact pixel cat canvas tone.
        - Framed with md:object-[82%_center] so the cat with horizontal scanlines is prominently positioned on the right.
      */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden bg-[#efd0a0]">
        <video
          ref={videoRef}
          src="/hero-section.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          className="w-full h-full object-cover object-center md:object-[82%_center] block pointer-events-none transform-gpu will-change-transform"
          style={{
            transform: 'translate3d(0, 0, 0)',
            WebkitTransform: 'translate3d(0, 0, 0)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        />
      </div>

      {/* 
        2. HERO CONTENT LAYERED DIRECTLY ON TOP OF FULL-SCREEN VIDEO
      */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col justify-between flex-grow">
        {/* Top Region: Zero-hallucination box removed as requested. Right: Retro Pixel Speech Bubble */}
        <div className="w-full flex items-start justify-end gap-4">
          {/* Retro Pixel Speech Bubble with Pointer Tail (Right over cat's head) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative self-start mr-2 sm:mr-6 md:mr-12 lg:mr-24 mt-1"
          >
            <div className="bg-white border-2 border-slate-900 px-4 py-2 shadow-[4px_4px_0px_#0F172A] font-pixel text-xs sm:text-sm text-slate-900 flex items-center gap-2 max-w-xs">
              <span className="font-bold">Purr! Live spatial camera ready to guide you.</span>
            </div>
            {/* Pixel speech bubble pointer tail pointing down towards the cat */}
            <div className="w-3.5 h-3.5 bg-white border-r-2 border-b-2 border-slate-900 rotate-45 ml-8 -mt-2 shadow-[2px_2px_0px_#0F172A]" />
          </motion.div>
        </div>

        {/* Center / Left Region: Bold Pixel Title (Strictly 2 lines with PERFECT SPACING), Narrative, 3D Popping Editorial Box, CTAs, Metrics */}
        <div className="flex flex-col items-start gap-4 sm:gap-5 w-full max-w-2xl lg:max-w-3xl py-2 my-auto">
          {/* 
            Bold Pixel Title: Strictly 2 lines only, with generous vertical breathing room
            Lines CANNOT touch: separated by flex-col gap-4 sm:gap-5 md:gap-6 with py-0.5 leading-none
            Line 1: SPARSH DRISHTI
            Line 2: VOICE AI SYMPHONY (in vibrant multi-color chromatic gradient)
          */}
          {/* 
            Bold Modern Title: Strictly 2 lines only, with perfectly calibrated vertical breathing room
            Lines CANNOT touch: separated by flex-col gap-0.5 sm:gap-1 md:gap-1.5 with leading-[0.98]
            Line 1: SPARSH DRISHTI (Clean, authoritative dark obsidian)
            Line 2: VOICE AI (Electric Blue) SYMPHONY (Vibrant Emerald)
          */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-pixel text-3xl sm:text-4xl md:text-[3.2rem] lg:text-[3.9rem] xl:text-[4.4rem] font-bold tracking-tight flex flex-col gap-0 select-none my-1 leading-[0.86]"
          >
            {/* Line 1: Pure Royal Obsidian in Pixelify Sans */}
            <span className="block whitespace-nowrap leading-none text-[#0F172A] tracking-tight">
              ROSE
            </span>
            {/* Line 2: Two-tone chromatic split - VOICE AI in Blue, SYMPHONY in Emerald */}
            <span className="block whitespace-nowrap leading-none tracking-tight -mt-0.5 sm:-mt-1 md:-mt-1.5">
              <span className="text-[#2563EB]">VOICE AI </span>
              <span className="text-[#059669]">SYMPHONY</span>
            </span>
          </motion.h1>

          {/* Subtitle exact copy */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xs sm:text-sm md:text-base text-slate-800 leading-relaxed font-sans max-w-xl font-medium"
          >
            Designed for billions of people who struggle to decipher complex medicine strips,
            lab reports, packet foods, government forms, etc. Just showcase live to trigger instant
            multilingual voice guidance and autonomous telephony escalation.
          </motion.p>

          {/* 3D Live Animated Popping Words Capsule */}
          <SpatialParadigmPoppingBox />

          {/* Exact Replica Liquid Morphism CTA Buttons (Ref: Image 3 'Start project' & 'Secondary') */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap items-center gap-3.5 pt-1"
          >
            <button
              onClick={handleLaunchStudio}
              className="liquid-glass-pill-dark px-6 py-3 rounded-full text-white font-sans text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer group select-none shadow-xl"
            >
              <Camera className="w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform" />
              <span>Launch Live Camera Studio</span>
              <ArrowRight className="w-4 h-4 text-cyan-300 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={onScrollToPetalyx}
              className="liquid-glass-pill-light px-6 py-3 rounded-full text-slate-900 font-sans text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer group select-none shadow-md"
            >
              <Layers className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
              <span>MVP</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </motion.div>

          {/* Bottom Demonstration Telemetry Bar (Zero Fake Data) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs font-mono text-slate-800 font-medium pt-1"
          >
            <span className="font-bold text-slate-950">Zero-Hallucination Tri-Lock</span>
            <span className="text-slate-400">·</span>
            <span className="font-bold text-blue-700">&lt;280ms Speech Engine</span>
            <span className="text-slate-400">·</span>
            <span className="font-bold text-emerald-700">60 FPS WebGPU Spatial Lock</span>
            <span className="text-slate-400">·</span>
            <span className="font-semibold text-slate-700">12+ Indic Dialects</span>
          </motion.div>
        </div>

        {/* Bottom smooth transition gradient into Daylight White */}
        <div className="w-full h-8 bg-gradient-to-b from-transparent to-[#FFFFFF]/70 pointer-events-none -mb-6" />
      </div>
    </section>
  );
}
