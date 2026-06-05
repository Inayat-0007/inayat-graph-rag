import asyncio
import httpx
import time

async def main():
    # We will upload a sample text file representing a project document
    filename = "test_hospital_project.txt"
    content = (
        "Project HealthCare-AI\n"
        "Project HealthCare-AI is an initiative led by Bangalore Tech Corp. "
        "The project director is Dr. Priya Sharma. "
        "It was launched in January 2025. "
        "Bangalore Tech Corp is collaborating with AIIMS Hospital on this initiative. "
        "The goal is to deploy diagnostic assistant models in remote clinics. "
        "Dr. James Keller serves as the technical advisor, assisting Dr. Priya Sharma."
    )
    
    files = {"file": (filename, content.encode("utf-8"), "text/plain")}
    
    url = "http://127.0.0.1:8000/api/upload"
    print(f"Uploading {filename} to {url}...")
    
    start_time = time.time()
    async with httpx.AsyncClient(timeout=180.0) as client:
        try:
            res = await client.post(url, files=files)
            elapsed = time.time() - start_time
            print(f"Status Code: {res.status_code}")
            print(f"Time Taken: {elapsed:.2f} seconds")
            if res.status_code == 200:
                print("Response JSON:", res.json())
                
                # Fetch graph data for the uploaded document to verify it is stored in Neo4j
                doc_id = res.json().get("doc_id")
                graph_url = f"http://127.0.0.1:8000/api/graph?doc_id={doc_id}"
                graph_res = await client.get(graph_url)
                if graph_res.status_code == 200:
                    graph_data = graph_res.json()
                    print("\nStored Graph Nodes in Neo4j:")
                    for node in graph_data.get("nodes", []):
                        print(f"  ID: {node['id']}, Label: {node['label']}, Type: {node['type']}")
                    print("Stored Graph Edges in Neo4j:")
                    for edge in graph_data.get("edges", []):
                        print(f"  Source: {edge['source']}, Target: {edge['target']}, Relation: {edge['relation']}")
                else:
                    print(f"Failed to fetch graph data: {graph_res.status_code}")
            else:
                print(f"Upload failed: {res.text}")
        except Exception as e:
            print(f"Error occurred: {e}")

if __name__ == "__main__":
    asyncio.run(main())
