# I.N.A.Y.A.T. PowerShell Model Puller
# Pulls the required embedding and generation models via Ollama.

Write-Host "Pulling nomic-embed-text:v1.5..." -ForegroundColor Green
ollama pull nomic-embed-text:v1.5

Write-Host "Pulling qwen3:4b..." -ForegroundColor Green
ollama pull qwen3:4b

Write-Host "Models pulled successfully!" -ForegroundColor Green
