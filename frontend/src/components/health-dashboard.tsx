"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Database,
  GitBranch,
  Cpu,
  Box,
  Sparkles,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { fetchHealth, type HealthResponse } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ServiceInfo {
  key: string;
  label: string;
  icon: React.ReactNode;
}

const SERVICES: ServiceInfo[] = [
  { key: "qdrant", label: "Qdrant", icon: <Database className="h-5 w-5" /> },
  { key: "neo4j", label: "Neo4j", icon: <GitBranch className="h-5 w-5" /> },
  { key: "ollama", label: "Ollama", icon: <Cpu className="h-5 w-5" /> },
  {
    key: "embed_model",
    label: "Embed Model",
    icon: <Box className="h-5 w-5" />,
  },
  {
    key: "gen_model",
    label: "Gen Model",
    icon: <Sparkles className="h-5 w-5" />,
  },
];

export default function HealthDashboard() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHealth = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchHealth();
      setHealth(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch health";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHealth();

    // Poll every 30 seconds
    const interval = setInterval(() => {
      loadHealth();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadHealth]);

  const handleRetry = () => {
    setLoading(true);
    loadHealth();
  };

  const allHealthy = health?.status === "healthy";

  if (error && !health) {
    return (
      <Card className="glass-card border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.05)]">
        <CardContent className="flex flex-col items-center justify-center py-10 gap-4">
          <AlertCircle className="h-12 w-12 text-red-500 animate-bounce" />
          <p className="text-muted-foreground text-center font-medium">{error}</p>
          <Button variant="outline" onClick={handleRetry} className="gap-2 border-red-500/30 hover:bg-red-500/10 hover:text-white">
            <RefreshCw className="h-4 w-4" />
            Retry Connection
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl font-bold text-foreground font-display tracking-wide">
            System Node Status
          </h2>
          {health && (
            <div
              className={cn(
                "h-2 w-2 rounded-full shadow-[0_0_8px_#00e5ff] transition-all duration-300",
                allHealthy ? "bg-emerald-400 animate-pulse" : "bg-yellow-400"
              )}
            />
          )}
        </div>
        {health && (
          <Badge
            className={cn(
              "font-semibold capitalize tracking-wide select-none transition-all duration-300",
              allHealthy
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(52,211,153,0.15)]"
                : "bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
            )}
          >
            {health.status}
          </Badge>
        )}
      </div>

      <div className="relative w-full">
        {/* Topology connecting path line */}
        <div className="absolute top-1/2 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-neural-cyan/15 via-neural-purple/15 to-transparent -translate-y-1/2 -z-10 hidden lg:block" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {SERVICES.map((service, index) => {
            if (loading) {
              return (
                <Card key={service.key} className="glass-premium border-white/5 pb-2">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-20 bg-white/5" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-6 w-16 bg-white/5" />
                  </CardContent>
                </Card>
              );
            }

            const status =
              health?.services[
                service.key as keyof HealthResponse["services"]
              ];
            const isHealthy = status === true || status === "connected" || status === "available";
            const statusText =
              status === true || status === "connected"
                ? "online"
                : status === "available"
                ? "available"
                : status === "unavailable"
                ? "unavailable"
                : "offline";

            return (
              <motion.div
                key={service.key}
                initial={{ opacity: 0, y: 25, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  delay: index * 0.12,
                  duration: 0.55,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <Card
                  className={cn(
                    "glass-premium relative overflow-hidden transition-all duration-300 group",
                    isHealthy
                      ? "hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-[0_4px_20px_rgba(52,211,153,0.1)] border-white/5"
                      : "border-red-500/20 hover:border-red-500/40 hover:shadow-[0_4px_20px_rgba(239,68,68,0.1)]"
                  )}
                >
                  {/* Subtle inner background shimmer if healthy */}
                  {isHealthy && (
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/[0.02] to-emerald-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  )}

                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                      <span className={cn("transition-colors duration-300", isHealthy ? "text-neural-cyan group-hover:text-emerald-400" : "text-red-400")}>
                        {service.icon}
                      </span>
                      {service.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="flex items-center gap-2">
                      {isHealthy ? (
                        // Tiny animated rotating SVG ring indicator
                        <svg className="h-4 w-4 text-emerald-400 animate-spin-slow" viewBox="0 0 20 20">
                          <circle
                            cx="10"
                            cy="10"
                            r="7"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeDasharray="25 8"
                            className="opacity-90"
                          />
                        </svg>
                      ) : (
                        <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" />
                      )}
                      <span
                        className={cn(
                          "text-xs font-semibold uppercase tracking-wider select-none",
                          isHealthy ? "text-emerald-400" : "text-red-400"
                        )}
                      >
                        {statusText}
                      </span>
                    </div>
                  </CardContent>

                  {/* Gradient shadow overlay */}
                  <div
                    className={cn(
                      "absolute inset-0 rounded-xl opacity-5 pointer-events-none transition-opacity duration-300 group-hover:opacity-10",
                      isHealthy
                        ? "bg-gradient-to-br from-emerald-400 to-transparent"
                        : "bg-gradient-to-br from-red-500 to-transparent"
                    )}
                  />
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {error && health && (
        <div className="mt-4 flex items-center gap-2 text-sm text-yellow-500 font-medium">
          <AlertCircle className="h-4 w-4" />
          <span>Last refresh failed. Displaying cached diagnostics.</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRetry}
            className="gap-1 h-7 px-2 hover:bg-white/5 text-yellow-500 hover:text-yellow-400"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
        </div>
      )}
    </div>
  );
}
