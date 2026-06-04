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
    <div className="flex flex-col gap-2 p-4 rounded-xl bg-background/20 border border-muted-foreground/10 glass-card w-full">
      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
        Sources Cited
      </span>
      <div className="flex flex-wrap gap-2 mt-1">
        {citations.map((cite, idx) => (
          <Badge
            key={idx}
            variant="outline"
            className="cursor-pointer hover:bg-primary/10 transition-colors py-1 px-2.5 flex items-center gap-1.5 border-muted-foreground/20 text-xs text-foreground font-medium"
            onClick={() => setSelectedCitation(cite)}
          >
            <span className="bg-primary/20 text-primary rounded-full h-4 w-4 flex items-center justify-center text-[9px] font-bold">
              {idx + 1}
            </span>
            <span className="truncate max-w-[120px]" title={cite.filename}>
              {cite.filename}
            </span>
          </Badge>
        ))}
      </div>

      {/* Detail Modal */}
      <Dialog open={selectedCitation !== null} onOpenChange={(open) => !open && setSelectedCitation(null)}>
        <DialogContent className="glass-card border-muted-foreground/20 sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <FileText className="h-5 w-5 text-primary" />
              Citation Details
            </DialogTitle>
          </DialogHeader>
          {selectedCitation && (
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex items-center justify-between text-xs border-b border-muted-foreground/15 pb-2">
                <span className="text-muted-foreground font-medium truncate max-w-[280px]">
                  Document: {selectedCitation.filename}
                </span>
                <span className="flex items-center gap-1 bg-primary/10 text-primary py-0.5 px-2 rounded-full font-semibold">
                  <Award className="h-3.5 w-3.5" />
                  Score: {selectedCitation.score.toFixed(2)}
                </span>
              </div>
              <div className="bg-background/40 p-4 rounded-xl border border-muted-foreground/10 max-h-[300px] overflow-y-auto">
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-line italic">
                  &ldquo;{selectedCitation.text}&rdquo;
                </p>
              </div>
              <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-1">
                <span>Chunk Index: {selectedCitation.chunk_index}</span>
                <Link
                  href={`/documents?doc_id=${selectedCitation.doc_id}&chunk_index=${selectedCitation.chunk_index}`}
                  onClick={() => setSelectedCitation(null)}
                >
                  <Button variant="outline" size="sm" className="gap-1.5 text-[10px] h-8 border-primary/20 hover:bg-primary/10 hover:text-primary rounded-lg px-2.5">
                    <Eye className="h-3.5 w-3.5" />
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
