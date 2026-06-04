import requests
import sys

def main():
    url = "http://localhost:8000/api/query"
    payload = {
        "question": "hi",
        "session_id": "test_hi_session"
    }
    print(f"Querying: {payload}")
    try:
        response = requests.post(url, json=payload, stream=True, timeout=180.0)
        print(f"Status: {response.status_code}")
        for line in response.iter_lines():
            if line:
                print(line.decode('utf-8'))
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    main()
