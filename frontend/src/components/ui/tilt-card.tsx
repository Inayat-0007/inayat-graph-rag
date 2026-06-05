"use client";

import React, { useState, useRef, MouseEvent } from "react";
import { cn } from "@/lib/utils";

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string; // e.g. "rgba(0, 229, 255, 0.12)"
}

export default function TiltCard({ children, className, glowColor = "rgba(0, 229, 255, 0.12)" }: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Mouse coordinates relative to card center
    const x = e.clientX - rect.left - width / 2;
    const y = e.clientY - rect.top - height / 2;

    // Pitch (rotateX) and Yaw (rotateY) values
    // Max tilt is 6 degrees
    const rX = -(y / (height / 2)) * 6;
    const rY = (x / (width / 2)) * 6;

    setRotateX(rX);
    setRotateY(rY);
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  const cardStyle: React.CSSProperties = {
    transform: isHovered 
      ? `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.015, 1.015, 1.015)`
      : "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
    transition: isHovered ? "transform 0.08s ease-out" : "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
  };

  const glowStyle: React.CSSProperties = {
    background: `radial-gradient(circle 120px at ${mousePosition.x}px ${mousePosition.y}px, ${glowColor}, transparent)`,
    opacity: isHovered ? 1 : 0,
    transition: "opacity 0.4s ease-out",
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={cardStyle}
      className={cn(
        "relative overflow-hidden transition-all duration-500 rounded-2xl border border-white/5 bg-white/[0.02] glass-premium",
        isHovered && "border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-shimmer-active",
        className
      )}
    >
      {/* Dynamic cursor tracking reflection/glow effect */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={glowStyle}
      />
      <div className="relative z-20 h-full w-full">
        {children}
      </div>
    </div>
  );
}
