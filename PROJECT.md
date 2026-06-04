# Project: I.N.A.Y.A.T. (Intelligent Neural Architecture for Yielding Agentic Thinking)

## Architecture

### System Overview
A fully local AI Knowledge Intelligence System with three tiers:
1. **Infrastructure Layer**: Docker Compose orchestrating Neo4j 5 (graph DB) + Qdrant (vector DB)
2. **Backend Layer**: Python 3.11 FastAPI server — document ingestion pipeline, query pipeline (hybrid search → rerank → graph → stream), conversation memory (SQLite)
3. **Frontend Layer**: Next.js 14 premium AI dashboard with Three.js neural mesh, health dashboard, document management, streaming ask page with knowledge graph visualization

### Data Flow
```
User uploads PDF/DOCX/TXT
  → FastAPI /api/upload
    → Text extraction (PyPDF2/python-docx)
    → Chunk (512 tokens, 64 overlap)
    → Embed via nomic-embed-text:v1.5 (768-dim, CPU)
    → BM25 sparse vectors
    → Store in Qdrant (hybrid: dense+sparse)
    → Entity extraction via qwen3:4b (JSON mode)
    → Store entities/relationships in Neo4j

User asks question
  → FastAPI /api/query
    → Embed question → Hybrid search Qdrant (RRF fusion) → top 10
    → Cross-encoder rerank (CPU) → top 3
    → Extract entities from question via qwen3:4b
    → Fetch 1-hop subgraph from Neo4j
    → Fetch last 6 messages from SQLite (conversation memory)
    → Build prompt with context + graph + history + /no_think
    → Stream answer via SSE (token, citations, graph, done, error)
```

### Key Constraints
- GPU: RTX 3050 4GB VRAM — qwen3:4b uses ~2.5GB
- All qwen3:4b calls: num_ctx=4096, /no_think, keep_alive=0 for uploads
- Embedding: nomic-embed-text:v1.5 (768-dim, CPU) — NEVER BGE-M3
- Generation: qwen3:4b — NEVER qwen3:8b
- Reranker: cross-encoder/ms-marco-MiniLM-L-6-v2 (CPU)
- Qdrant collection 'documents': dense 768-dim Cosine + sparse

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Docker Infrastructure | docker-compose.yml, scripts/, SETUP.md | none | COMPLETE |
| 2 | Backend Core & Ingestion | FastAPI app structure, document upload pipeline, health endpoint | none | COMPLETE |
| 3 | Backend Query Pipeline | Query endpoint with hybrid search, rerank, graph context, SSE streaming, conversation memory, agentic router | M2 | COMPLETE |
| 4 | Frontend Foundation | Next.js 14 project setup, Tailwind/Shadcn, layout, Three.js neural mesh, health dashboard, command palette, page transitions | none | COMPLETE |
| 5 | Frontend Features | Document upload page, Ask page with streaming, confidence gauge, citations, knowledge graph viz, conversation sidebar, mobile responsive | M4 | COMPLETE |
| 6 | Integration & Hardening | Error handling, health checks, request limits, graceful fallbacks, TESTING.md, end-to-end testing | M1, M2, M3, M4, M5 | COMPLETE |
| 7 | Documentation & GitHub | README.md, final commits, push to GitHub | M6 | COMPLETE |

## Interface Contracts

### API Endpoints (Backend ↔ Frontend)
- `POST /api/upload` → Request: multipart file → Response: `{ doc_id, filename, chunk_count, entity_count }`
- `POST /api/query` → Request: `{ question, session_id }` → Response: SSE stream with events `token`, `citations`, `graph`, `done`, `error`
- `GET /api/documents` → Response: `{ documents: [{doc_id, filename, size, created_at, chunk_count, entity_count}] }`
- `GET /api/graph?doc_id=...` → Response: `{ nodes: [{id, label, type}], edges: [{source, target, relation}] }`
- `GET /api/history?session_id=...` → Response: `{ messages: [{role, content, timestamp}] }`
- `GET /api/health` → Response: `{ status, services: { qdrant, neo4j, ollama, embed_model, gen_model } }`

### Qdrant Collection Schema
- Collection name: `documents`
- Dense vector: name `dense`, size 768, distance Cosine
- Sparse vector: name `sparse`, type SparseVectorParams
- Payload: `doc_id`, `chunk_id`, `text`, `filename`, `chunk_index`

