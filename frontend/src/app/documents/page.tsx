"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import UploadZone from "@/components/upload-zone";
import DocumentList from "@/components/document-list";

export default function DocumentsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadSuccess = () => {
    // Increment trigger to force DocumentList to reload
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <main className="min-h-screen pt-20 md:pt-24 pb-24 md:pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-8"
      >
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="hover:bg-primary/10">
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Documents</h1>
            <p className="text-sm text-muted-foreground">
              Upload files to build your local AI knowledge base
            </p>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-1">
            <UploadZone onUploadSuccess={handleUploadSuccess} />
          </div>
          <div className="lg:col-span-2">
            <DocumentList refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </motion.div>
    </main>
  );
}
