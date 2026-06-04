#!/bin/bash
echo 'Pulling nomic-embed-text:v1.5...'
ollama pull nomic-embed-text:v1.5
echo 'Pulling qwen3:4b...'
ollama pull qwen3:4b
echo 'Models pulled successfully!'
