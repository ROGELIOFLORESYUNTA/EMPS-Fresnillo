"""Genera fragmentos LaTeX pulidos (espanol, headers escapados, booktabs)
a partir de las tablas CSV producidas por 03 y 03b.

Sustituye a los fragmentos del script 04 que dejaban guiones bajos sin
escapar (n_train, MAPE_pct) y nombres de modelo crudos.

Salidas en article/generated/:
  - tabla_metricas.tex      (metricas de los 3 modelos x 2 datasets)
  - tabla_expertos.tex      (JOSSE: estimacion experta vs esfuerzo real)
  - tabla_seera_dev.tex     (SEERA: desviacion estimado vs real)
  - tabla_dispersion.tex    (JOSSE: dispersion por tipo de tarea)
  - figuras.tex             (las 6 figuras con captions en espanol)
  - cifras.tex              (macros \\newcommand con las cifras clave para
                             citarlas en el texto sin transcripcion manual)
"""
from common import TABLES, FIGURES, GENERATED
import pandas as pd

MODEL_LABELS = {
    "baseline_media": "L\\'inea base",
    "regresion_lineal": "Reg.\\ lineal",
    "bosque_aleatorio": "Bosque aleat.",
}

# ============================================================
# 1) Tabla de metricas de modelos
# ============================================================
m = pd.read_csv(TABLES / "model_metrics.csv")
rows = []
for _, r in m.iterrows():
    rows.append(
        f"{r['dataset']} & {MODEL_LABELS.get(r['modelo'], r['modelo'])} & "
        f"{int(r['n_train'])} & {int(r['n_test'])} & "
        f"{r['MAE']:.3f} & {r['RMSE']:.3f} & {r['R2']:.3f} \\\\"
    )
tabla_metricas = (
    "\\begin{table}[t]\n"
    "\\centering\n"
    "\\caption{M\\'etricas de los modelos sobre $\\log(1+\\text{esfuerzo})$ "
    "(conjunto de prueba, partici\\'on 75/25).}\n"
    "\\label{tab:metricas}\n"
    "\\scriptsize\n"
    "\\setlength{\\tabcolsep}{3.5pt}\n"
    "\\begin{tabular}{llrrrrr}\n"
    "\\toprule\n"
    "Dataset & Modelo & $n_{ent}$ & $n_{pru}$ & MAE & RMSE & $R^2$ \\\\\n"
    "\\midrule\n"
    + "\n".join(rows) + "\n"
    "\\bottomrule\n"
    "\\end{tabular}\n"
    "\\end{table}\n"
)
(GENERATED / "tabla_metricas.tex").write_text(tabla_metricas, encoding="utf-8")

# ============================================================
# 2) Tabla expertos JOSSE
# ============================================================
e = pd.read_csv(TABLES / "josse_expert_vs_actual.csv").iloc[0]
tabla_expertos = (
    "\\begin{table}[t]\n"
    "\\centering\n"
    "\\caption{Precisi\\'on de las estimaciones expertas en JOSSE "
    f"($n={int(e['n'])}$ tareas anotadas).}}\n"
    "\\label{tab:expertos}\n"
    "\\small\n"
    "\\begin{tabular}{lr}\n"
    "\\toprule\n"
    "Indicador & Valor \\\\\n"
    "\\midrule\n"
    f"MMRE (error relativo medio) & {e['MMRE']:.2f} \\\\\n"
    f"MdMRE (error relativo mediano) & {e['MdMRE']:.2f} \\\\\n"
    f"PRED(15) & {e['PRED_15']*100:.1f}\\% \\\\\n"
    f"PRED(30) & {e['PRED_30']*100:.1f}\\% \\\\\n"
    f"Tareas subestimadas & {e['pct_subestimadas']*100:.1f}\\% \\\\\n"
    f"Correlaci\\'on de Spearman ($\\rho$) & {e['spearman_rho']:.2f} \\\\\n"
    "\\bottomrule\n"
    "\\end{tabular}\n"
    "\\end{table}\n"
)
(GENERATED / "tabla_expertos.tex").write_text(tabla_expertos, encoding="utf-8")

# ============================================================
# 3) Tabla desviacion SEERA
# ============================================================
s = pd.read_csv(TABLES / "seera_estimate_vs_actual.csv").iloc[0]
tabla_seera = (
    "\\begin{table}[t]\n"
    "\\centering\n"
    "\\caption{Desviaci\\'on entre esfuerzo estimado y real en SEERA "
    f"($n={int(s['n'])}$ proyectos).}}\n"
    "\\label{tab:seera}\n"
    "\\small\n"
    "\\begin{tabular}{lr}\n"
    "\\toprule\n"
    "Indicador & Valor \\\\\n"
    "\\midrule\n"
    f"MMRE & {s['MMRE']:.2f} \\\\\n"
    f"MdMRE & {s['MdMRE']:.2f} \\\\\n"
    f"PRED(15) & {s['PRED_15']*100:.1f}\\% \\\\\n"
    f"PRED(30) & {s['PRED_30']*100:.1f}\\% \\\\\n"
    f"Proyectos subestimados & {s['pct_subestimados']*100:.1f}\\% \\\\\n"
    f"Desviaci\\'on mediana del esfuerzo & +{s['desviacion_mediana_pct']:.1f}\\% \\\\\n"
    "\\bottomrule\n"
    "\\end{tabular}\n"
    "\\end{table}\n"
)
(GENERATED / "tabla_seera_dev.tex").write_text(tabla_seera, encoding="utf-8")

