"""
I.N.A.Y.A.T. Embedding Service

Thin wrapper around ollama_service.embed() that provides a clean
interface for generating 768-dim embeddings via nomic-embed-text:v1.5.
"""
import logging
from typing import List

from backend.services import ollama_service

logger = logging.getLogger(__name__)


async def get_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Generate 768-dimensional embeddings for the given texts.

    Uses nomic-embed-text:v1.5 via Ollama (CPU-only).

    Args:
        texts: List of text strings to embed

    Returns:
        List of 768-dim embedding vectors

    Raises:
        Exception: If embedding generation fails
    """
    if not texts:
        return []

    embeddings = await ollama_service.embed(texts)

    # Verify dimensions
    if embeddings and len(embeddings[0]) != 768:
        logger.warning(
            f"Expected 768-dim embeddings, got {len(embeddings[0])}-dim. "
            f"Ensure nomic-embed-text:v1.5 is being used, NOT BGE-M3."
        )

    logger.info(f"Generated {len(embeddings)} embeddings (768-dim)")
    return embeddings
