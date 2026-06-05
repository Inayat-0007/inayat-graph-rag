"""
I.N.A.Y.A.T. Reranker Service

Uses sentence_transformers CrossEncoder with cross-encoder/ms-marco-MiniLM-L-6-v2
for CPU-only cross-encoder reranking of search results.

The model is lazy-loaded on first use (~80MB RAM, CPU-only).
"""
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Model name — NEVER change this
RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"

# Lazy-loaded model singleton
_model = None
_import_failed = False


def _get_model():
    """
    Lazy-load the CrossEncoder model on first use.

    Returns the model instance, or None if loading failed.
    """
    global _model, _import_failed

    if _model is not None:
        return _model

    if _import_failed:
        return None

    # Check import first (if sentence-transformers is not installed, it is a permanent error)
    try:
        from sentence_transformers import CrossEncoder
    except ImportError as e:
        _import_failed = True
        logger.error(f"sentence-transformers package is not installed: {e}")
        return None

    # Try downloading and loading the model (if HF download fails, we allow retrying on next query)
    try:
        logger.info(f"Loading reranker model: {RERANKER_MODEL} (CPU-only, ~80MB)...")
        _model = CrossEncoder(RERANKER_MODEL, max_length=512, device="cpu")
        logger.info(f"Reranker model loaded successfully: {RERANKER_MODEL}")
        return _model
    except Exception as e:
        logger.error(f"Failed to load/download reranker model '{RERANKER_MODEL}': {e}")
        return None


def rerank(
    query: str,
    documents: List[Dict[str, Any]],
    top_k: int = 3,
) -> List[Dict[str, Any]]:
    """
    Rerank documents using cross-encoder scoring.

    Scores each (query, document_text) pair and returns the top_k
    documents sorted by descending relevance score.

    Args:
        query: The search query string
        documents: List of search result dicts, each must have a
                   'payload' dict containing a 'text' field
        top_k: Number of top results to return (default: 3)

    Returns:
        List of top_k documents sorted by reranker score,
        each augmented with a 'rerank_score' field.
        Falls back to returning the original top_k if model is unavailable.
    """
    if not documents:
        return []

    if not query.strip():
        return documents[:top_k]

    model = _get_model()
    if model is None:
        logger.warning(
            "Reranker model unavailable — returning top results by original score"
        )
        return documents[:top_k]

    try:
        # Build query-document pairs for scoring
        pairs = []
        for doc in documents:
            text = ""
            if isinstance(doc.get("payload"), dict):
                text = doc["payload"].get("text", "")
            pairs.append((query, text))

        # Score all pairs at once
        scores = model.predict(pairs)

        # Attach scores to documents
        scored_docs = []
        for i, doc in enumerate(documents):
            doc_copy = dict(doc)
            doc_copy["rerank_score"] = float(scores[i])
            scored_docs.append(doc_copy)

        # Sort by reranker score descending
        scored_docs.sort(key=lambda d: d["rerank_score"], reverse=True)

        logger.info(
            f"Reranked {len(documents)} documents → top {top_k} "
            f"(best score: {scored_docs[0]['rerank_score']:.4f})"
        )

        return scored_docs[:top_k]

    except Exception as e:
        logger.error(f"Reranking failed (falling back to original order): {e}")
        return documents[:top_k]
