'use client';

import React from 'react';
import { TransitionRouter } from 'next-transition-router';

interface SpatialTransitionRouterProps {
  children: React.ReactNode;
}

/**
 * SpatialTransitionRouter integrates next-transition-router with
 * ultra-realistic 3D spatial perspective transitions.
 */
export default function SpatialTransitionRouter({ children }: SpatialTransitionRouterProps) {
  return (
    <TransitionRouter
      auto
      leave={(next) => {
        // 3D Perspective push-back & exit transition
        const mainEl = document.getElementById('main-spatial-container');
        if (mainEl) {
          mainEl.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease-out';
          mainEl.style.transform = 'perspective(1200px) rotateX(8deg) scale(0.94) translateY(-20px)';
          mainEl.style.opacity = '0.4';
        }
        setTimeout(() => {
          next();
        }, 550);
      }}
      enter={(next) => {
        // 3D Unfold & settle transition
        const mainEl = document.getElementById('main-spatial-container');
        if (mainEl) {
          mainEl.style.transition = 'transform 0.7s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s ease-in';
          mainEl.style.transform = 'perspective(1200px) rotateX(0deg) scale(1) translateY(0px)';
          mainEl.style.opacity = '1';
        }
        next?.();
      }}
    >
      <div id="main-spatial-container" className="w-full min-h-screen transition-all duration-500">
        {children}
      </div>
    </TransitionRouter>
  );
}
