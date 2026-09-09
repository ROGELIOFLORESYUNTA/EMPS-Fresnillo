"""Analisis complementario orientado a las hipotesis del articulo.

H1 (la estimacion basada solo en opinion es insuficiente):
  - JOSSE: 4,329 tareas con estimacion experta y esfuerzo real. Se calcula
    desviacion MRE (magnitude of relative error), MdMRE, PRED(15) y PRED(30)
    al estilo IFPUG/Conte, y correlacion estimado-real.
  - SEERA: 120 proyectos con esfuerzo estimado y real al nivel proyecto.
    Se calcula el porcentaje de proyectos subestimados y la desviacion mediana.

H2 (las tareas asociadas a cambio/mantenimiento presentan mayor variabilidad):
  - JOSSE: contraste de distribuciones de esfuerzo entre tareas change-like
    y no change-like via Mann-Whitney U + comparacion de dispersion (IQR, std).

Salidas: tablas CSV en outputs/tables y figuras PNG en outputs/figures.
"""
from common import PROCESSED, TABLES, FIGURES
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from scipy import stats

# ============================================================
# H1a — JOSSE: estimacion experta vs esfuerzo real
# ============================================================
exp = pd.read_csv(PROCESSED / "josse_expert_subset.csv")
mre = (exp["expert_estimate"] - exp["actual_effort"]).abs() / exp["actual_effort"]
pred15 = float((mre <= 0.15).mean())
pred30 = float((mre <= 0.30).mean())
under = float((exp["expert_estimate"] < exp["actual_effort"]).mean())
rho, rho_p = stats.spearmanr(exp["expert_estimate"], exp["actual_effort"])
r_log, r_log_p = stats.pearsonr(np.log1p(exp["expert_estimate"]), np.log1p(exp["actual_effort"]))

h1a = pd.DataFrame([{
    "n": len(exp),
    "MMRE": float(mre.mean()),
    "MdMRE": float(mre.median()),
    "PRED_15": pred15,
    "PRED_30": pred30,
    "pct_subestimadas": under,
    "spearman_rho": float(rho),
    "pearson_r_log": float(r_log),
}])
h1a.to_csv(TABLES / "josse_expert_vs_actual.csv", index=False)
print("=== H1a JOSSE experto vs real ===")
print(h1a.to_string(index=False))

plt.figure(figsize=(7, 5))
plt.scatter(exp["expert_estimate"], exp["actual_effort"], alpha=0.25, s=12)
lim = float(np.percentile(pd.concat([exp["expert_estimate"], exp["actual_effort"]]), 99))
plt.plot([0, lim], [0, lim], color="black", linewidth=1)
plt.xlim(0, lim)
plt.ylim(0, lim)
plt.xlabel("Estimación experta (horas)")
plt.ylabel("Esfuerzo real (horas)")
plt.title("JOSSE: estimación experta vs esfuerzo real (n={})".format(len(exp)))
plt.tight_layout()
plt.savefig(FIGURES / "josse_expert_vs_actual.png", dpi=180)
plt.close()

# ============================================================
# H1b — SEERA: esfuerzo estimado vs real por proyecto
# ============================================================
dev = pd.read_csv(PROCESSED / "seera_estimate_deviation.csv")
dev_mre = (dev["estimated_effort"] - dev["actual_effort"]).abs() / dev["actual_effort"]
h1b = pd.DataFrame([{
    "n": len(dev),
    "MMRE": float(dev_mre.mean()),
    "MdMRE": float(dev_mre.median()),
    "PRED_15": float((dev_mre <= 0.15).mean()),
    "PRED_30": float((dev_mre <= 0.30).mean()),
    "pct_subestimados": float((dev["estimated_effort"] < dev["actual_effort"]).mean()),
    "desviacion_mediana_pct": float(((dev["actual_effort"] - dev["estimated_effort"]) / dev["estimated_effort"]).median() * 100),
}])
h1b.to_csv(TABLES / "seera_estimate_vs_actual.csv", index=False)
print("\n=== H1b SEERA estimado vs real ===")
print(h1b.to_string(index=False))

plt.figure(figsize=(7, 5))
plt.scatter(dev["estimated_effort"], dev["actual_effort"], alpha=0.6)
lim = float(max(dev["estimated_effort"].max(), dev["actual_effort"].max())) * 1.05
plt.plot([0, lim], [0, lim], color="black", linewidth=1)
plt.xlabel("Esfuerzo estimado (persona-hora)")
plt.ylabel("Esfuerzo real (persona-hora)")
plt.title("SEERA: esfuerzo estimado vs real por proyecto (n={})".format(len(dev)))
plt.tight_layout()
plt.savefig(FIGURES / "seera_estimate_vs_actual.png", dpi=180)
plt.close()

# ============================================================
# H2 — JOSSE: dispersión del esfuerzo en tareas change-like
# ============================================================
josse = pd.read_csv(PROCESSED / "josse_prepared.csv")
g1 = josse.loc[josse["is_change_like"] == 1, "actual_effort"]
g0 = josse.loc[josse["is_change_like"] == 0, "actual_effort"]
u_stat, u_p = stats.mannwhitneyu(g1, g0, alternative="two-sided")

def disp(s):
    return {
        "n": len(s),
        "mediana_h": float(s.median()),
        "media_h": float(s.mean()),
        "std_h": float(s.std()),
        "IQR_h": float(s.quantile(0.75) - s.quantile(0.25)),
        "p90_h": float(s.quantile(0.90)),
    }

h2 = pd.DataFrame([
    {"grupo": "change_like", **disp(g1)},
    {"grupo": "no_change_like", **disp(g0)},
])
h2["mannwhitney_p"] = u_p
h2.to_csv(TABLES / "josse_change_dispersion.csv", index=False)
print("\n=== H2 JOSSE dispersion por tipo de tarea ===")
print(h2.to_string(index=False))
print(f"Mann-Whitney U p-value: {u_p:.3e}")

plt.figure(figsize=(7, 5))
data = [np.log1p(g0), np.log1p(g1)]
plt.boxplot(data, tick_labels=["Sin términos de cambio", "Con términos de cambio"], showfliers=False)
plt.ylabel("log(1 + esfuerzo real en horas)")
plt.title("JOSSE: esfuerzo por tipo de tarea")
plt.tight_layout()
plt.savefig(FIGURES / "josse_change_boxplot.png", dpi=180)
plt.close()

print("\nListo: 3 tablas y 3 figuras adicionales generadas.")
