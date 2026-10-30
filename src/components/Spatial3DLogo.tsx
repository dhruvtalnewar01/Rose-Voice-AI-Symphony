'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function Spatial3DLogo() {
  return (
    <div className="relative w-9 h-9 flex items-center justify-center select-none group" style={{ perspective: 1000 }}>
      {/* Dynamic 3D Gyroscopic Engine */}
      <div
        className="relative w-full h-full flex items-center justify-center"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Outer 3D Gyroscope Orbital Ring (Metallic Cobalt Titanium Sheen) */}
        <motion.div
          animate={{
            rotateX: [0, 360],
            rotateY: [0, 180],
            rotateZ: [0, 90],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          style={{ transformStyle: 'preserve-3d' }}
          className="absolute inset-0 rounded-full border-[2px] border-blue-500/90 shadow-[0_0_12px_rgba(37,99,235,0.45),inset_0_0_6px_rgba(255,255,255,0.8)] pointer-events-none"
        >
          {/* Orbital Satellite Node A */}
          <span
            className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#3b82f6,0_0_2px_#fff]"
            style={{ transform: 'translateZ(6px)' }}
          />
        </motion.div>

        {/* Middle Counter-Rotating Gimbal Ring (Botanical Emerald Chrome) */}
        <motion.div
          animate={{
            rotateX: [360, 0],
            rotateY: [0, -360],
            rotateZ: [90, 0],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          style={{ transformStyle: 'preserve-3d' }}
          className="absolute inset-1 rounded-full border-[1.8px] border-emerald-400/90 shadow-[0_0_10px_rgba(16,185,129,0.4),inset_0_0_4px_rgba(255,255,255,0.7)] pointer-events-none"
        >
          {/* Orbital Satellite Node B */}
          <span
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-200 shadow-[0_0_6px_#10b981]"
            style={{ transform: 'translateZ(-6px)' }}
          />
        </motion.div>

        {/* Inner High-Speed Precession Ring (Warm Amber Gold) */}
        <motion.div
          animate={{
            rotateZ: [0, 360],
            rotateX: [45, 405],
          }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
          style={{ transformStyle: 'preserve-3d' }}
          className="absolute inset-2 rounded-full border-[1.4px] border-amber-300/80 shadow-[0_0_8px_rgba(245,158,11,0.35)] pointer-events-none"
        />

        {/* Center 3D Prismatic Crystal Core with Volumetric Breathing Light */}
        <motion.div
          animate={{
            scale: [0.92, 1.14, 0.92],
            rotate: [0, 90, 180, 270, 360],
          }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          className="relative w-4 h-4 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-500 to-emerald-400 shadow-[0_0_16px_rgba(37,99,235,0.85),inset_0_1.5px_2px_rgba(255,255,255,0.95)] flex items-center justify-center"
        >
          {/* Prismatic Specular Glint */}
          <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#fff]" />
        </motion.div>
      </div>
    </div>
  );
}
