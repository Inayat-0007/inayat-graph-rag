"use client";

import React, { useEffect, useState } from "react";
import { Plus, MessageSquare, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchSessions, deleteSession } from "@/lib/api";

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
      className={`h-full border-r border-muted-foreground/10 bg-background/25 flex flex-col transition-all duration-300 relative ${
        collapsed ? "w-14" : "w-64"
      }`}
    >
      {/* Toggle button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-16 h-6 w-6 rounded-full border border-muted-foreground/15 bg-background shadow-md z-20 hidden md:flex hover:bg-primary/10"
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </Button>

      {/* Sidebar Header */}
      <div className={`p-4 border-b border-muted-foreground/10 flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && (
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            History
          </span>
        )}
        <Button
          onClick={onNewSession}
          variant="outline"
          size={collapsed ? "icon" : "sm"}
          className="border-muted-foreground/20 hover:bg-primary/10 text-xs flex items-center gap-1.5 h-8 w-8 md:w-auto"
          title="New Chat"
        >
          <Plus className="h-4 w-4" />
          {!collapsed && <span>New Chat</span>}
        </Button>
      </div>

      {/* Sessions List */}
      <ScrollArea className="flex-1">
        <div className="p-2 flex flex-col gap-1">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onSessionSelect(session.id)}
              className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200 group text-sm select-none ${
                currentSessionId === session.id
                  ? "bg-primary/10 border border-primary/20 text-foreground"
                  : "hover:bg-muted/40 border border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="h-4 w-4 text-primary shrink-0" />
              
              {!collapsed && (
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <span className="truncate pr-2 font-medium">
                    {session.name}
                  </span>
                  <button
                    onClick={(e) => deleteSessionHandler(session.id, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-500 transition-opacity p-0.5"
                    title="Delete Chat"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
export { type Session };
