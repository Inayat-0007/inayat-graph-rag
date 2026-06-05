"use client";

import React, { useEffect, useState } from "react";
import { Plus, MessageSquare, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchSessions, deleteSession } from "@/lib/api";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Session {
  id: string;
  name: string;
  timestamp: number;
}

interface ConversationSidebarProps {
  currentSessionId: string;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
}

export default function ConversationSidebar({
  currentSessionId,
  onSessionSelect,
  onNewSession,
}: ConversationSidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  const loadSessions = async () => {
    try {
      const data = await fetchSessions();
      if (data.sessions && data.sessions.length > 0) {
        const mapped = data.sessions.map((s) => ({
          id: s.session_id,
          name: s.first_question || "New Conversation",
          timestamp: new Date(s.last_message_at).getTime(),
        }));
        setSessions(mapped);
      } else {
        // Fallback to localStorage or single session
        const saved = localStorage.getItem("inayat_chat_sessions");
        if (saved) {
          setSessions(JSON.parse(saved));
        } else {
          const initial: Session = {
            id: currentSessionId,
            name: "New Conversation",
            timestamp: Date.now(),
          };
          setSessions([initial]);
          localStorage.setItem("inayat_chat_sessions", JSON.stringify([initial]));
        }
      }
    } catch (e) {
      console.error("Failed to load sessions from backend:", e);
      const saved = localStorage.getItem("inayat_chat_sessions");
      if (saved) {
        try {
          setSessions(JSON.parse(saved));
        } catch {
          // ignore
        }
      }
    }
  };

  // Load sessions on mount and when currentSessionId changes
  useEffect(() => {
    loadSessions();
  }, [currentSessionId]);

  const deleteSessionHandler = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteSession(id);
      
      // Sync localStorage
      const saved = localStorage.getItem("inayat_chat_sessions");
      if (saved) {
        try {
          const list = JSON.parse(saved);
          const updated = list.filter((s: any) => s.id !== id);
          localStorage.setItem("inayat_chat_sessions", JSON.stringify(updated));
        } catch (err) {
          console.error(err);
        }
      }

      if (currentSessionId === id) {
        const remaining = sessions.filter((s) => s.id !== id);
        if (remaining.length > 0) {
          onSessionSelect(remaining[0].id);
        } else {
          onNewSession();
        }
      } else {
        loadSessions();
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };


  const renameSession = (id: string, name: string) => {
    const updated = sessions.map((s) =>
      s.id === id ? { ...s, name: name.slice(0, 30) } : s
    );
    setSessions(updated);
    localStorage.setItem("inayat_chat_sessions", JSON.stringify(updated));
  };

  return (
    <div
      className={cn(
        "h-full border-r border-white/5 bg-neural-darker/35 flex flex-col transition-all duration-300 relative select-none",
        collapsed ? "w-14" : "w-64"
      )}
    >
      {/* Right Edge Glow Separator */}
      <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-neural-cyan/15 to-transparent pointer-events-none" />

      {/* Toggle button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-16 h-6 w-6 rounded-full border border-white/10 bg-neural-darker hover:bg-white/10 text-muted-foreground hover:text-foreground shadow-md z-20 hidden md:flex"
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </Button>

      {/* Sidebar Header */}
      <div className={`p-4 border-b border-white/5 flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
            Chat Logs
          </span>
        )}
        <Button
          onClick={onNewSession}
          variant="outline"
          size={collapsed ? "icon" : "sm"}
          className="relative overflow-hidden group bg-gradient-to-r from-neural-cyan/10 to-neural-purple/10 border-white/10 hover:border-neural-cyan/35 text-xs flex items-center gap-1.5 h-8 w-8 md:w-auto px-2 md:px-3 text-muted-foreground hover:text-foreground"
          title="New Chat"
        >
          <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300 text-neural-cyan" />
          {!collapsed && <span>New Session</span>}
        </Button>
      </div>

      {/* Sessions List */}
      <ScrollArea className="flex-1">
        <div className="p-2 flex flex-col gap-1.5">
          <AnimatePresence initial={false}>
            {sessions.map((session) => {
              const isActive = currentSessionId === session.id;
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onClick={() => onSessionSelect(session.id)}
                  className={cn(
                    "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-300 group text-xs relative select-none overflow-hidden",
                    isActive
                      ? "bg-neural-cyan/10 border border-neural-cyan/20 text-foreground font-semibold"
                      : "hover:bg-white/[0.03] border border-transparent text-muted-foreground hover:text-foreground glass-premium"
                  )}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-[2.5px] bg-neural-cyan shadow-[0_0_8px_#00e5ff]" />
                  )}

                  <MessageSquare className={cn("h-4 w-4 shrink-0 transition-colors duration-300", isActive ? "text-neural-cyan" : "text-muted-foreground/60 group-hover:text-foreground")} />
                  
                  {!collapsed && (
                    <div className="flex-1 min-w-0 flex items-center justify-between">
                      <span className="truncate pr-2 font-medium">
                        {session.name}
                      </span>
                      <AnimatePresence>
                        <button
                          onClick={(e) => deleteSessionHandler(session.id, e)}
                          className="opacity-0 group-hover:opacity-100 hover:text-rose-500 transition-all p-0.5 text-muted-foreground/50 hover:scale-110"
                          title="Delete Chat"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
export { type Session };
