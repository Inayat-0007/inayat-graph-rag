"""
I.N.A.Y.A.T. Sparse Vector Service (BM25-based)

Computes sparse vectors for text chunks using a BM25/TF-IDF approach
compatible with Qdrant's sparse vector format (indices + values).

This is a lightweight, dependency-free implementation that:
1. Tokenizes text into terms
2. Computes TF (term frequency) for each term in each document
3. Computes IDF (inverse document frequency) across the corpus
4. Produces BM25-weighted sparse vectors

The sparse vectors complement the dense 768-dim embeddings from
nomic-embed-text:v1.5 for hybrid search with RRF fusion.
"""
import math
import logging
import re
from typing import List, Dict, Any
from collections import Counter

logger = logging.getLogger(__name__)

# BM25 parameters
BM25_K1 = 1.5
BM25_B = 0.75

# Simple stop words to filter out
STOP_WORDS = {
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "dare", "ought",
    "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
    "as", "into", "through", "during", "before", "after", "above",
    "below", "between", "out", "off", "over", "under", "again",
    "further", "then", "once", "here", "there", "when", "where", "why",
    "how", "all", "each", "every", "both", "few", "more", "most",
    "other", "some", "such", "no", "nor", "not", "only", "own", "same",
    "so", "than", "too", "very", "just", "because", "but", "and", "or",
    "if", "while", "about", "up", "it", "its", "this", "that", "these",
    "those", "i", "me", "my", "we", "our", "you", "your", "he", "him",
    "his", "she", "her", "they", "them", "their", "what", "which", "who",
    "whom", "whose",
}

# Global vocabulary mapping term -> integer index
_vocab: Dict[str, int] = {}
_next_id: int = 0


def _tokenize(text: str) -> List[str]:
    """
    Tokenize text into lowercase terms, filtering out stop words
    and tokens shorter than 2 characters.
    """
    # Lowercase and split on non-alphanumeric characters
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    # Filter stop words and very short tokens
    return [t for t in tokens if t not in STOP_WORDS and len(t) >= 2]


def _get_term_id(term: str) -> int:
    """Get or assign an integer ID for a vocabulary term."""
    global _next_id
    if term not in _vocab:
        _vocab[term] = _next_id
        _next_id += 1
    return _vocab[term]


def compute_sparse_vectors(texts: List[str]) -> List[Dict[str, Any]]:
    """
    Compute BM25-based sparse vectors for a list of text chunks.

    Each sparse vector contains:
      - indices: List[int] — term IDs (vocabulary indices)
      - values: List[float] — BM25 weights

    The vectors are compatible with Qdrant's SparseVector format.

    Args:
        texts: List of text chunks to compute sparse vectors for

    Returns:
        List of dicts, each with 'indices' (List[int]) and 'values' (List[float])
    """
    if not texts:
        return []

    # Tokenize all documents
    doc_tokens = [_tokenize(text) for text in texts]

    # Compute document frequencies (DF) for IDF calculation
    num_docs = len(doc_tokens)
    df: Counter = Counter()
    for tokens in doc_tokens:
        unique_terms = set(tokens)
        for term in unique_terms:
            df[term] += 1

    # Compute average document length for BM25
    total_tokens = sum(len(tokens) for tokens in doc_tokens)
    avg_dl = total_tokens / max(num_docs, 1)

    # Compute BM25 sparse vector for each document
    sparse_vectors = []
    for tokens in doc_tokens:
        if not tokens:
            sparse_vectors.append({"indices": [], "values": []})
            continue

        # Term frequency in this document
        tf = Counter(tokens)
        doc_len = len(tokens)

        indices = []
        values = []

        for term, freq in tf.items():
            term_id = _get_term_id(term)

            # IDF: log((N - df + 0.5) / (df + 0.5) + 1)
            doc_freq = df.get(term, 0)
            idf = math.log(
                (num_docs - doc_freq + 0.5) / (doc_freq + 0.5) + 1.0
            )

            # BM25 TF component: (freq * (k1 + 1)) / (freq + k1 * (1 - b + b * dl/avgdl))
            tf_component = (freq * (BM25_K1 + 1.0)) / (
                freq + BM25_K1 * (1.0 - BM25_B + BM25_B * doc_len / max(avg_dl, 1.0))
            )

            bm25_score = idf * tf_component

            if bm25_score > 0:
                indices.append(term_id)
                values.append(round(bm25_score, 6))

        sparse_vectors.append({"indices": indices, "values": values})

    logger.info(f"Computed {len(sparse_vectors)} BM25 sparse vectors")
    return sparse_vectors


def compute_query_sparse_vector(query: str) -> Dict[str, Any]:
    """
    Compute a sparse vector for a single query string.

    Uses the same vocabulary as the document vectors but with
    simpler TF weighting (since queries are short).

    Args:
        query: Query text string

    Returns:
        Dict with 'indices' (List[int]) and 'values' (List[float])
    """
    tokens = _tokenize(query)
    if not tokens:
        return {"indices": [], "values": []}

    tf = Counter(tokens)
    indices = []
    values = []

    for term, freq in tf.items():
        term_id = _get_term_id(term)
        # For queries, use simple term frequency as weight
        indices.append(term_id)
        values.append(float(freq))

    return {"indices": indices, "values": values}
