# ──────────────────────────────────────────────
# I.N.A.Y.A.T. Windows Environment Launcher
# ──────────────────────────────────────────────

Clear-Host
Write-Host "=============================================" -ForegroundColor Green
Write-Host "  I.N.A.Y.A.T. Environment Launcher (Windows) " -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Step 1: Set Ollama environment variables
Write-Host "`n[1/5] Setting Ollama environment variables..." -ForegroundColor Yellow
$env:OLLAMA_FLASH_ATTENTION = 1
$env:OLLAMA_KV_CACHE_TYPE = "q8_0"
Write-Host "  OLLAMA_FLASH_ATTENTION = 1"
Write-Host "  OLLAMA_KV_CACHE_TYPE = q8_0"

# Step 2: Start Docker containers
Write-Host "`n[2/5] Starting Docker containers (Qdrant + Neo4j)..." -ForegroundColor Yellow
docker compose up -d

# Step 3: Wait for Neo4j & Qdrant to be healthy
Write-Host "`n[3/5] Checking service health endpoints..." -ForegroundColor Yellow

# Wait for Neo4j
Write-Host -NoNewline "  Waiting for Neo4j..."
$maxRetries = 30
$retryCount = 0
$neo4jHealthy = $false

while (-not $neo4jHealthy -and $retryCount -lt $maxRetries) {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:7474" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
        $neo4jHealthy = $true
    } catch {
        $retryCount++
        Write-Host -NoNewline "."
        Start-Sleep -Seconds 2
    }
}

if ($neo4jHealthy) {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host "Neo4j failed to start. Run 'docker compose logs neo4j' for details." -ForegroundColor Red
    Exit 1
}

# Wait for Qdrant
Write-Host -NoNewline "  Waiting for Qdrant..."
$retryCount = 0
$qdrantHealthy = $false

while (-not $qdrantHealthy -and $retryCount -lt $maxRetries) {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:6333/healthz" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
        $qdrantHealthy = $true
    } catch {
        $retryCount++
        Write-Host -NoNewline "."
        Start-Sleep -Seconds 2
    }
}

if ($qdrantHealthy) {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host "Qdrant failed to start. Run 'docker compose logs qdrant' for details." -ForegroundColor Red
    Exit 1
}

# Step 4: Start backend
Write-Host "`n[4/5] Launching backend server in a separate window..." -ForegroundColor Yellow
$pythonPath = "python"
# Check if virtual environment exists and use its python if present
if (Test-Path ".venv\Scripts\python.exe") {
    $pythonPath = ".venv\Scripts\python.exe"
}

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Starting I.N.A.Y.A.T. Backend...' -ForegroundColor Green; $pythonPath -m uvicorn backend.main:app --port 8000"
Write-Host "  Backend running on http://localhost:8000"

# Step 5: Start frontend
Write-Host "`n[5/5] Launching frontend developer server in a separate window..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Starting I.N.A.Y.A.T. Frontend...' -ForegroundColor Green; cd frontend; npm run dev"
Write-Host "  Frontend running on http://localhost:3000"

Write-Host "`n=============================================" -ForegroundColor Green
Write-Host "  All services started successfully!         " -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  URLs:"
Write-Host "    Frontend Dashboard: http://localhost:3000"
Write-Host "    Backend Health API: http://localhost:8000/api/health"
Write-Host "    Neo4j Browser Web:  http://localhost:7474"
Write-Host "    Qdrant Dashboard:   http://localhost:6333/dashboard"
Write-Host ""
Write-Host "  Keep the spawned console windows open to view server logs."
Write-Host "  To stop everything: Close the windows and run 'docker compose down'."
Write-Host ""
