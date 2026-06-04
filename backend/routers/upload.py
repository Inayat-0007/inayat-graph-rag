"""
I.N.A.Y.A.T. Upload Router

POST /api/upload: Accept multipart file upload
  1. Validate file type (magic bytes + extension)
  2. Limit file size (50 MB)
  3. Extract text (PDF / DOCX / TXT)
  4. Chunk text (512 tokens, 64 overlap)
  5. Generate embeddings (768-dim via nomic-embed-text:v1.5)
  6. Generate sparse vectors (BM25)
  7. Upsert to Qdrant (hybrid: dense + sparse)
  8. Extract entities via qwen3:4b (keep_alive=0, /no_think, num_ctx=4096)
  9. Store entities/relationships in Neo4j
  10. Return {doc_id, filename, chunk_count, entity_count}
"""
import uuid
import logging

from fastapi import APIRouter, UploadFile, File, HTTPException

from backend.models import UploadResponse
from backend.config import MAX_FILE_SIZE
from backend.services import (
    document_service,
    embedding_service,
    sparse_service,
    qdrant_service,
    ollama_service,
    neo4j_service,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """
    Upload a document for processing and ingestion into the knowledge base.

    Accepts PDF, DOCX, or TXT files up to 50 MB.
    """
    filename = file.filename or "unknown"
    logger.info(f"Upload started: {filename}")

    # 1. Read file content
    content_bytes = await file.read()

    # 2. Validate file size
    if len(content_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size {len(content_bytes)} exceeds maximum of {MAX_FILE_SIZE} bytes (50 MB)",
        )

    # 3. Validate file type (magic bytes + extension)
    validation_error = document_service.validate_file(filename, content_bytes)
    if validation_error:
        raise HTTPException(status_code=400, detail=validation_error)

    # 4. Generate deterministic document ID based on content hash
    import hashlib
    doc_id = hashlib.sha256(content_bytes).hexdigest()

    try:
        # 5. Extract text
        text = document_service.extract_text(content_bytes, filename)
        if not text or not text.strip():
            raise HTTPException(
                status_code=400,
                detail="No text could be extracted from the file. Please ensure the PDF is text-based and not scanned (scanned image PDFs require OCR which is not supported).",
            )

        # 6. Chunk text (512 tokens, 64 overlap)
        chunks = document_service.chunk_text(text)
        if not chunks:
            raise HTTPException(
                status_code=400,
                detail="Text could not be split into chunks",
            )

        logger.info(f"Extracted {len(text)} chars, split into {len(chunks)} chunks")

        # 7. Generate dense embeddings (768-dim via nomic-embed-text:v1.5)
        dense_vectors = await embedding_service.get_embeddings(chunks)

        # 8. Generate BM25 sparse vectors
        sparse_vectors = sparse_service.compute_sparse_vectors(chunks)

        # 9. Upsert to Qdrant (hybrid: dense + sparse)
        qdrant_service.upsert_chunks(
            doc_id=doc_id,
            chunks=chunks,
            dense_vectors=dense_vectors,
            sparse_vectors=sparse_vectors,
            filename=filename,
        )

        # 10. Extract entities via qwen3:4b (with keep_alive=0, /no_think, num_ctx=4096)
        # Use first few chunks for entity extraction to avoid token limit
        extraction_text = "\n\n".join(chunks[:5])
        entity_result = await ollama_service.extract_entities(extraction_text)

        entities = entity_result.get("entities", [])
        relationships = entity_result.get("relationships", [])

        # 11. Store document and entities in Neo4j
        await neo4j_service.store_document(doc_id, filename)

        # Store file size in Neo4j for document listing
        driver = await neo4j_service.get_driver()
        async with driver.session() as session:
            await session.run(
                """
                MATCH (d:Document {doc_id: $doc_id})
                SET d.size = $size
                """,
                doc_id=doc_id,
                size=len(content_bytes),
            )

        if entities or relationships:
            await neo4j_service.store_entities(doc_id, entities, relationships)

        entity_count = len(entities)
        chunk_count = len(chunks)

        logger.info(
            f"Upload complete: {filename} → doc_id={doc_id}, "
            f"chunks={chunk_count}, entities={entity_count}"
        )

        return UploadResponse(
            doc_id=doc_id,
            filename=filename,
            chunk_count=chunk_count,
            entity_count=entity_count,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload failed for {filename}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Document processing failed: {str(e)}",
        )