# ============================================================
# 4) Tabla dispersion change-like
# ============================================================
d = pd.read_csv(TABLES / "josse_change_dispersion.csv")
rows = []
label = {"change_like": "Con t\\'erm.\\ cambio", "no_change_like": "Sin t\\'erm.\\ cambio"}
for _, r in d.iterrows():
    rows.append(
        f"{label.get(r['grupo'], r['grupo'])} & {int(r['n'])} & "
        f"{r['mediana_h']:.2f} & {r['media_h']:.2f} & {r['std_h']:.2f} & {r['IQR_h']:.2f} \\\\"
    )
pval = d["mannwhitney_p"].iloc[0]
tabla_disp = (
    "\\begin{table}[t]\n"
    "\\centering\n"
    "\\caption{Esfuerzo real (horas) seg\\'un presencia de t\\'erminos de "
    f"cambio/mantenimiento en JOSSE. Mann-Whitney $p={pval:.2f}$.}}\n"
    "\\label{tab:dispersion}\n"
    "\\scriptsize\n"
    "\\setlength{\\tabcolsep}{3.5pt}\n"
    "\\begin{tabular}{lrrrrr}\n"
    "\\toprule\n"
    "Grupo & $n$ & Mediana & Media & D.E. & RIC \\\\\n"
    "\\midrule\n"
    + "\n".join(rows) + "\n"
    "\\bottomrule\n"
    "\\end{tabular}\n"
    "\\end{table}\n"
)
(GENERATED / "tabla_dispersion.tex").write_text(tabla_disp, encoding="utf-8")

# ============================================================
# 5) Figuras
# ============================================================
FIGS = [
    ("josse_expert_vs_actual.png",
     "Estimaci\\'on experta contra esfuerzo real en JOSSE. La l\\'inea diagonal "
     "indica estimaci\\'on perfecta.", "fig:expertos"),
    ("seera_estimate_vs_actual.png",
     "Esfuerzo estimado contra esfuerzo real por proyecto en SEERA. Los puntos "
     "por encima de la diagonal corresponden a proyectos subestimados.", "fig:seera"),
    ("actual_vs_predicted_josse.png",
     "Esfuerzo real contra esfuerzo predicho por la regresi\\'on lineal en el "
     "conjunto de prueba de JOSSE.", "fig:pred"),
    ("effort_distribution_josse.png",
     "Distribuci\\'on del esfuerzo real en JOSSE (escala logar\\'itmica).", "fig:distjosse"),
    ("effort_distribution_seera.png",
     "Distribuci\\'on del esfuerzo real en SEERA (escala logar\\'itmica).", "fig:distseera"),
    ("josse_change_boxplot.png",
     "Esfuerzo real por tipo de tarea en JOSSE (sin valores at\\'ipicos).", "fig:boxplot"),
]
parts = []
for fname, caption, lab in FIGS:
    if (FIGURES / fname).exists():
        parts.append(
            "\\begin{figure}[t]\n"
            "\\centering\n"
            f"\\includegraphics[width=0.95\\linewidth]{{../outputs/figures/{fname}}}\n"
            f"\\caption{{{caption}}}\n"
            f"\\label{{{lab}}}\n"
            "\\end{figure}\n"
        )
(GENERATED / "figuras.tex").write_text("\n".join(parts), encoding="utf-8")

# ============================================================
# 6) Macros con cifras clave (citar en el texto sin transcribir)
# ============================================================
jl = m[(m.dataset == "JOSSE") & (m.modelo == "regresion_lineal")].iloc[0]
jb = m[(m.dataset == "JOSSE") & (m.modelo == "baseline_media")].iloc[0]
sr = m[(m.dataset == "SEERA") & (m.modelo == "bosque_aleatorio")].iloc[0]
sl = m[(m.dataset == "SEERA") & (m.modelo == "regresion_lineal")].iloc[0]
macros = f"""% Cifras clave generadas automaticamente — NO editar a mano.
\\newcommand{{\\nJosse}}{{23{{,}}186}}
\\newcommand{{\\nJosseExp}}{{{int(e['n']):,}}}
\\newcommand{{\\nSeera}}{{{int(s['n'])}}}
\\newcommand{{\\rdosJosseLin}}{{{jl['R2']:.2f}}}
\\newcommand{{\\rdosSeeraRF}}{{{sr['R2']:.2f}}}
\\newcommand{{\\rdosSeeraLin}}{{{sl['R2']:.2f}}}
\\newcommand{{\\maeJosseLin}}{{{jl['MAE']:.2f}}}
\\newcommand{{\\maeJosseBase}}{{{jb['MAE']:.2f}}}
\\newcommand{{\\predQuinceJosse}}{{{e['PRED_15']*100:.1f}\\%}}
\\newcommand{{\\predTreintaJosse}}{{{e['PRED_30']*100:.1f}\\%}}
\\newcommand{{\\mdmreJosse}}{{{e['MdMRE']*100:.0f}\\%}}
\\newcommand{{\\rhoJosse}}{{{e['spearman_rho']:.2f}}}
\\newcommand{{\\predQuinceSeera}}{{{s['PRED_15']*100:.1f}\\%}}
\\newcommand{{\\subestSeera}}{{{s['pct_subestimados']*100:.1f}\\%}}
\\newcommand{{\\desvSeera}}{{{s['desviacion_mediana_pct']:.1f}\\%}}
\\newcommand{{\\mdmreSeera}}{{{s['MdMRE']*100:.0f}\\%}}
\\newcommand{{\\pCambio}}{{{pval:.2f}}}
"""
(GENERATED / "cifras.tex").write_text(macros.replace(",", "{,}").replace("{{,}}", "{,}") if False else macros, encoding="utf-8")

print("OK: 6 fragmentos LaTeX generados en article/generated/")
