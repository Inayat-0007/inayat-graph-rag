"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ConfidenceGaugeProps {
  value: number; // 0 to 100
}

export default function ConfidenceGauge({ value }: ConfidenceGaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const clamped = Math.max(0, Math.min(100, value));
    const timer = setTimeout(() => {
      setAnimatedValue(clamped);
    }, 100);
    return () => clearTimeout(timer);
  }, [value]);

  // SVG parameters
  const strokeWidth = 6;
  const normalizedRadius = 40;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (animatedValue / 100) * circumference;

  // Get color based on confidence level
  const getColor = (val: number) => {
    if (val >= 70) return "stroke-emerald-400";
    if (val >= 40) return "stroke-amber-400";
    return "stroke-rose-400";
  };

  const getBgColor = (val: number) => {
    if (val >= 70) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (val >= 40) return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    return "bg-rose-500/10 text-rose-400 border-rose-500/20";
  };

  const getShadowStyle = (val: number) => {
    if (val >= 70) return "shadow-[0_0_20px_rgba(52,211,153,0.15)] hover:border-emerald-500/30";
    if (val >= 40) return "shadow-[0_0_20px_rgba(251,191,36,0.15)] hover:border-amber-500/30";
    return "shadow-[0_0_20px_rgba(244,63,94,0.15)] hover:border-rose-500/30";
  };

  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-4 rounded-xl border border-white/5 bg-white/[0.02] glass-premium w-full max-w-[155px] transition-all duration-500 group select-none",
      getShadowStyle(animatedValue)
    )}>
      <span className="text-[9px] text-muted-foreground/60 font-bold uppercase tracking-wider mb-2">
        Confidence
      </span>
      <div className="relative flex items-center justify-center h-24 w-24">
        {/* Glow behind the ring */}
        <div className={cn(
          "absolute inset-3 rounded-full blur-md opacity-25 group-hover:opacity-40 transition-opacity duration-500",
          animatedValue >= 70 ? "bg-emerald-400" : animatedValue >= 40 ? "bg-amber-400" : "bg-rose-400"
        )} />
        
        <svg className="h-24 w-24 transform -rotate-90 relative z-10">
          {/* Background circle */}
          <circle
            className="stroke-white/5"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx="48"
            cy="48"
          />
          {/* Progress circle */}
          <motion.circle
            className={cn(getColor(animatedValue), "gauge-ring")}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference + " " + circumference}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx="48"
            cy="48"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center z-20">
          <span className={cn(
            "text-xl font-bold font-display select-none transition-colors duration-300",
            animatedValue >= 70 ? "text-emerald-400 text-glow" : animatedValue >= 40 ? "text-amber-400" : "text-rose-400"
          )}>
            {animatedValue}%
          </span>
        </div>
      </div>
      <div className={cn(
        "mt-3 px-2.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider select-none",
        getBgColor(animatedValue)
      )}>
        {animatedValue >= 70 ? "High" : animatedValue >= 40 ? "Medium" : "Low"}
      </div>
    </div>
  );
}
