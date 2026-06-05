"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, File, FileUp, CheckCircle2, AlertCircle, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadDocument, UploadResponse } from "@/lib/api";

interface UploadZoneProps {
  onUploadSuccess?: (data: UploadResponse) => void;
}

const UPLOAD_STEPS = [
  "Extracting Document Text",
  "Computing Neural Vector Embeddings",
  "Constructing Knowledge Graph Schema",
];

export default function UploadZone({ onUploadSuccess }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [progress, setProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Simulated progress ticker during ingestion
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === "uploading") {
      setProgress(5);
      setActiveStep(0);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 96) {
            clearInterval(interval);
            return prev;
          }
          const increment = Math.floor(Math.random() * 8) + 2;
          const next = prev + increment;
          
          if (next < 35) {
            setActiveStep(0);
          } else if (next < 75) {
            setActiveStep(1);
          } else {
            setActiveStep(2);
          }
          return Math.min(next, 96);
        });
      }, 350);
    }
    return () => clearInterval(interval);
  }, [status]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    const allowedExtensions = [".pdf", ".docx", ".txt"];
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      setStatus("error");
      setErrorMsg(`Unsupported file type "${fileExtension}". Only PDF, DOCX, and TXT files are accepted.`);
      return;
    }

    setStatus("uploading");
    setErrorMsg("");
    try {
      const data = await uploadDocument(file);
      setProgress(100);
      setActiveStep(2);
      
      // Delay success display briefly so the 100% completion renders
      setTimeout(() => {
        setResult(data);
        setStatus("success");
        if (onUploadSuccess) {
          onUploadSuccess(data);
        }
      }, 600);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Something went wrong during upload");
      setStatus("error");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  const reset = () => {
    setStatus("idle");
    setErrorMsg("");
    setResult(null);
    setProgress(0);
    setActiveStep(0);
  };

  return (
    <div className="w-full relative">
      <AnimatePresence mode="wait">
        {status === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`relative flex flex-col items-center justify-center p-10 border-2 rounded-2xl glass-premium overflow-hidden transition-all duration-350 ${
              dragActive
                ? "border-neural-cyan bg-neural-cyan/5 scale-[1.03] shadow-[0_0_30px_rgba(0,229,255,0.25)]"
                : "border-dashed border-white/10 hover:border-neural-cyan/40 upload-border-pulse"
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            {/* Background Floating Decorative Icons */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] -z-10">
              <FileText className="absolute top-4 left-6 h-12 w-12 rotate-12" />
              <File className="absolute bottom-6 left-16 h-10 w-10 -rotate-6" />
              <FileUp className="absolute top-10 right-10 h-16 w-16 rotate-[15deg]" />
              <FileText className="absolute bottom-8 right-12 h-11 w-11 -rotate-12" />
            </div>

            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.txt"
              onChange={handleChange}
            />

            <div className="p-4 bg-white/5 border border-white/10 rounded-full mb-4 shadow-inner group-hover:scale-105 transition-all duration-300">
              <Upload className="h-10 w-10 text-neural-cyan animate-float" />
            </div>

            <h3 className="text-lg font-bold text-foreground mb-1 font-display tracking-wide">
              Drag & drop document here
            </h3>
            <p className="text-xs text-muted-foreground/80 mb-6 text-center max-w-xs leading-normal">
              Accepting PDF, DOCX, and TXT files up to 50 MB for Graph RAG indexing.
            </p>

            <Button
              onClick={onButtonClick}
              className="relative overflow-hidden group bg-gradient-to-r from-neural-cyan/80 to-neural-purple/80 hover:from-neural-cyan hover:to-neural-purple text-neural-dark font-bold px-6 py-2.5 rounded-xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] border-none"
            >
              <span className="relative z-10 flex items-center gap-1.5">
                <FileUp className="h-4 w-4" />
                Select Workspace File
              </span>
            </Button>
          </motion.div>
        )}

        {status === "uploading" && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center p-12 rounded-2xl glass-premium border border-white/5"
          >
            {/* Pulsing Neural Nodes Loading Visual */}
            <div className="relative h-20 w-20 mb-6 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-neural-cyan/20 border-t-neural-cyan animate-spin" />
              <div className="absolute inset-2.5 rounded-full border-2 border-neural-purple/20 border-b-neural-purple animate-spin-slow" />
              <Brain className="h-8 w-8 text-neural-cyan animate-pulse" />
            </div>

            <h3 className="text-lg font-bold text-foreground mb-1 font-display tracking-wide">
              Agent Ingestion Pipeline
            </h3>
            <span className="text-xs text-neural-cyan uppercase tracking-wider font-semibold animate-pulse mb-6">
              {UPLOAD_STEPS[activeStep]}
            </span>

            {/* Glowing Shimmer Progress Bar */}
            <div className="w-full max-w-sm h-2.5 bg-white/5 border border-white/10 rounded-full overflow-hidden relative shimmer mb-2">
              <div
                className="h-full bg-gradient-to-r from-neural-cyan via-neural-purple to-neural-cyan transition-all duration-300 rounded-full shadow-[0_0_10px_#00e5ff]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground font-mono">{progress}% Complete</span>
          </motion.div>
        )}

        {status === "success" && result && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center p-8 rounded-2xl glass-premium border border-emerald-500/30 bg-emerald-500/[0.02] text-center relative overflow-hidden"
          >
            {/* Interactive Particle Burst Effects */}
            <div className="absolute inset-0 pointer-events-none">
              <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-400" initial={{ width: 0, height: 0, opacity: 0.8 }} animate={{ width: 180, height: 180, opacity: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} />
              <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-400" initial={{ width: 0, height: 0, opacity: 0.6 }} animate={{ width: 280, height: 280, opacity: 0 }} transition={{ duration: 1.1, delay: 0.1, ease: "easeOut" }} />
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-full mb-4 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            </div>

            <h3 className="text-lg font-bold text-foreground mb-1 font-display tracking-wide">
              Ingestion Complete
            </h3>
            <p className="text-xs font-semibold text-emerald-400/90 mb-6 truncate max-w-sm font-mono bg-emerald-500/10 px-3 py-1 rounded-md border border-emerald-500/20">
              {result.filename}
            </p>

            <div className="grid grid-cols-2 gap-4 w-full max-w-xs mb-6">
              <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5 shadow-inner">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">Text Chunks</span>
                <span className="text-2xl font-bold text-foreground font-display">{result.chunk_count}</span>
              </div>
              <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5 shadow-inner">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">KG Relations</span>
                <span className="text-2xl font-bold text-foreground font-display">{result.entity_count}</span>
              </div>
            </div>

            <Button onClick={reset} variant="ghost" className="text-xs hover:bg-emerald-500/10 text-muted-foreground hover:text-foreground font-semibold px-4 py-2 rounded-xl transition-all">
              Upload Another File
            </Button>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center p-8 rounded-2xl glass-premium border border-rose-500/30 bg-rose-500/[0.02] text-center shadow-[0_0_30px_rgba(244,63,94,0.08)]"
          >
            <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-full mb-4 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
              <AlertCircle className="h-10 w-10 text-rose-400" />
            </div>

            <h3 className="text-lg font-bold text-foreground mb-1 font-display tracking-wide">
              Ingestion Failed
            </h3>
            <p className="text-xs text-rose-400/90 mb-6 max-w-xs leading-relaxed">
              {errorMsg}
            </p>

            <Button onClick={reset} className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 font-semibold px-5 py-2 rounded-xl transition-all">
              Try Again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
