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
import os
import json
import math
import logging
import re
import threading
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
_df: Dict[str, int] = {}
_num_docs: int = 0
_total_tokens: int = 0
_avg_dl: float = 0.0

STATS_PATH = "data/bm25_stats.json"
_stats_lock = threading.Lock()


def _load_stats():
    global _vocab, _next_id, _df, _num_docs, _total_tokens, _avg_dl
    with _stats_lock:
        if os.path.exists(STATS_PATH):
            try:
                with open(STATS_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    _vocab = data.get("vocab", {})
                    _next_id = len(_vocab)
                    _df = data.get("df", {})
                    _num_docs = data.get("num_docs", 0)
                    _total_tokens = data.get("total_tokens", 0)
                    _avg_dl = data.get("avg_dl", 0.0)
                logger.info(f"Loaded BM25 stats: {len(_vocab)} terms, {_num_docs} docs")
            except Exception as e:
                logger.error(f"Failed to load BM25 stats: {e}")
        else:
            _vocab = {}
            _next_id = 0
            _df = {}
            _num_docs = 0
            _total_tokens = 0
            _avg_dl = 0.0


def _save_stats():
    with _stats_lock:
        try:
            os.makedirs(os.path.dirname(STATS_PATH), exist_ok=True)
            with open(STATS_PATH, "w", encoding="utf-8") as f:
                json.dump({
                    "vocab": _vocab,
                    "df": _df,
                    "num_docs": _num_docs,
                    "total_tokens": _total_tokens,
                    "avg_dl": _avg_dl
                }, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Failed to save BM25 stats: {e}")

# Initial load
_load_stats()


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
    Compute BM25-based sparse vectors for a list of text chunks using global corpus statistics.

    Each sparse vector contains:
      - indices: List[int] — term IDs (vocabulary indices)
      - values: List[float] — BM25 weights

    The vectors are compatible with Qdrant's SparseVector format.

    Args:
        texts: List of text chunks to compute sparse vectors for

    Returns:
        List of dicts, each with 'indices' (List[int]) and 'values' (List[float])
    """
    global _num_docs, _total_tokens, _avg_dl
    if not texts:
        return []

    # Tokenize all documents
    doc_tokens = [_tokenize(text) for text in texts]

    # Update global counts (DF and total docs/tokens)
    for tokens in doc_tokens:
        _num_docs += 1
        _total_tokens += len(tokens)
        unique_terms = set(tokens)
        for term in unique_terms:
            _get_term_id(term)  # Assign ID if not exists
            _df[term] = _df.get(term, 0) + 1

    # Recalculate average document length
    _avg_dl = _total_tokens / max(_num_docs, 1)

    # Save stats to disk
    _save_stats()

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
            term_id = _vocab[term]  # Must exist because we just added it above

            # IDF using global N and global DF
            doc_freq = _df.get(term, 0)
            idf = math.log(
                (_num_docs - doc_freq + 0.5) / (doc_freq + 0.5) + 1.0
            )
            idf = max(idf, 0.0001)

            # BM25 TF component using global average length
            tf_component = (freq * (BM25_K1 + 1.0)) / (
                freq + BM25_K1 * (1.0 - BM25_B + BM25_B * doc_len / max(_avg_dl, 1.0))
            )

            bm25_score = idf * tf_component

            if bm25_score > 0:
                indices.append(term_id)
                values.append(round(bm25_score, 6))

        sparse_vectors.append({"indices": indices, "values": values})

    logger.info(f"Computed {len(sparse_vectors)} global BM25 sparse vectors")
    return sparse_vectors


def compute_query_sparse_vector(query: str) -> Dict[str, Any]:
    """
    Compute a sparse vector for a single query string.

    Uses the same vocabulary as the document vectors but with
    simpler TF weighting (since queries are short).
    Only returns values for terms present in the global vocabulary.

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
        if term in _vocab:
            term_id = _vocab[term]
            # For queries, use simple term frequency as weight
            indices.append(term_id)
            values.append(float(freq))

    return {"indices": indices, "values": values}
