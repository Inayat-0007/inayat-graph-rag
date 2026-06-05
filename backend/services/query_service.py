"""
I.N.A.Y.A.T. Query Service

Orchestrates the entire query pipeline:
  1. Determine strategy via router_service
  2. Retrieve chunks via Qdrant hybrid search + rerank
  3. Retrieve subgraph via Neo4j
  4. Fetch history from memory
  5. Stream answer via SSE
  6. Post-process to parse confidence and citations
"""
import re
import json
import logging
import asyncio
from typing import AsyncGenerator, List, Dict, Any

from backend.services import (
    router_service,
    embedding_service,
    sparse_service,
    qdrant_service,
    reranker_service,
    neo4j_service,
    ollama_service,
    memory_service,
)

logger = logging.getLogger(__name__)

async def orchestrate_query(
    question: str, session_id: str
) -> AsyncGenerator[str, None]:
    """
    Orchestrates the query RAG pipeline and yields SSE formatted events.
    
    SSE Events yielded:
      - event: graph (early payload for visualization)
      - event: token (tokens of answer text)
      - event: citations (JSON mapping cited doc fragments and confidence)
      - event: done (signals end)
    """
    # 1. Route query
    route_info = router_service.route_query(question)
    strategy = route_info["route"]
    
    # 2. Retrieve chunks (Vector/Hybrid)
    chunks = []
    if strategy in ("vector", "hybrid"):
        try:
            # Generate embeddings
            dense_vectors = await embedding_service.get_embeddings([question])
            dense_vector = dense_vectors[0]
            
            # Generate sparse vectors
            sparse_vector = sparse_service.compute_query_sparse_vector(question)
            
            # Search
            search_results = qdrant_service.hybrid_search(
                dense_vector=dense_vector,
                sparse_vector=sparse_vector,
                limit=10,
            )
            
            # Rerank
            chunks = reranker_service.rerank(question, search_results, top_k=3)
        except Exception as e:
            logger.error(f"Retrieval pipeline failed: {e}", exc_info=True)
            # Fall back to empty chunks
            chunks = []
            
    # 3. Retrieve subgraph (Graph/Hybrid/Vector)
    graph_data = {"nodes": [], "edges": []}
    if strategy != "greeting":
        try:
            # Extract entities from question
            entities_res = await ollama_service.extract_entities(question, keep_alive=None)
            entity_names = [e["name"] for e in entities_res.get("entities", []) if "name" in e]
            
            if entity_names:
                # Fetch 1-hop subgraph
                graph_data = await neo4j_service.get_subgraph_for_entities(entity_names, hops=1)
                
                # Upgrade vector to hybrid if we found matching nodes in the database graph
                if strategy == "vector" and graph_data.get("nodes"):
                    strategy = "hybrid"
                    logger.info("Upgraded strategy from vector to hybrid because matching graph entities were found.")
        except Exception as e:
            logger.warning(f"Graph retrieval failed (graceful fallback): {e}")
            graph_data = {"nodes": [], "edges": []}
            
    # Yield the graph early to populate visualization
    yield f"event: graph\ndata: {json.dumps(graph_data)}\n\n"
    
    # 4. Fetch history from SQLite memory
    history = []
    if session_id:
        try:
            history = await memory_service.get_history(session_id, limit=6)
        except Exception as e:
            logger.error(f"Failed to fetch conversation history: {e}")
            history = []
            
    # 5. Build system and user prompts and stream response
    if strategy == "greeting":
        greeting_lower = question.lower()
        if "thank" in greeting_lower:
            response_text = "You're welcome! Let me know if you need help with anything else."
        elif "morning" in greeting_lower:
            response_text = "Good morning! How can I help you with your documents or knowledge graphs today?"
        elif "afternoon" in greeting_lower:
            response_text = "Good afternoon! How can I help you with your documents or knowledge graphs today?"
        elif "evening" in greeting_lower:
            response_text = "Good evening! How can I help you with your documents or knowledge graphs today?"
        else:
            response_text = "Hello! I am I.N.A.Y.A.T., your local AI Knowledge Intelligence assistant. How can I help you with your documents or knowledge graphs today?"
        
        # Stream the predefined greeting smoothly
        words = response_text.split(" ")
        for i, word in enumerate(words):
            token = word + (" " if i < len(words) - 1 else "")
            yield f"event: token\ndata: {json.dumps(token)}\n\n"
            await asyncio.sleep(0.03)  # smooth 30ms typing simulation
            
        full_response = response_text + "\nConfidence: 100%"
    else:
        system_prompt = (
            "You are I.N.A.Y.A.T., a highly capable, local AI Knowledge Intelligence assistant.\n"
            "Answer the user's question using the provided context and knowledge graph details.\n\n"
            "RULES:\n"
            "1. Direct citation: Cite the source chunks using [1], [2], [3] at the end of sentences that use facts from them.\n"
            "2. If the context does not contain the answer, say that you cannot find it, but use your general knowledge if relevant (stating it clearly).\n"
            "3. Provide clear, well-structured, professional explanations.\n"
            "4. At the very end of your response, on a new line, write exactly: 'Confidence: [0-100]%'\n"
            "/no_think"
        )
        
        # Format chunks context
        context_str = ""
        if chunks:
            context_str += "=== RETRIEVED TEXT CONTEXT ===\n"
            for i, chunk in enumerate(chunks):
                payload = chunk.get("payload", {})
                text = payload.get("text", "")
                filename = payload.get("filename", "unknown")
                context_str += f"[{i+1}] (Source: {filename}):\n{text}\n\n"
                
        # Format graph context
        graph_str = ""
        if graph_data.get("nodes"):
            graph_str += "=== RETRIEVED KNOWLEDGE GRAPH CONTEXT ===\n"
            graph_str += "Entities:\n"
            for node in graph_data["nodes"]:
                graph_str += f"- {node['label']} (Type: {node['type']})\n"
            graph_str += "Relationships:\n"
            for edge in graph_data["edges"]:
                graph_str += f"- {edge['source']} --({edge['relation']})--> {edge['target']}\n"
            graph_str += "\n"
            
        # Format history context
        history_str = ""
        if history:
            history_str += "=== CONVERSATION HISTORY ===\n"
            for msg in history:
                role_label = "User" if msg["role"] == "user" else "Assistant"
                history_str += f"{role_label}: {msg['content']}\n"
            history_str += "\n"
            
        user_prompt = f"{context_str}{graph_str}{history_str}User Question: {question}\nAssistant Answer:"
    
        # 6. Stream from Ollama and collect full response
        full_response = ""
        try:
            async for token in ollama_service.generate_stream(
                prompt=user_prompt,
                system=system_prompt,
            ):
                full_response += token
                # JSON-serialize token data to handle newlines safely
                yield f"event: token\ndata: {json.dumps(token)}\n\n"
        except Exception as e:
            logger.error(f"Stream generation failed: {e}", exc_info=True)
            yield f"event: error\ndata: {json.dumps({'detail': f'Generation error: {str(e)}'})}\n\n"
            return
        
    # 7. Post-process to parse confidence and citations
    # Extract confidence score (e.g. "Confidence: 85%", "Confidence: ~95%", "confidence score is 90%", "confidence level: 85%")
    confidence_match = re.search(
        r"confidence\s*(?:score|level|is|approx|approximately|rating)*\s*[^0-9a-zA-Z]*\s*(\d+)\s*%",
        full_response,
        re.IGNORECASE,
    )
    confidence = int(confidence_match.group(1)) if confidence_match else 80
    
    # Remove the confidence line from backend storage memory if we want clean memory
    cleaned_response = re.sub(r"\n*Confidence:\s*\d+%.*$", "", full_response, flags=re.IGNORECASE).strip()
    
    # Detect cited document indices in the response text, e.g. [1], [2]
    citations = []
    cited_indices = set(re.findall(r"\[(\d+)\]", cleaned_response))
    for idx_str in cited_indices:
        try:
            idx = int(idx_str) - 1
            if 0 <= idx < len(chunks):
                chunk = chunks[idx]
                payload = chunk.get("payload", {})
                citations.append({
                    "doc_id": payload.get("doc_id", ""),
                    "filename": payload.get("filename", "unknown"),
                    "text": payload.get("text", ""),
                    "chunk_index": payload.get("chunk_index", 0),
                    "score": chunk.get("rerank_score", chunk.get("score", 0.0))
                })
        except ValueError:
            continue
            
    # Yield citations and confidence event
    citations_payload = {
        "citations": citations,
        "confidence": confidence
    }
    yield f"event: citations\ndata: {json.dumps(citations_payload)}\n\n"
    
    # 8. Save to memory
    if session_id:
        try:
            metadata_dict = {
                "citations": citations,
                "confidence": confidence,
                "graph": graph_data
            }
            metadata_json = json.dumps(metadata_dict)
            await memory_service.add_message(session_id, "user", question)
            await memory_service.add_message(session_id, "assistant", cleaned_response, metadata=metadata_json)
        except Exception as e:
            logger.error(f"Failed to save messages to SQLite memory: {e}")
            
    # Yield done event
    yield "event: done\ndata: {}\n\n"
