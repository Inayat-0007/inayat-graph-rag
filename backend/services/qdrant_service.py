"""
I.N.A.Y.A.T. Qdrant Vector Database Service

Manages the Qdrant collection for hybrid dense+sparse vector search.
Collection 'documents' uses:
  - Dense vector 'dense': 768-dim (nomic-embed-text:v1.5), Cosine distance
  - Sparse vector 'sparse': BM25-based sparse vectors
"""
import hashlib
import logging
from typing import List, Dict, Any, Optional, Tuple

from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels
from qdrant_client.http.exceptions import UnexpectedResponse

from backend.config import QDRANT_HOST, QDRANT_PORT, COLLECTION_NAME, VECTOR_DIM

logger = logging.getLogger(__name__)

# Global Qdrant client instance
_client: Optional[QdrantClient] = None


def get_client() -> QdrantClient:
    """Get or create the Qdrant client singleton."""
    global _client
    if _client is None:
        _client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
        logger.info(f"Qdrant client connected to {QDRANT_HOST}:{QDRANT_PORT}")
    return _client


def ensure_collection() -> None:
    """
    Create the 'documents' collection if it does not already exist.
    Uses 768-dim dense vectors (Cosine) + sparse vectors.
    """
    client = get_client()
    try:
        collections = client.get_collections().collections
        existing_names = [c.name for c in collections]

        if COLLECTION_NAME in existing_names:
            logger.info(f"Collection '{COLLECTION_NAME}' already exists")
            return

        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config={
                "dense": qmodels.VectorParams(
                    size=VECTOR_DIM,  # 768 — nomic-embed-text:v1.5
                    distance=qmodels.Distance.COSINE,
                )
            },
            sparse_vectors_config={
                "sparse": qmodels.SparseVectorParams()
            },
        )
        logger.info(
            f"Created collection '{COLLECTION_NAME}' with "
            f"dense ({VECTOR_DIM}-dim Cosine) + sparse vectors"
        )
    except Exception as e:
        logger.error(f"Failed to ensure collection: {e}")
        raise


def upsert_chunks(
    doc_id: str,
    chunks: List[str],
    dense_vectors: List[List[float]],
    sparse_vectors: List[Dict[str, Any]],
    filename: str = "",
) -> None:
    """
    Store document chunks with their dense and sparse vectors in Qdrant.

    Args:
        doc_id: Unique document identifier
        chunks: List of text chunks
        dense_vectors: List of 768-dim dense embedding vectors
        sparse_vectors: List of sparse vector dicts with 'indices' and 'values'
        filename: Original filename for payload metadata
    """
    client = get_client()

    points = []
    for i, (chunk, dense_vec, sparse_vec) in enumerate(
        zip(chunks, dense_vectors, sparse_vectors)
    ):
        chunk_id = f"{doc_id}_chunk_{i}"

        # Deterministic int64 ID using SHA-256
        h = hashlib.sha256(chunk_id.encode("utf-8")).hexdigest()
        point_id = int(h[:16], 16) % (2**63)

        point = qmodels.PointStruct(
            id=point_id,
            vector={
                "dense": dense_vec,
                "sparse": qmodels.SparseVector(
                    indices=sparse_vec["indices"],
                    values=sparse_vec["values"],
                ),
            },
            payload={
                "doc_id": doc_id,
                "chunk_id": chunk_id,
                "text": chunk,
                "filename": filename,
                "chunk_index": i,
            },
        )
        points.append(point)

    # Upsert in batches of 100
    batch_size = 100
    for start in range(0, len(points), batch_size):
        batch = points[start : start + batch_size]
        client.upsert(collection_name=COLLECTION_NAME, points=batch)

    logger.info(f"Upserted {len(points)} chunks for doc_id={doc_id}")


