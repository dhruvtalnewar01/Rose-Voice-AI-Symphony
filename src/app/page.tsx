'use client';

import React, { useRef } from 'react';
import { Camera } from 'lucide-react';
import ThreeBackground from '@/components/ThreeBackground';
import HeroSection from '@/components/HeroSection';
import LiveVisionVoiceStudio from '@/components/LiveVisionVoiceStudio';
import RoseSection from '@/components/RoseSection';
import SpatialTransitionRouter from '@/components/SpatialTransitionRouter';
import Spatial3DSectionDivider from '@/components/Spatial3DSectionDivider';

export default function MasterLandingPage() {
  const studioRef = useRef<HTMLDivElement | null>(null);
  const roseRef = useRef<HTMLDivElement | null>(null);

  const scrollToStudio = () => {
    const el = document.getElementById('studio');
    if (el) {
      const topOffset = el.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top: Math.max(0, topOffset), behavior: 'smooth' });
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('activate-camera-studio'));
    }
  };

  const scrollToRose = () => {
    const el = document.getElementById('rose-section');
    if (el) {
      const topOffset = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: Math.max(0, topOffset), behavior: 'smooth' });
    }
  };

  return (
    <SpatialTransitionRouter>
      <div className="relative min-h-screen w-full bg-[#FFFFFF] text-[#0F172A] flex flex-col overflow-x-hidden p-0 m-0">
        {/* 1. Global Interactive Three.js 3D Background Canvas */}
        <ThreeBackground />

        {/* 2. Floating 3D Liquid Morphism Top Navigation Bar (Compact Island Proportions) */}
        <header className="fixed top-3 sm:top-3.5 left-1/2 -translate-x-1/2 z-50 w-[90%] sm:w-auto sm:min-w-[540px] md:min-w-[600px] max-w-xl px-3 sm:px-3.5 py-1.5 rounded-full liquid-glass-nav-replica flex items-center justify-between gap-3 sm:gap-4 transition-all duration-300">
          {/* Brand Link with 3D Liquid Morphism Crystal Jewel Badge & Official Logo */}
          <div className="flex items-center gap-2 group cursor-pointer shrink-0">
            <div className="relative flex items-center justify-center w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-xl p-0.5 bg-white/85 backdrop-blur-xl border border-white/95 shadow-[0_2px_8px_rgba(37,99,235,0.2),inset_0_1px_1.5px_rgba(255,255,255,1)] transition-transform duration-300 group-hover:scale-105 shrink-0 overflow-hidden">
              {/* Iridescent internal chromatic caustics */}
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400/30 via-indigo-500/15 to-amber-400/30 pointer-events-none" />
              <img
                src="/logo-transparent.png"
                alt="Rose Logo"
                className="relative z-10 w-full h-full object-contain filter drop-shadow-[0_1.5px_4px_rgba(37,99,235,0.25)] select-none"
              />
            </div>
            <div className="flex items-center select-none leading-none">
              <span className="font-pixel text-xs sm:text-sm md:text-base font-bold text-slate-950 tracking-tight leading-none group-hover:text-blue-600 transition-colors">
                ROSE
              </span>
            </div>
          </div>

          {/* Center Nav Links with Liquid Glass Subtle Floating Pills */}
          <nav className="hidden sm:flex items-center gap-0.5 sm:gap-1 text-[11px] sm:text-xs font-semibold text-slate-800 font-sans">
            <a
              href="#hero"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-2.5 py-1 rounded-full hover:bg-slate-900/5 hover:text-blue-600 transition-all cursor-pointer"
            >
              Overview
            </a>
            <a
              href="#studio"
              onClick={(e) => {
                e.preventDefault();
                scrollToStudio();
              }}
              className="px-2.5 py-1 rounded-full hover:bg-slate-900/5 hover:text-blue-600 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Live Studio</span>
              <span className="px-1.5 py-0.5 rounded-full bg-blue-100/90 text-blue-700 text-[9px] font-mono font-bold shadow-xs flex items-center gap-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-600"></span>
                </span>
                <span>Live</span>
              </span>
            </a>
            <a
              href="#rose-section"
              onClick={(e) => {
                e.preventDefault();
                scrollToRose();
              }}
              className="px-2.5 py-1 rounded-full hover:bg-slate-900/5 hover:text-emerald-700 transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>Rose Engine</span>
            </a>
          </nav>

          {/* Right CTA: Exact Image 3 'Start project' Liquid Glass Obsidian Pill Button */}
          <div className="flex items-center shrink-0">
            <button
              onClick={scrollToStudio}
              className="liquid-glass-pill-dark px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-white text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 cursor-pointer select-none group"
            >
              <Camera className="w-3 h-3 text-cyan-400 group-hover:rotate-12 transition-transform" />
              <span>Launch Studio</span>
            </button>
          </div>
        </header>

        {/* 3. SECTION 1: REDEFINED MODULAR 3D HERO SECTION (EDGE-TO-EDGE, NO SIDE GAPS) */}
        <div id="hero" className="w-full w-screen max-w-none px-0 m-0">
          <HeroSection
            onScrollToStudio={scrollToStudio}
            onScrollToPetalyx={scrollToRose}
          />
        </div>

        {/* 3D Realism Transition Divider (Hero -> Studio) */}
        <Spatial3DSectionDivider
          badge="Live Spatial Stage"
          label="Entering 100% Optical Production Studio"
          sublabel="Dual Mode Camera & Photo Engine"
          colorTheme="blue"
          onScrollToNext={scrollToStudio}
        />

        {/* 4. SECTION 2: THE LIVE PRODUCTION WORKSPACE (CAMERA + UPLOAD) */}
        <div id="studio" ref={studioRef} className="w-full py-6 scroll-mt-32">
          <LiveVisionVoiceStudio />
        </div>

        {/* 3D Realism Transition Divider (Studio -> Rose) */}
        <Spatial3DSectionDivider
          badge="Autonomous Gate"
          label="Entering Rose Zero-Hallucination Engine"
          sublabel="Sub-300ms Verification & Multilingual Voice Guidance"
          colorTheme="emerald"
          onScrollToNext={scrollToRose}
        />

        {/* 5. SECTION 3: ROSE FULLSCREEN NATIVE STANDALONE-STYLE SECTION (EDGE-TO-EDGE, NO SIDE GAPS) */}
        <div ref={roseRef} className="w-full w-screen max-w-none px-0 m-0">
          <RoseSection onScrollToStudio={scrollToStudio} />
        </div>
      </div>
    </SpatialTransitionRouter>
  );
}
