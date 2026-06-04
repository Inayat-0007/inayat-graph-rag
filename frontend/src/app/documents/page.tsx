"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  FileText, 
  Calendar, 
  HardDrive, 
  Layers, 
  Share2, 
  Trash2, 
  RefreshCw, 
  Search, 
  FolderOpen,
  Eye
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import UploadZone from "@/components/upload-zone";
import KnowledgeGraph from "@/components/knowledge-graph";
import { 
  fetchDocuments, 
  deleteDocument, 
  fetchDocumentChunks, 
  fetchGraph, 
  DocumentInfo, 
  DocumentChunkInfo 
} from "@/lib/api";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentInfo | null>(null);
  const [chunks, setChunks] = useState<DocumentChunkInfo[]>([]);
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"graph" | "chunks" | "entities">("graph");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDocuments();
      setDocuments(data.documents);
      
      // Keep selected doc sync or clear if it's no longer in list
      if (selectedDoc) {
        const stillExists = data.documents.find(d => d.doc_id === selectedDoc.doc_id);
        if (!stillExists) {
          setSelectedDoc(null);
          setChunks([]);
          setGraphData({ nodes: [], edges: [] });
        } else {
          // Update selected doc with latest metadata (e.g. if chunk/entity counts changed)
          setSelectedDoc(stillExists);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch documents. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [refreshTrigger]);

  // Load selected document details (chunks & graph)
  useEffect(() => {
    if (!selectedDoc) return;

    const loadDetails = async () => {
      setLoadingDetails(true);
      try {
        const [chunksRes, graphRes] = await Promise.all([
          fetchDocumentChunks(selectedDoc.doc_id),
          fetchGraph(selectedDoc.doc_id)
        ]);
        setChunks(chunksRes.chunks);
        setGraphData(graphRes);
      } catch (err) {
        console.error("Failed to load document details:", err);
      } finally {
        setLoadingDetails(false);
      }
    };

    loadDetails();
  }, [selectedDoc?.doc_id]);

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleDelete = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this document from vector and graph databases?")) return;
    
    try {
      await deleteDocument(docId);
      if (selectedDoc?.doc_id === docId) {
        setSelectedDoc(null);
        setChunks([]);
        setGraphData({ nodes: [], edges: [] });
      }
      loadDocuments();
    } catch (err) {
      console.error("Failed to delete document:", err);
      alert("Failed to delete document.");
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (isoString: string): string => {
    if (!isoString) return "Unknown";
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return isoString;
    }
  };

  const filteredDocs = documents.filter((doc) =>
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen pt-16 md:pt-20 pb-20 md:pb-0 flex flex-col bg-background text-foreground">
      {/* Top Header */}
      <div className="p-4 md:px-8 border-b border-muted-foreground/10 flex items-center justify-between bg-background/20 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="hover:bg-primary/10">
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </Button>
          </Link>
          <div>
            <h1 className="text-base font-bold text-foreground">Documents Repository</h1>
            <p className="text-[10px] text-muted-foreground">
              Manage knowledge base vector mappings and entity networks
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={loadDocuments} 
          disabled={loading} 
          className="hover:bg-primary/10"
        >
          <RefreshCw className={`h-4 w-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Main split view */}
      <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100vh-8rem)]">
        
        {/* Left Column: Upload Zone + Scrollable List */}
        <div className="w-full md:w-80 lg:w-96 border-r border-muted-foreground/10 p-4 flex flex-col gap-4 bg-background/5">
          {/* Upload Zone */}
          <UploadZone onUploadSuccess={handleUploadSuccess} />

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-muted-foreground/20 bg-background/40 hover:border-primary/45 focus:border-primary text-xs rounded-xl focus:outline-none"
            />
          </div>

          {/* Document list */}
          <ScrollArea className="flex-1 max-h-[300px] md:max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
            <div className="flex flex-col gap-2">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <Card key={i} className="glass-card">
                    <CardContent className="p-3.5 flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3.5 w-3/4" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : error ? (
                <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-center text-rose-400 text-xs">
                  {error}
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-muted-foreground/15 rounded-xl text-muted-foreground text-xs">
                  No documents found.
                </div>
              ) : (
                filteredDocs.map((doc) => (
                  <div
                    key={doc.doc_id}
                    onClick={() => setSelectedDoc(doc)}
                    className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer border transition-all duration-200 group relative select-none ${
                      selectedDoc?.doc_id === doc.doc_id
                        ? "bg-primary/10 border-primary/20 text-foreground"
                        : "hover:bg-muted/40 border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-4">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        selectedDoc?.doc_id === doc.doc_id ? "bg-primary/25 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold truncate max-w-[150px] lg:max-w-[200px]" title={doc.filename}>
                          {doc.filename}
                        </h4>
                        <span className="text-[9px] text-muted-foreground block mt-0.5">
                          {formatSize(doc.size)} &bull; {doc.chunk_count} Chunks
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(doc.doc_id, e)}
                      className="opacity-0 group-hover:opacity-100 hover:text-rose-500 transition-opacity p-1 text-muted-foreground"
                      title="Delete Document"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Column: Detailed Document workspace */}
        <div className="flex-1 p-4 md:p-6 flex flex-col bg-background/10 overflow-y-auto max-h-[calc(100vh-8rem)]">
          <AnimatePresence mode="wait">
            {!selectedDoc ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 border border-dashed border-muted-foreground/10 rounded-2xl flex flex-col items-center justify-center text-center p-8 gap-3 my-auto glass-card min-h-[300px]"
              >
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <FolderOpen className="h-7 w-7 animate-pulse" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Workspace Viewport</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Select a document from the repository to visualize its knowledge graph connections, inspect text chunks, and audit extraction statistics.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="details"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex flex-col gap-6"
              >
                {/* Selected document header metadata */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-background/25 p-4 border border-muted-foreground/10 rounded-2xl glass-card">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/15 rounded-xl text-primary">
                      <FileText className="h-6 w-6 animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-foreground truncate max-w-[280px] sm:max-w-md lg:max-w-xl" title={selectedDoc.filename}>
                        {selectedDoc.filename}
                      </h2>
                      <span className="text-[9px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        HASH ID: {selectedDoc.doc_id}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={(e) => handleDelete(selectedDoc.doc_id, e)}
                    variant="outline"
                    className="border-rose-500/20 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 text-xs flex items-center gap-1.5 self-start sm:self-auto rounded-xl px-3"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete File</span>
                  </Button>
                </div>

                {/* Metrics Stats row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-background/20 p-4 border border-muted-foreground/10 rounded-xl flex flex-col justify-center">
                    <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">File Size</span>
                    <span className="text-sm font-bold text-foreground flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-primary" />
                      {formatSize(selectedDoc.size)}
                    </span>
                  </div>
                  <div className="bg-background/20 p-4 border border-muted-foreground/10 rounded-xl flex flex-col justify-center">
                    <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Total Chunks</span>
                    <span className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Layers className="h-4 w-4 text-neural-cyan" />
                      {selectedDoc.chunk_count}
                    </span>
                  </div>
                  <div className="bg-background/20 p-4 border border-muted-foreground/10 rounded-xl flex flex-col justify-center">
                    <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Graph Entities</span>
                    <span className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Share2 className="h-4 w-4 text-pink-400" />
                      {selectedDoc.entity_count}
                    </span>
                  </div>
                  <div className="bg-background/20 p-4 border border-muted-foreground/10 rounded-xl flex flex-col justify-center">
                    <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Upload Date</span>
                    <span className="text-xs font-bold text-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-amber-400" />
                      {formatDate(selectedDoc.created_at)}
                    </span>
                  </div>
                </div>

                {/* Tabs selection */}
                <div className="flex gap-2 border-b border-muted-foreground/10 pb-0">
                  <button
                    onClick={() => setActiveTab("graph")}
                    className={`pb-3 text-xs font-semibold px-2 transition-all relative ${
                      activeTab === "graph" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>Knowledge Graph</span>
                    {activeTab === "graph" && (
                      <motion.div layoutId="docTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab("chunks")}
                    className={`pb-3 text-xs font-semibold px-2 transition-all relative ${
                      activeTab === "chunks" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>Ingested Chunks</span>
                    {activeTab === "chunks" && (
                      <motion.div layoutId="docTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab("entities")}
                    className={`pb-3 text-xs font-semibold px-2 transition-all relative ${
                      activeTab === "entities" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>Entities Index</span>
                    {activeTab === "entities" && (
                      <motion.div layoutId="docTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                  </button>
                </div>

                {/* Tab content viewport */}
                <div className="flex-1 min-h-[350px]">
                  {loadingDetails ? (
                    <div className="flex flex-col items-center justify-center h-full p-12 text-muted-foreground gap-2">
                      <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                      <span className="text-xs">Loading document data...</span>
                    </div>
                  ) : (
                    <AnimatePresence mode="wait">
                      {activeTab === "graph" && (
                        <motion.div
                          key="graph"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="h-[380px] md:h-[450px] w-full"
                        >
                          <KnowledgeGraph nodes={graphData.nodes} edges={graphData.edges} height={380} />
                        </motion.div>
                      )}

                      {activeTab === "chunks" && (
                        <motion.div
                          key="chunks"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col gap-3 max-h-[380px] md:max-h-[450px] overflow-y-auto pr-1"
                        >
                          {chunks.length === 0 ? (
                            <div className="text-center p-8 border border-dashed border-muted-foreground/15 rounded-xl text-muted-foreground text-xs">
                              No text chunks retrieved.
                            </div>
                          ) : (
                            chunks.map((c) => (
                              <div key={c.chunk_id} className="bg-background/20 p-4 border border-muted-foreground/10 rounded-xl text-xs glass-card">
                                <div className="flex justify-between items-center text-[10px] text-muted-foreground border-b border-muted-foreground/5 pb-2 mb-2">
                                  <span className="font-semibold text-primary uppercase">Chunk {c.chunk_index + 1}</span>
                                  <span>ID: {c.chunk_id.slice(-20)}</span>
                                </div>
                                <p className="leading-relaxed whitespace-pre-line text-slate-200 select-text font-sans">{c.text}</p>
                              </div>
                            ))
                          )}
                        </motion.div>
                      )}

                      {activeTab === "entities" && (
                        <motion.div
                          key="entities"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="max-h-[380px] md:max-h-[450px] overflow-y-auto pr-1"
                        >
                          {graphData.nodes.filter(n => n.type !== "Document").length === 0 ? (
                            <div className="text-center p-8 border border-dashed border-muted-foreground/15 rounded-xl text-muted-foreground text-xs">
                              No entities extracted.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {graphData.nodes
                                .filter(n => n.type !== "Document")
                                .map((node) => (
                                  <div key={node.id} className="p-3 border border-muted-foreground/10 bg-background/20 rounded-xl flex items-center justify-between glass-card">
                                    <div className="min-w-0 pr-2">
                                      <span className="text-[9px] font-semibold text-muted-foreground uppercase block tracking-wider mb-0.5">
                                        {node.type}
                                      </span>
                                      <h4 className="text-xs font-bold text-foreground truncate" title={node.label}>
                                        {node.label}
                                      </h4>
                                    </div>
                                    <div className="p-1.5 bg-primary/10 rounded-lg text-primary shrink-0">
                                      <Eye className="h-3.5 w-3.5" />
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </main>
  );
}

// Custom ScrollArea for clean UI
function ScrollArea({ className, children }: { className?: string, children: React.ReactNode }) {
  return (
    <div className={`overflow-y-auto scrollbar-thin scrollbar-thumb-muted/30 ${className || ""}`}>
      {children}
    </div>
  );
}
