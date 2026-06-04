"""
I.N.A.Y.A.T. Memory Service

SQLite-based conversation memory using aiosqlite.
Stores conversation messages per session and provides
history retrieval for the query pipeline context window.

Database file: data/conversations.db
"""
import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

import aiosqlite

from backend.config import DB_PATH

logger = logging.getLogger(__name__)


async def init_db() -> None:
    """
    Initialize the SQLite database for conversation memory.

    Creates the data/ directory if it doesn't exist,
    then creates the messages table and indexes.
    """
    db_dir = os.path.dirname(DB_PATH)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        await db.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_messages_session_id
            ON messages (session_id)
            """
        )
        await db.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_messages_timestamp
            ON messages (session_id, timestamp DESC)
            """
        )
        await db.commit()

    logger.info(f"Memory service: SQLite database initialized at {DB_PATH}")


async def add_message(session_id: str, role: str, content: str) -> None:
    """
    Insert a conversation message into the database.

    Args:
        session_id: Unique session identifier
        role: Message role ('user' or 'assistant')
        content: Message content text
    """
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO messages (session_id, role, content, timestamp)
            VALUES (?, ?, ?, ?)
            """,
            (session_id, role, content, datetime.utcnow().isoformat()),
        )
        await db.commit()

    logger.debug(f"Saved {role} message for session {session_id[:8]}...")


async def get_history(
    session_id: str, limit: int = 6
) -> List[Dict[str, str]]:
    """
    Fetch the last N messages for a given session.

    Args:
        session_id: Unique session identifier
        limit: Maximum number of messages to return (default: 6)

    Returns:
        List of message dicts with 'role', 'content', and 'timestamp',
        ordered chronologically (oldest first).
    """
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT role, content, timestamp
            FROM messages
            WHERE session_id = ?
            ORDER BY timestamp DESC, id DESC
            LIMIT ?
            """,
            (session_id, limit),
        )
        rows = await cursor.fetchall()

    # Reverse to get chronological order (oldest first)
    messages = []
    for row in reversed(rows):
        messages.append({
            "role": row["role"],
            "content": row["content"],
            "timestamp": row["timestamp"],
        })

    return messages


async def get_sessions() -> List[Dict[str, Any]]:
    """
    List all conversation sessions with their latest message timestamp and their first user question.

    Returns:
        List of session dicts with 'session_id', 'last_message_at', and 'first_question',
        ordered by most recent activity first.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT session_id, 
                   MAX(timestamp) AS last_message_at,
                   (SELECT content FROM messages WHERE session_id = m.session_id AND role = 'user' ORDER BY timestamp ASC LIMIT 1) AS first_question
            FROM messages m
            GROUP BY session_id
            ORDER BY last_message_at DESC
            """
        )
        rows = await cursor.fetchall()

    sessions = []
    for row in rows:
        sessions.append({
            "session_id": row["session_id"],
            "last_message_at": row["last_message_at"],
            "first_question": row["first_question"] or "New Conversation",
        })

    return sessions


async def delete_session(session_id: str) -> None:
    """
    Delete all messages for a given session from the SQLite database.

    Args:
        session_id: Unique session identifier
    """
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "DELETE FROM messages WHERE session_id = ?",
            (session_id,),
        )
        await db.commit()
    logger.info(f"Deleted conversation session from SQLite: {session_id}")

