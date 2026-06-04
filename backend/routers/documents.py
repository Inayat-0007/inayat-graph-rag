"""
I.N.A.Y.A.T. Documents Router

GET /api/documents: List all uploaded documents with metadata
  Returns: {documents: [{doc_id, filename, size, created_at, chunk_count, entity_count}]}
"""
import logging

from fastapi import APIRouter, HTTPException

from backend.models import DocumentsResponse, DocumentInfo
from backend.services import neo4j_service, qdrant_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/documents", response_model=DocumentsResponse)
async def list_documents():
    """
    List all uploaded documents with their metadata.

    Fetches document info from Neo4j (filename, created_at, size, entity_count)
    and chunk counts from Qdrant.
    """
    try:
        # Fetch all documents from Neo4j
        documents = await neo4j_service.get_all_documents()

        doc_list = []
        for doc in documents:
            doc_id = doc["doc_id"]

            # Get chunk count from Qdrant
            chunk_count = qdrant_service.get_chunk_count(doc_id)

            doc_list.append(
                DocumentInfo(
                    doc_id=doc_id,
                    filename=doc.get("filename", ""),
                    size=doc.get("size", 0),
                    created_at=doc.get("created_at", ""),
                    chunk_count=chunk_count,
                    entity_count=doc.get("entity_count", 0),
                )
            )

        logger.info(f"Listed {len(doc_list)} documents")
        return DocumentsResponse(documents=doc_list)

    except Exception as e:
        logger.error(f"Failed to list documents: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve documents: {str(e)}",
        )
