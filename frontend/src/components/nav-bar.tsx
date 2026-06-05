"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  MessageSquare,
  Command,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface NavLink {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/", icon: <Home className="h-5 w-5" /> },
  {
    label: "Documents",
    href: "/documents",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    label: "Ask",
    href: "/ask",
    icon: <MessageSquare className="h-5 w-5" />,
  },
];

export default function NavBar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Desktop Navigation — Top horizontal bar */}
      <nav
        className={cn(
          "hidden md:flex fixed top-0 left-0 right-0 z-40 h-16 items-center justify-between px-6 transition-all duration-300",
          scrolled
            ? "bg-neural-dark/85 backdrop-blur-2xl border-b border-neural-cyan/20 shadow-[0_4px_30px_rgba(0,229,255,0.05)]"
            : "bg-white/5 backdrop-blur-xl border-b border-white/5"
        )}
      >
        {/* Top border glow line (scrolled state) */}
        {scrolled && (
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neural-cyan/40 to-transparent" />
        )}

        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 group relative"
        >
          <div className="relative p-1 rounded-full group-hover:shadow-[0_0_15px_rgba(0,229,255,0.4)] transition-all duration-300">
            <Brain className="h-7 w-7 text-neural-cyan group-hover:scale-110 group-hover:rotate-3 transition-all duration-300" />
            <div className="absolute inset-0 rounded-full border border-neural-cyan/0 group-hover:border-neural-cyan/30 group-hover:scale-125 transition-all duration-300" />
          </div>
          <span className="text-lg font-bold text-gradient tracking-wide">
            I.N.A.Y.A.T.
          </span>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-1 relative">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 relative z-10",
                  isActive
                    ? "text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 bg-white/10 rounded-lg -z-10 border border-white/10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className={cn(isActive && "text-neural-cyan")}>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Ctrl+K Hint */}
        <Badge
          variant="outline"
          className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-all duration-300 hover:border-neural-cyan/30 hover:shadow-[0_0_10px_rgba(0,229,255,0.2)] animate-pulse-glow"
          onClick={() => {
            document.dispatchEvent(
              new KeyboardEvent("keydown", { key: "k", ctrlKey: true })
            );
          }}
        >
          <Command className="h-3 w-3" />
          <span>Ctrl+K</span>
        </Badge>
      </nav>

      {/* Mobile Navigation — Bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-white/5">
        <div className="flex items-center justify-around h-16">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all duration-300 relative pb-3",
                  isActive
                    ? "text-neural-cyan"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className={cn("transition-transform duration-300", isActive && "scale-110 -translate-y-0.5 text-neural-cyan")}>
                  {link.icon}
                </div>
                <span className="text-[10px] font-medium">{link.label}</span>
                {isActive && (
                  <motion.span
                    layoutId="mobile-nav-indicator"
                    className="absolute bottom-1 w-8 h-1 rounded-full bg-neural-cyan/35 shadow-[0_0_12px_#00e5ff] border-t border-neural-cyan/50"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
