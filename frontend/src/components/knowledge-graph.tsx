"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Share2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// Dynamic import with SSR disabled to prevent Canvas rendering issues on server
const ForceGraph2D = dynamic(
  () => import("react-force-graph-2d").then((mod) => mod.default),
  { ssr: false }
);

interface Node {
  id: string;
  label: string;
  type: string;
}

interface Edge {
  source: string;
  target: string;
  relation: string;
}

interface KnowledgeGraphProps {
  nodes: Node[];
  edges: Edge[];
  height?: number;
}

export default function KnowledgeGraph({ nodes, edges, height = 300 }: KnowledgeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });

  useEffect(() => {
    if (!containerRef.current) return;
    
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: height,
        });
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    
    // Nudge window resize to fix initial size
    const timer = setTimeout(handleResize, 200);
    
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, [containerRef, height, nodes, edges]);

  // Color mapping based on node type
  const getNodeColor = (type: string) => {
    const t = type.toUpperCase();
    if (t === "DOCUMENT") return "#8b5cf6"; // Violet
    if (t === "PERSON") return "#ec4899"; // Pink
    if (t === "ORGANIZATION") return "#3b82f6"; // Blue
    if (t === "CONCEPT") return "#f59e0b"; // Amber
    if (t === "LOCATION") return "#10b981"; // Emerald
    if (t === "TECHNOLOGY") return "#06b6d4"; // Cyan
    return "#64748b"; // Slate
  };

  // Format data for react-force-graph
  const graphData = {
    nodes: nodes.map((node) => ({
      id: node.id,
      name: node.label,
      type: node.type,
      color: getNodeColor(node.type),
      val: node.type.toUpperCase() === "DOCUMENT" ? 7 : 4,
    })),
    links: edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      label: edge.relation,
    })),
  };

  const hasData = nodes.length > 0;

  return (
    <Card className="glass-card border-muted-foreground/10 bg-background/20 h-full w-full overflow-hidden flex flex-col">
      <div className="p-4 border-b border-muted-foreground/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Share2 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Interactive Subgraph</h3>
        </div>
        {hasData && (
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
            {nodes.length} Nodes &bull; {edges.length} Connections
          </span>
        )}
      </div>
      <CardContent ref={containerRef} className="p-0 flex-1 relative flex items-center justify-center min-h-[300px]">
        {hasData ? (
          <ForceGraph2D
            graphData={graphData}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor="rgba(0,0,0,0)"
            nodeRelSize={2.5}
            nodeVal={(node: any) => node.val}
            nodeColor={(node: any) => node.color}
            linkColor={() => "rgba(255, 255, 255, 0.12)"}
            linkWidth={1}
            nodeCanvasObject={(node: any, ctx, globalScale) => {
              const label = node.name;
              const fontSize = 10 / globalScale;
              ctx.font = `${fontSize}px Outfit, sans-serif`;
              
              // Draw node circle
              ctx.beginPath();
              ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
              ctx.fillStyle = node.color;
              ctx.fill();
              
              // Draw text label below node
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillStyle = "#e2e8f0"; // slate-200
              ctx.fillText(label, node.x, node.y + node.val + 6 / globalScale);
            }}
            cooldownTicks={100}
            linkDirectionalArrowLength={3}
            linkDirectionalArrowRelPos={1}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
            <Share2 className="h-10 w-10 text-muted-foreground/30 animate-pulse" />
            <p className="text-xs">No graph connections retrieved for this query.</p>
            <p className="text-[10px] text-muted-foreground/70 max-w-[200px]">
              Ingest documents with relationships, or ask about connections between entities.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
