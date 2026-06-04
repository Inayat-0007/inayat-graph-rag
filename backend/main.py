"""
I.N.A.Y.A.T. — Intelligent Neural Architecture for Yielding Agentic Thinking

FastAPI Application Entry Point

Usage:
    uvicorn backend.main:app --reload --port 8000
"""
import os
import logging
from contextlib import asynccontextmanager

import aiosqlite
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import DB_PATH, COLLECTION_NAME, CORS_ORIGINS, NEO4J_PASSWORD
from backend.services import qdrant_service, neo4j_service, memory_service
from backend.routers import upload, documents, graph, health, query, history

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events."""
    # === STARTUP ===
    logger.info("I.N.A.Y.A.T. API starting up...")
    if not NEO4J_PASSWORD:
        logger.warning(
            "NEO4J_PASSWORD environment variable is not set. "
            "Please ensure it is set in your .env file, otherwise connection to Neo4j database will fail."
        )

    # Initialize Qdrant collection
    try:
        qdrant_service.ensure_collection()
        logger.info(f"Qdrant collection '{COLLECTION_NAME}' ready")
    except Exception as e:
        logger.warning(f"Qdrant initialization failed (will retry on first request): {e}")

    # Initialize Neo4j driver
    try:
        await neo4j_service.get_driver()
        logger.info("Neo4j driver initialized")
    except Exception as e:
        logger.warning(f"Neo4j initialization failed (will retry on first request): {e}")

    # Initialize SQLite database
    try:
        await memory_service.init_db()
    except Exception as e:
        logger.warning(f"SQLite initialization failed: {e}")

    logger.info("I.N.A.Y.A.T. API startup complete")

    yield  # Application running

    # === SHUTDOWN ===
    logger.info("I.N.A.Y.A.T. API shutting down...")

    # Close Neo4j driver
    try:
        await neo4j_service.close()
    except Exception as e:
        logger.error(f"Error closing Neo4j driver: {e}")

    logger.info("I.N.A.Y.A.T. API shutdown complete")


# Create the FastAPI application
app = FastAPI(
    title="I.N.A.Y.A.T. API",
    description=(
        "Intelligent Neural Architecture for Yielding Agentic Thinking — "
        "A fully local AI Knowledge Intelligence System with Graph RAG, "
        "Hybrid Search, and Knowledge Graph Visualization."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware — allow configured origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request size middleware
@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    """Middleware to limit request body size for non-upload endpoints."""
    # For upload endpoint, the file size is checked in the router
    # For other endpoints, limit request body to 10 MB
    if request.url.path != "/api/upload":
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > 10 * 1024 * 1024:
            return JSONResponse(
                status_code=413,
                content={"detail": "Request body too large (max 10 MB)"},
            )
    response = await call_next(request)
    return response


# Global error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle uncaught exceptions with structured logging."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# Include routers with /api prefix
app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(documents.router, prefix="/api", tags=["Documents"])
app.include_router(graph.router, prefix="/api", tags=["Graph"])
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(query.router, prefix="/api", tags=["Query"])
app.include_router(history.router, prefix="/api", tags=["History"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "I.N.A.Y.A.T. API",
        "version": "1.0.0",
        "docs": "/docs",
    }
