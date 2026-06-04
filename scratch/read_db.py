import sqlite3
import json

def main():
    conn = sqlite3.connect("data/conversations.db")
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM messages")
        rows = cursor.fetchall()
        print("=== MESSAGES TABLE ROWS ===")
        for row in rows:
            print(row)
    except Exception as e:
        print(f"Error reading DB: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
