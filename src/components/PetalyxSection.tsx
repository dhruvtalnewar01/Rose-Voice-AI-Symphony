'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, ExternalLink, ShieldCheck, Zap, Activity } from 'lucide-react';

export default function PetalyxSection() {
  const [activePanel, setActivePanel] = useState<number>(1);

  const panels = [
    {
      num: 1,
      title: 'Ticket comes in',
      description: "A shopper files a return claim with purchase details, why it's going back, and any proof they can share.",
      color: 'text-[#4d6a10]',
      bgColor: 'bg-[#e7efcf]',
      badge: 'Step 1: Automated Ingestion',
    },
    {
      num: 2,
      title: 'Review record',
      description: 'Your agent scans the buyer profile, earlier purchases, prior returns, and any notable account events.',
      color: 'text-[#6f9a0c]',
      bgColor: 'bg-[#d8e8b2]',
      badge: 'Step 2: Deep Grounding',
    },
    {
      num: 3,
      title: 'Apply the rules',
      description: 'Your agent measures the claim against return terms, qualifying conditions, time limits, and edge cases.',
      color: 'text-[#4d6a10]',
      bgColor: 'bg-[#b4cd52]/30',
      badge: 'Step 3: Deterministic Gate',
    },
  ];

  return (
    <section id="petalyx" className="relative w-full py-20 px-4 md:px-8 max-w-7xl mx-auto flex flex-col gap-12 bg-white">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-200/80">
        <div className="flex flex-col gap-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e7efcf] text-[#2c3a10] text-xs font-mono font-semibold uppercase tracking-wider w-fit">
            <Sparkles className="w-3.5 h-3.5 text-[#4d6a10]" />
            <span>AI Staff Benchmarking & Telephony Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-ink-primary font-sans leading-tight">
            Petalyx Engine: Measure & Automate AI Agents
          </h2>
          <p className="text-base text-slate-600 font-sans">
            Autonomous decision engine powering Sparsh Drishti&apos;s human-in-the-loop escalation.
            80,000+ flows finished on autopilot with sub-300ms verification.
          </p>
        </div>

        <a
          href="/petalyx.html"
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-3 rounded-2xl bg-[#4d6a10] hover:bg-[#3d540d] text-[#f3f8e4] text-xs font-semibold shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <span>Open Full Standalone Experience</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* 4 Interactive Ticket Cards (Stats) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Staff Time Freed', value: '40%', sub: 'Saved per user session' },
          { label: 'Verified Queries', value: '300k+', sub: 'Zero-hallucination calls' },
          { label: 'Task Success Rate', value: '99.2%', sub: 'Verified across clinical data' },
          { label: 'Output Reliability', value: '99.2%', sub: 'Deterministic schema gate' },
        ].map((card, idx) => (
          <motion.div
            key={idx}
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="p-6 rounded-3xl bg-[#e7efcf]/40 border border-[#b4cd52]/40 shadow-sm flex flex-col justify-between h-40 cursor-default"
          >
            <span className="text-xs font-mono font-semibold text-[#2c3a10] uppercase tracking-wider">
              {card.label}
            </span>
            <div className="flex flex-col">
              <span className="text-4xl font-extrabold text-[#151a08] tracking-tight font-mono">
                {card.value}
              </span>
              <span className="text-[11px] text-slate-500 font-sans mt-0.5">{card.sub}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Human-In-The-Loop Interactive Accordion */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-mono uppercase tracking-wider text-[#4d6a10] font-bold">
            Human-in-the-Loop Protocol
          </span>
          <h3 className="text-2xl font-bold text-slate-900 font-sans">
            Humans take over only at the critical crunch.
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          {panels.map((p) => {
            const isActive = activePanel === p.num;
            return (
              <div
                key={p.num}
                onClick={() => setActivePanel(p.num)}
                onMouseEnter={() => setActivePanel(p.num)}
                className={`p-6 rounded-3xl border transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[220px] ${
                  isActive
                    ? 'bg-white border-[#4d6a10] shadow-glass-hover scale-[1.02]'
                    : 'bg-slate-50 border-slate-200/80 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-6xl font-black font-mono leading-none ${p.color}`}>
                    0{p.num}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-700">
                    {p.badge}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 mt-4">
                  <h4 className="text-lg font-bold text-slate-900 font-sans">{p.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-sans">{p.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Integration Logos Strip */}
      <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-around gap-6 text-slate-700 font-mono text-sm font-bold">
        <span className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-amber-500" />
          <span>Bolna Voice AI</span>
        </span>
        <span>OpenAI GPT-4o</span>
        <span>Deepgram Nova-2</span>
        <span>OpenFDA Registry</span>
        <span>NIH RxNorm</span>
      </div>
    </section>
  );
}
