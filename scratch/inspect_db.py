import sqlite3, os

db = r"c:\Users\moham\Music\INAYAT MCA LNCT MAJOR PROJECT\data\conversations.db"
print("DB exists:", os.path.exists(db))
conn = sqlite3.connect(db)
c = conn.cursor()
c.execute('SELECT name FROM sqlite_master WHERE type="table"')
tables = c.fetchall()
print("Tables:", tables)
for t in tables:
    c.execute(f'SELECT COUNT(*) FROM "{t[0]}"')
    print(f"  {t[0]}: {c.fetchone()[0]} rows")
try:
    c.execute("SELECT * FROM messages ORDER BY timestamp DESC LIMIT 10")
    rows = c.fetchall()
    print("\nLatest messages:")
    for r in rows:
        print(f"  session={r[1]}, role={r[2]}, content={str(r[3])[:80]}..., ts={r[4]}")
except Exception as e:
    print(f"Error reading messages: {e}")
c.execute("PRAGMA table_info(messages)")
print("\nmessages schema:", c.fetchall())
conn.close()
