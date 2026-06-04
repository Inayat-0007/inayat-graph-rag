"""
I.N.A.Y.A.T. Health Router

GET /api/health: Check all 5 services and return health status
  Services: qdrant, neo4j, ollama, embed_model, gen_model
  Returns: {status, services: {qdrant, neo4j, ollama, embed_model, gen_model}}
"""
import logging

from fastapi import APIRouter

from backend.models import HealthResponse, ServiceStatus
from backend.config import EMBED_MODEL, GEN_MODEL
from backend.services import qdrant_service, neo4j_service, ollama_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Check the health of all backend services.

    Checks:
      1. Qdrant vector database connectivity
      2. Neo4j graph database connectivity
      3. Ollama API connectivity
      4. Embedding model availability (nomic-embed-text:v1.5)
      5. Generation model availability (qwen3:4b)
    """
    services = ServiceStatus()

    # Check Qdrant
    try:
        services.qdrant = qdrant_service.health_check()
    except Exception as e:
        logger.error(f"Qdrant health check error: {e}")
        services.qdrant = False

    # Check Neo4j
    try:
        services.neo4j = await neo4j_service.health_check()
    except Exception as e:
        logger.error(f"Neo4j health check error: {e}")
        services.neo4j = False

    # Check Ollama
    try:
        services.ollama = await ollama_service.health_check()
    except Exception as e:
        logger.error(f"Ollama health check error: {e}")
        services.ollama = False

    # Check embedding model (nomic-embed-text:v1.5)
    try:
        services.embed_model = await ollama_service.check_model(EMBED_MODEL)
    except Exception as e:
        logger.error(f"Embed model check error: {e}")
        services.embed_model = False

    # Check generation model (qwen3:4b)
    try:
        services.gen_model = await ollama_service.check_model(GEN_MODEL)
    except Exception as e:
        logger.error(f"Gen model check error: {e}")
        services.gen_model = False

    # Overall status
    all_healthy = all([
        services.qdrant,
        services.neo4j,
        services.ollama,
        services.embed_model,
        services.gen_model,
    ])

    status = "healthy" if all_healthy else "degraded"

    logger.info(
        f"Health check: {status} — "
        f"qdrant={services.qdrant}, neo4j={services.neo4j}, "
        f"ollama={services.ollama}, embed={services.embed_model}, "
        f"gen={services.gen_model}"
    )

    return HealthResponse(status=status, services=services)
