"use client";

import React, { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ParticleFieldProps {
  count: number;
}

function ParticleField({ count }: ParticleFieldProps) {
  const meshRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const timeRef = useRef(0);
  const frameCount = useRef(0);

  // Generate random positions for particles
  const { positions, velocities, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const cyanColor = new THREE.Color("#00e5ff");
    const purpleColor = new THREE.Color("#b388ff");

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // Spread particles in a large volume
      positions[i3] = (Math.random() - 0.5) * 20;
      positions[i3 + 1] = (Math.random() - 0.5) * 20;
      positions[i3 + 2] = (Math.random() - 0.5) * 10;

      // Random slow velocities
      velocities[i3] = (Math.random() - 0.5) * 0.002;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.002;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.001;

      // Interpolate between cyan and purple
      const t = Math.random();
      const color = cyanColor.clone().lerp(purpleColor, t);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }
    return { positions, velocities, colors };
  }, [count]);

  // Line connections buffer — pre-allocate for max possible connections
  const maxLines = count * 3; // max connections per frame
  const linePositions = useMemo(() => new Float32Array(maxLines * 6), [maxLines]);
  const lineColors = useMemo(() => new Float32Array(maxLines * 6), [maxLines]);

  const lineGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    geom.setAttribute("color", new THREE.BufferAttribute(lineColors, 3));
    return geom;
  }, [linePositions, lineColors]);

  // Clean up WebGL geometry resources on unmount
  useEffect(() => {
    return () => {
      lineGeometry.dispose();
    };
  }, [lineGeometry]);


  // Cap at ~45fps by skipping frames and apply mouse parallax
  useFrame((state, delta) => {
    frameCount.current++;
    // Skip every other frame to maintain ~45fps cap
    if (frameCount.current % 2 !== 0) return;

    timeRef.current += delta;

    if (!meshRef.current) return;
    
    // Smooth Mouse Parallax Rotation
    const targetX = state.pointer.x * 0.35;
    const targetY = state.pointer.y * 0.35;
    meshRef.current.rotation.y += (targetX - meshRef.current.rotation.y) * 0.06;
    meshRef.current.rotation.x += (targetY - meshRef.current.rotation.x) * 0.06;
    
    if (linesRef.current) {
      linesRef.current.rotation.y = meshRef.current.rotation.y;
      linesRef.current.rotation.x = meshRef.current.rotation.x;
    }

    const posArray = meshRef.current.geometry.attributes.position
      .array as Float32Array;

    // Animate particles with sine waves for subtle floating
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      posArray[i3] +=
        velocities[i3] + Math.sin(timeRef.current * 0.5 + i * 0.1) * 0.001;
      posArray[i3 + 1] +=
        velocities[i3 + 1] + Math.cos(timeRef.current * 0.3 + i * 0.15) * 0.001;
      posArray[i3 + 2] +=
        velocities[i3 + 2] + Math.sin(timeRef.current * 0.2 + i * 0.05) * 0.0005;

      // Wrap around boundaries
      if (posArray[i3] > 10) posArray[i3] = -10;
      if (posArray[i3] < -10) posArray[i3] = 10;
      if (posArray[i3 + 1] > 10) posArray[i3 + 1] = -10;
      if (posArray[i3 + 1] < -10) posArray[i3 + 1] = 10;
      if (posArray[i3 + 2] > 5) posArray[i3 + 2] = -5;
      if (posArray[i3 + 2] < -5) posArray[i3 + 2] = 5;
    }

    meshRef.current.geometry.attributes.position.needsUpdate = true;

    // Build proximity connections
    let lineIndex = 0;
    const connectionDistance = 2.5;
    const cyanLine = new THREE.Color("#00e5ff");

    for (let i = 0; i < count && lineIndex < maxLines; i++) {
      const i3 = i * 3;
      for (let j = i + 1; j < count && lineIndex < maxLines; j++) {
        const j3 = j * 3;
        const dx = posArray[i3] - posArray[j3];
        const dy = posArray[i3 + 1] - posArray[j3 + 1];
        const dz = posArray[i3 + 2] - posArray[j3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < connectionDistance) {
          const li = lineIndex * 6;
          linePositions[li] = posArray[i3];
          linePositions[li + 1] = posArray[i3 + 1];
          linePositions[li + 2] = posArray[i3 + 2];
          linePositions[li + 3] = posArray[j3];
          linePositions[li + 4] = posArray[j3 + 1];
          linePositions[li + 5] = posArray[j3 + 2];

          const alpha = 1 - dist / connectionDistance;
          lineColors[li] = cyanLine.r * alpha;
          lineColors[li + 1] = cyanLine.g * alpha;
          lineColors[li + 2] = cyanLine.b * alpha;
          lineColors[li + 3] = cyanLine.r * alpha;
          lineColors[li + 4] = cyanLine.g * alpha;
          lineColors[li + 5] = cyanLine.b * alpha;

          lineIndex++;
        }
      }
    }

    // Clear remaining line positions
    for (let i = lineIndex * 6; i < linePositions.length; i++) {
      linePositions[i] = 0;
    }

    if (linesRef.current) {
      linesRef.current.geometry.attributes.position.needsUpdate = true;
      linesRef.current.geometry.attributes.color.needsUpdate = true;
      linesRef.current.geometry.setDrawRange(0, lineIndex * 2);
    }
  });

  return (
    <>
      <points ref={meshRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={count}
            array={colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.04}
          vertexColors
          transparent
          opacity={0.8}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
      <lineSegments ref={linesRef} geometry={lineGeometry}>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.15}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
    </>
  );
}

export default function NeuralMesh() {
  const [nodeCount, setNodeCount] = useState(800);

  useEffect(() => {
    // Battery-aware: reduce particles in low-performance mode
    async function checkBattery() {
      try {
        // navigator.getBattery is not available in all browsers
        const nav = navigator as Navigator & {
          getBattery?: () => Promise<{ charging: boolean; level: number }>;
        };
        if (nav.getBattery) {
          const battery = await nav.getBattery();
          if (!battery.charging && battery.level < 0.3) {
            setNodeCount(400);
          }
        }
      } catch {
        // getBattery not supported — use default count
      }
    }
    checkBattery();
  }, []);

  return (
    <div className="neural-mesh-container" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: "low-power",
        }}
        style={{ background: "transparent" }}
      >
        <ParticleField count={nodeCount} />
      </Canvas>
    </div>
  );
}
