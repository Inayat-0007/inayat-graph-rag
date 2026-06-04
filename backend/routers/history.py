"""
I.N.A.Y.A.T. History Router

GET /api/history?session_id=...: Retrieve conversation history for a session
"""
import logging
from fastapi import APIRouter, HTTPException, Query

from backend.models import HistoryResponse, HistoryMessage
from backend.services import memory_service

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/history", response_model=HistoryResponse)
async def get_history(session_id: str = Query(..., description="Session ID")):
    """
    Retrieve message history for a conversation session.
    """
    try:
        messages = await memory_service.get_history(session_id, limit=20)
        
        history_msgs = [
            HistoryMessage(
                role=msg["role"],
                content=msg["content"],
                timestamp=msg["timestamp"]
            )
            for msg in messages
        ]
        
        logger.info(f"Retrieved {len(history_msgs)} history messages for session={session_id}")
        return HistoryResponse(messages=history_msgs)
        
    except Exception as e:
        logger.error(f"Failed to get history for session={session_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve history: {str(e)}"
        )
