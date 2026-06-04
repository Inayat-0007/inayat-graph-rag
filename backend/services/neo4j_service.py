"""
I.N.A.Y.A.T. Neo4j Graph Database Service

Manages the knowledge graph with Document and Entity nodes,
CONTAINS and RELATES_TO relationships.
"""
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

from neo4j import AsyncGraphDatabase, AsyncDriver

from backend.config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD

logger = logging.getLogger(__name__)

# Global Neo4j driver instance
_driver: Optional[AsyncDriver] = None


async def get_driver() -> AsyncDriver:
    """Get or create the async Neo4j driver singleton."""
    global _driver
    if _driver is None:
        _driver = AsyncGraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USER, NEO4J_PASSWORD),
        )
        logger.info(f"Neo4j async driver created for {NEO4J_URI}")
    return _driver


async def store_document(doc_id: str, filename: str) -> None:
    """
    Create a Document node in Neo4j.

    Args:
        doc_id: Unique document identifier
        filename: Original filename
    """
    driver = await get_driver()
    created_at = datetime.utcnow().isoformat()

    async with driver.session() as session:
        await session.run(
            """
            MERGE (d:Document {doc_id: $doc_id})
            SET d.filename = $filename,
                d.created_at = $created_at
            """,
            doc_id=doc_id,
            filename=filename,
            created_at=created_at,
        )
    logger.info(f"Stored Document node for doc_id={doc_id}")


async def store_entities(
    doc_id: str,
    entities: List[Dict[str, str]],
    relationships: List[Dict[str, str]],
) -> None:
    """
    Create Entity nodes and relationships in Neo4j.

    Creates:
      - Entity nodes with name and type properties
      - CONTAINS edges from Document to each Entity
      - RELATES_TO edges between Entity pairs with relation property

    Args:
        doc_id: Document identifier to link entities to
        entities: List of dicts with 'name' and 'type' keys
        relationships: List of dicts with 'source', 'target', and 'relation' keys
    """
    driver = await get_driver()

    async with driver.session() as session:
        # Create Entity nodes and CONTAINS relationships
        for entity in entities:
            entity_name = entity.get("name", "").strip()
            entity_type = entity.get("type", "UNKNOWN").strip()

            if not entity_name:
                continue

            await session.run(
                """
                MATCH (d:Document {doc_id: $doc_id})
                MERGE (e:Entity {name: $name})
                SET e.type = $type
                MERGE (d)-[:CONTAINS]->(e)
                """,
                doc_id=doc_id,
                name=entity_name,
                type=entity_type,
            )

        # Create RELATES_TO relationships between entities
        for rel in relationships:
            source = rel.get("source", "").strip()
            target = rel.get("target", "").strip()
            relation = rel.get("relation", "RELATED").strip()

            if not source or not target:
                continue

            await session.run(
                """
                MERGE (s:Entity {name: $source})
                MERGE (t:Entity {name: $target})
                MERGE (s)-[r:RELATES_TO {relation: $relation}]->(t)
                """,
                source=source,
                target=target,
                relation=relation,
            )

    entity_count = len([e for e in entities if e.get("name", "").strip()])
    rel_count = len([r for r in relationships if r.get("source", "").strip() and r.get("target", "").strip()])
    logger.info(
        f"Stored {entity_count} entities and {rel_count} relationships "
        f"for doc_id={doc_id}"
    )


async def get_document_graph(doc_id: str) -> Dict[str, Any]:
    """
    Fetch all nodes and edges for a specific document from Neo4j.

    Returns:
        Dict with 'nodes' (list of {id, label, type}) and
        'edges' (list of {source, target, relation})
    """
    driver = await get_driver()
    nodes = []
    edges = []
    seen_nodes = set()

    async with driver.session() as session:
        # Fetch the document node and its entities
        result = await session.run(
            """
            MATCH (d:Document {doc_id: $doc_id})-[:CONTAINS]->(e:Entity)
            RETURN d.doc_id AS doc_id, d.filename AS filename,
                   e.name AS entity_name, e.type AS entity_type
            """,
            doc_id=doc_id,
        )

        records = [record async for record in result]

        # Add document node
        if records:
            doc_node_id = f"doc_{doc_id}"
            if doc_node_id not in seen_nodes:
                nodes.append({
                    "id": doc_node_id,
                    "label": records[0]["filename"] or doc_id,
                    "type": "Document",
                })
                seen_nodes.add(doc_node_id)

        # Add entity nodes and CONTAINS edges
        for record in records:
            entity_name = record["entity_name"]
            entity_type = record["entity_type"] or "UNKNOWN"
            entity_id = f"entity_{entity_name}"

            if entity_id not in seen_nodes:
                nodes.append({
                    "id": entity_id,
                    "label": entity_name,
                    "type": entity_type,
                })
                seen_nodes.add(entity_id)

            edges.append({
                "source": f"doc_{doc_id}",
                "target": entity_id,
                "relation": "CONTAINS",
            })

        # Fetch RELATES_TO edges between entities of this document
        rel_result = await session.run(
            """
            MATCH (d:Document {doc_id: $doc_id})-[:CONTAINS]->(e1:Entity)
            MATCH (e1)-[r:RELATES_TO]->(e2:Entity)
            RETURN e1.name AS source, e2.name AS target, r.relation AS relation
            """,
            doc_id=doc_id,
        )

        rel_records = [record async for record in rel_result]

        for record in rel_records:
            source_name = record["source"]
            target_name = record["target"]
            target_id = f"entity_{target_name}"

            # Ensure target entity node exists in our result
            if target_id not in seen_nodes:
                nodes.append({
                    "id": target_id,
                    "label": target_name,
                    "type": "Entity",
                })
                seen_nodes.add(target_id)

            edges.append({
                "source": f"entity_{source_name}",
                "target": target_id,
                "relation": record["relation"] or "RELATED",
            })

    return {"nodes": nodes, "edges": edges}


