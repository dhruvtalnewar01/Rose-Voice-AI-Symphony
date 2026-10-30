'use client';

import React, { useRef, useState, useEffect, Component, ErrorInfo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

// Fallback high-performance CSS 3D ambient background if WebGL has issues
function CSS3DAmbientFallback() {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden z-0">
      <div className="absolute top-[10%] left-[8%] w-72 h-72 rounded-full bg-blue-400/10 blur-[80px] animate-pulse" />
      <div
        className="absolute top-[40%] right-[10%] w-80 h-80 rounded-full bg-amber-400/10 blur-[90px] animate-pulse"
        style={{ animationDelay: '2s' }}
      />
      <div
        className="absolute bottom-[15%] left-[25%] w-96 h-96 rounded-full bg-emerald-400/10 blur-[100px] animate-pulse"
        style={{ animationDelay: '4s' }}
      />
    </div>
  );
}

// React Error Boundary to catch any WebGL context loss cleanly without crashing Next.js
class WebGLErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('ThreeBackground WebGL gracefully degraded to CSS3D fallback:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return <CSS3DAmbientFallback />;
    }
    return this.props.children;
  }
}

function FloatingStandardObjects() {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const torusRef = useRef<THREE.Mesh>(null);
  const sphereRef1 = useRef<THREE.Mesh>(null);
  const sphereRef2 = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = performance.now() * 0.0008;
    if (groupRef.current) {
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        state.pointer.y * 0.15,
        0.04
      );
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        state.pointer.x * 0.15,
        0.04
      );
    }

    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.25;
      ringRef.current.rotation.x = t * 0.18;
    }
    if (torusRef.current) {
      torusRef.current.rotation.y = -t * 0.2;
      torusRef.current.rotation.z = t * 0.12;
    }
  });

  return (
    <group ref={groupRef}>
      {/* 1. Large Translucent Optical Ring */}
      <Float speed={1.2} rotationIntensity={0.3} floatIntensity={0.5}>
        <mesh ref={ringRef} position={[-2.4, 1.2, -1]}>
          <torusGeometry args={[1.5, 0.1, 24, 48]} />
          <meshStandardMaterial
            color="#2563EB"
            roughness={0.2}
            metalness={0.1}
            transparent
            opacity={0.35}
          />
        </mesh>
      </Float>

      {/* 2. Optical Glass Sphere (Warm Amber Highlight) */}
      <Float speed={1.5} rotationIntensity={0.4} floatIntensity={0.6}>
        <mesh ref={sphereRef1} position={[3.0, 1.6, -1.8]}>
          <sphereGeometry args={[1.0, 32, 32]} />
          <meshStandardMaterial
            color="#EA580C"
            roughness={0.15}
            metalness={0.05}
            transparent
            opacity={0.3}
          />
        </mesh>
      </Float>

      {/* 3. Emerald Floating Lens */}
      <Float speed={1.4} rotationIntensity={0.4} floatIntensity={0.5}>
        <mesh ref={torusRef} position={[2.4, -1.4, -1.2]}>
          <torusGeometry args={[1.1, 0.15, 20, 36]} />
          <meshStandardMaterial
            color="#059669"
            roughness={0.2}
            metalness={0.15}
            transparent
            opacity={0.3}
          />
        </mesh>
      </Float>

      {/* 4. Small Translucent Orbiting Bead */}
      <Float speed={1.8} rotationIntensity={0.2} floatIntensity={0.7}>
        <mesh ref={sphereRef2} position={[-2.6, -1.6, -1.6]}>
          <sphereGeometry args={[0.6, 24, 24]} />
          <meshStandardMaterial
            color="#0F172A"
            roughness={0.1}
            metalness={0.1}
            transparent
            opacity={0.22}
          />
        </mesh>
      </Float>
    </group>
  );
}

export default function ThreeBackground() {
  const [mounted, setMounted] = useState(false);
  const [webGLSupported, setWebGLSupported] = useState(true);

  useEffect(() => {
    setMounted(true);
    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebGLSupported(false);
      }
    } catch {
      setWebGLSupported(false);
    }
  }, []);

  if (!mounted) {
    return null;
  }

  if (!webGLSupported) {
    return <CSS3DAmbientFallback />;
  }

  return (
    <WebGLErrorBoundary>
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          dpr={[1, 1.25]}
          gl={{
            alpha: true,
            antialias: false,
            powerPreference: 'low-power',
            failIfMajorPerformanceCaveat: false,
          }}
          className="w-full h-full"
        >
          <ambientLight intensity={1.4} />
          <directionalLight position={[8, 8, 4]} intensity={1.5} color="#ffffff" />
          <pointLight position={[-8, -8, -4]} intensity={0.7} color="#2563EB" />
          <pointLight position={[8, -4, 2]} intensity={0.7} color="#EA580C" />
          <FloatingStandardObjects />
        </Canvas>
      </div>
    </WebGLErrorBoundary>
  );
}
