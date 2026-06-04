"""
I.N.A.Y.A.T. Ollama API Service

Handles all interactions with the Ollama API:
  - Embedding via nomic-embed-text:v1.5 (768-dim, CPU)
  - Generation via qwen3:4b (num_ctx=4096, /no_think, keep_alive=0 for uploads)
  - Entity extraction using JSON mode
  - Model availability checks

CRITICAL CONSTRAINTS:
  - NEVER use BGE-M3 (1024-dim) — always nomic-embed-text:v1.5 (768-dim)
  - NEVER use qwen3:8b — always qwen3:4b
  - ALL qwen3:4b calls: num_ctx=4096, system prompt ends with /no_think
  - Upload pipeline: keep_alive="0" to free GPU memory immediately
"""
import json
import logging
from typing import List, Dict, Any, Optional, AsyncGenerator

import httpx

from backend.config import OLLAMA_BASE_URL, EMBED_MODEL, GEN_MODEL

logger = logging.getLogger(__name__)

# Shared httpx async client
_http_client: Optional[httpx.AsyncClient] = None


def _get_http_client() -> httpx.AsyncClient:
    """Get or create the shared httpx async client."""
    global _http_client
    if _http_client is None:
        _http_client = httpx.AsyncClient(
            base_url=OLLAMA_BASE_URL,
            timeout=httpx.Timeout(300.0, connect=10.0),
        )
    return _http_client


