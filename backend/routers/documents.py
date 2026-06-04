"""
I.N.A.Y.A.T. Documents Router

GET /api/documents: List all uploaded documents with metadata
  Returns: {documents: [{doc_id, filename, size, created_at, chunk_count, entity_count}]}
"""
import logging

from fastapi import APIRouter, HTTPException

from backend.models import DocumentsResponse, DocumentInfo, DocumentChunksResponse, DocumentChunkInfo
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


@router.get("/documents/{doc_id}/chunks", response_model=DocumentChunksResponse)
async def get_document_chunks(doc_id: str):
    """
    Retrieve all text chunks and positions for a specific document.
    """
    try:
        chunks_data = qdrant_service.get_document_chunks(doc_id)
        
        chunks = [
            DocumentChunkInfo(
                chunk_id=c["chunk_id"],
                chunk_index=c["chunk_index"],
                text=c["text"]
            )
            for c in chunks_data
        ]
        
        logger.info(f"Retrieved {len(chunks)} text chunks for doc_id={doc_id}")
        return DocumentChunksResponse(chunks=chunks)
        
    except Exception as e:
        logger.error(f"Failed to get chunks for doc_id={doc_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve document chunks: {str(e)}"
        )


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """
    Delete an uploaded document from both Qdrant (vectors) and Neo4j (graph).
    Clean up any unique entities that are no longer referenced by other documents.
    """
    try:
        # 1. Delete from Qdrant
        qdrant_service.delete_document(doc_id)
        
        # 2. Delete from Neo4j
        await neo4j_service.delete_document(doc_id)
        
        logger.info(f"Successfully deleted document={doc_id} from vector and graph databases")
        return {"status": "success", "doc_id": doc_id}
        
    except Exception as e:
        logger.error(f"Failed to delete document={doc_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete document: {str(e)}"
        )

