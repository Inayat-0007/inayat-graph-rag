import requests
import json
import sys

def main():
    url = "http://localhost:8000/api/query"
    payload = {
        "question": "Who is Ronaldo?",
        "session_id": "test_ronaldo_session"
    }
    print(f"Querying: {payload}", flush=True)
    try:
        response = requests.post(url, json=payload, stream=True, timeout=120.0)
        print(f"Status: {response.status_code}", flush=True)
        for line in response.iter_lines():
            if line:
                decoded = line.decode('utf-8')
                print(decoded, flush=True)
    except Exception as e:
        print(f"Failed: {e}", flush=True)

if __name__ == "__main__":
    main()
