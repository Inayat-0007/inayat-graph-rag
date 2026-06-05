import asyncio
import httpx
import json

async def main():
    url = "http://127.0.0.1:8000/api/query"
    payload = {
        "question": "Who is James Keller?",
        "session_id": "test_session_123"
    }
    
    print(f"Sending query payload: {payload} to {url}...")
    
    async with httpx.AsyncClient(timeout=180.0) as client:
        # Send query and read SSE stream
        async with client.stream("POST", url, json=payload) as response:
            print(f"Status Code: {response.status_code}")
            if response.status_code != 200:
                print("Failed to query:", await response.aread())
                return
                
            current_event = None
            async for line in response.aiter_lines():
                line = line.strip()
                if not line:
                    continue
                if line.startswith("event: "):
                    current_event = line.replace("event: ", "")
                elif line.startswith("data: "):
                    data_val = line.replace("data: ", "")
                    if current_event == "token":
                        import sys
                        sys.stdout.write(data_val)
                        sys.stdout.flush()
                    elif current_event in ["citations", "graph", "done"]:
                        print(f"\n[{current_event.upper()}]:", data_val)
                    elif current_event == "error":
                        print(f"\n[ERROR]:", data_val)
            print("\nDone.")

if __name__ == "__main__":
    asyncio.run(main())