async def get_subgraph_for_entities(
    entity_names: List[str], hops: int = 1
) -> Dict[str, Any]:
    """
    Fetch a subgraph centered on the given entity names, up to N hops.

    Args:
        entity_names: List of entity names to start from
        hops: Number of relationship hops to traverse (default: 1)

    Returns:
        Dict with 'nodes' and 'edges'
    """
    driver = await get_driver()
    nodes = []
    edges = []
    seen_nodes = set()

    if not entity_names:
        return {"nodes": nodes, "edges": edges}

    async with driver.session() as session:
        use_fallback = False
        records = []
        try:
            result = await session.run(
                """
                MATCH (e:Entity)
                WHERE e.name IN $names
                CALL apoc.path.subgraphAll(e, {
                    maxLevel: $hops,
                    relationshipFilter: "RELATES_TO|CONTAINS"
                })
                YIELD nodes AS subNodes, relationships AS subRels
                RETURN subNodes, subRels
                """,
                names=entity_names,
                hops=hops,
            )
            records = [record async for record in result]
        except Exception as e:
            logger.warning(f"Neo4j APOC query failed (falling back to standard Cypher): {e}")
            use_fallback = True

        # If APOC is not available, fall back to a simpler query
        if use_fallback or not records:
            result = await session.run(
                """
                MATCH (e:Entity)
                WHERE e.name IN $names
                OPTIONAL MATCH (e)-[r:RELATES_TO]-(neighbor:Entity)
                RETURN e.name AS name, e.type AS type,
                       neighbor.name AS neighbor_name,
                       neighbor.type AS neighbor_type,
                       r.relation AS relation,
                       startNode(r).name AS rel_source,
                       endNode(r).name AS rel_target
                """,
                names=entity_names,
            )

            fallback_records = [record async for record in result]

            for record in fallback_records:
                node_id = f"entity_{record['name']}"
                if node_id not in seen_nodes:
                    nodes.append({
                        "id": node_id,
                        "label": record["name"],
                        "type": record["type"] or "Entity",
                    })
                    seen_nodes.add(node_id)

                if record["neighbor_name"]:
                    neighbor_id = f"entity_{record['neighbor_name']}"
                    if neighbor_id not in seen_nodes:
                        nodes.append({
                            "id": neighbor_id,
                            "label": record["neighbor_name"],
                            "type": record["neighbor_type"] or "Entity",
                        })
                        seen_nodes.add(neighbor_id)

                    if record["rel_source"] and record["rel_target"]:
                        edges.append({
                            "source": f"entity_{record['rel_source']}",
                            "target": f"entity_{record['rel_target']}",
                            "relation": record["relation"] or "RELATED",
                        })

        else:
            # Process APOC results
            for record in records:
                for node in record["subNodes"]:
                    labels = list(node.labels)
                    node_label = labels[0] if labels else "Unknown"
                    node_name = node.get("name", node.get("doc_id", str(node.id)))
                    node_id = f"node_{node.id}"

                    if node_id not in seen_nodes:
                        nodes.append({
                            "id": node_id,
                            "label": node_name,
                            "type": node_label,
                        })
                        seen_nodes.add(node_id)

                for rel in record["subRels"]:
                    edges.append({
                        "source": f"node_{rel.start_node.id}",
                        "target": f"node_{rel.end_node.id}",
                        "relation": rel.get("relation", rel.type),
                    })

    return {"nodes": nodes, "edges": edges}


async def get_entity_count(doc_id: str) -> int:
    """Count the number of entities linked to a document."""
    driver = await get_driver()

    async with driver.session() as session:
        result = await session.run(
            """
            MATCH (d:Document {doc_id: $doc_id})-[:CONTAINS]->(e:Entity)
            RETURN count(e) AS count
            """,
            doc_id=doc_id,
        )
        record = await result.single()
        return record["count"] if record else 0


async def get_all_documents() -> List[Dict[str, Any]]:
    """Fetch all Document nodes with their metadata and entity counts."""
    driver = await get_driver()

    async with driver.session() as session:
        result = await session.run(
            """
            MATCH (d:Document)
            OPTIONAL MATCH (d)-[:CONTAINS]->(e:Entity)
            RETURN d.doc_id AS doc_id, d.filename AS filename,
                   d.created_at AS created_at, d.size AS size,
                   count(e) AS entity_count
            ORDER BY d.created_at DESC
            """
        )
        records = [record async for record in result]

        documents = []
        for record in records:
            documents.append({
                "doc_id": record["doc_id"],
                "filename": record["filename"] or "",
                "created_at": record["created_at"] or "",
                "size": record["size"] or 0,
                "entity_count": record["entity_count"],
            })
        return documents


async def health_check() -> bool:
    """Check Neo4j connectivity."""
    try:
        driver = await get_driver()
        async with driver.session() as session:
            result = await session.run("RETURN 1 AS ping")
            record = await result.single()
            return record is not None
    except Exception as e:
        logger.error(f"Neo4j health check failed: {e}")
        return False


async def close() -> None:
    """Close the Neo4j driver."""
    global _driver
    if _driver is not None:
        await _driver.close()
        _driver = None
        logger.info("Neo4j driver closed")
