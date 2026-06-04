# I.N.A.Y.A.T. — Setup Guide

> **I**ntelligent **N**eural **A**rchitecture for **Y**ielding **A**gentic **T**hinking

Complete first-time setup instructions for the I.N.A.Y.A.T. Knowledge Intelligence System.

---

## Prerequisites

Ensure the following are installed on your system before proceeding:

| Tool | Version | Purpose | Install Link |
|------|---------|---------|-------------|
| **Docker Desktop** | Latest | Runs Neo4j and Qdrant containers | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop) |
| **Python** | 3.11+ | Backend (FastAPI) | [python.org/downloads](https://www.python.org/downloads/) |
| **Node.js** | 18+ | Frontend (Next.js) | [nodejs.org](https://nodejs.org/) |
| **Ollama** | Latest | Local LLM inference | [ollama.com/download](https://ollama.com/download) |
| **Git** | Latest | Version control | [git-scm.com](https://git-scm.com/) |

### Hardware Requirements
- **GPU**: NVIDIA RTX 3050 (4 GB VRAM) or better — `qwen3:4b` uses ~2.5 GB VRAM
- **RAM**: 8 GB minimum (16 GB recommended)
- **Disk**: ~10 GB free (models + Docker images + data)

---

## 1. Clone the Repository

```bash
git clone https://github.com/Inayat-0007/inayat-graph-rag.git
cd inayat-graph-rag
```

---

## 2. Pull Ollama Models

The project uses two Ollama models:
- **nomic-embed-text:v1.5** — 768-dimensional embeddings (runs on CPU)
- **qwen3:4b** — Text generation (runs on GPU, ~2.5 GB VRAM)

### Using the script (Linux/macOS/WSL):
```bash
chmod +x scripts/pull_models.sh
./scripts/pull_models.sh
```

### Manual pull:
```bash
ollama pull nomic-embed-text:v1.5
ollama pull qwen3:4b
```

Verify models are available:
```bash
ollama list
```

---

## 3. Ollama Environment Variables

Set these environment variables for optimal performance on RTX 3050:

```bash
export OLLAMA_FLASH_ATTENTION=1
export OLLAMA_KV_CACHE_TYPE=q8_0
```

On **Windows (PowerShell)**:
```powershell
$env:OLLAMA_FLASH_ATTENTION = "1"
$env:OLLAMA_KV_CACHE_TYPE = "q8_0"
```

> **Note**: `OLLAMA_FLASH_ATTENTION=1` enables flash attention for faster inference.
> `OLLAMA_KV_CACHE_TYPE=q8_0` reduces VRAM usage via quantized KV cache.

---

## 4. Start Services

### Option A: Automated Start (Linux/macOS/WSL)

The `start_dev.sh` script handles everything:

```bash
chmod +x scripts/start_dev.sh
./scripts/start_dev.sh
```

This will:
1. Set Ollama environment variables
2. Start Docker containers (Neo4j + Qdrant)
3. Wait for services to become healthy
4. Start the backend API server
5. Start the frontend dev server

### Option B: Manual Start

#### Step 4a: Start Docker Containers

Make sure Docker Desktop is running, then:

```bash
docker compose up -d
```

Verify containers are running:
```bash
docker compose ps
```

Wait for health checks to pass:
```bash
docker compose ps --format "table {{.Name}}\t{{.Status}}"
```

You should see both `inayat-neo4j` and `inayat-qdrant` with status `(healthy)`.

#### Step 4b: Set Up the Backend

```bash
# Create a Python virtual environment (recommended)
python -m venv venv

# Activate the virtual environment
# Linux/macOS:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install Python dependencies
pip install -r backend/requirements.txt

# Start the backend server
uvicorn backend.main:app --reload --port 8000
```

The backend API will be available at `http://localhost:8000`.

#### Step 4c: Set Up the Frontend

Open a new terminal:

```bash
cd frontend

# Install Node.js dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:3000`.

---

## 5. Verify Installation

### Check Service Health

Open your browser or use curl to check all services:

```bash
curl http://localhost:8000/api/health
```

Expected response:
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

### Check Individual Services

| Service | URL | Expected |
|---------|-----|----------|
| Neo4j Browser | http://localhost:7474 | Neo4j web interface |
| Neo4j Bolt | bolt://localhost:7687 | Connection accepted |
| Qdrant | http://localhost:6333 | JSON status response |
| Qdrant Health | http://localhost:6333/healthz | `OK` or empty 200 |
| Backend API | http://localhost:8000 | FastAPI response |
| Frontend | http://localhost:3000 | Next.js application |

---

## 6. Service Details

### Neo4j
- **Browser**: http://localhost:7474
- **Bolt**: bolt://localhost:7687
- **Username**: `neo4j`
- **Password**: `inayat2026`
- **Heap**: 512 MB initial, 1536 MB max
- **Page Cache**: 256 MB

### Qdrant
- **REST API**: http://localhost:6333
- **Collection**: `documents` (created automatically by the backend)
- **Dense vectors**: 768-dimensional, Cosine distance
- **Sparse vectors**: BM25-based

### Ollama
- **API**: http://localhost:11434 (default)
- **Embedding model**: `nomic-embed-text:v1.5` (768-dim, CPU)
- **Generation model**: `qwen3:4b` (GPU, ~2.5 GB VRAM)

---

## 7. Stopping Services

### Stop everything:
```bash
# Stop the frontend (Ctrl+C in its terminal)
# Stop the backend (Ctrl+C in its terminal)

# Stop Docker containers
docker compose down
```

### Stop and remove data:
```bash
docker compose down -v
```

> **Warning**: `docker compose down -v` removes all stored data in Neo4j and Qdrant.

---

## 8. Troubleshooting

### Docker containers won't start
- Ensure Docker Desktop is running
- Check if ports 7474, 7687, or 6333 are already in use:
  ```bash
  # Linux/macOS
  lsof -i :7474
  lsof -i :7687
  lsof -i :6333
  # Windows (PowerShell)
  netstat -ano | findstr :7474
  netstat -ano | findstr :7687
  netstat -ano | findstr :6333
  ```
- View container logs for errors:
  ```bash
  docker compose logs neo4j
  docker compose logs qdrant
  ```

### Neo4j health check fails
- Neo4j takes 20–60 seconds to start; wait and retry
- Ensure you have at least 2 GB of free RAM for Neo4j
- Check Neo4j logs: `docker compose logs neo4j`

### Qdrant health check fails
- Qdrant usually starts within 10 seconds
- Ensure port 6333 is not occupied
- Check Qdrant logs: `docker compose logs qdrant`

### Ollama model pull fails
- Ensure Ollama is running: `ollama serve`
- Check available disk space (~4 GB needed for both models)
- Retry the pull command

### VRAM issues with qwen3:4b
- Close other GPU applications (games, other AI tools)
- Ensure `OLLAMA_FLASH_ATTENTION=1` is set
- Ensure `OLLAMA_KV_CACHE_TYPE=q8_0` is set
- Check VRAM usage: `nvidia-smi`

### Backend won't start
- Ensure the virtual environment is activated
- Ensure all dependencies are installed: `pip install -r backend/requirements.txt`
- Check that Docker containers (Neo4j, Qdrant) are healthy first

### Frontend won't start
- Ensure Node.js 18+ is installed: `node --version`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check if port 3000 is already in use

### Connection refused errors
- Ensure all services are running in the correct order:
  1. Docker containers (Neo4j + Qdrant) first
  2. Ollama running (`ollama serve`)
  3. Backend server
  4. Frontend server

---

## Quick Reference

```bash
# Pull models (first time only)
./scripts/pull_models.sh

# Start everything
./scripts/start_dev.sh

# Or manually:
docker compose up -d            # Start databases
uvicorn backend.main:app --reload --port 8000  # Start backend
cd frontend && npm run dev      # Start frontend

# Stop everything
docker compose down             # Stop databases
# Ctrl+C to stop backend/frontend

# View logs
docker compose logs -f neo4j
docker compose logs -f qdrant

# Reset data
docker compose down -v
```
