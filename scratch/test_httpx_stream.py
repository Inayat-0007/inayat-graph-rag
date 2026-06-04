import asyncio
import httpx
import json

async def main():
    url = "http://localhost:11434/api/generate"
    payload = {
        "model": "qwen3:4b",
        "prompt": "hi",
        "stream": True
    }
    print("Connecting via httpx...", flush=True)
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            async with client.stream("POST", url, json=payload) as response:
                print(f"Status: {response.status_code}", flush=True)
                async for line in response.aiter_lines():
                    if line.strip():
                        data = json.loads(line)
                        print(f"LINE: {data.get('thinking', '') or data.get('response', '')}", flush=True)
        except Exception as e:
            print(f"Error: {repr(e)}", flush=True)

if __name__ == "__main__":
    asyncio.run(main())
