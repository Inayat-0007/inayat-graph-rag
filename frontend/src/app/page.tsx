"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import Link from "next/link";
import { FileUp, MessageSquare, Brain, Sparkles, ArrowRight } from "lucide-react";
import HealthDashboard from "@/components/health-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TiltCard from "@/components/ui/tilt-card";

// Dynamically import NeuralMesh to avoid SSR issues with Three.js
const NeuralMesh = dynamic(() => import("@/components/neural-mesh"), {
  ssr: false,
  loading: () => null,
});

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

const letterContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03, delayChildren: 0.4 },
  },
};

const letterVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

export default function HomePage() {
  const subtitleWords = [
    { text: "I", full: "ntelligent" },
    { text: "N", full: "eural" },
    { text: "A", full: "rchitecture" },
    { text: "Y", full: "ielding" },
    { text: "A", full: "gentic" },
    { text: "T", full: "hinking" },
  ];

  return (
    <>
      {/* Three.js Neural Mesh Background */}
      <Suspense fallback={null}>
        <NeuralMesh />
      </Suspense>

      {/* Main Content */}
      <main className="relative z-10 min-h-screen pt-20 md:pt-24 pb-24 md:pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-12"
        >
          {/* Hero Section */}
          <motion.section
            variants={itemVariants}
            className="flex flex-col items-center text-center gap-6 py-8 md:py-16 relative"
          >
            {/* Ambient Radial Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] md:w-[600px] h-[350px] md:h-[600px] bg-neural-cyan/5 rounded-full blur-[80px] pointer-events-none -z-10" />

            {/* Orbiting particles around logo */}
            <div className="relative mb-2">
              {/* Pulse Ring Behind Logo */}
              <div className="absolute inset-0 rounded-full bg-neural-cyan/10 blur-xl animate-pulse-glow" style={{ transform: "scale(1.5)" }} />

              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 p-4 bg-neural-darker/60 backdrop-blur-xl border border-neural-cyan/20 rounded-full shadow-[0_0_30px_rgba(0,229,255,0.15)] hover:shadow-[0_0_50px_rgba(0,229,255,0.3)] transition-all duration-500"
              >
                <Brain className="h-14 w-14 md:h-18 md:w-18 text-neural-cyan animate-float" />
              </motion.div>

              {/* Orbital Particles */}
              <div className="absolute inset-0 pointer-events-none -z-10 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-neural-cyan absolute animate-orbit shadow-[0_0_8px_#00e5ff]" style={{ animationDelay: "0s" }} />
                <div className="w-2 h-2 rounded-full bg-neural-purple absolute animate-orbit shadow-[0_0_8px_#b388ff]" style={{ animationDelay: "2s", animationDuration: "8s" }} />
                <div className="w-1 h-1 rounded-full bg-white absolute animate-orbit shadow-[0_0_6px_#fff]" style={{ animationDelay: "4s", animationDuration: "5s" }} />
              </div>
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-8xl font-extrabold tracking-tighter font-display relative">
              <span className="text-shimmer-display text-glow select-none">
                I.N.A.Y.A.T.
              </span>
            </h1>

            {/* Letter-staggered subtitle */}
            <motion.div
              variants={letterContainerVariants}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed flex flex-wrap justify-center gap-x-2"
            >
              {subtitleWords.map((word, idx) => (
                <motion.span key={idx} variants={letterVariants} className="inline-block">
                  <span className="text-neural-cyan font-bold shadow-glow-sm">{word.text}</span>
                  <span className="text-foreground/90 font-medium">{word.full}</span>
                </motion.span>
              ))}
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="text-sm text-muted-foreground/80 max-w-lg mt-1"
            >
              A local-first, low-footprint Knowledge Intelligence System combining vector similarity matching with deep Neo4j relation subgraphs.
            </motion.p>
          </motion.section>

          {/* Health Dashboard - Scroll Reveal */}
          <motion.section
            initial={{ opacity: 0, y: 35, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          >
            <HealthDashboard />
          </motion.section>

          {/* Quick Actions - Scroll Reveal */}
          <motion.section
            initial={{ opacity: 0, y: 35, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="flex flex-col gap-6"
          >
            <h2 className="text-2xl font-bold tracking-tight text-foreground font-display flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-neural-cyan animate-pulse-glow" />
              Agent Workspaces
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Upload Documents Card */}
              <Link href="/documents" className="block h-full group">
                <TiltCard className="gradient-border p-6 h-full flex flex-col justify-between" glowColor="rgba(0, 229, 255, 0.15)">
                  <div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 rounded-xl bg-neural-cyan/10 text-neural-cyan group-hover:bg-neural-cyan/20 group-hover:scale-110 transition-all duration-350 shadow-inner">
                        <FileUp className="h-6 w-6 group-hover:animate-float" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground font-display group-hover:text-neural-cyan transition-colors duration-300">
                        Document Vault
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Feed PDFs, DOCX, or text files into the neural index. Files are parsed, chunked, embedded via Nomic-Embed-Text on CPU, and cataloged.
                    </p>
                  </div>
                  <div className="mt-4 pt-2 flex flex-wrap gap-1.5 items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 border border-white/10 text-muted-foreground group-hover:border-neural-cyan/30 group-hover:text-neural-cyan transition-all">PDF • DOCX • TXT</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 border border-white/10 text-muted-foreground group-hover:border-neural-cyan/30 group-hover:text-neural-cyan transition-all">Hybrid Vector DB</span>
                    </div>
                    <ArrowRight className="h-5 w-5 text-neural-cyan opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                  </div>
                </TiltCard>
              </Link>

              {/* Ask a Question Card */}
              <Link href="/ask" className="block h-full group">
                <TiltCard className="gradient-border p-6 h-full flex flex-col justify-between" glowColor="rgba(179, 136, 255, 0.15)">
                  <div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 rounded-xl bg-neural-purple/10 text-neural-purple group-hover:bg-neural-purple/20 group-hover:scale-110 transition-all duration-350 shadow-inner">
                        <MessageSquare className="h-6 w-6 group-hover:animate-float" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground font-display group-hover:text-neural-purple transition-colors duration-300">
                        Inquiry Terminal
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Engage with the hybrid search engine. Ask queries and receive real-time answers backed by document chunks and Neo4j subgraphs.
                    </p>
                  </div>
                  <div className="mt-4 pt-2 flex flex-wrap gap-1.5 items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 border border-white/10 text-muted-foreground group-hover:border-neural-purple/30 group-hover:text-neural-purple transition-all">Streaming SSE</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 border border-white/10 text-muted-foreground group-hover:border-neural-purple/30 group-hover:text-neural-purple transition-all">Entity Relations</span>
                    </div>
                    <ArrowRight className="h-5 w-5 text-neural-purple opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                  </div>
                </TiltCard>
              </Link>
            </div>
          </motion.section>

          {/* Glowing Separator Line */}
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-neural-cyan/20 to-transparent mt-4 mb-2" />

          {/* Footer Info */}
          <motion.footer
            variants={itemVariants}
            className="text-center pb-8"
          >
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors duration-300">
              <Sparkles className="h-3.5 w-3.5 text-neural-cyan animate-pulse-glow" />
              <span>
                Engineered for MSI Thin series • Ollama local execution • Qdrant dense+sparse index • Neo4j graph schemas
              </span>
            </div>
          </motion.footer>
        </motion.div>
      </main>
    </>
  );
}
