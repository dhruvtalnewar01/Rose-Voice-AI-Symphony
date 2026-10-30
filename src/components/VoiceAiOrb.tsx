'use client';

import React, { useEffect, useRef } from 'react';
import { VoiceStatus } from '@/lib/bolnaVoiceController';

interface VoiceAiOrbProps {
  status: VoiceStatus;
  volume?: number;
  frequencyData?: Uint8Array;
  onClick?: () => void;
  compact?: boolean;
  size?: number;
}

export default function VoiceAiOrb({
  status,
  volume = 0,
  frequencyData,
  onClick,
  compact = false,
  size = 48,
}: VoiceAiOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      time += 0.04;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // React to audio volume
      const dynamicBoost = Math.min(volume * 50, 35);
      const baseRadius = (canvas.width * 0.38) + (dynamicBoost * (canvas.width / 100));

      // Multi-Color state palette
      let primaryColor = 'rgba(37, 99, 235, 0.9)'; // Cobalt Blue default
      let glowColor = 'rgba(37, 99, 235, 0.25)';

      if (status === 'listening') {
        primaryColor = 'rgba(5, 150, 105, 0.95)'; // Emerald Green
        glowColor = 'rgba(5, 150, 105, 0.35)';
      } else if (status === 'thinking') {
        primaryColor = 'rgba(234, 88, 12, 0.95)'; // Warm Amber Coral
        glowColor = 'rgba(234, 88, 12, 0.35)';
      } else if (status === 'speaking') {
        primaryColor = 'rgba(37, 99, 235, 0.98)'; // Active Cobalt Blue
        glowColor = 'rgba(37, 99, 235, 0.45)';
      }

      // Outer Glow
      const outerGrad = ctx.createRadialGradient(cx, cy, baseRadius * 0.5, cx, cy, baseRadius * 1.6);
      outerGrad.addColorStop(0, primaryColor);
      outerGrad.addColorStop(0.6, glowColor);
      outerGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = outerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Liquid Wobble Outer Rim
      const numPoints = 24;
      ctx.beginPath();
      for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const freqOffset = frequencyData ? (frequencyData[i % frequencyData.length] / 255) * 18 : 0;
        const wobble =
          Math.sin(angle * 4 + time * 2) * 4 +
          Math.cos(angle * 3 - time * 1.5) * 3 +
          freqOffset;
        const r = baseRadius + wobble;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Core Pure Glass Shading
      const coreGrad = ctx.createLinearGradient(
        cx - baseRadius,
        cy - baseRadius,
        cx + baseRadius,
        cy + baseRadius
      );
      coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
      coreGrad.addColorStop(0.4, primaryColor);
      coreGrad.addColorStop(1, 'rgba(15, 23, 42, 0.85)');

      ctx.fillStyle = coreGrad;
      ctx.fill();

      // Specular Light Arc
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx - 6, cy - 6, baseRadius * 0.6, -Math.PI * 0.7, -Math.PI * 0.2);
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [status, volume, frequencyData]);

  const statusLabels: Record<VoiceStatus, string> = {
    idle: 'Voice AI Ready',
    connecting: 'Connecting WebRTC...',
    listening: 'Listening to You...',
    thinking: 'Grounding Truth...',
    speaking: 'Speaking Now',
  };

  if (compact) {
    return (
      <div
        onClick={onClick}
        style={{ width: size, height: size }}
        className="relative flex items-center justify-center cursor-pointer select-none"
      >
        <canvas ref={canvasRef} width={size * 2} height={size * 2} className="w-full h-full" />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className="relative flex items-center gap-3 px-4 py-2.5 rounded-full cursor-pointer select-none transition-all duration-300 bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-sm hover:shadow-md hover:scale-102 active:scale-98"
    >
      <div className="relative w-12 h-12 flex items-center justify-center">
        <canvas ref={canvasRef} width={96} height={96} className="w-full h-full" />
      </div>

      <div className="flex flex-col pr-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
            IRA · VOICE AI
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              status === 'speaking'
                ? 'bg-blue-600 animate-ping'
                : status === 'listening'
                ? 'bg-emerald-500 animate-pulse'
                : status === 'thinking'
                ? 'bg-amber-500 animate-bounce'
                : 'bg-slate-400'
            }`}
          />
        </div>
        <span className="text-xs font-medium text-slate-600 font-sans">
          {statusLabels[status]}
        </span>
      </div>
    </div>
  );
}
