"""
I.N.A.Y.A.T. Backend Configuration Constants
"""
import os
from dotenv import load_dotenv

# Load env variables from .env file
load_dotenv()

# Ollama settings
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
EMBED_MODEL = "nomic-embed-text:v1.5"
GEN_MODEL = "qwen3:4b"

# Qdrant settings
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))

# Neo4j settings
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")  # No hardcoded password default (M2)

# CORS settings
CORS_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")

# Qdrant collection
COLLECTION_NAME = "documents"

# Chunking parameters
CHUNK_SIZE = 512
CHUNK_OVERLAP = 64

# Vector dimensions — 768 for nomic-embed-text:v1.5 (NEVER 1024)
VECTOR_DIM = 768

# File upload constraints
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}

# SQLite database path
DB_PATH = os.getenv("DB_PATH", "data/conversations.db")
