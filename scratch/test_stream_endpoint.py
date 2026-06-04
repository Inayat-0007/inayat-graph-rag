import asyncio
import sys
import logging

logging.basicConfig(level=logging.INFO)

# Add parent directory to sys.path so we can import backend
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.services import ollama_service

async def main():
    print("Testing generate_stream directly...", flush=True)
    try:
        async for token in ollama_service.generate_stream(
            prompt="hi",
            system="You are a helpful assistant"
        ):
            print(f"TOKEN: {repr(token)}", flush=True)
    except Exception as e:
        print(f"Error: {e}", flush=True)

if __name__ == "__main__":
    asyncio.run(main())
