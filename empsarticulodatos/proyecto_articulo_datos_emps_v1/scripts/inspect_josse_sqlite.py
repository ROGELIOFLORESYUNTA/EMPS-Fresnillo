"""Inspecciona el schema del SQLite curado de JOSSE."""
import sqlite3

con = sqlite3.connect(r"data/raw/JOSSE_Dataset/josse/JOSSE_18092020.sqlite3")
cur = con.cursor()
tables = cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
print("TABLAS:", [t[0] for t in tables])
for (t,) in tables:
    n = cur.execute(f"SELECT COUNT(*) FROM [{t}]").fetchone()[0]
    cols = [c[1] for c in cur.execute(f"PRAGMA table_info([{t}])").fetchall()]
    print(f"--- {t} ({n} filas, {len(cols)} cols)")
    print("   ", cols[:40])
con.close()
