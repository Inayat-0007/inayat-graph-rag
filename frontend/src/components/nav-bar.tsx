"use client";

import React from "react";
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

  return (
    <>
      {/* Desktop Navigation — Top horizontal bar */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-40 h-16 items-center justify-between px-6 glass border-b border-white/5">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 group"
        >
          <Brain className="h-7 w-7 text-neural-cyan group-hover:animate-pulse transition-all" />
          <span className="text-lg font-bold text-gradient">
            I.N.A.Y.A.T.
          </span>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                {link.icon}
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Ctrl+K Hint */}
        <Badge
          variant="outline"
          className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
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
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all duration-200",
                  isActive
                    ? "text-neural-cyan"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.icon}
                <span className="text-[10px] font-medium">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
