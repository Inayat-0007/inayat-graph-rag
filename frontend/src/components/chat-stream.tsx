"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User, Cpu, ChevronDown, ChevronRight, BrainCircuit } from "lucide-react";

interface Message {
  role: string;
  content: string;
}

interface ChatStreamProps {
  messages: Message[];
  streamingMessage?: string;
  isLoading?: boolean;
}

function MessageContent({ content }: { content: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const thinkStart = content.indexOf("<think>");
  if (thinkStart === -1) {
    return <p className="whitespace-pre-line leading-relaxed">{content}</p>;
  }

  const thinkEnd = content.indexOf("</think>", thinkStart);
  let thinking = "";
  let response = "";
  let isStillThinking = false;

  if (thinkEnd !== -1) {
    thinking = content.slice(thinkStart + 7, thinkEnd).trim();
    response = content.slice(thinkEnd + 8).trim();
  } else {
    thinking = content.slice(thinkStart + 7).trim();
    isStillThinking = true;
  }

  return (
    <div className="flex flex-col gap-3 max-w-full">
      {/* Thought Process Container */}
      <div className="border border-muted-foreground/10 bg-muted/5 rounded-xl p-3 flex flex-col gap-2 transition-all w-full max-w-[28rem] sm:max-w-md md:max-w-lg">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider hover:text-foreground transition-colors text-left"
        >
          <span className="flex items-center gap-2">
            <BrainCircuit className={`h-4 w-4 text-neural-cyan ${isStillThinking ? "animate-pulse" : ""}`} />
            {isStillThinking ? "Thinking Process..." : "Thought Process"}
          </span>
          {!isStillThinking && (isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
        </button>
        {(isExpanded || isStillThinking) && (
          <div className="text-[11px] leading-relaxed text-muted-foreground/80 border-t border-muted-foreground/5 pt-2 whitespace-pre-line font-mono pl-1 max-h-[160px] overflow-y-auto w-full">
            {thinking}
            {isStillThinking && <span className="inline-block h-2.5 w-2.5 rounded-full bg-neural-cyan animate-pulse ml-1" />}
          </div>
        )}
      </div>
      
      {/* Actual text response */}
      {response && (
        <p className="whitespace-pre-line leading-relaxed">{response}</p>
      )}
    </div>
  );
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
            <MessageContent content={msg.content} />
          </div>
        </motion.div>
      ))}

      {streamingMessage && (
        <div className="flex gap-4 max-w-3xl mr-auto">
          <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground border border-muted-foreground/15 flex items-center justify-center shrink-0 select-none">
            <Cpu className="h-4 w-4" />
          </div>

          <div className="p-4 rounded-2xl rounded-tl-none border border-muted-foreground/10 bg-card/40 text-foreground text-sm shadow-sm glass-card">
            <MessageContent content={streamingMessage} />
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
