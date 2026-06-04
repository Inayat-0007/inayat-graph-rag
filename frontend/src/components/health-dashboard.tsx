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

  if (error && !health) {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-10 gap-4">
          <AlertCircle className="h-12 w-12 text-red-400" />
          <p className="text-muted-foreground text-center">{error}</p>
          <Button variant="outline" onClick={handleRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">
          System Health
        </h2>
        {health && (
          <Badge
            variant={health.status === "healthy" ? "success" : "destructive"}
          >
            {health.status}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {SERVICES.map((service, index) => {
          if (loading) {
            return (
              <Card key={service.key} className="glass-card">
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
            >
              <Card
                className={cn(
                  "glass-card glass-hover relative overflow-hidden",
                  isHealthy && "animate-pulse-glow"
                )}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    {service.icon}
                    {service.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        isHealthy ? "bg-emerald-400" : "bg-red-400",
                        isHealthy && "animate-pulse"
                      )}
                    />
                    <span
                      className={cn(
                        "text-sm font-medium capitalize",
                        isHealthy ? "text-emerald-400" : "text-red-400"
                      )}
                    >
                      {statusText}
                    </span>
                  </div>
                </CardContent>
                {/* Subtle glow effect */}
                {isHealthy && (
                  <div className="absolute inset-0 rounded-xl opacity-10 bg-gradient-to-br from-emerald-400 to-transparent pointer-events-none" />
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>

      {error && health && (
        <div className="mt-4 flex items-center gap-2 text-sm text-yellow-400">
          <AlertCircle className="h-4 w-4" />
          <span>Last refresh failed. Showing stale data.</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRetry}
            className="gap-1 h-7 px-2"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
