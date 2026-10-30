'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, Cpu, Sparkles, Orbit, Compass } from 'lucide-react';

interface Spatial3DSectionDividerProps {
  label: string;
  sublabel: string;
  badge: string;
  colorTheme?: 'blue' | 'emerald' | 'amber';
  onScrollToNext?: () => void;
}

export default function Spatial3DSectionDivider({
  label,
  sublabel,
  badge,
  colorTheme = 'emerald',
  onScrollToNext,
}: Spatial3DSectionDividerProps) {
  const accentTheme = {
    blue: {
      border: 'border-blue-400/40',
      pillBg: 'bg-blue-500/10',
      pillText: 'text-blue-700',
      glow: 'rgba(37,99,235,0.18)',
      dot: 'bg-blue-600',
      accentGlow: '#2563EB',
    },
    emerald: {
      border: 'border-emerald-500/40',
      pillBg: 'bg-emerald-500/10',
      pillText: 'text-emerald-800',
      glow: 'rgba(16,185,129,0.18)',
      dot: 'bg-emerald-600',
      accentGlow: '#059669',
    },
    amber: {
      border: 'border-amber-400/40',
      pillBg: 'bg-amber-500/10',
      pillText: 'text-amber-800',
      glow: 'rgba(245,158,11,0.18)',
      dot: 'bg-amber-600',
      accentGlow: '#D97706',
    },
  }[colorTheme];

  return (
    <div className="relative w-full py-10 max-w-5xl mx-auto px-4 flex flex-col items-center justify-center select-none" style={{ perspective: 1200 }}>
      {/* 3D Holographic Portal Floating Capsule */}
      <motion.div
        initial={{ opacity: 0, y: 24, rotateX: 18 }}
        whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ y: -4, scale: 1.02, rotateX: -2 }}
        onClick={onScrollToNext}
        style={{ transformStyle: 'preserve-3d' }}
        className={`group relative flex flex-col sm:flex-row items-center gap-3 sm:gap-6 px-6 sm:px-8 py-3.5 sm:py-4 rounded-3xl bg-white/80 backdrop-blur-2xl border ${accentTheme.border} shadow-[0_20px_50px_-10px_${accentTheme.glow},inset_0_1.5px_2px_rgba(255,255,255,0.95)] hover:shadow-2xl transition-all duration-300 cursor-pointer`}
      >
        {/* Subtle Specular Sheen Sweep */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-700 -translate-x-full group-hover:translate-x-full" />

        {/* Left 3D Optical Reticle Micro-Orb */}
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0.5 rounded-full border border-dashed border-slate-300 pointer-events-none"
            />
            <Compass className={`w-4 h-4 ${accentTheme.pillText} group-hover:rotate-45 transition-transform duration-500`} />
          </div>

          {/* Badge Pill with Live Radar Dot */}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase ${accentTheme.pillBg} ${accentTheme.pillText} border border-slate-200/50`}>
            <span className={`w-1.5 h-1.5 rounded-full ${accentTheme.dot} animate-ping`} />
            {badge}
          </span>
        </div>

        {/* Center Descriptive Telemetry */}
        <div className="flex items-center gap-2 text-center sm:text-left">
          <span className="text-xs sm:text-sm font-bold text-slate-900 font-sans tracking-tight">
            {label}
          </span>
          <span className="text-slate-300 hidden sm:inline">·</span>
          <span className="text-[11px] font-mono text-slate-600 hidden sm:inline font-medium">
            {sublabel}
          </span>
        </div>

        {/* Right 3D Directional Gravity Arrow */}
        <motion.div
          animate={{ y: [0, 3, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200/70 flex items-center justify-center text-slate-700 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-colors shadow-sm ml-auto"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </motion.div>
      </motion.div>
    </div>
  );
}