async def embed(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings using nomic-embed-text:v1.5 via Ollama.

    Args:
        texts: List of text strings to embed

    Returns:
        List of 768-dimensional embedding vectors
    """
    client = _get_http_client()

    all_embeddings = []
    # Process in batches to avoid overloading
    batch_size = 32
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]

        response = await client.post(
            "/api/embed",
            json={
                "model": EMBED_MODEL,  # nomic-embed-text:v1.5
                "input": batch,
                "options": {
                    "num_gpu": 0,
                },
            },
        )
        response.raise_for_status()
        data = response.json()

        embeddings = data.get("embeddings", [])
        all_embeddings.extend(embeddings)

    logger.info(f"Generated {len(all_embeddings)} embeddings ({EMBED_MODEL})")
    return all_embeddings


async def generate(
    prompt: str,
    system: str = "",
    stream: bool = False,
    keep_alive: Optional[str] = None,
) -> str:
    """
    Generate text using qwen3:4b via Ollama.

    The system prompt ALWAYS has /no_think appended.
    num_ctx is ALWAYS set to 4096.

    Args:
        prompt: The user prompt
        system: System prompt (will have /no_think appended)
        stream: Whether to stream (use generate_stream for streaming)
        keep_alive: Set to "0" for upload pipeline to free GPU immediately

    Returns:
        Generated text response
    """
    client = _get_http_client()

    # CRITICAL: System prompt MUST end with /no_think
    system_prompt = system.rstrip()
    if not system_prompt.endswith("/no_think"):
        system_prompt = f"{system_prompt}\n/no_think" if system_prompt else "/no_think"

    request_body: Dict[str, Any] = {
        "model": GEN_MODEL,  # qwen3:4b — NEVER qwen3:8b
        "prompt": prompt,
        "system": system_prompt,
        "stream": False,
        "options": {
            "num_ctx": 4096,  # CRITICAL: Cap KV cache
        },
    }

    if keep_alive is not None:
        request_body["keep_alive"] = keep_alive

    response = await client.post("/api/generate", json=request_body)
    response.raise_for_status()
    data = response.json()

    return data.get("response", "")


async def generate_stream(
    prompt: str,
    system: str = "",
    keep_alive: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """
    Stream text generation using qwen3:4b via Ollama.

    Yields tokens as they are generated.

    Args:
        prompt: The user prompt
        system: System prompt (will have /no_think appended)
        keep_alive: Optional keep_alive parameter
    """
    client = _get_http_client()

    # CRITICAL: System prompt MUST end with /no_think
    system_prompt = system.rstrip()
    if not system_prompt.endswith("/no_think"):
        system_prompt = f"{system_prompt}\n/no_think" if system_prompt else "/no_think"

    request_body: Dict[str, Any] = {
        "model": GEN_MODEL,  # qwen3:4b
        "prompt": prompt,
        "system": system_prompt,
        "stream": True,
        "options": {
            "num_ctx": 4096,
        },
    }

    if keep_alive is not None:
        request_body["keep_alive"] = keep_alive

    async with client.stream("POST", "/api/generate", json=request_body) as response:
        response.raise_for_status()
        in_thinking = False
        yielded_think_start = False
        async for line in response.aiter_lines():
            if line.strip():
                try:
                    data = json.loads(line)
                    thinking = data.get("thinking", "")
                    token = data.get("response", "")
                    if thinking:
                        if not yielded_think_start:
                            yield "<think>\n"
                            yielded_think_start = True
                            in_thinking = True
                        yield thinking
                    if token:
                        if in_thinking:
                            yield "\n</think>\n\n"
                            in_thinking = False
                        yield token
                    if data.get("done", False):
                        if in_thinking:
                            yield "\n</think>\n\n"
                        break
                except json.JSONDecodeError:
                    continue


async def extract_entities(text: str, keep_alive: Optional[str] = "0") -> Dict[str, Any]:
    """
    Extract entities and relationships from text using qwen3:4b in JSON mode.

    Uses keep_alive="0" by default to free GPU memory after extraction (upload pipeline).
    On any failure, returns an empty graph structure (graceful fallback).

    Args:
        text: Text to extract entities from
        keep_alive: Optional keep_alive string ("0" to unload immediately)

    Returns:
        Dict with 'entities' (list of {name, type}) and
        'relationships' (list of {source, target, relation})
    """
    empty_result = {"entities": [], "relationships": []}

    system_prompt = (
        "You are an entity extraction assistant. "
        "Extract named entities and their relationships from the given text. "
        "Return a valid JSON object with exactly two keys:\n"
        '- "entities": a list of objects with "name" (string) and "type" (string, e.g. PERSON, ORGANIZATION, CONCEPT, LOCATION, DATE, TECHNOLOGY)\n'
        '- "relationships": a list of objects with "source" (string), "target" (string), and "relation" (string)\n'
        "Return ONLY the JSON object, no other text.\n"
        "/no_think"
    )

    prompt = f"Extract entities and relationships from the following text:\n\n{text[:3000]}"

    client = _get_http_client()

    try:
        request_body = {
            "model": GEN_MODEL,  # qwen3:4b
            "prompt": prompt,
            "system": system_prompt,
            "stream": False,
            "format": "json",
            "options": {
                "num_ctx": 4096,
            },
        }
        if keep_alive is not None:
            request_body["keep_alive"] = keep_alive

        response = await client.post(
            "/api/generate",
            json=request_body,
            timeout=httpx.Timeout(120.0, connect=10.0),
        )
        response.raise_for_status()
        data = response.json()

        response_text = data.get("response", "").strip()
        if not response_text:
            # Fallback for reasoning/thinking models which might output JSON inside the thinking/CoT field
            response_text = data.get("thinking", "").strip()
            if response_text:
                logger.info("Found entity extraction payload inside the Ollama 'thinking' field")

        if not response_text:
            logger.warning("Empty response from entity extraction")
            return empty_result

        # Parse the JSON response
        parsed = json.loads(response_text)

        # Validate the structure
        entities = parsed.get("entities", [])
        relationships = parsed.get("relationships", [])

        # Ensure each entity has required fields
        validated_entities = []
        for entity in entities:
            if isinstance(entity, dict) and "name" in entity:
                validated_entities.append({
                    "name": str(entity["name"]),
                    "type": str(entity.get("type", "UNKNOWN")),
                })

        validated_relationships = []
        for rel in relationships:
            if isinstance(rel, dict) and "source" in rel and "target" in rel:
                validated_relationships.append({
                    "source": str(rel["source"]),
                    "target": str(rel["target"]),
                    "relation": str(rel.get("relation", "RELATED")),
                })

        result = {
            "entities": validated_entities,
            "relationships": validated_relationships,
        }

        logger.info(
            f"Extracted {len(validated_entities)} entities and "
            f"{len(validated_relationships)} relationships"
        )
        return result

    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse entity extraction JSON: {e}")
        return empty_result
    except httpx.HTTPError as e:
        logger.warning(f"HTTP error during entity extraction: {e}")
        return empty_result
    except Exception as e:
        logger.warning(f"Entity extraction failed (graceful fallback): {e}")
        return empty_result


async def check_model(model_name: str) -> bool:
    """
    Check if a specific model is available in Ollama.

    Args:
        model_name: Name of the model to check

    Returns:
        True if the model is available
    """
    client = _get_http_client()
    try:
        response = await client.post(
            "/api/show",
            json={"name": model_name},
        )
        return response.status_code == 200
    except Exception as e:
        logger.error(f"Model check failed for {model_name}: {e}")
        return False


async def health_check() -> bool:
    """Check Ollama API connectivity."""
    client = _get_http_client()
    try:
        response = await client.get("/api/tags")
        return response.status_code == 200
    except Exception as e:
        logger.error(f"Ollama health check failed: {e}")
        return False
