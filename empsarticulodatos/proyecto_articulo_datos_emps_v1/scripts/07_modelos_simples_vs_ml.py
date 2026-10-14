"""Modelos simples contra aprendizaje automatico con pocos proyectos (hipotesis H4 del articulo).

Pregunta: con pocos proyectos (43 o menos), un modelo parametrico calibrado con los
datos locales (esfuerzo = a * tamano^b) iguala o supera a un bosque aleatorio?

Para cada uno de los 7 datasets publicos de esfuerzo (Albrecht, China, COCOMO81,
Desharnais, Kitchenham, Maxwell, NASA93; ver data/raw/promise/PROCEDENCIA.md):
  - objetivo = esfuerzo real; tamano = puntos de funcion o lineas de codigo;
  - variables extra = columnas numericas u ordinales conocidas al arrancar, sin fuga
    de informacion (se excluye lo derivado del esfuerzo o la duracion reales);
  - cuatro modelos: (a) mediana de entrenamiento, (b) log-lineal esfuerzo = a * tamano^b,
    (c) lineal con transformaciones logaritmicas (estilo ATLM), (d) bosque aleatorio
    (200 arboles, semilla fija);
  - validacion cruzada de 5 pliegues repetida 10 veces (semilla 2026);
  - por pliegue: MdMRE, PRED(25), MAE y exactitud estandarizada
    SA = 1 - MAE / MAE_azar (Shepperd y MacDonell, 2012; MAE_azar = promedio de 1000
    sorteos en que cada proyecto de prueba recibe el esfuerzo real de un proyecto de
    entrenamiento al azar); despues se promedian los pliegues;
  - prueba de rangos con signo de Wilcoxon sobre el MAE por pliegue de cada modelo
    contra la mediana y contra el log-lineal.

Salidas:
  outputs/modelos_simples_vs_ml.csv          resumen por dataset y modelo
  outputs/modelos_simples_vs_ml_pliegues.csv una fila por pliegue (permite verificar todo)
  outputs/parametros_loglineal.csv           a, b y R2 del log-lineal con todos los proyectos
  outputs/kitchenham_estimacion_inicial.csv  la estimacion inicial de la empresa contra lo real (aparte de los modelos)
  outputs/figures/fig3_sa_modelos.png        SA por dataset, cuatro barras por dataset

Uso: .venv/Scripts/python scripts/07_modelos_simples_vs_ml.py   (desde la raiz del subproyecto)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import numpy as np
import pandas as pd

from common_promise import (COLORES, ETIQUETAS, FIGURES, MODELOS, MODELOS_EXTRA, ORDEN_CONJUNTOS, OUTPUTS,
                            PROMISE, REJILLA, TINTA, TINTA_SUAVE, cargar, leer_arff, orden_por_tamano,
                            resumir, validacion_cruzada)

TODOS = MODELOS + MODELOS_EXTRA


def parametros_loglineal(D):
    """a, b y R2 del modelo log-lineal ajustado con todos los proyectos (descriptivo)."""
    x, z = np.log(D.tam), np.log(D.y)
    b, a = np.polyfit(x, z, 1)
    r2 = float(np.corrcoef(x, z)[0, 1] ** 2)
    return {"conjunto": D.nombre, "n_proyectos": D.n, "a": float(np.exp(a)), "b": float(b), "R2_log": r2,
            "esfuerzo_mediano": float(np.median(D.y)), "tamano_mediano": float(np.median(D.tam)),
            "productividad_mediana": float(np.median(D.y / D.tam)),
            "unidad_esfuerzo": D.cfg["unidad_esfuerzo"], "medida_tamano": D.cfg["medida_tamano"]}


def estimacion_inicial_kitchenham():
    """Aparte de los modelos: la estimacion inicial que hizo la empresa en Kitchenham (First.estimate)
    contra el esfuerzo real, con las mismas metricas. No se entrena nada, asi que no hay validacion
    cruzada; el MAE de adivinar es su valor esperado exacto con los demas proyectos."""
    d = leer_arff(PROMISE / "kitchenham" / "kitchenham.arff").datos
    y = d["Actual.effort"].to_numpy(float)
    e = d["First.estimate"].to_numpy(float)
    fp = d["Adjusted.function.points"].to_numpy(float)
    n = len(y)
    mre = np.abs(e - y) / y
    mae = float(np.mean(np.abs(e - y)))
    dif = np.abs(y[:, None] - y[None, :])
    mae_azar = float((dif.sum(axis=1) / (n - 1)).mean())
    return {"conjunto": "Kitchenham", "n": n,
            "corr_log_estimacion_inicial": float(np.corrcoef(np.log(e), np.log(y))[0, 1]),
            "corr_log_tamano": float(np.corrcoef(np.log(fp), np.log(y))[0, 1]),
            "MdMRE": float(np.median(mre)), "PRED25": float(np.mean(mre <= 0.25)), "MAE": mae,
            "MAE_azar_exacto": mae_azar, "SA": 1.0 - mae / mae_azar, "pct_subestimados": float(np.mean(e < y))}


def figura_sa(resumen):
    """Figura 3: exactitud estandarizada (SA) promedio por dataset, cuatro barras por dataset."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.patches import Patch

    orden = orden_por_tamano(resumen)
    n_por = resumen.drop_duplicates("conjunto").set_index("conjunto").n_proyectos
    fila = resumen.set_index(["conjunto", "modelo"])
    alto = 0.19
    fig, ax = plt.subplots(figsize=(4.7, 4.6))
    for i, conjunto in enumerate(orden):
        for j, modelo in enumerate(MODELOS):
            v = float(fila.loc[(conjunto, modelo), "SA"])
            y = i + (j - 1.5) * alto
            ax.barh(y, v, height=alto, color=COLORES[modelo], edgecolor="white", linewidth=0.8)
            if modelo == "bosque" and bool(fila.loc[(conjunto, "bosque"), "supera_a_loglineal_p05"]):
                ax.text(v + 0.012, y, "*", va="center", ha="left", fontsize=11, color=TINTA)
    ax.set_yticks(range(len(orden)))
    ax.set_yticklabels(["%s\n(n = %d)" % (c, n_por[c]) for c in orden], fontsize=8.5, color=TINTA)
    ax.invert_yaxis()
    ax.set_ylim(len(orden) - 0.5, -0.6)
    ax.set_xlim(min(0.0, float(resumen[resumen.modelo.isin(MODELOS)].SA.min()) - 0.05), 1.0)
    ax.axvline(0, color=TINTA_SUAVE, linewidth=0.9)
    ax.xaxis.grid(True, color=REJILLA, linewidth=0.7)
    ax.set_axisbelow(True)
    for lado in ("top", "right", "left"):
        ax.spines[lado].set_visible(False)
    ax.tick_params(axis="y", length=0)
    ax.tick_params(axis="x", labelsize=8.5, colors=TINTA_SUAVE)
    ax.set_xlabel("Exactitud estandarizada SA (0 = adivinar al azar, 1 = sin error)", fontsize=8.3, color=TINTA_SUAVE)
    manijas = [Patch(facecolor=COLORES[m], label=ETIQUETAS[m]) for m in MODELOS]
    ax.legend(handles=manijas, loc="upper center", bbox_to_anchor=(0.42, -0.13), ncol=2, frameon=False,
              fontsize=8.3, handlelength=1.2, columnspacing=1.6)
    fig.text(0.02, 0.012, "* el bosque aleatorio supera al log-lineal (MAE por pliegue, Wilcoxon, p < 0.05)",
             fontsize=7.8, color=TINTA_SUAVE, ha="left", va="bottom")
    fig.tight_layout(rect=(0, 0.03, 1, 1))
    fig.savefig(FIGURES / "fig3_sa_modelos.png", dpi=200, facecolor="white")
    plt.close(fig)


