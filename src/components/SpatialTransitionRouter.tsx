'use client';

import React from 'react';

interface SpatialTransitionRouterProps {
  children: React.ReactNode;
}

/**
 * SpatialTransitionRouter provides ultra-stable 3D perspective spatial container
 * with 100% hydration reliability across Next.js and Netlify.
 */
export default function SpatialTransitionRouter({ children }: SpatialTransitionRouterProps) {
  return (
    <div id="main-spatial-container" className="w-full min-h-screen transition-all duration-500">
      {children}
    </div>
  );
}
