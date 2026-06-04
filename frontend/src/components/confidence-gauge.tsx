"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface ConfidenceGaugeProps {
  value: number; // 0 to 100
}

export default function ConfidenceGauge({ value }: ConfidenceGaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    // Clamp between 0 and 100
    const clamped = Math.max(0, Math.min(100, value));
    const timer = setTimeout(() => {
      setAnimatedValue(clamped);
    }, 100);
    return () => clearTimeout(timer);
  }, [value]);

  // SVG parameters
  const radius = 35;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (animatedValue / 100) * circumference;

  // Get color based on confidence level
  const getColor = (val: number) => {
    if (val >= 80) return "text-emerald-500 stroke-emerald-500";
    if (val >= 50) return "text-amber-500 stroke-amber-500";
    return "text-rose-500 stroke-rose-500";
  };

  const getBgColor = (val: number) => {
    if (val >= 80) return "bg-emerald-500/10 text-emerald-400";
    if (val >= 50) return "bg-amber-500/10 text-amber-400";
    return "bg-rose-500/10 text-rose-400";
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-background/20 border border-muted-foreground/10 glass-card w-full max-w-[150px]">
      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">
        Confidence
      </span>
      <div className="relative flex items-center justify-center h-20 w-20">
        <svg className="h-20 w-20 transform -rotate-90">
          {/* Background circle */}
          <circle
            className="stroke-muted/20"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius + stroke}
            cy={radius + stroke}
          />
          {/* Progress circle */}
          <motion.circle
            className={`transition-all duration-1000 ease-out ${getColor(animatedValue)}`}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + " " + circumference}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius + stroke}
            cy={radius + stroke}
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-foreground">{animatedValue}%</span>
        </div>
      </div>
      <div className={`mt-3 px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${getBgColor(animatedValue)}`}>
        {animatedValue >= 80 ? "High" : animatedValue >= 50 ? "Medium" : "Low"}
      </div>
    </div>
  );
}
