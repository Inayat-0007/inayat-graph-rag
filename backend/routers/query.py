"""
I.N.A.Y.A.T. Query Router

POST /api/query: Accepts question and session_id, returns SSE token stream with
citations and knowledge graph.
"""
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from backend.models import QueryRequest
from backend.services.query_service import orchestrate_query

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/query")
async def query_endpoint(request: QueryRequest):
    """
    Query the knowledge base using hybrid search + graph analysis and stream
    the answer token-by-token.
    
    Streams SSE events: token, citations, graph, done, error
    """
    question = request.question.strip()
    session_id = request.session_id or "default"
    
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")
        
    logger.info(f"Query request received: '{question[:40]}...' (session={session_id})")
    
    try:
        # Return StreamingResponse with media_type text/event-stream
        return StreamingResponse(
            orchestrate_query(question, session_id),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Content-Type": "text/event-stream",
            }
        )
    except Exception as e:
        logger.error(f"Failed to initialize query stream: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Query orchestration failed: {str(e)}"
        )
