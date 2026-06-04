import requests
import json
import sys

def main():
    print("=== Testing I.N.A.Y.A.T. Integration Pipeline ===")
    
    # 1. Create a dummy text file
    content = "The LNCT Group is led by Director Moham, who collaborates with Lead Engineer Inayat. They build intelligent neuro networks together."
    files = {
        'file': ('test_lnct.txt', content, 'text/plain')
    }
    
    # 2. Upload file
    upload_url = "http://localhost:8000/api/upload"
    print(f"\n1. Uploading file to {upload_url}...")
    try:
        response = requests.post(upload_url, files=files)
        print(f"Status Code: {response.status_code}")
        if response.status_code != 200:
            print(f"Error: {response.text}")
            sys.exit(1)
        upload_data = response.json()
        print(f"Response data: {json.dumps(upload_data, indent=2)}")
    except Exception as e:
        print(f"Upload failed: {e}")
        sys.exit(1)
        
    # 3. Query system
    query_url = "http://localhost:8000/api/query"
    payload = {
        "question": "Who does Director Moham collaborate with and what do they build?",
        "session_id": "test_session_1"
    }
    print(f"\n2. Querying system at {query_url}...")
    print(f"Payload: {json.dumps(payload)}")
    
    try:
        # Use streaming response
        response = requests.post(query_url, json=payload, stream=True)
        print(f"Status Code: {response.status_code}")
        if response.status_code != 200:
            print(f"Error: {response.text}")
            sys.exit(1)
            
        print("\nStreaming response events:")
        for line in response.iter_lines():
            if line:
                decoded_line = line.decode('utf-8')
                print(decoded_line)
    except Exception as e:
        print(f"Query failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
