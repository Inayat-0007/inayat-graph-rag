"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Calendar, HardDrive, Layers, Share2, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchDocuments, DocumentInfo } from "@/lib/api";

interface DocumentListProps {
  refreshTrigger?: number;
}

export default function DocumentList({ refreshTrigger = 0 }: DocumentListProps) {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDocuments();
      setDocuments(data.documents);
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch documents. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [refreshTrigger]);

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (isoString: string): string => {
    if (!isoString) return "Unknown";
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground">Ingested Documents</h2>
        <Button variant="ghost" size="icon" onClick={loadDocuments} disabled={loading} className="hover:bg-primary/10">
          <RefreshCw className={`h-4 w-4 text-muted-foreground hover:text-foreground ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="glass-card">
              <CardContent className="p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Skeleton className="h-8 rounded" />
                  <Skeleton className="h-8 rounded" />
                  <Skeleton className="h-8 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="p-6 rounded-xl border border-rose-500/20 bg-rose-500/5 text-center text-rose-400 text-sm">
          {error}
        </div>
      ) : documents.length === 0 ? (
        <Card className="glass-card border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-2">
            <FileText className="h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-sm font-semibold text-foreground">No documents uploaded yet</h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              Upload PDF, DOCX, or TXT files above to populate your knowledge graph database.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {documents.map((doc, idx) => (
              <motion.div
                key={doc.doc_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
              >
                <Card className="glass-card hover:border-primary/40 transition-all duration-300 group hover:shadow-lg hover:shadow-primary/5">
                  <CardContent className="p-5 flex flex-col gap-4">
                    <div className="flex items-start gap-3 justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:scale-105 transition-transform duration-300">
                          <FileText className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-foreground truncate max-w-[200px]" title={doc.filename}>
                            {doc.filename}
                          </h3>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            ID: {doc.doc_id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                      <div className="bg-background/30 p-2 rounded border border-muted-foreground/10 flex flex-col justify-center">
                        <span className="text-muted-foreground block text-[9px] uppercase tracking-wider mb-0.5">Size</span>
                        <span className="font-semibold text-foreground flex items-center justify-center gap-1">
                          <HardDrive className="h-3 w-3 text-muted-foreground/75" />
                          {formatSize(doc.size)}
                        </span>
                      </div>
                      <div className="bg-background/30 p-2 rounded border border-muted-foreground/10 flex flex-col justify-center">
                        <span className="text-muted-foreground block text-[9px] uppercase tracking-wider mb-0.5">Chunks</span>
                        <span className="font-semibold text-foreground flex items-center justify-center gap-1">
                          <Layers className="h-3 w-3 text-muted-foreground/75" />
                          {doc.chunk_count}
                        </span>
                      </div>
                      <div className="bg-background/30 p-2 rounded border border-muted-foreground/10 flex flex-col justify-center">
                        <span className="text-muted-foreground block text-[9px] uppercase tracking-wider mb-0.5">Entities</span>
                        <span className="font-semibold text-foreground flex items-center justify-center gap-1">
                          <Share2 className="h-3 w-3 text-muted-foreground/75" />
                          {doc.entity_count}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-muted-foreground/10 pt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Uploaded {formatDate(doc.created_at)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
