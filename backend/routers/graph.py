"""
I.N.A.Y.A.T. Graph Router

GET /api/graph?doc_id=...: Return knowledge graph nodes and edges for a document
  Returns: {nodes: [{id, label, type}], edges: [{source, target, relation}]}
"""
import logging

from fastapi import APIRouter, HTTPException, Query

from backend.models import GraphResponse, GraphNode, GraphEdge
from backend.services import neo4j_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/graph", response_model=GraphResponse)
async def get_document_graph(doc_id: str = Query(..., description="Document ID")):
    """
    Retrieve the knowledge graph for a specific document.

    Returns all Entity nodes connected to the document and their
    RELATES_TO relationships.
    """
    try:
        graph_data = await neo4j_service.get_document_graph(doc_id)

        nodes = [
            GraphNode(
                id=node["id"],
                label=node["label"],
                type=node["type"],
            )
            for node in graph_data.get("nodes", [])
        ]

        edges = [
            GraphEdge(
                source=edge["source"],
                target=edge["target"],
                relation=edge["relation"],
            )
            for edge in graph_data.get("edges", [])
        ]

        logger.info(f"Graph for doc_id={doc_id}: {len(nodes)} nodes, {len(edges)} edges")
        return GraphResponse(nodes=nodes, edges=edges)

    except Exception as e:
        logger.error(f"Failed to get graph for doc_id={doc_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve graph: {str(e)}",
        )
