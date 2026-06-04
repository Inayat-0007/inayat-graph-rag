"use client";

import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Cpu } from "lucide-react";

interface Message {
  role: string;
  content: string;
}

interface ChatStreamProps {
  messages: Message[];
  streamingMessage?: string;
  isLoading?: boolean;
}

export default function ChatStream({ messages, streamingMessage = "", isLoading = false }: ChatStreamProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-6 scrollbar-thin scrollbar-thumb-muted/30">
      {messages.length === 0 && !streamingMessage && (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 gap-3 my-auto">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Cpu className="h-6 w-6 animate-pulse" />
          </div>
          <h3 className="text-lg font-medium text-foreground">How can I help you today?</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Ask any question about your ingested documents. I'll search vector embeddings and graph connections to build the answer.
          </p>
        </div>
      )}

      {messages.map((msg, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`flex gap-4 max-w-3xl ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
        >
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs shrink-0 select-none ${
            msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border border-muted-foreground/15"
          }`}>
            {msg.role === "user" ? <User className="h-4 w-4" /> : <Cpu className="h-4 w-4" />}
          </div>

          <div className={`p-4 rounded-2xl border text-sm shadow-sm transition-all duration-300 ${
            msg.role === "user"
              ? "bg-primary/10 border-primary/20 text-foreground rounded-tr-none"
              : "bg-card/40 border-muted-foreground/10 text-foreground rounded-tl-none glass-card"
          }`}>
            <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>
          </div>
        </motion.div>
      ))}

      {streamingMessage && (
        <div className="flex gap-4 max-w-3xl mr-auto">
          <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground border border-muted-foreground/15 flex items-center justify-center shrink-0 select-none">
            <Cpu className="h-4 w-4" />
          </div>

          <div className="p-4 rounded-2xl rounded-tl-none border border-muted-foreground/10 bg-card/40 text-foreground text-sm shadow-sm glass-card">
            <p className="whitespace-pre-line leading-relaxed">{streamingMessage}</p>
          </div>
        </div>
      )}

      {isLoading && !streamingMessage && (
        <div className="flex gap-4 max-w-3xl mr-auto">
          <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground border border-muted-foreground/15 flex items-center justify-center shrink-0 select-none">
            <Cpu className="h-4 w-4 animate-spin" />
          </div>

          <div className="p-4 rounded-2xl rounded-tl-none border border-muted-foreground/10 bg-card/40 text-foreground text-sm shadow-sm glass-card flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="h-2 w-2 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="h-2 w-2 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
