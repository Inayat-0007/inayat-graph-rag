import asyncio
import httpx
import json

async def main():
    async with httpx.AsyncClient(base_url="http://localhost:11434") as client:
        # 1. List models
        res = await client.get("/api/tags")
        print("--- Available Models in Ollama ---")
        for model in res.json().get("models", []):
            print(f"Name: {model['name']}, Size: {model['size'] / (1024*1024*1024):.2f} GB")
        
        # 2. Test extraction with a sample paragraph
        text = (
            "Nova Lab is a state-of-the-art research facility established in 2024 by Dr. Aris Thorne. "
            "It specializes in developing neural interface systems. The laboratory partnered with "
            "Apex Corp to fund the project 'Project MindWave'. Under this partnership, Nova Lab provides "
            "the algorithms while Apex Corp manufactures the hardware chips."
        )
        
        system_prompt = (
            "You are an entity extraction assistant. "
            "Extract named entities and their relationships from the given text. "
            "Return a valid JSON object with exactly two keys:\n"
            '- "entities": a list of objects with "name" (string) and "type" (string, e.g. PERSON, ORGANIZATION, CONCEPT, LOCATION, DATE, TECHNOLOGY)\n'
            '- "relationships": a list of objects with "source" (string), "target" (string), and "relation" (string)\n'
            "Return ONLY the JSON object, no other text.\n"
            "/no_think"
        )
        
        print("\n--- Testing Entity Extraction with qwen3:4b ---")
        request_body = {
            "model": "qwen3:4b",
            "prompt": f"Extract entities and relationships from the following text:\n\n{text}",
            "system": system_prompt,
            "stream": False,
            "format": "json",
            "options": {
                "num_ctx": 4096,
            },
            "keep_alive": "0"
        }
        
        import time
        start_time = time.time()
        try:
            res_gen = await client.post("/api/generate", json=request_body, timeout=120.0)
            elapsed = time.time() - start_time
            print(f"Status Code: {res_gen.status_code}")
            print(f"Time Taken: {elapsed:.2f} seconds")
            
            data = res_gen.json()
            print("Raw response keys:", list(data.keys()))
            if "response" in data:
                print("response field:", repr(data["response"]))
            if "thinking" in data:
                print("thinking field:", repr(data["thinking"]))
            print("Full Data:", json.dumps(data, indent=2))
            
            # Print token stats if available
            eval_count = data.get("eval_count", 0)
            eval_duration = data.get("eval_duration", 0)
            if eval_duration > 0:
                speed = eval_count / (eval_duration / 1e9)
                print(f"Speed: {speed:.2f} tokens/sec (eval_count: {eval_count})")
        except Exception as e:
            print(f"Error during call: {e}")

if __name__ == "__main__":
    asyncio.run(main())
