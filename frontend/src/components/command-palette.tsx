"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Home, FileText, MessageSquare, Search } from "lucide-react";

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
  const router = useRouter();

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
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Command Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed left-1/2 top-[20%] z-50 w-full max-w-md -translate-x-1/2"
          >
            <Command
              className="glass-card rounded-xl border border-white/10 overflow-hidden shadow-2xl"
              label="Command Palette"
            >
              <div className="flex items-center gap-2 border-b border-white/10 px-4">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <Command.Input
                  placeholder="Search pages..."
                  className="flex h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
              <Command.List className="max-h-[300px] overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                  No results found.
                </Command.Empty>
                <Command.Group
                  heading="Navigation"
                  className="text-xs text-muted-foreground px-2 py-1.5"
                >
                  {NAV_ITEMS.map((item) => (
                    <Command.Item
                      key={item.href}
                      value={item.label}
                      onSelect={() => handleSelect(item.href)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground cursor-pointer transition-colors hover:bg-white/10 data-[selected=true]:bg-white/10 aria-selected:bg-white/10"
                    >
                      <span className="text-muted-foreground">
                        {item.icon}
                      </span>
                      {item.label}
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
