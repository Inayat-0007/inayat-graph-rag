import asyncio
import sys
import time

sys.path.append("c:\\Users\\moham\\Music\\INAYAT MCA LNCT MAJOR PROJECT")

from backend.services import qdrant_service, ollama_service

async def main():
    doc_id = "12bdba030451a98d921f61ddf5b131aeaa3793ca2f7cecd79bd73e597d6b8d0f"
    print(f"Fetching chunks for doc_id: {doc_id}")
    chunks = qdrant_service.get_document_chunks(doc_id)
    print(f"Found {len(chunks)} chunks.")
    
    if not chunks:
        print("No chunks found. Is Qdrant empty or is the collection missing?")
        return
        
    for i, c in enumerate(chunks):
        print(f"\n--- Chunk {c['chunk_index']} (length {len(c['text'])} chars) ---")
        clean_text = c['text'][:300].encode('ascii', 'ignore').decode('ascii')
        print(clean_text + "...")
        
    # Run entity extraction on the text of these chunks
    extraction_text = "\n\n".join([c['text'] for c in chunks[:5]])
    print(f"\nRunning extract_entities on merged chunks (total length: {len(extraction_text)})...")
    
    start_time = time.time()
    res = await ollama_service.extract_entities(extraction_text, keep_alive="0")
    elapsed = time.time() - start_time
    
    print(f"\nExtraction completed in {elapsed:.2f} seconds.")
    print("Entities extracted:", len(res.get("entities", [])))
    print("Relationships extracted:", len(res.get("relationships", [])))
    print("Result JSON:", res)

if __name__ == "__main__":
    asyncio.run(main())
