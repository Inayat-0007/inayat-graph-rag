const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface HealthResponse {
  status: string;
  services: {
    qdrant: string;
    neo4j: string;
    ollama: string;
    embed_model: string;
    gen_model: string;
  };
}

export interface DocumentInfo {
  doc_id: string;
  filename: string;
  size: number;
  created_at: string;
  chunk_count: number;
  entity_count: number;
}

export interface DocumentsResponse {
  documents: DocumentInfo[];
}

export interface UploadResponse {
  doc_id: string;
  filename: string;
  chunk_count: number;
  entity_count: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface HistoryMessage {
  role: string;
  content: string;
  timestamp: string;
}

export interface HistoryResponse {
  messages: HistoryMessage[];
}

/**
 * Fetch health status of all backend services.
 */
export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/api/health`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/**
 * Fetch list of all uploaded documents.
 */
export async function fetchDocuments(): Promise<DocumentsResponse> {
  const res = await fetch(`${API_BASE}/api/documents`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Fetch documents failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/**
 * Upload a document file (multipart form data).
 */
export async function uploadDocument(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Upload failed: ${res.status} ${res.statusText} — ${errorBody}`);
  }
  return res.json();
}

/**
 * Send a query and return a ReadableStream for SSE streaming.
 * Events: token, citations, graph, done, error
 *
 * Uses fetch + ReadableStream (NOT EventSource).
 */
export async function queryStream(
  question: string,
  sessionId: string
): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${API_BASE}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, session_id: sessionId }),
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Query failed: ${res.status} ${res.statusText} — ${errorBody}`);
  }
  if (!res.body) {
    throw new Error("No response body for streaming");
  }
  return res.body;
}

/**
 * Parse SSE events from a ReadableStream.
 * Yields parsed events with { event, data } pairs.
 */
export async function* parseSSEStream(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<{ event: string; data: string }> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let currentEvent = "message";
      let currentData = "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          currentData = line.slice(6);
        } else if (line === "") {
          if (currentData) {
            yield { event: currentEvent, data: currentData };
            currentEvent = "message";
            currentData = "";
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Fetch knowledge graph data for a specific document.
 */
export async function fetchGraph(docId: string): Promise<GraphResponse> {
  const res = await fetch(
    `${API_BASE}/api/graph?doc_id=${encodeURIComponent(docId)}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }
  );
  if (!res.ok) {
    throw new Error(`Fetch graph failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/**
 * Fetch conversation history for a session.
 */
export async function fetchHistory(sessionId: string): Promise<HistoryResponse> {
  const res = await fetch(
    `${API_BASE}/api/history?session_id=${encodeURIComponent(sessionId)}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }
  );
  if (!res.ok) {
    throw new Error(`Fetch history failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
