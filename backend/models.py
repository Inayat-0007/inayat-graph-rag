"""
I.N.A.Y.A.T. Pydantic Models for API Requests and Responses
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class UploadResponse(BaseModel):
    """Response model for document upload."""
    doc_id: str
    filename: str
    chunk_count: int
    entity_count: int


class QueryRequest(BaseModel):
    """Request model for query endpoint."""
    question: str
    session_id: Optional[str] = None


class DocumentInfo(BaseModel):
    """Information about an uploaded document."""
    doc_id: str
    filename: str
    size: int
    created_at: str
    chunk_count: int
    entity_count: int


class DocumentsResponse(BaseModel):
    """Response model for document listing."""
    documents: List[DocumentInfo]


class GraphNode(BaseModel):
    """A node in the knowledge graph."""
    id: str
    label: str
    type: str


class GraphEdge(BaseModel):
    """An edge in the knowledge graph."""
    source: str
    target: str
    relation: str


class GraphResponse(BaseModel):
    """Response model for graph data."""
    nodes: List[GraphNode]
    edges: List[GraphEdge]


class HistoryMessage(BaseModel):
    """A single message in conversation history."""
    role: str
    content: str
    timestamp: str


class HistoryResponse(BaseModel):
    """Response model for conversation history."""
    messages: List[HistoryMessage]


class ServiceStatus(BaseModel):
    """Status of an individual service."""
    qdrant: bool = False
    neo4j: bool = False
    ollama: bool = False
    embed_model: bool = False
    gen_model: bool = False


class HealthResponse(BaseModel):
    """Response model for health check endpoint."""
    status: str
    services: ServiceStatus


class SessionInfo(BaseModel):
    """Information about a conversation session."""
    session_id: str
    last_message_at: str
    first_question: str


class SessionsResponse(BaseModel):
    """Response model for session listing."""
    sessions: List[SessionInfo]


class DocumentChunkInfo(BaseModel):
    """Information about a text chunk from a document."""
    chunk_id: str
    chunk_index: int
    text: str


class DocumentChunksResponse(BaseModel):
    """Response model for document chunks preview."""
    chunks: List[DocumentChunkInfo]
