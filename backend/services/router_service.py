"""
I.N.A.Y.A.T. Query Router Service

Routes queries to 'vector-only', 'graph-only', or 'hybrid' based on query keywords
and analysis of structure.
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

GRAPH_KEYWORDS = {
    "relationship", "relation", "connect", "link", "between", "how are",
    "associated with", "network", "entity", "entities", "graph", "influence",
    "impact", "connection", "interact", "hierarchy", "related", "interconnected"
}

VECTOR_KEYWORDS = {
    "what is", "define", "explain", "describe", "detail", "meaning of",
    "summary", "list", "how to", "exactly", "definition", "quote",
    "stat", "number", "figure", "percentage", "amount", "where does"
}

def route_query(query: str) -> Dict[str, Any]:
    """
    Analyze query text to determine the optimal search routing strategy.
    
    Args:
        query: User input search query.
        
    Returns:
        Dict containing:
            - 'route': 'vector', 'graph', or 'hybrid'
            - 'reason': brief explanation of routing choice
    """
    q_lower = query.lower()
    
    # Check graph keywords
    has_graph_keyword = any(kw in q_lower for kw in GRAPH_KEYWORDS)
    # Check vector keywords
    has_vector_keyword = any(kw in q_lower for kw in VECTOR_KEYWORDS)
    
    if has_graph_keyword and not has_vector_keyword:
        strategy = "graph"
        reason = "Query contains graph-focused keywords (relationships, connections, networks)."
    elif has_vector_keyword and not has_graph_keyword:
        strategy = "vector"
        reason = "Query contains vector-focused keywords (definition, fact retrieval, description)."
    else:
        strategy = "hybrid"
        reason = "Query demands both structural context and factual text content (default hybrid RAG)."
        
    logger.info(f"Routed query '{query[:30]}...' to '{strategy}' strategy. Reason: {reason}")
    return {
        "route": strategy,
        "reason": reason
    }