def main():
    if "--solo-figura" in sys.argv:          # rehace la figura con el CSV ya calculado
        figura_sa(pd.read_csv(OUTPUTS / "modelos_simples_vs_ml.csv"))
        print("Figura regenerada: outputs/figures/fig3_sa_modelos.png")
        return
    resumenes, pliegues, params = [], [], []
    for nombre in ORDEN_CONJUNTOS:
        D = cargar(nombre)
        pl = validacion_cruzada(D, TODOS)
        resumenes.append(resumir(D, pl, TODOS))
        pliegues.append(pl)
        params.append(parametros_loglineal(D))
        print(f"{nombre:<11} n={D.n:>3} extras={D.extras.shape[1]:>2}  hecho")
    resumen = pd.concat(resumenes, ignore_index=True)
    pliegues = pd.concat(pliegues, ignore_index=True)
    resumen.to_csv(OUTPUTS / "modelos_simples_vs_ml.csv", index=False)
    pliegues.to_csv(OUTPUTS / "modelos_simples_vs_ml_pliegues.csv", index=False)
    pd.DataFrame(params).to_csv(OUTPUTS / "parametros_loglineal.csv", index=False)
    pd.DataFrame([estimacion_inicial_kitchenham()]).to_csv(OUTPUTS / "kitchenham_estimacion_inicial.csv", index=False)
    figura_sa(resumen)
    print("Figura guardada: outputs/figures/fig3_sa_modelos.png")

    # Resumen corto en pantalla
    tabla = resumen.pivot(index="conjunto", columns="modelo", values="SA").reindex(ORDEN_CONJUNTOS)[TODOS]
    print("\nSA promedio por dataset y modelo:")
    print(tabla.round(2).to_string())
    gana = lambda col: resumen[(resumen.modelo == "bosque") & resumen[col]].conjunto.tolist()
    print()
    print("El bosque supera al log-lineal (MAE, p<0.05) en:", gana("supera_a_loglineal_p05"),
          "| con la prueba conservadora (10 repeticiones):", gana("supera_a_loglineal_p05_rep"))
    return resumen


if __name__ == "__main__":
    main()
