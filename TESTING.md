# I.N.A.Y.A.T. — Manual Test Plan & Verification

This document provides a step-by-step verification plan to confirm the local setup of the I.N.A.Y.A.T. Knowledge Intelligence System.

---

## Pre-requisites

Ensure the services are running:
1. Docker Desktop is active.
2. Ollama is running (`ollama list` shows both `qwen3:4b` and `nomic-embed-text:v1.5`).
3. Services started via `./scripts/start_dev.sh` (or started manually).

---

## 1. Automated Health Check (FastAPI Backend)

Execute the following `curl` command or navigate to the URL in your browser:

```bash
curl http://localhost:8000/api/health
```

### Expected Output
All services must be marked as `connected` or `available`:

```json
{
  "status": "healthy",
  "services": {
    "qdrant": "connected",
    "neo4j": "connected",
    "ollama": "connected",
    "embed_model": "available",
    "gen_model": "available"
  }
}
```

---

## 2. Ingestion Pipeline Verification (Neo4j & Qdrant)

### Step 2.1: Open Dashboard
1. Open http://localhost:3000 in your browser.
2. Confirm the **Health Status** panel on the Home screen shows all green indicators.
3. Click **Documents** in the navigation bar.

### Step 2.2: Upload Test File
1. Prepare a simple `.txt` file containing structural details (e.g., "TheLNCT Group is led by Director Moham, who collaborates with Lead Engineer Inayat. They build intelligent neuro networks together.").
2. Drag and drop the file into the upload zone.
3. Confirm the status changes from **Ingesting** to **Ingestion Complete**.
4. Note the reported counts for **Chunks** and **Entities**.

### Step 2.3: Verify DB Entries
- **Qdrant**: Open http://localhost:6333/dashboard in your browser, or query collections:
  ```bash
  curl http://localhost:6333/collections/documents
  ```
  Ensure vector size is `768` (dense config).
- **Neo4j**: Open http://localhost:7474, log in (`username: neo4j, password: inayat2026`), and run:
  ```cypher
  MATCH (n) RETURN n LIMIT 25
  ```
  Verify that `Document` and `Entity` (Moham, Inayat, LNCT Group) nodes are rendered.

---

## 3. Query SSE Stream & RAG Retrieval

### Step 3.1: Navigate to Ask Panel
1. Click **Ask** in the navigation menu.
2. In the input box, type: `"How is Moham connected to Inayat?"` and press Enter.

### Step 3.2: Verify Stream Events
The stream response should update dynamically:
- **Tokens**: Stream sequentially to construct the answer text.
- **Graph**: The graph canvas on the right side should immediately draw circles and linking lines (representing the retrieved 1-hop subgraph).
- **Citations**: Clickable citations should populate underneath the confidence gauge.
- **Confidence Gauge**: Should animate to show the LLM's computed confidence level (e.g., `85%` or higher).

### Step 3.3: Verify Conversation Persistence
1. Refresh the page.
2. Click on the sidebar conversation history tab.
3. Confirm your last conversation is loaded back cleanly with session data intact.

---

## 4. Hardware Constraints & VRAM Safety Checks

Open a terminal and run the CUDA monitor during query processing:

```bash
nvidia-smi
```

Confirm that:
- Total VRAM usage does not exceed **4.0 GB** (should stay around **3.0-3.3 GB** including Windows overhead).
- After query processing, Ollama model memory goes warm (holds model for fast follow-ups).
- During uploads, `keep_alive: 0` is applied (check backend console logs for Ollama model load/unload triggers).
