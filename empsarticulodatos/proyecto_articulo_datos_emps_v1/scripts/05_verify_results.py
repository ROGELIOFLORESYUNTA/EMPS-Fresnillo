"""Verificacion INDEPENDIENTE de todos los numeros que aparecen en el articulo.

Recalcula cada indicador desde los CSV procesados con codigo escrito desde
cero (sin reusar las funciones del pipeline) y lo compara contra:
  a) las tablas generadas en outputs/tables/, y
  b) los valores citados en el texto del articulo (hardcodeados aqui como
     "valores esperados del articulo").

Si TODO da PASS, los numeros del PDF son correctos y consistentes.

Uso: .venv\\Scripts\\python scripts\\05_verify_results.py
"""
from pathlib import Path
import numpy as np
import pandas as pd

PROCESSED = Path("data/processed")
TABLES = Path("outputs/tables")

RESULTS = []

def check(nombre, esperado, recalculado, tol=0.01):
    ok = abs(esperado - recalculado) <= tol
    RESULTS.append((nombre, esperado, round(recalculado, 4), "PASS" if ok else "FAIL"))
    return ok

print("=" * 72)
print("VERIFICACION INDEPENDIENTE DE RESULTADOS DEL ARTICULO")
print("=" * 72)

# ------------------------------------------------------------------
# 1) Tamanos de muestra
# ------------------------------------------------------------------
josse = pd.read_csv(PROCESSED / "josse_prepared.csv")
expert = pd.read_csv(PROCESSED / "josse_expert_subset.csv")
seera = pd.read_csv(PROCESSED / "seera_prepared.csv")
dev = pd.read_csv(PROCESSED / "seera_estimate_deviation.csv")

check("n JOSSE (articulo: 23,186)", 23186, len(josse), tol=0)
check("n expertos JOSSE (articulo: 4,329)", 4329, len(expert), tol=0)
check("n SEERA (articulo: 120)", 120, len(seera), tol=0)
check("n SEERA desviacion (articulo: 120)", 120, len(dev), tol=0)
check("proyectos JOSSE (articulo: 371)", 371, josse["project"].nunique(), tol=0)

# ------------------------------------------------------------------
# 2) H1a: precision experta JOSSE (recalculo desde cero)
# ------------------------------------------------------------------
est = expert["expert_estimate"].to_numpy(dtype=float)
act = expert["actual_effort"].to_numpy(dtype=float)
mre = np.abs(est - act) / act

check("PRED(15) expertos (articulo: 39.8%)", 0.398, float((mre <= 0.15).mean()))
check("PRED(30) expertos (articulo: 46.0%)", 0.460, float((mre <= 0.30).mean()))
check("MdMRE expertos (articulo: 0.33)", 0.33, float(np.median(mre)))
check("MMRE expertos (tabla: 2.92)", 2.92, float(np.mean(mre)))
check("% subestimadas (tabla: 24.0%)", 0.240, float((est < act).mean()))

# Spearman sin scipy: rho = Pearson de los rangos
def rank(a):
    order = a.argsort()
    r = np.empty_like(order, dtype=float)
    r[order] = np.arange(1, len(a) + 1)
    # promedio de rangos para empates
    s = pd.Series(a)
    return s.rank(method="average").to_numpy()

rho = float(np.corrcoef(rank(est), rank(act))[0, 1])
check("Spearman rho (articulo: 0.79)", 0.79, rho)

# ------------------------------------------------------------------
# 3) H1b: desviacion SEERA (recalculo desde cero)
# ------------------------------------------------------------------
e2 = dev["estimated_effort"].to_numpy(dtype=float)
a2 = dev["actual_effort"].to_numpy(dtype=float)
mre2 = np.abs(e2 - a2) / a2

check("PRED(15) SEERA (articulo: 16.7%)", 0.167, float((mre2 <= 0.15).mean()))
check("PRED(30) SEERA (tabla: 30.8%)", 0.308, float((mre2 <= 0.30).mean()))
check("% subestimados SEERA (articulo: 80.8%)", 0.808, float((e2 < a2).mean()))
check("desv. mediana SEERA (articulo: +58.6%)", 58.6, float(np.median((a2 - e2) / e2) * 100), tol=0.1)
check("MdMRE SEERA (tabla: 0.38)", 0.38, float(np.median(mre2)))

# ------------------------------------------------------------------
# 4) H3: modelos (re-entrenar desde cero con la misma configuracion)
# ------------------------------------------------------------------
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score

