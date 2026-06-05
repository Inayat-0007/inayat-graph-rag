"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Home, FileText, MessageSquare, Search } from "lucide-react";
import { fetchDocuments, DocumentInfo } from "@/lib/api";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", icon: <Home className="h-4 w-4" /> },
  {
    label: "Documents",
    href: "/documents",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    label: "Ask",
    href: "/ask",
    icon: <MessageSquare className="h-4 w-4" />,
  },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const router = useRouter();

  // Load documents when palette opens (M8)
  useEffect(() => {
    if (!open) return;
    const loadDocs = async () => {
      try {
        const res = await fetchDocuments();
        setDocuments(res.documents || []);
      } catch (err) {
        console.error("Failed to load documents for command palette:", err);
      }
    };
    loadDocs();
  }, [open]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    },
    []
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleSelect = (href: string) => {
    router.push(href);
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md"
            onClick={() => setOpen(false)}
          />

          {/* Command Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -15 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-[20%] z-50 w-full max-w-md -translate-x-1/2 px-4"
          >
            <Command
              className="glass-premium rounded-2xl border border-white/10 overflow-hidden shadow-[0_0_50px_rgba(0,229,255,0.15)] bg-neural-darker/90"
              label="Command Palette"
            >
              <div className="flex items-center gap-2 border-b border-white/5 px-4 h-13">
                <Search className="h-4 w-4 text-neural-cyan shrink-0 animate-pulse-glow" />
                <Command.Input
                  placeholder="Type a command or document name..."
                  className="flex h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                />
              </div>
              <Command.List className="max-h-[320px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/10">
                <Command.Empty className="py-6 text-center text-xs text-muted-foreground/80 font-medium">
                  No commands or files matching query.
                </Command.Empty>
                <Command.Group
                  heading="Navigation"
                  className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider px-2 py-2"
                >
                  {NAV_ITEMS.map((item) => (
                    <Command.Item
                      key={item.href}
                      value={item.label}
                      onSelect={() => handleSelect(item.href)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-foreground cursor-pointer transition-all duration-200 hover:bg-white/[0.04] data-[selected=true]:bg-white/[0.04] aria-selected:bg-white/[0.04] hover:text-neural-cyan data-[selected=true]:text-neural-cyan"
                    >
                      <span className="text-muted-foreground group-hover:text-neural-cyan shrink-0">
                        {item.icon}
                      </span>
                      <span className="font-semibold">{item.label}</span>
                    </Command.Item>
                  ))}
                </Command.Group>

                {/* Ingested Documents Group (M8) */}
                {documents.length > 0 && (
                  <Command.Group
                    heading="Knowledge Index Files"
                    className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider px-2 py-2 border-t border-white/5 mt-2 pt-2"
                  >
                    {documents.map((doc) => (
                      <Command.Item
                        key={doc.doc_id}
                        value={doc.filename}
                        onSelect={() => handleSelect(`/documents?doc_id=${doc.doc_id}`)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-foreground cursor-pointer transition-all duration-200 hover:bg-white/[0.04] data-[selected=true]:bg-white/[0.04] aria-selected:bg-white/[0.04] hover:text-neural-cyan data-[selected=true]:text-neural-cyan"
                      >
                        <span className="text-muted-foreground shrink-0">
                          <FileText className="h-4 w-4" />
                        </span>
                        <div className="flex-1 min-w-0 flex items-center justify-between">
                          <span className="truncate pr-3 font-semibold">{doc.filename}</span>
                          <span className="text-[9px] text-muted-foreground/60 shrink-0 font-mono">{doc.chunk_count} Chunks</span>
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
