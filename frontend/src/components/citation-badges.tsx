"use client";

import React, { useState } from "react";
import { FileText, Award, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface Citation {
  doc_id: string;
  filename: string;
  text: string;
  chunk_index: number;
  score: number;
}

interface CitationBadgesProps {
  citations: Citation[];
}

export default function CitationBadges({ citations }: CitationBadgesProps) {
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);

  if (!citations || citations.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 p-4 rounded-xl border border-white/5 bg-white/[0.02] glass-premium w-full">
      <span className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider">
        Sources Cited
      </span>
      <div className="flex flex-wrap gap-2 mt-1">
        {citations.map((cite, idx) => {
          const score = cite.score;
          const styleClass =
            score > 0.8
              ? "border-amber-500/20 text-amber-400 bg-amber-500/5 hover:border-amber-500/40 hover:shadow-[0_0_12px_rgba(251,191,36,0.15)]"
              : score > 0.5
              ? "border-neural-cyan/20 text-neural-cyan bg-neural-cyan/5 hover:border-neural-cyan/40 hover:shadow-[0_0_12px_rgba(0,229,255,0.15)]"
              : "border-white/5 text-muted-foreground hover:text-foreground bg-white/[0.01] hover:border-white/10";

          const numberBg =
            score > 0.8
              ? "bg-amber-500/20 text-amber-400"
              : score > 0.5
              ? "bg-neural-cyan/20 text-neural-cyan"
              : "bg-white/10 text-muted-foreground";

          return (
            <Badge
              key={idx}
              variant="outline"
              className={cn(
                "cursor-pointer transition-all duration-300 py-1 px-2.5 flex items-center gap-1.5 text-xs font-semibold hover:scale-[1.02]",
                styleClass
              )}
              onClick={() => setSelectedCitation(cite)}
            >
              <span className={cn("rounded-full h-4 w-4 flex items-center justify-center text-[9px] font-bold shadow-inner", numberBg)}>
                {idx + 1}
              </span>
              <span className="truncate max-w-[120px]" title={cite.filename}>
                {cite.filename}
              </span>
            </Badge>
          );
        })}
      </div>

      {/* Detail Modal */}
      <Dialog open={selectedCitation !== null} onOpenChange={(open) => !open && setSelectedCitation(null)}>
        <DialogContent className="glass-premium border-white/10 sm:max-w-[500px] shadow-2xl relative overflow-hidden">
          {/* Ambient Glow in Background */}
          {selectedCitation && (
            <div className={cn(
              "absolute -top-16 -right-16 w-36 h-36 rounded-full blur-2xl opacity-10 pointer-events-none",
              selectedCitation.score > 0.8 ? "bg-amber-400" : selectedCitation.score > 0.5 ? "bg-neural-cyan" : "bg-white"
            )} />
          )}

          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-display tracking-wide">
              <FileText className="h-5 w-5 text-neural-cyan animate-pulse-glow" />
              Citation Details
            </DialogTitle>
          </DialogHeader>
          {selectedCitation && (
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2.5">
                <span className="text-muted-foreground font-medium truncate max-w-[280px]">
                  Document: {selectedCitation.filename}
                </span>
                <span className={cn(
                  "flex items-center gap-1 py-0.5 px-2 rounded-full font-bold uppercase tracking-wider text-[9px] border shadow-sm",
                  selectedCitation.score > 0.8
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : selectedCitation.score > 0.5
                    ? "bg-neural-cyan/10 text-neural-cyan border-neural-cyan/20"
                    : "bg-white/5 text-muted-foreground border-white/10"
                )}>
                  <Award className="h-3.5 w-3.5" />
                  Score: {(selectedCitation.score * 100).toFixed(0)}%
                </span>
              </div>
              <div className="bg-neural-darker/60 p-4 rounded-xl border border-white/5 max-h-[300px] overflow-y-auto shadow-inner relative">
                <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line italic font-medium">
                  &ldquo;{selectedCitation.text}&rdquo;
                </p>
              </div>
              <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-1">
                <span className="font-mono">Chunk Index: {selectedCitation.chunk_index}</span>
                <Link
                  href={`/documents?doc_id=${selectedCitation.doc_id}&chunk_index=${selectedCitation.chunk_index}`}
                  onClick={() => setSelectedCitation(null)}
                >
                  <Button variant="outline" className="gap-1.5 text-[10px] h-8 border-white/10 bg-white/5 hover:bg-white/10 hover:border-neural-cyan/30 text-muted-foreground hover:text-foreground rounded-lg px-3 transition-all duration-300">
                    <Eye className="h-3.5 w-3.5 text-neural-cyan" />
                    <span>View in Workspace</span>
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
