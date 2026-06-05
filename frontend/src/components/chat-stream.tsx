"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Cpu, ChevronDown, ChevronRight, BrainCircuit, Sparkles } from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface Message {
  role: string;
  content: string;
}

interface ChatStreamProps {
  messages: Message[];
  streamingMessage?: string;
  isLoading?: boolean;
  onSelectQuestion?: (q: string) => void;
}

const mdComponents: Record<string, React.ComponentType<any>> = {
  h1: ({ children }) => <h1 className="text-base font-bold my-2 text-foreground font-display tracking-wide">{children}</h1>,
  h2: ({ children }) => <h2 className="text-sm font-bold my-2 text-foreground font-display">{children}</h2>,
  h3: ({ children }) => <h3 className="text-xs font-bold my-1 text-foreground font-display">{children}</h3>,
  p: ({ children }) => <p className="my-1.5 leading-relaxed text-foreground/90">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1 text-foreground/80">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1 text-foreground/80">{children}</ol>,
  li: ({ children }) => <li className="text-sm">{children}</li>,
  table: ({ children }) => (
    <div className="overflow-x-auto my-3 border border-white/10 rounded-xl glass-premium">
      <table className="w-full text-xs text-left border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-white/5 border-b border-white/10">{children}</thead>,
  th: ({ children }) => <th className="px-3 py-2 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">{children}</th>,
  td: ({ children }) => <td className="px-3 py-2 border-b border-white/5 text-foreground/90">{children}</td>,
  code: ({ node, inline, className, children, ...props }) => {
    return !inline ? (
      <pre className="p-3 bg-neural-darker/60 rounded-xl border border-white/10 my-3 overflow-x-auto text-[11px] font-mono leading-normal select-text relative">
        <code className={className} {...props}>{children}</code>
      </pre>
    ) : (
      <code className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-xs font-mono text-neural-cyan select-all" {...props}>{children}</code>
    );
  }
};

function MessageContent({ content }: { content: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const thinkStart = content.indexOf("<think>");
  if (thinkStart === -1) {
    return (
      <div className="markdown-content text-slate-100 max-w-none text-[13px] leading-relaxed select-text">
        <ReactMarkdown components={mdComponents} remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    );
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
      <div className="border border-white/10 bg-white/[0.02] rounded-xl p-3 flex flex-col gap-2 transition-all w-full max-w-[28rem] sm:max-w-md md:max-w-lg relative overflow-hidden group">
        {/* Animated Left Border Gradient */}
        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-neural-cyan to-neural-purple" />
        
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between text-[10px] text-muted-foreground/80 font-bold uppercase tracking-wider hover:text-foreground transition-colors text-left pl-1"
        >
          <span className="flex items-center gap-2">
            <BrainCircuit className={cn("h-4 w-4 text-neural-cyan", isStillThinking && "animate-pulse-glow")} />
            {isStillThinking ? "Analyzing Context Subgraph..." : "Thought Pipeline"}
          </span>
          {!isStillThinking && (isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
        </button>
        <AnimatePresence initial={false}>
          {(isExpanded || isStillThinking) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="text-[11px] leading-relaxed text-muted-foreground/80 border-t border-white/5 pt-2 whitespace-pre-line font-mono pl-1 max-h-[160px] overflow-y-auto w-full"
            >
              {thinking}
              {isStillThinking && <span className="inline-block h-2 w-2 rounded-full bg-neural-cyan animate-pulse ml-1" />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Actual text response */}
      {response && (
        <div className="markdown-content text-slate-100 max-w-none text-[13px] leading-relaxed select-text">
          <ReactMarkdown components={mdComponents} remarkPlugins={[remarkGfm]}>
            {response}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

const SUGGESTED_QUESTIONS = [
  "What documents are currently ingested?",
  "Synthesize relations between core entities",
  "Summarize my uploaded knowledge base",
];

export default function ChatStream({
  messages,
  streamingMessage = "",
  isLoading = false,
  onSelectQuestion,
}: ChatStreamProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-6 scrollbar-thin scrollbar-thumb-muted/30 h-[calc(100%-6rem)]">
      {messages.length === 0 && !streamingMessage && (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 gap-4 my-auto">
          <div className="p-4 bg-neural-cyan/10 border border-neural-cyan/20 rounded-full shadow-[0_0_20px_rgba(0,229,255,0.15)] animate-pulse-glow">
            <Cpu className="h-8 w-8 text-neural-cyan animate-float" />
          </div>
          <h3 className="text-xl font-bold text-foreground font-display tracking-wide">Inquiry Workspace</h3>
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-2">
            Ask any question about your ingested documents. The engine will scan hybrid vectors and query the Neo4j subgraph to synthesize responses.
          </p>
          
          {/* Suggested Question Pills */}
          {onSelectQuestion && (
            <div className="flex flex-col gap-2 w-full max-w-sm mt-2">
              <span className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider mb-1">Suggested inquiries</span>
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectQuestion(q)}
                  className="w-full text-left px-4 py-3 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.04] text-xs font-semibold text-muted-foreground hover:text-foreground transition-all duration-300 hover:border-neural-cyan/20 flex items-center justify-between group shadow-inner"
                >
                  <span>{q}</span>
                  <Sparkles className="h-3.5 w-3.5 text-neural-cyan opacity-0 group-hover:opacity-100 transition-opacity duration-300 shrink-0 ml-2" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {messages.map((msg, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className={`flex gap-4 max-w-3xl ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
        >
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center text-xs shrink-0 select-none shadow-md",
            msg.role === "user"
              ? "bg-gradient-to-br from-neural-cyan to-neural-purple text-neural-dark font-bold"
              : "bg-neural-darker border border-neural-cyan/30 text-neural-cyan shadow-[0_0_10px_rgba(0,229,255,0.15)]"
          )}>
            {msg.role === "user" ? <User className="h-4 w-4" /> : <Cpu className="h-4 w-4" />}
          </div>

          <div className={cn(
            "p-4 rounded-2xl border text-sm shadow-sm transition-all duration-300 relative overflow-hidden",
            msg.role === "user"
              ? "bg-gradient-to-br from-neural-cyan/15 to-neural-purple/10 border-neural-cyan/15 text-foreground rounded-tr-none"
              : "bg-white/[0.02] border-white/5 text-foreground rounded-tl-none glass-premium pl-4 border-l-2 border-l-neural-cyan"
          )}>
            <MessageContent content={msg.content} />
          </div>
        </motion.div>
      ))}

      {streamingMessage && (
        <div className="flex gap-4 max-w-3xl mr-auto">
          <div className="h-8 w-8 rounded-full bg-neural-darker border border-neural-cyan/30 text-neural-cyan shadow-[0_0_10px_rgba(0,229,255,0.15)] flex items-center justify-center shrink-0 select-none">
            <Cpu className="h-4 w-4 animate-pulse-glow" />
          </div>

          <div className="p-4 rounded-2xl rounded-tl-none border border-white/5 bg-white/[0.02] text-foreground text-sm shadow-sm glass-premium pl-4 border-l-2 border-l-neural-cyan">
            <MessageContent content={streamingMessage} />
          </div>
        </div>
      )}

      {isLoading && !streamingMessage && (
        <div className="flex gap-4 max-w-3xl mr-auto">
          <div className="h-8 w-8 rounded-full bg-neural-darker border border-neural-cyan/30 text-neural-cyan shadow-[0_0_10px_rgba(0,229,255,0.15)] flex items-center justify-center shrink-0 select-none">
            <Cpu className="h-4 w-4 animate-spin-slow" />
          </div>

          <div className="p-4 rounded-2xl rounded-tl-none border border-white/5 bg-white/[0.02] text-foreground text-sm shadow-sm glass-premium flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-neural-cyan animate-bounce wave-dot" style={{ animationDelay: "0s" }} />
            <div className="h-2 w-2 rounded-full bg-neural-cyan animate-bounce wave-dot" style={{ animationDelay: "0.15s" }} />
            <div className="h-2 w-2 rounded-full bg-neural-cyan animate-bounce wave-dot" style={{ animationDelay: "0.3s" }} />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
