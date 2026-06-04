"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import Link from "next/link";
import { FileUp, MessageSquare, Brain, Sparkles } from "lucide-react";
import HealthDashboard from "@/components/health-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export default function HomePage() {
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
            className="flex flex-col items-center text-center gap-6 py-8 md:py-16"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex items-center gap-3 mb-2"
            >
              <Brain className="h-12 w-12 md:h-16 md:w-16 text-neural-cyan animate-float" />
            </motion.div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight">
              <span className="text-gradient">I.N.A.Y.A.T.</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              <span className="text-foreground font-medium">I</span>ntelligent{" "}
              <span className="text-foreground font-medium">N</span>eural{" "}
              <span className="text-foreground font-medium">A</span>rchitecture
              for{" "}
              <span className="text-foreground font-medium">Y</span>ielding{" "}
              <span className="text-foreground font-medium">A</span>gentic{" "}
              <span className="text-foreground font-medium">T</span>hinking
            </p>

            <p className="text-sm text-muted-foreground max-w-lg">
              A fully local AI Knowledge Intelligence System with Graph RAG,
              hybrid semantic search, and persistent memory.
            </p>
          </motion.section>

          {/* Health Dashboard */}
          <motion.section variants={itemVariants}>
            <HealthDashboard />
          </motion.section>

          {/* Quick Action Cards */}
          <motion.section variants={itemVariants}>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Upload Documents Card */}
              <Link href="/documents" className="block">
                <Card className="glass-card glass-hover group cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-foreground">
                      <div className="p-2 rounded-lg bg-neural-cyan/10 text-neural-cyan group-hover:bg-neural-cyan/20 transition-colors">
                        <FileUp className="h-6 w-6" />
                      </div>
                      Upload Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Upload PDF, DOCX, or TXT files to build your knowledge
                      base. Documents are chunked, embedded, and indexed
                      automatically.
                    </p>
                  </CardContent>
                </Card>
              </Link>

              {/* Ask a Question Card */}
              <Link href="/ask" className="block">
                <Card className="glass-card glass-hover group cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-foreground">
                      <div className="p-2 rounded-lg bg-neural-purple/10 text-neural-purple group-hover:bg-neural-purple/20 transition-colors">
                        <MessageSquare className="h-6 w-6" />
                      </div>
                      Ask a Question
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Query your knowledge base with natural language. Get
                      streaming answers with citations and knowledge graph
                      visualization.
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </motion.section>

          {/* Footer Info */}
          <motion.footer
            variants={itemVariants}
            className="text-center pb-8"
          >
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              <span>
                Powered by Qwen3:4b • Nomic Embed • Neo4j • Qdrant
              </span>
            </div>
          </motion.footer>
        </motion.div>
      </main>
    </>
  );
}
