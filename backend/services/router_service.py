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
            - 'route': 'vector', 'graph', 'hybrid', or 'greeting'
            - 'reason': brief explanation of routing choice
    """
    q_lower = query.lower()
    
    # 0. Check for greetings / pleasantries (P0 critical optimization)
    clean_q = "".join(c for c in q_lower if c.isalnum() or c.isspace()).strip()
    words = clean_q.split()
    
    greetings = {"hi", "hello", "hey", "greetings", "hola", "yo", "thanks", "thank", "thankyou", "welcome"}
    pleasantries = {"how", "are", "you", "good", "morning", "afternoon", "evening", "there", "sup"}
    
    is_greeting = False
    if len(words) > 0 and len(words) <= 4:
        if all(w in greetings or w in pleasantries for w in words):
            is_greeting = True
        elif len(words) == 1 and words[0] in greetings:
            is_greeting = True

    if is_greeting:
        strategy = "greeting"
        reason = "Query is a simple greeting or pleasantry, handled via direct fast greeting response."
    else:
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
            
        # Proper noun heuristic: override vector to hybrid if query contains proper nouns (potential entities)
        if strategy == "vector":
            words_raw = query.split()
            has_proper_noun = False
            for idx, w in enumerate(words_raw):
                if w and w[0].isupper():
                    clean_w = "".join(c for c in w if c.isalnum())
                    clean_lower = clean_w.lower()
                    if clean_lower not in {
                        "is", "the", "a", "an", "of", "and", "in", "on", "at", "to", "for", "with", "by", "about", "your", "my", "our",
                        "what", "who", "where", "how", "why", "define", "explain", "describe", "detail", "list", "summary"
                    }:
                        has_proper_noun = True
                        break
            if has_proper_noun:
                strategy = "hybrid"
                reason = "Query contains proper nouns indicating entity references; overridden to hybrid Graph RAG strategy."
        
    logger.info(f"Routed query '{query[:30]}...' to '{strategy}' strategy. Reason: {reason}")
    return {
        "route": strategy,
        "reason": reason
    }
