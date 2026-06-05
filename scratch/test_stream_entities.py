import asyncio
import httpx
import json
import sys

sys.path.append("c:\\Users\\moham\\Music\\INAYAT MCA LNCT MAJOR PROJECT")

async def main():
    text = (
        "Nova Research Lab\n"
        "Nova Research Lab is an independent artificial intelligence research institute founded in 2022 by "
        "Dr. Priya Sharma and Dr. James Keller. The lab is located in Bangalore, India, and focuses on "
        "developing ethical AI systems for healthcare and education.\n\n"
        "Key People\n"
        "- Dr. Priya Sharma, CoFounder and Director (PhD in Computer Vision from MIT)\n"
        "- Dr. James Keller, CoFounder and Chief Technology Officer (PhD in Robotics from Stanford)\n"
        "- Dr. Ravi Patel, Head of Health AI Division (MD in Radiology from AIIMS, MS in AI from Carnegie Mellon)"
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
    
    request_body = {
        "model": "qwen3:4b",
        "prompt": f"Extract entities and relationships from the following text:\n\n{text}",
        "system": system_prompt,
        "stream": True,
        "format": "json",
        "options": {
            "num_ctx": 4096,
        },
        "keep_alive": "0"
    }
    
    print("Streaming generation from qwen3:4b...")
    async with httpx.AsyncClient(timeout=180.0) as client:
        async with client.stream("POST", "http://localhost:11434/api/generate", json=request_body) as response:
            async for line in response.aiter_lines():
                if line.strip():
                    try:
                        data = json.loads(line)
                        token = data.get("response", "")
                        thinking = data.get("thinking", "")
                        if thinking:
                            # Print thinking tokens as they arrive
                            sys.stdout.write(thinking)
                            sys.stdout.flush()
                        if token:
                            # Print regular tokens
                            sys.stdout.write(token)
                            sys.stdout.flush()
                    except Exception as e:
                        pass
    print("\n\nDone.")

if __name__ == "__main__":
    asyncio.run(main())
