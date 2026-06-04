"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import ConversationSidebar from "@/components/conversation-sidebar";
import ChatStream from "@/components/chat-stream";
import ConfidenceGauge from "@/components/confidence-gauge";
import CitationBadges, { Citation } from "@/components/citation-badges";
import KnowledgeGraph from "@/components/knowledge-graph";
import { queryStream, parseSSEStream, fetchHistory, fetchSessions } from "@/lib/api";

interface Message {
  role: string;
  content: string;
}

export default function AskPage() {
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuestion, setInputQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  
  // RAG responses metadata
  const [confidence, setConfidence] = useState<number>(0);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] }>({
    nodes: [],
    edges: [],
  });

  // Load session from sessionStorage or create a new one, and sync active session from backend
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const data = await fetchSessions();
        if (data.sessions && data.sessions.length > 0) {
          const savedSessionId = sessionStorage.getItem("inayat_current_session_id");
          const sessionExists = data.sessions.some(s => s.session_id === savedSessionId);
          const activeSessionId = sessionExists && savedSessionId ? savedSessionId : data.sessions[0].session_id;
          setSessionId(activeSessionId);
          sessionStorage.setItem("inayat_current_session_id", activeSessionId);
          loadHistory(activeSessionId);
        } else {
          // Create new session
          const newSessionId = `session_${Date.now()}`;
          setSessionId(newSessionId);
          sessionStorage.setItem("inayat_current_session_id", newSessionId);
          loadHistory(newSessionId);
        }
      } catch (e) {
        console.error("Failed to fetch sessions from backend:", e);
        const savedSessionId = sessionStorage.getItem("inayat_current_session_id") || `session_${Date.now()}`;
        setSessionId(savedSessionId);
        sessionStorage.setItem("inayat_current_session_id", savedSessionId);
        loadHistory(savedSessionId);
      }
    };
    initializeSession();
  }, []);

  const loadHistory = async (sessId: string) => {
    if (!sessId) return;
    setIsLoading(true);
    setMessages([]);
    setStreamingMessage("");
    setConfidence(0);
    setCitations([]);
    setGraphData({ nodes: [], edges: [] });
    
    try {
      const data = await fetchHistory(sessId);
      // Map API messages to local format
      const historyMsgs = data.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      setMessages(historyMsgs);

      // Restore metadata (confidence, citations, graph) from the last assistant message
      const lastAssistantMsg = [...data.messages].reverse().find(m => m.role === "assistant");
      if (lastAssistantMsg && lastAssistantMsg.metadata) {
        try {
          const meta = JSON.parse(lastAssistantMsg.metadata);
          if (meta.confidence !== undefined) setConfidence(meta.confidence);
          if (meta.citations !== undefined) setCitations(meta.citations);
          if (meta.graph !== undefined) setGraphData(meta.graph);
        } catch (err) {
          console.error("Failed to parse message metadata:", err);
        }
      }
    } catch (e) {
      console.error("Failed to load session history:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSessionSelect = (sessId: string) => {
    setSessionId(sessId);
    sessionStorage.setItem("inayat_current_session_id", sessId);
    loadHistory(sessId);
  };

  const handleNewSession = () => {
    const newSessId = `session_${Date.now()}`;
    setSessionId(newSessId);
    sessionStorage.setItem("inayat_current_session_id", newSessId);
    
    // Add to localStorage list
    const saved = localStorage.getItem("inayat_chat_sessions");
    const initialSession = { id: newSessId, name: "New Conversation", timestamp: Date.now() };
    if (saved) {
      try {
        const list = JSON.parse(saved);
        const updated = [initialSession, ...list];
        localStorage.setItem("inayat_chat_sessions", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
    } else {
      localStorage.setItem("inayat_chat_sessions", JSON.stringify([initialSession]));
    }
    
    loadHistory(newSessId);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputQuestion.trim();
    if (!query || isLoading) return;

    setInputQuestion("");
    setIsLoading(true);
    setStreamingMessage("");
    
    // Reset right-hand panel metrics for new query
    setConfidence(0);
    setCitations([]);
    setGraphData({ nodes: [], edges: [] });
    
    // Add user message immediately
    setMessages((prev) => [...prev, { role: "user", content: query }]);

    // Update conversation name in sidebar if it's the first message
    if (messages.length === 0) {
      const saved = localStorage.getItem("inayat_chat_sessions");
      if (saved) {
        try {
          const list = JSON.parse(saved);
          const updated = list.map((s: any) =>
            s.id === sessionId ? { ...s, name: query.slice(0, 25) + "..." } : s
          );
          localStorage.setItem("inayat_chat_sessions", JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
      }
    }

    try {
      // Connect to SSE stream
      const stream = await queryStream(query, sessionId);
      const generator = parseSSEStream(stream);

      let accumulated = "";

      for await (const chunk of generator) {
        if (chunk.event === "token") {
          let tokenText = chunk.data;
          try {
            tokenText = JSON.parse(chunk.data);
          } catch (e) {
            // Not a JSON string (e.g. legacy backend output), keep raw
          }
          accumulated += tokenText;
          setStreamingMessage(accumulated);
        } else if (chunk.event === "citations") {
          try {
            const data = JSON.parse(chunk.data);
            setCitations(data.citations || []);
            setConfidence(data.confidence || 0);
          } catch (err) {
            console.error("Failed to parse citations JSON:", err);
          }
        } else if (chunk.event === "graph") {
          try {
            const data = JSON.parse(chunk.data);
            setGraphData(data || { nodes: [], edges: [] });
          } catch (err) {
            console.error("Failed to parse graph JSON:", err);
          }
        } else if (chunk.event === "error") {
          try {
            const errDetails = JSON.parse(chunk.data);
            setStreamingMessage((prev) => prev + `\n\n[Error: ${errDetails.detail}]`);
          } catch {
            setStreamingMessage((prev) => prev + `\n\n[Error: Connection failed]`);
          }
        }
      }

      // Finalize
      if (accumulated) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: accumulated },
        ]);
      }
      setStreamingMessage("");

    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Failed to query agent: ${err.message || "Connection refused."}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-16 md:pt-20 pb-20 md:pb-0 flex text-foreground">
      {/* Sidebar for chat history */}
      <ConversationSidebar
        currentSessionId={sessionId}
        onSessionSelect={handleSessionSelect}
        onNewSession={handleNewSession}
      />

      {/* Main chat layout */}
      <div className="flex-1 flex flex-col md:flex-row min-w-0 bg-background/5">
        
        {/* Left side: Messages & Input */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-muted-foreground/10 relative h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)]">
          {/* Header */}
          <div className="p-4 border-b border-muted-foreground/10 flex items-center gap-4 bg-background/20 backdrop-blur-md sticky top-0 z-10">
            <Link href="/">
              <Button variant="ghost" size="icon" className="hover:bg-primary/10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h2 className="text-sm font-bold text-foreground">Agent Inquiry Panel</h2>
              <p className="text-[10px] text-muted-foreground">
                Local inference warm for follow-up
              </p>
            </div>
          </div>

          {/* Chat box */}
          <ChatStream
            messages={messages}
            streamingMessage={streamingMessage}
            isLoading={isLoading}
          />

          {/* Input form */}
          <div className="p-4 border-t border-muted-foreground/10 bg-background/25">
            <form onSubmit={handleSend} className="flex gap-2 max-w-3xl mx-auto">
              <Input
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                placeholder="Ask I.N.A.Y.A.T. anything..."
                disabled={isLoading}
                className="flex-1 border-muted-foreground/20 bg-background/40 hover:border-primary/45 focus:border-primary text-sm rounded-xl py-5"
              />
              <Button
                type="submit"
                disabled={isLoading || !inputQuestion.trim()}
                className="rounded-xl px-4 py-5"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Right side: Graph & Citation metrics panel */}
        <div className="w-full md:w-80 lg:w-96 p-4 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-4rem)] md:max-h-[calc(100vh-5rem)] bg-background/10">
          
          <div className="grid grid-cols-1 gap-4 items-start">
            <div className="flex gap-4">
              {/* Confidence Gauge */}
              <ConfidenceGauge value={confidence} />
              
              {/* Context Summary card */}
              <Card className="glass-card flex-1 border-muted-foreground/10 bg-background/20 p-4">
                <CardContent className="p-0 flex flex-col justify-between h-full min-h-[90px]">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                    Retrieval Mode
                  </span>
                  <div className="text-xs font-semibold mt-1">
                    {citations.length > 0 ? (
                      <span className="text-emerald-400">RAG Injected</span>
                    ) : (
                      <span className="text-muted-foreground">Synthesized</span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground leading-tight block mt-3">
                    Dense + sparse BM25 reranked on CPU.
                  </span>
                </CardContent>
              </Card>
            </div>

            {/* Citation Badges */}
            <CitationBadges citations={citations} />

            {/* Subgraph visualization */}
            <div className="h-[360px] md:h-[420px]">
              <KnowledgeGraph nodes={graphData.nodes} edges={graphData.edges} height={365} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

