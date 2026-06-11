"""Muestra filas del SQLite JOSSE + busca columnas de tiempo/texto en un CSV crudo."""
import sqlite3
import pandas as pd

con = sqlite3.connect(r"data/raw/JOSSE_Dataset/josse/JOSSE_18092020.sqlite3")
df = pd.read_sql("SELECT * FROM [case] LIMIT 8", con)
print("=== SAMPLE SQLITE ===")
print(df.to_string())
print()
stats = pd.read_sql(
    """SELECT corpus, COUNT(*) AS n,
              AVG(actual_effort) AS avg_actual,
              AVG(expert_estimated_effort) AS avg_expert
       FROM [case] GROUP BY corpus""",
    con,
)
print("=== POR CORPUS ===")
print(stats.to_string())
nulls = pd.read_sql(
    """SELECT
         SUM(CASE WHEN actual_effort IS NULL THEN 1 ELSE 0 END) AS null_actual,
         SUM(CASE WHEN expert_estimated_effort IS NULL THEN 1 ELSE 0 END) AS null_expert,
         SUM(CASE WHEN actual_effort <= 0 THEN 1 ELSE 0 END) AS nonpos_actual,
         COUNT(*) AS total
       FROM [case]""",
    con,
)
print("=== NULOS ===")
print(nulls.to_string())
con.close()

print()
print("=== COLUMNAS TIEMPO/TEXTO EN CSV CRUDO ===")
import glob
csvs = glob.glob(r"data/raw/JOSSE_Dataset/josse/dataset_replication/raw_data/*.csv")
sample_csv = [c for c in csvs if "JBoss" in c][0]
raw = pd.read_csv(sample_csv, nrows=5, low_memory=False)
cols = list(raw.columns)
print(f"archivo: {sample_csv}  total_cols={len(cols)}")
interesting = [c for c in cols if any(k in c.lower() for k in ["time", "estimate", "spent", "summary", "description", "type"])]
print("columnas relevantes:", interesting[:25])