# JOSSE regresion lineal (variables texto + project)
feats = ["text_length", "word_count", "is_change_like", "project"]
dfj = josse.dropna(subset=["actual_effort"])
dfj = dfj[dfj["actual_effort"] > 0]
Xj = dfj[feats]
yj = np.log1p(dfj["actual_effort"].astype(float))
Xtr, Xte, ytr, yte = train_test_split(Xj, yj, test_size=0.25, random_state=42)
pre = ColumnTransformer([
    ("num", Pipeline([("i", SimpleImputer(strategy="median")), ("s", StandardScaler())]),
     ["text_length", "word_count", "is_change_like"]),
    ("cat", Pipeline([("i", SimpleImputer(strategy="most_frequent")),
                      ("oh", OneHotEncoder(handle_unknown="ignore"))]), ["project"]),
])
lin = Pipeline([("p", pre), ("m", LinearRegression())]).fit(Xtr, ytr)
r2_josse = r2_score(yte, lin.predict(Xte))
check("R2 reg.lineal JOSSE (articulo: 0.389)", 0.389, float(r2_josse))

# SEERA random forest (21 predictores tempranos)
dfs = seera.dropna(subset=["effort_target"])
dfs = dfs[dfs["effort_target"] > 0]
num_cols = [c for c in dfs.select_dtypes(include=[np.number]).columns if c != "effort_target"][:25]
Xs = dfs[num_cols]
ys = np.log1p(dfs["effort_target"].astype(float))
Xtr2, Xte2, ytr2, yte2 = train_test_split(Xs, ys, test_size=0.25, random_state=42)
pre2 = ColumnTransformer([
    ("num", Pipeline([("i", SimpleImputer(strategy="median")), ("s", StandardScaler())]), num_cols),
])
rf = Pipeline([("p", pre2), ("m", RandomForestRegressor(n_estimators=200, random_state=42, min_samples_leaf=3))]).fit(Xtr2, ytr2)
r2_seera = r2_score(yte2, rf.predict(Xte2))
check("R2 random forest SEERA (articulo: 0.808)", 0.808, float(r2_seera))

# ------------------------------------------------------------------
# 5) H2: Mann-Whitney y proporcion change-like
# ------------------------------------------------------------------
from scipy.stats import mannwhitneyu
g1 = josse.loc[josse["is_change_like"] == 1, "actual_effort"]
g0 = josse.loc[josse["is_change_like"] == 0, "actual_effort"]
_, pval = mannwhitneyu(g1, g0, alternative="two-sided")
check("Mann-Whitney p (articulo: 0.57)", 0.57, float(pval))
check("proporcion change-like (articulo: 26%)", 0.26, float((josse["is_change_like"] == 1).mean()))
check("n change-like (tabla: 6,004)", 6004, len(g1), tol=0)
check("n no change-like (tabla: 17,182)", 17182, len(g0), tol=0)

# ------------------------------------------------------------------
# 6) Consistencia con las tablas generadas (lo que entra al PDF)
# ------------------------------------------------------------------
te = pd.read_csv(TABLES / "josse_expert_vs_actual.csv").iloc[0]
check("tabla PRED_15 == recalculo", float(te["PRED_15"]), float((mre <= 0.15).mean()), tol=1e-9)
ts = pd.read_csv(TABLES / "seera_estimate_vs_actual.csv").iloc[0]
check("tabla %subest SEERA == recalculo", float(ts["pct_subestimados"]), float((e2 < a2).mean()), tol=1e-9)
tm = pd.read_csv(TABLES / "model_metrics.csv")
r2_tab = float(tm[(tm.dataset == "JOSSE") & (tm.modelo == "regresion_lineal")]["R2"].iloc[0])
check("tabla R2 JOSSE == re-entrenamiento", r2_tab, float(r2_josse), tol=0.001)
r2_tab2 = float(tm[(tm.dataset == "SEERA") & (tm.modelo == "bosque_aleatorio")]["R2"].iloc[0])
check("tabla R2 SEERA == re-entrenamiento", r2_tab2, float(r2_seera), tol=0.001)

# ------------------------------------------------------------------
# Reporte final
# ------------------------------------------------------------------
print()
print(f"{'Indicador':<48} {'Esperado':>10} {'Recalc.':>10} {'Estado':>7}")
print("-" * 78)
fails = 0
for nombre, esp, rec, estado in RESULTS:
    print(f"{nombre:<48} {esp:>10} {rec:>10} {estado:>7}")
    if estado == "FAIL":
        fails += 1
print("-" * 78)
total = len(RESULTS)
print(f"TOTAL: {total - fails}/{total} PASS" + ("  *** HAY FALLAS ***" if fails else "  (todo correcto)"))