def hybrid_search(
    dense_vector: List[float],
    sparse_vector: Dict[str, Any],
    limit: int = 10,
) -> List[Dict[str, Any]]:
    """
    Perform hybrid search using dense + sparse vectors with RRF fusion.

    Uses Qdrant's built-in prefetch + fusion mechanism for Reciprocal Rank Fusion.

    Args:
        dense_vector: 768-dim query embedding
        sparse_vector: Sparse query vector with 'indices' and 'values'
        limit: Number of results to return

    Returns:
        List of search results with payload and score
    """
    client = get_client()

    try:
        results = client.query_points(
            collection_name=COLLECTION_NAME,
            prefetch=[
                qmodels.Prefetch(
                    query=dense_vector,
                    using="dense",
                    limit=limit * 2,
                ),
                qmodels.Prefetch(
                    query=qmodels.SparseVector(
                        indices=sparse_vector["indices"],
                        values=sparse_vector["values"],
                    ),
                    using="sparse",
                    limit=limit * 2,
                ),
            ],
            query=qmodels.FusionQuery(fusion=qmodels.Fusion.RRF),
            limit=limit,
        )

        search_results = []
        for point in results.points:
            search_results.append({
                "id": point.id,
                "score": point.score,
                "payload": point.payload,
            })

        return search_results

    except Exception as e:
        logger.error(f"Hybrid search failed: {e}")
        return []


def get_chunk_count(doc_id: str) -> int:
    """Count the number of chunks stored for a given document."""
    client = get_client()
    try:
        result = client.count(
            collection_name=COLLECTION_NAME,
            count_filter=qmodels.Filter(
                must=[
                    qmodels.FieldCondition(
                        key="doc_id",
                        match=qmodels.MatchValue(value=doc_id),
                    )
                ]
            ),
        )
        return result.count
    except Exception as e:
        logger.error(f"Failed to count chunks for doc_id={doc_id}: {e}")
        return 0


def health_check() -> bool:
    """Check Qdrant connectivity."""
    try:
        client = get_client()
        client.get_collections()
        return True
    except Exception as e:
        logger.error(f"Qdrant health check failed: {e}")
        return False


def delete_document(doc_id: str) -> None:
    """
    Delete all vector points associated with a document from Qdrant.

    Args:
        doc_id: Unique document identifier
    """
    client = get_client()
    try:
        client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=qmodels.Filter(
                must=[
                    qmodels.FieldCondition(
                        key="doc_id",
                        match=qmodels.MatchValue(value=doc_id),
                    )
                ]
            ),
        )
        logger.info(f"Deleted all vector points for doc_id={doc_id} from Qdrant")
    except Exception as e:
        logger.error(f"Failed to delete points for doc_id={doc_id}: {e}")
        raise


def get_document_chunks(doc_id: str) -> List[Dict[str, Any]]:
    """
    Retrieve all chunk texts associated with a document from Qdrant,
    sorted chronologically by chunk_index.

    Args:
        doc_id: Unique document identifier

    Returns:
        List of dictionaries with 'chunk_id', 'chunk_index', and 'text' keys
    """
    client = get_client()
    try:
        result, _ = client.scroll(
            collection_name=COLLECTION_NAME,
            scroll_filter=qmodels.Filter(
                must=[
                    qmodels.FieldCondition(
                        key="doc_id",
                        match=qmodels.MatchValue(value=doc_id),
                    )
                ]
            ),
            limit=1000,  # Cap at 1000 chunks max per document in dev env
            with_payload=True,
            with_vectors=False,
        )

        chunks = []
        for point in result:
            payload = point.payload or {}
            chunks.append({
                "chunk_id": payload.get("chunk_id", ""),
                "chunk_index": int(payload.get("chunk_index", 0)),
                "text": payload.get("text", ""),
            })

        # Sort chunks by chunk index
        chunks.sort(key=lambda x: x["chunk_index"])
        return chunks
    except Exception as e:
        logger.error(f"Failed to scroll document chunks for doc_id={doc_id}: {e}")
        return []