### Neo4j Graph Schema
- Node labels: `Document` (doc_id, filename, created_at), `Entity` (name, type)
- Relationships: `CONTAINS` (Document→Entity), `RELATES_TO` (Entity→Entity with `relation` property)

## Code Layout

```
c:\Users\moham\Music\INAYAT MCA LNCT MAJOR PROJECT\
├── docker-compose.yml              # M1: Docker infrastructure
├── SETUP.md                        # M1: Setup instructions
├── README.md                       # M7: Project documentation
├── TESTING.md                      # M6: Manual test plan
├── scripts/
│   ├── pull_models.sh              # M1: Pull Ollama models
│   └── start_dev.sh                # M1: Development startup script
├── backend/
│   ├── requirements.txt            # M2: Python dependencies
│   ├── __init__.py
│   ├── main.py                     # M2: FastAPI app entry point
│   ├── config.py                   # M2: Configuration constants
│   ├── models.py                   # M2: Pydantic models
│   ├── services/
│   │   ├── __init__.py
│   │   ├── qdrant_service.py       # M2: Qdrant client & operations
│   │   ├── neo4j_service.py        # M2: Neo4j client & operations
│   │   ├── ollama_service.py       # M2: Ollama API client (embed + generate)
│   │   ├── document_service.py     # M2: Document processing (extract, chunk)
│   │   ├── embedding_service.py    # M2: Embedding generation
│   │   ├── sparse_service.py       # M2: BM25 sparse vector generation
│   │   ├── reranker_service.py     # M3: Cross-encoder reranking
│   │   ├── query_service.py        # M3: Query pipeline orchestration
│   │   ├── memory_service.py       # M3: SQLite conversation memory
│   │   └── router_service.py       # M3: Agentic query router
│   └── routers/
│       ├── __init__.py
│       ├── upload.py               # M2: Upload endpoint
│       ├── query.py                # M3: Query endpoint
│       ├── documents.py            # M2: Documents list endpoint
│       ├── graph.py                # M2: Graph endpoint
│       ├── history.py              # M3: History endpoint
│       └── health.py               # M2: Health endpoint
├── frontend/
│   ├── package.json                # M4: Node.js dependencies
│   ├── next.config.js              # M4: Next.js configuration
│   ├── tailwind.config.ts          # M4: Tailwind CSS config
│   ├── tsconfig.json               # M4: TypeScript config
│   ├── postcss.config.js           # M4: PostCSS config
│   ├── components.json             # M4: Shadcn UI config
│   ├── public/                     # M4: Static assets
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx          # M4: Root layout with providers
│   │   │   ├── page.tsx            # M4: Home page (health dashboard)
│   │   │   ├── globals.css         # M4: Global styles
│   │   │   ├── documents/
│   │   │   │   └── page.tsx        # M5: Document upload page
│   │   │   └── ask/
│   │   │       └── page.tsx        # M5: Ask page with streaming
│   │   ├── components/
│   │   │   ├── ui/                 # M4: Shadcn UI components
│   │   │   ├── neural-mesh.tsx     # M4: Three.js neural mesh background
│   │   │   ├── health-dashboard.tsx # M4: Health status indicators
│   │   │   ├── command-palette.tsx  # M4: Ctrl+K command palette
│   │   │   ├── page-transition.tsx  # M4: Framer Motion page transitions
│   │   │   ├── nav-bar.tsx         # M4: Navigation bar (desktop + mobile)
│   │   │   ├── upload-zone.tsx     # M5: Drag-and-drop upload zone
│   │   │   ├── document-list.tsx   # M5: Document list with metadata
│   │   │   ├── chat-stream.tsx     # M5: Streaming token display
│   │   │   ├── confidence-gauge.tsx # M5: SVG confidence gauge
│   │   │   ├── citation-badges.tsx # M5: Citation badges
│   │   │   ├── knowledge-graph.tsx # M5: Force graph visualization
│   │   │   └── conversation-sidebar.tsx # M5: Conversation history sidebar
│   │   └── lib/
│   │       ├── api.ts              # M4: API client utilities
│   │       └── utils.ts            # M4: Utility functions
│   └── ...
└── .agents/                        # Agent metadata (NOT source code)
```
