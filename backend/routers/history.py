"""
I.N.A.Y.A.T. History Router

GET /api/history?session_id=...: Retrieve conversation history for a session
"""
import logging
from fastapi import APIRouter, HTTPException, Query

from backend.models import HistoryResponse, HistoryMessage, SessionsResponse, SessionInfo
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


@router.get("/history/sessions", response_model=SessionsResponse)
async def get_active_sessions():
    """
    List all active conversation sessions with their metadata and titles.
    """
    try:
        sessions = await memory_service.get_sessions()
        
        session_list = [
            SessionInfo(
                session_id=s["session_id"],
                last_message_at=s["last_message_at"],
                first_question=s["first_question"]
            )
            for s in sessions
        ]
        
        logger.info(f"Retrieved {len(session_list)} active conversation sessions")
        return SessionsResponse(sessions=session_list)
        
    except Exception as e:
        logger.error(f"Failed to list active sessions: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve conversation sessions: {str(e)}"
        )


@router.delete("/history/{session_id}")
async def delete_conversation_session(session_id: str):
    """
    Delete a conversation session and all its messages.
    """
    try:
        await memory_service.delete_session(session_id)
        logger.info(f"Successfully deleted session={session_id}")
        return {"status": "success", "session_id": session_id}
        
    except Exception as e:
        logger.error(f"Failed to delete session={session_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete session: {str(e)}"
        )

