"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadDocument, UploadResponse } from "@/lib/api";

interface UploadZoneProps {
  onUploadSuccess?: (data: UploadResponse) => void;
}

export default function UploadZone({ onUploadSuccess }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<UploadResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    // Client-side file extension check (P3 | H5)
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
      setResult(data);
      setStatus("success");
      if (onUploadSuccess) {
        onUploadSuccess(data);
      }
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
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {status === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl glass-card transition-all duration-300 ${
              dragActive
                ? "border-primary/80 bg-primary/5 scale-[1.01]"
                : "border-muted-foreground/30 hover:border-primary/50"
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.txt"
              onChange={handleChange}
            />

            <Upload className="h-12 w-12 text-muted-foreground mb-4 animate-pulse" />

            <h3 className="text-lg font-medium text-foreground mb-1">
              Drag & drop document here
            </h3>
            <p className="text-xs text-muted-foreground mb-4 text-center max-w-xs">
              Supports PDF, DOCX, and TXT up to 50 MB
            </p>

            <Button onClick={onButtonClick} variant="outline" className="relative overflow-hidden group">
              <span className="relative z-10">Choose File</span>
              <div className="absolute inset-0 bg-primary/10 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
            </Button>
          </motion.div>
        )}

        {status === "uploading" && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center p-12 rounded-2xl glass-card border border-muted-foreground/20"
          >
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">Ingesting Document</h3>
            <p className="text-xs text-muted-foreground text-center">
              Extracting text, computing vector embeddings, and mapping knowledge graph nodes...
            </p>
          </motion.div>
        )}

        {status === "success" && result && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center p-8 rounded-2xl glass-card border border-emerald-500/30 bg-emerald-500/5 text-center"
          >
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Ingestion Complete</h3>
            <p className="text-sm font-medium text-emerald-400/90 mb-4 truncate max-w-md">
              {result.filename}
            </p>

            <div className="grid grid-cols-2 gap-4 w-full max-w-xs mb-6 text-left">
              <div className="bg-background/40 p-3 rounded-lg border border-muted-foreground/10 text-center">
                <span className="text-xs text-muted-foreground block">Chunks</span>
                <span className="text-lg font-bold text-foreground">{result.chunk_count}</span>
              </div>
              <div className="bg-background/40 p-3 rounded-lg border border-muted-foreground/10 text-center">
                <span className="text-xs text-muted-foreground block">Entities</span>
                <span className="text-lg font-bold text-foreground">{result.entity_count}</span>
              </div>
            </div>

            <Button onClick={reset} variant="ghost" className="text-xs hover:bg-emerald-500/10 text-muted-foreground hover:text-foreground">
              Upload Another
            </Button>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center p-8 rounded-2xl glass-card border border-rose-500/30 bg-rose-500/5 text-center"
          >
            <AlertCircle className="h-12 w-12 text-rose-500 mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Ingestion Failed</h3>
            <p className="text-xs text-rose-400 mb-6 max-w-sm">
              {errorMsg}
            </p>

            <div className="flex gap-2">
              <Button onClick={reset} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
