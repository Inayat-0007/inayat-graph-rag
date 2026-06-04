#!/bin/bash
set -e

# ──────────────────────────────────────────────
# I.N.A.Y.A.T. Development Environment Launcher
# ──────────────────────────────────────────────

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  I.N.A.Y.A.T. Development Environment Setup  ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"

# Step 1: Set Ollama environment variables
echo -e "\n${YELLOW}[1/5]${NC} Setting Ollama environment variables..."
export OLLAMA_FLASH_ATTENTION=1
export OLLAMA_KV_CACHE_TYPE=q8_0
echo "  OLLAMA_FLASH_ATTENTION=$OLLAMA_FLASH_ATTENTION"
echo "  OLLAMA_KV_CACHE_TYPE=$OLLAMA_KV_CACHE_TYPE"

# Step 2: Start Docker containers
echo -e "\n${YELLOW}[2/5]${NC} Starting Docker containers..."
docker compose up -d
echo "  Docker containers started."

# Step 3: Wait for Neo4j & Qdrant to be healthy, and check Ollama status
echo -e "\n${YELLOW}[3/5]${NC} Checking service dependencies..."

# Trap exit signals to cleanup background servers automatically (M16)
cleanup() {
  echo -e "\n${YELLOW}Stopping background dev servers...${NC}"
  if [ -n "$BACKEND_PID" ]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [ -n "$FRONTEND_PID" ]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  docker compose down
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Check if Ollama is running (M15)
echo -n "  Checking Ollama status..."
if ! curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; then
  echo -e " ${RED}FAILED${NC}"
  echo -e "${RED}Ollama is not running. Please launch Ollama before starting I.N.A.Y.A.T.${NC}"
  exit 1
fi
echo -e " ${GREEN}OK${NC}"

echo -n "  Waiting for Neo4j..."
MAX_RETRIES=30
RETRY_COUNT=0
until curl -sf http://localhost:7474 > /dev/null 2>&1; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
    echo -e " ${RED}FAILED${NC} (timed out after ${MAX_RETRIES} attempts)"
    echo -e "${RED}Neo4j did not start in time. Check logs with: docker compose logs neo4j${NC}"
    exit 1
  fi
  echo -n "."
  sleep 2
done
echo -e " ${GREEN}OK${NC}"

# Step 4: Wait for Qdrant to be healthy
echo -n "  Waiting for Qdrant..."
RETRY_COUNT=0
until curl -sf http://localhost:6333/healthz > /dev/null 2>&1; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
    echo -e " ${RED}FAILED${NC} (timed out after ${MAX_RETRIES} attempts)"
    echo -e "${RED}Qdrant did not start in time. Check logs with: docker compose logs qdrant${NC}"
    exit 1
  fi
  echo -n "."
  sleep 2
done
echo -e " ${GREEN}OK${NC}"

# Step 5: Start backend
echo -e "\n${YELLOW}[4/5]${NC} Starting backend server..."
# Try to activate virtual environment if it exists (M14)
if [ -d ".venv" ]; then
  source .venv/bin/activate
elif [ -d "venv" ]; then
  source venv/bin/activate
fi
uvicorn backend.main:app --reload --port 8000 &
BACKEND_PID=$!
echo "  Backend started (PID: $BACKEND_PID) on http://localhost:8000"

# Step 6: Start frontend
echo -e "\n${YELLOW}[5/5]${NC} Starting frontend dev server..."
cd frontend && npm run dev &
FRONTEND_PID=$!
cd ..
echo "  Frontend started (PID: $FRONTEND_PID) on http://localhost:3000"

echo -e "\n${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  All services are running! Press Ctrl+C to stop.${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo "  Services:"
echo "    Neo4j Browser:  http://localhost:7474"
echo "    Neo4j Bolt:     bolt://localhost:7687"
echo "    Qdrant:         http://localhost:6333"
echo "    Backend API:    http://localhost:8000"
echo "    Frontend:       http://localhost:3000"
echo "    Health Check:   http://localhost:8000/api/health"
echo ""

# Wait for background processes
wait
