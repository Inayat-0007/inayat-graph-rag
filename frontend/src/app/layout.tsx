import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/nav-bar";
import PageTransition from "@/components/page-transition";
import CommandPalette from "@/components/command-palette";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "I.N.A.Y.A.T.",
  description:
    "Intelligent Neural Architecture for Yielding Agentic Thinking — AI Knowledge Intelligence System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased bg-neural-darker text-foreground min-h-screen`}
      >
        <NavBar />
        <CommandPalette />
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
