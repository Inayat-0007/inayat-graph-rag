import os

log_path = r"C:\Users\moham\.gemini\antigravity\brain\63d23f34-87c4-4e61-b303-fedde84816a3\.system_generated\tasks\task-643.log"
if os.path.exists(log_path):
    print("Log file found. Searching...", flush=True)
    with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
        for idx, line in enumerate(f):
            if "MSI 2026" in line or "Upload complete" in line:
                print(f"{idx+1}: {line.strip()}", flush=True)
else:
    print("Log file not found!", flush=True)
