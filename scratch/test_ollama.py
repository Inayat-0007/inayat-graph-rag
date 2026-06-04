import requests
import json

def main():
    url = "http://localhost:11434/api/generate"
    system_prompt = (
        "You are an entity extraction assistant. "
        "Extract named entities and their relationships from the given text. "
        "Return a valid JSON object with exactly two keys:\n"
        '- "entities": a list of objects with "name" (string) and "type" (string, e.g. PERSON, ORGANIZATION)\n'
        '- "relationships": a list of objects with "source" (string), "target" (string), and "relation" (string)\n'
        "Return ONLY the JSON object, no other text.\n"
        "/no_think"
    )
    prompt = "Extract entities and relationships from the following text:\n\nThe LNCT Group is led by Director Moham, who collaborates with Lead Engineer Inayat."
    
    payload = {
        "model": "qwen3:4b",
        "prompt": prompt,
        "system": system_prompt,
        "format": "json",
        "stream": False,
        "options": {
            "num_ctx": 4096
        },
        "keep_alive": "0"
    }
    
    print("Sending POST request to Ollama...")
    try:
        response = requests.post(url, json=payload, timeout=60.0)
        print(f"Status Code: {response.status_code}")
        data = response.json()
        print("Response from Ollama:")
        print(json.dumps(data, indent=2))
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    main()
