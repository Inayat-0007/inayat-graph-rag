#!/bin/bash
set -e

# Verify Ollama is running
if ! curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "Error: Ollama is not running. Please start Ollama serve first." >&2
    exit 1
fi

echo 'Pulling nomic-embed-text:v1.5...'
ollama pull nomic-embed-text:v1.5

echo 'Pulling qwen3:4b...'
ollama pull qwen3:4b

echo 'Models pulled successfully!'
