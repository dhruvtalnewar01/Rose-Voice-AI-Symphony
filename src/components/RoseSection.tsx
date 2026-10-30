'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

interface RoseSectionProps {
  onScrollToStudio?: () => void;
}

export default function RoseSection({ onScrollToStudio }: RoseSectionProps) {
  // Accordion active panel state (1, 2, or 3)
  const [activePanel, setActivePanel] = useState<number>(1);

  const scrollToStudioHandler = () => {
    if (onScrollToStudio) {
      onScrollToStudio();
    } else {
      const el = document.getElementById('studio');
      if (el) {
        const topOffset = el.getBoundingClientRect().top + window.scrollY - 90;
        window.scrollTo({ top: Math.max(0, topOffset), behavior: 'smooth' });
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('activate-camera-studio'));
    }
  };

  return (
    <div id="rose-section" className="relative w-full w-screen max-w-none overflow-hidden bg-white text-[#121410] font-sans m-0 p-0 scroll-mt-24">
      {/* =========================================================================
          SUBSECTION 1: ROSE HERO WITH SEEDANCE 2.5 VIDEO & PASTEL WATERCOLOR CLOUDS
          ========================================================================= */}
      <section className="relative w-full h-screen min-h-[640px] overflow-hidden bg-white flex flex-col items-center justify-between">
        {/* Floating Pill Nav */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-8 sm:gap-12 px-5 py-2 rounded-full bg-white/90 backdrop-blur-md shadow-[0_6px_20px_rgba(0,0,0,0.06)] border border-slate-100">
          <div className="flex items-center gap-2 font-medium text-xl sm:text-2xl tracking-tight text-slate-900">
            <svg viewBox="0 0 30 22" className="w-7 h-5">
              <circle cx="4" cy="17" r="3.6" fill="currentColor" />
              <path
                d="M10.5 18.5 16.8 5.2 25.5 18.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="5.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-semibold">rose</span>
          </div>
          <button
            onClick={scrollToStudioHandler}
            className="liquid-glass-pill-emerald px-5 py-2 text-white text-xs sm:text-sm font-semibold cursor-pointer"
          >
            Launch Studio
          </button>
        </div>

        {/* Pastel Watercolor Cloud Left */}
        <div className="absolute -top-[2%] -left-[4%] w-[min(44vw,620px)] pointer-events-none z-10 rose-drift-a">
          <img
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261021_093216_44218665-b15e-4566-a2d4-2676ab03609d.png"
            alt="Pastel Cloud Left"
            className="w-full h-auto"
          />
        </div>

        {/* Pastel Watercolor Cloud Right */}
        <div className="absolute top-[2%] -right-[5%] w-[min(42vw,600px)] pointer-events-none z-10 rose-drift-b">
          <img
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261021_093215_0f37c0c3-f82c-485b-87dd-5a35b75a8782.png"
            alt="Pastel Cloud Right"
            className="w-full h-auto"
          />
        </div>

        {/* Hero Title (Updated with Rose MVP Core Specification) */}
        <div className="relative z-20 w-full text-center px-4 pt-32 sm:pt-36">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-[clamp(32px,5.2vw,72px)] font-normal tracking-[-0.045em] leading-[1.04] text-[#121410]"
          >
            Point at any physical object.<br />
            Decipher with <span className="text-[#4d6a10] italic font-serif font-medium">Rose Voice AI.</span>
          </motion.h1>
        </div>

        {/* Seedance 2.5 1080p Video Backdrop */}
        <div
          className="absolute left-0 right-0 bottom-0 h-[72%] z-0"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent 0%, #000 24%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 24%)',
          }}
        >
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261021_093215_b7826239-e451-4e15-b42b-d6bcf9497a32.png"
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261021_093331_5998f443-1b9c-4b62-820c-8219c73c72c4.mp4"
            className="w-full h-full object-cover object-[center_70%]"
          />
        </div>

        {/* Floating Refraction Glass Squares */}
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="rose-glass w-12 sm:w-16 h-12 sm:h-16 left-[5%] top-[68%] animate-pulse" />
          <div className="rose-glass w-10 sm:w-14 h-10 sm:h-14 left-[9%] top-[74%]" />
          <div className="rose-glass w-10 sm:w-12 h-10 sm:h-12 left-[48%] top-[78%]" />
          <div className="rose-glass w-14 sm:w-18 h-14 sm:h-18 right-[7%] top-[66%]" />
          <div className="rose-glass w-11 sm:w-14 h-11 sm:h-14 right-[12%] top-[75%]" />
        </div>
      </section>

      {/* =========================================================================
          SUBSECTION 2: ROSE STATS, RISING CHERRY BLOSSOM TREE & 4 TICKET CARDS
          ========================================================================= */}
      <section className="relative w-full min-h-[720px] py-20 overflow-hidden bg-white flex flex-col items-center justify-center">
        {/* Rising Cherry Blossom Tree anchored at bottom */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[min(380px,64vw)] pointer-events-none z-0">
          <img
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261021_093215_95f11900-c4a0-49ad-bb2d-bb927dd594ee.png"
            alt="Cherry Blossom Tree"
            className="w-full h-auto drop-shadow-md"
          />
        </div>

        <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center justify-center gap-6 px-4">
          {/* Architectural Pill */}
          <div className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-1.5 rounded-full bg-[#e7efcf] text-[#2c3a10] tracking-wide border border-[#b4cd52]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4d6a10] animate-ping" />
            <span>Spatial Zero-Hallucination Architecture · Technology Demonstration</span>
          </div>

          {/* Impactful Heading */}
          <h2 className="text-[clamp(26px,3.2vw,46px)] font-normal tracking-[-0.03em] leading-[1.12] text-center text-[#121410] max-w-3xl">
            The Spatial-Voice Operating System<br />
            Architected for Physical Reality.
          </h2>

          {/* 4 Demonstration Ticket Cards with circular punch notch mask */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 w-full max-w-4xl mt-3">
            {/* Ticket Card 1 */}
            <div className="rose-ticket-card h-36 sm:h-40 p-5 rounded-[22px] bg-[#b4cd52] flex flex-col justify-between shadow-sm hover:scale-[1.02] transition-transform">
              <span className="text-[11px] font-semibold text-[#2a3410] uppercase tracking-wider font-mono">Voice Telemetry</span>
              <div>
                <b className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-[-0.04em] text-[#151a08] tabular-nums block">
                  &lt;280ms
                </b>
                <span className="text-[10px] text-[#2c3a10] font-sans font-medium">Sub-300ms WebRTC duplex</span>
              </div>
            </div>

            {/* Ticket Card 2 */}
            <div className="rose-ticket-card h-36 sm:h-40 p-5 rounded-[22px] bg-[#b4cd52] flex flex-col justify-between shadow-sm hover:scale-[1.02] transition-transform">
              <span className="text-[11px] font-semibold text-[#2a3410] uppercase tracking-wider font-mono">Spatial Tracking</span>
              <div>
                <b className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-[-0.04em] text-[#151a08] tabular-nums block">
                  60 FPS
                </b>
                <span className="text-[10px] text-[#2c3a10] font-sans font-medium">WebGPU Coordinate Lock</span>
              </div>
            </div>

            {/* Ticket Card 3 */}
            <div className="rose-ticket-card h-36 sm:h-40 p-5 rounded-[22px] bg-[#b4cd52] flex flex-col justify-between shadow-sm hover:scale-[1.02] transition-transform">
              <span className="text-[11px] font-semibold text-[#2a3410] uppercase tracking-wider font-mono">Grounding Protocol</span>
              <div>
                <b className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-[-0.04em] text-[#151a08] tabular-nums block">
                  100%
                </b>
                <span className="text-[10px] text-[#2c3a10] font-sans font-medium">Tri-Lock Grounding Rate</span>
              </div>
            </div>

            {/* Ticket Card 4 */}
            <div className="rose-ticket-card h-36 sm:h-40 p-5 rounded-[22px] bg-[#b4cd52] flex flex-col justify-between shadow-sm hover:scale-[1.02] transition-transform">
              <span className="text-[11px] font-semibold text-[#2a3410] uppercase tracking-wider font-mono">Acoustic Precision</span>
              <div>
                <b className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-[-0.04em] text-[#151a08] tabular-nums block">
                  99.4%
                </b>
                <span className="text-[10px] text-[#2c3a10] font-sans font-medium">Multilingual Indic Dialects</span>
              </div>
            </div>
          </div>

          {/* Under-Card Soft Shadow */}
          <div className="w-[min(820px,94%)] h-3 -mt-2 rounded-full bg-[radial-gradient(closest-side,rgba(0,0,0,0.08),transparent)]" />

          {/* High-Impact Architectural Tagline Replacing Logos */}
          <div className="relative w-full max-w-3xl mt-5 px-6 sm:px-8 py-5 rounded-2xl bg-white/75 backdrop-blur-xl border border-[#b4cd52]/40 shadow-[0_16px_36px_rgba(77,106,16,0.08)] flex items-center justify-center text-center">
            <p className="text-sm sm:text-base md:text-lg font-serif italic text-[#1d270a] leading-relaxed select-none">
              &ldquo;No hallucinations. No synthetic guesses. Just verified physical truth spoken into reality in sub-300 milliseconds.&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SUBSECTION 3: 3-PANEL INTERACTIVE LOOP ACCORDION
          ========================================================================= */}
      <section className="relative w-full min-h-[700px] py-16 overflow-hidden bg-white flex flex-col justify-between">
        {/* Floating Loop Pastel Cloud */}
        <div className="absolute top-10 -left-12 w-[min(36vw,500px)] pointer-events-none z-10 rose-drift-a">
          <img
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261021_093216_44218665-b15e-4566-a2d4-2676ab03609d.png"
            alt="Cloud"
            className="w-full h-auto"
          />
        </div>

        {/* Section Heading */}
        <div className="relative z-20 w-full flex flex-col items-center gap-3 px-4 text-center">
          <span className="inline-flex text-xs font-semibold px-4 py-1.5 rounded-full bg-[#e7efcf] text-[#2c3a10] tracking-wide">
            Autonomous Tri-Lock
          </span>
          <h2 className="text-[clamp(26px,3.2vw,44px)] font-normal tracking-[-0.03em] leading-[1.12] text-[#121410]">
            Tri-lock verification gates<br />
            every spoken word.
          </h2>
        </div>

        {/* Accordion Panels Track */}
        <div className="relative z-20 w-full max-w-6xl mx-auto mt-12 px-4 flex flex-col md:flex-row border-y md:border-y-0 md:border-x border-slate-200 divide-y md:divide-y-0 md:divide-x divide-slate-200 min-h-[420px]">
          {/* Panel 1 */}
          <div
            onClick={() => setActivePanel(1)}
            onMouseEnter={() => setActivePanel(1)}
            className={`relative p-6 sm:p-8 flex flex-col justify-end transition-all duration-700 cursor-pointer overflow-hidden ${
              activePanel === 1 ? 'md:flex-[3] bg-emerald-50/20' : 'md:flex-[1] bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-end gap-6">
              <span className="text-[clamp(90px,16vw,170px)] font-semibold leading-[0.74] tracking-[-0.07em] text-[#4d6a10] select-none">
                1
              </span>
              <div
                className={`transition-all duration-500 max-w-md ${
                  activePanel === 1 ? 'opacity-100 translate-x-0' : 'opacity-40 md:opacity-0 md:translate-x-4'
                }`}
              >
                <h3 className="text-xl sm:text-2xl font-normal tracking-[-0.03em] text-[#121410] mb-2 font-serif italic">
                  Showcase &amp; Spatial Lock
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
                  Point your finger or camera at any medicine strip, lab metric, or packaged food. Real-time vision locks optical coordinates and extracts high-res text crops.
                </p>
              </div>
            </div>
          </div>

          {/* Panel 2 */}
          <div
            onClick={() => setActivePanel(2)}
            onMouseEnter={() => setActivePanel(2)}
            className={`relative p-6 sm:p-8 flex flex-col justify-end transition-all duration-700 cursor-pointer overflow-hidden ${
              activePanel === 2 ? 'md:flex-[3] bg-emerald-50/20' : 'md:flex-[1] bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-end gap-6">
              <span className="text-[clamp(90px,16vw,170px)] font-semibold leading-[0.74] tracking-[-0.07em] text-[#6f9a0c] select-none">
                2
              </span>
              <div
                className={`transition-all duration-500 max-w-md ${
                  activePanel === 2 ? 'opacity-100 translate-x-0' : 'opacity-40 md:opacity-0 md:translate-x-4'
                }`}
              >
                <h3 className="text-xl sm:text-2xl font-normal tracking-[-0.03em] text-[#121410] mb-2 font-serif italic">
                  Deterministic API Grounding
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
                  Queries OpenFDA, RxNorm, and OpenFoodFacts registries in real time. Spoken statements must bind to verbatim OCR evidence and certified databases before uttering.
                </p>
              </div>
            </div>
          </div>

          {/* Panel 3 */}
          <div
            onClick={() => setActivePanel(3)}
            onMouseEnter={() => setActivePanel(3)}
            className={`relative p-6 sm:p-8 flex flex-col justify-end transition-all duration-700 cursor-pointer overflow-hidden ${
              activePanel === 3 ? 'md:flex-[3] bg-emerald-50/20' : 'md:flex-[1] bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-end gap-6">
              <span className="text-[clamp(90px,16vw,170px)] font-semibold leading-[0.74] tracking-[-0.07em] text-[#b4cd52] select-none">
                3
              </span>
              <div
                className={`transition-all duration-500 max-w-md ${
                  activePanel === 3 ? 'opacity-100 translate-x-0' : 'opacity-40 md:opacity-0 md:translate-x-4'
                }`}
              >
                <h3 className="text-xl sm:text-2xl font-normal tracking-[-0.03em] text-[#121410] mb-2 font-serif italic">
                  Multilingual Voice &amp; Escalation
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
                  Rose responds in &lt;300ms across 10+ Indian dialects (Hindi, Hinglish, Tamil, Telugu, English). If dangerous contraindications appear, it triggers instant phone call escalation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SUBSECTION 4: ROSE CTA WITH MOONLIT VALLEY LAKE & FALLING CHERRY PETALS
          ========================================================================= */}
      <section className="relative w-full min-h-[720px] overflow-hidden bg-white flex items-center justify-center py-24">
        {/* Moonlit Cherry Blossom Valley Lake Image */}
        <div
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent 0%, #000 24%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 24%)',
          }}
        >
          <img
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261021_093217_cc690198-ad8c-4127-8734-8485bd878351.png"
            alt="Moonlit Cherry Blossom Lake"
            className="w-full h-full object-cover object-[center_60%]"
          />
        </div>

        {/* Falling Pink Cherry Petals Simulation */}
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          {[...Array(18)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2.5 h-2 rounded-[80%_0_80%_0] bg-[#f6c4d6]/80"
              style={{
                left: `${(i * 5.8) % 100}%`,
                animation: `rosePetalFall ${7 + (i % 5)}s linear infinite`,
                animationDelay: `${(i * 0.7) % 6}s`,
                // @ts-expect-error CSS variable
                '--dx': `${(i % 2 === 0 ? 1 : -1) * (20 + (i * 6))}px`,
              }}
            />
          ))}
        </div>

        {/* Translucent Glass CTA Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 30 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative z-20 w-[min(680px,calc(100%-32px))] px-6 sm:px-10 py-12 text-center rounded-[26px] bg-gradient-to-b from-white/95 via-white/80 to-white/30 backdrop-blur-xl border border-white/80 shadow-[0_30px_60px_rgba(10,20,60,0.18)] flex flex-col items-center gap-4"
        >
          <span className="inline-flex text-xs font-semibold px-4 py-1.5 rounded-full bg-[#e7efcf] text-[#2c3a10]">
            Experience Rose Live
          </span>
          <h2 className="text-[clamp(24px,3vw,38px)] font-normal tracking-[-0.03em] leading-tight text-[#121410] max-w-lg">
            Every second deciphering medicine &amp; lab reports is critical.
          </h2>
          <p className="text-sm text-slate-800 leading-relaxed max-w-md">
            Switch on your camera or drop an image. Experience zero-hallucination spatial voice AI right now.
          </p>
          <button
            onClick={scrollToStudioHandler}
            className="inline-flex items-center justify-center gap-2 h-11 px-7 rounded-full bg-[#4d6a10] hover:bg-[#5a7c14] text-[#f3f8e4] text-sm font-semibold tracking-tight transition-transform hover:-translate-y-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_12px_rgba(60,80,10,0.3)] cursor-pointer mt-2"
          >
            <span>Launch Live Camera Studio</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </section>

      {/* =========================================================================
          SUBSECTION 5: LIME FOOTER WITH ANIMATED SVG LOGO & COPYRIGHT
          ========================================================================= */}
      <footer className="w-full bg-[#b4cd52] px-6 sm:px-12 py-10 flex flex-col md:flex-row items-center justify-between gap-6 z-20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12">
            <svg viewBox="0 0 80 80" className="w-full h-full text-slate-950">
              <circle
                cx="40"
                cy="40"
                r="37"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeDasharray="233"
                className="animate-spin"
                style={{ animationDuration: '24s' }}
              />
              <circle cx="22" cy="40" r="4.5" fill="currentColor" />
              <circle cx="40" cy="40" r="4.5" fill="currentColor" />
              <circle cx="58" cy="40" r="4.5" fill="currentColor" />
              <path
                d="M33 53 43 31 56 53"
                fill="none"
                stroke="currentColor"
                strokeWidth="9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-950 text-base">Rose Voice AI</span>
            <span className="text-xs text-[#2a3410]">Zero-Hallucination Spatial OS</span>
          </div>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-5 sm:gap-8 text-xs font-semibold text-[#1d240c]">
          <a href="#hero" className="hover:underline">Overview</a>
          <span>·</span>
          <a href="#studio" className="hover:underline">Live Studio</a>
          <span>·</span>
          <a href="#rose-section" className="hover:underline">Tri-Lock Engine</a>
          <span>·</span>
          <a href="https://open.fda.gov" target="_blank" rel="noopener noreferrer" className="hover:underline">OpenFDA Registry</a>
          <span>·</span>
          <span className="text-[#2a3410] font-mono">[ID Redacted] Privacy Shield</span>
        </nav>

        <div className="text-xs text-[#2a330f] font-sans text-center md:text-right">
          © 2026 Rose Voice AI Symphony. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
