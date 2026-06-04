import requests
import json
import sys

def main():
    url = "http://localhost:11434/api/generate"
    system_prompt = (
        "You are I.N.A.Y.A.T., a highly capable, local AI Knowledge Intelligence assistant.\n"
        "Answer the user's question using the provided context and knowledge graph details.\n\n"
        "RULES:\n"
        "1. Direct citation: Cite the source chunks using [1], [2], [3] at the end of sentences that use facts from them.\n"
        "2. If the context does not contain the answer, say that you cannot find it, but use your general knowledge if relevant (stating it clearly).\n"
        "3. Provide clear, well-structured, professional explanations.\n"
        "4. At the very end of your response, on a new line, write exactly: 'Confidence: [0-100]%'\n"
        "/no_think"
    )
    user_prompt = "User Question: hi\nAssistant Answer:"
    
    payload = {
        "model": "qwen3:4b",
        "prompt": user_prompt,
        "system": system_prompt,
        "stream": True,
        "options": {
            "num_ctx": 4096
        }
    }
    
    print("Sending POST request to Ollama with stream=True...")
    try:
        response = requests.post(url, json=payload, stream=True, timeout=180.0)
        print(f"Status Code: {response.status_code}")
        for line in response.iter_lines():
            if line:
                decoded_line = line.decode('utf-8')
                data = json.loads(decoded_line)
                print(f"response: {repr(data.get('response'))} | thinking: {repr(data.get('thinking'))} | done: {data.get('done')}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    main()
