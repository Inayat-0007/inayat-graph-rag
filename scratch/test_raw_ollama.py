import requests
import json

def main():
    url = "http://localhost:11434/api/generate"
    payload = {
        "model": "qwen3:4b",
        "prompt": "hi",
        "stream": True
    }
    print("Connecting directly to Ollama...", flush=True)
    try:
        response = requests.post(url, json=payload, stream=True)
        count = 0
        for line in response.iter_lines():
            if line and count < 10:
                decoded = line.decode('utf-8')
                print(f"LINE {count}: {decoded}", flush=True)
                count += 1
            elif count >= 10:
                break
    except Exception as e:
        print(f"Failed: {e}", flush=True)

if __name__ == "__main__":
    main()
