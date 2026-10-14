"""Curvas de aprendizaje: que pasa con la exactitud cuando hay muy pocos proyectos.

Para cada dataset publico (ver 07) y para n = 4, 8, 16 y 32 proyectos de entrenamiento
(solo cuando n < N/2, donde N es el total del dataset):
  - 100 sorteos al azar de n proyectos para entrenar (semilla 2026) y prueba con todos
    los demas proyectos del dataset;
  - modelos: log-lineal (esfuerzo = a * tamano^b), bosque aleatorio (200 arboles, con todas
    las variables permitidas) y, como piso, la mediana de entrenamiento;
  - por sorteo: MdMRE, PRED(25), MAE y exactitud estandarizada SA (misma definicion que en
    07, con MAE_azar calculado con los esfuerzos reales de esos n proyectos);
  - se promedian los 100 sorteos.

Salidas:
  outputs/curva_aprendizaje.csv                una fila por dataset, n y modelo
  outputs/figures/fig4_curva_aprendizaje.png   una grafica chica por dataset: x = n, y = SA

Uso: .venv/Scripts/python scripts/08_curva_aprendizaje.py   (desde la raiz del subproyecto)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import numpy as np
import pandas as pd

from common_promise import (COLORES, FIGURES, ORDEN_CONJUNTOS, OUTPUTS, PREDICTORES, REJILLA, SEMILLA,
                            TINTA, TINTA_SUAVE, cargar, mae_azar, metricas, orden_por_tamano, sa)

N_ENTRENAMIENTO = (4, 8, 16, 32)
N_SORTEOS = 100
MODELOS_CURVA = ["mediana", "loglineal", "proporcional", "bosque"]   # proporcional = complementario


def curva_conjunto(idx, nombre):
    D = cargar(nombre)
    filas = []
    for n in N_ENTRENAMIENTO:
        if not n < D.n / 2:
            continue
        rng = np.random.default_rng([SEMILLA, idx, n])
        por_modelo = {m: [] for m in MODELOS_CURVA}
        for _ in range(N_SORTEOS):
            tr = np.sort(rng.choice(D.n, size=n, replace=False))
            te = np.setdiff1d(np.arange(D.n), tr)
            m_azar = mae_azar(D.y[te], D.y[tr], rng)
            for modelo in MODELOS_CURVA:
                met = metricas(D.y[te], PREDICTORES[modelo](D, tr, te))
                por_modelo[modelo].append({**met, "SA": sa(met["MAE"], m_azar)})
        for modelo in MODELOS_CURVA:
            d = pd.DataFrame(por_modelo[modelo])
            filas.append({"conjunto": nombre, "n_proyectos": D.n, "n_entrenamiento": n, "n_prueba": D.n - n,
                          "modelo": modelo, "n_sorteos": N_SORTEOS,
                          "MdMRE": d.MdMRE.mean(), "PRED25": d.PRED25.mean(), "MAE": d.MAE.mean(),
                          "SA": d.SA.mean(), "SA_mediana_sorteos": d.SA.median(), "SA_desv": d.SA.std()})
    return filas


def _fmt_fuera(v):
    """Valor fuera de escala con signo menos tipografico: -2.7, -62."""
    s = "%.1f" % v if abs(v) < 10 else "%.0f" % v
    return s.replace("-", "\u2212")


def figura_curva(curva):
    """Figura 4: una grafica chica por dataset, x = n proyectos de entrenamiento, y = SA promedio."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.lines import Line2D

    orden = orden_por_tamano(curva)
    n_por = curva.drop_duplicates("conjunto").set_index("conjunto").n_proyectos
    pos = {n: k for k, n in enumerate(N_ENTRENAMIENTO)}
    y_min = -0.6
    estilos = {
        "mediana": dict(color=COLORES["mediana"], linewidth=1.5, linestyle="-"),
        "loglineal": dict(color=COLORES["loglineal"], linewidth=1.8, linestyle="-", marker="o", markersize=4),
        "proporcional": dict(color=COLORES["proporcional"], linewidth=1.3, linestyle=(0, (3, 2)), marker="D", markersize=3.2),
        "bosque": dict(color=COLORES["bosque"], linewidth=1.8, linestyle="-", marker="s", markersize=4),
    }
    fig, axes = plt.subplots(3, 3, figsize=(4.7, 5.0), sharex=True, sharey=True)
    for ax, conjunto in zip(axes.flat, orden):
        sub = curva[curva.conjunto == conjunto]
        for modelo in ("mediana", "proporcional", "loglineal", "bosque"):
            d = sub[sub.modelo == modelo].sort_values("n_entrenamiento")
            x = np.array([pos[n] for n in d.n_entrenamiento])
            y = d.SA.to_numpy(dtype=float)
            ax.plot(x, np.where(y >= y_min, y, np.nan), **estilos[modelo])
            for xi, yi in zip(x, y):
                if yi < y_min:                      # fuera de escala: triangulo abajo con su valor
                    ax.plot(xi, y_min + 0.06, marker="v", color=estilos[modelo]["color"], markersize=5, clip_on=False)
                    ax.annotate(_fmt_fuera(yi), (xi, y_min + 0.06), xytext=(5, 2), textcoords="offset points",
                                fontsize=7, color=TINTA_SUAVE)
        ax.axhline(0, color=TINTA_SUAVE, linewidth=0.8)
        ax.set_title("%s (N = %d)" % (conjunto, n_por[conjunto]), fontsize=8, color=TINTA, pad=3)
        ax.set_xticks(range(len(N_ENTRENAMIENTO)))
        ax.set_xticklabels([str(n) for n in N_ENTRENAMIENTO], fontsize=7.5)
        ax.set_xlim(-0.35, len(N_ENTRENAMIENTO) - 0.65)
        ax.set_ylim(y_min, 1.0)
        ax.set_yticks([-0.5, 0, 0.5, 1.0])
        ax.tick_params(axis="y", labelsize=7.5, colors=TINTA_SUAVE)
        ax.tick_params(axis="x", labelbottom=True, labelsize=7.5, colors=TINTA_SUAVE)   # n visible en cada grafica
        ax.yaxis.grid(True, color=REJILLA, linewidth=0.7)
        ax.set_axisbelow(True)
        for lado in ("top", "right"):
            ax.spines[lado].set_visible(False)
    for ax in axes.flat[len(orden):]:
        ax.set_visible(False)
    manijas = [
        Line2D([], [], label="Mediana (piso)", **estilos["mediana"]),
        Line2D([], [], label="Log-lineal (a\u00b7tama\u00f1o^b)", **estilos["loglineal"]),
        Line2D([], [], label="Proporcional (a\u00b7tama\u00f1o)", **estilos["proporcional"]),
        Line2D([], [], label="Bosque aleatorio", **estilos["bosque"]),
        Line2D([], [], color=TINTA_SUAVE, marker="v", linestyle="", markersize=5, label="fuera de escala (valor)"),
    ]
    fig.legend(handles=manijas, loc="lower right", bbox_to_anchor=(0.985, 0.075), frameon=False, fontsize=7.6,
               handlelength=2.2, labelspacing=0.5)
    fig.supxlabel("Proyectos usados para calibrar (n)", fontsize=8.3, color=TINTA_SUAVE)
    fig.supylabel("Exactitud estandarizada SA (promedio de 100 sorteos)", fontsize=8.3, color=TINTA_SUAVE)
    fig.tight_layout()
    fig.savefig(FIGURES / "fig4_curva_aprendizaje.png", dpi=200, facecolor="white")
    plt.close(fig)


def main():
    if "--solo-figura" in sys.argv:          # rehace la figura con el CSV ya calculado
        figura_curva(pd.read_csv(OUTPUTS / "curva_aprendizaje.csv"))
        print("Figura regenerada: outputs/figures/fig4_curva_aprendizaje.png")
        return
    filas = []
    for idx, nombre in enumerate(ORDEN_CONJUNTOS):
        filas += curva_conjunto(idx, nombre)
        print(f"{nombre:<11} hecho")
    curva = pd.DataFrame(filas)
    curva.to_csv(OUTPUTS / "curva_aprendizaje.csv", index=False)
    figura_curva(curva)
    print("Figura guardada: outputs/figures/fig4_curva_aprendizaje.png")
    tabla = curva.pivot_table(index=["conjunto", "n_entrenamiento"], columns="modelo", values="SA")[MODELOS_CURVA]
    print("\nSA promedio por dataset, n y modelo:")
    print(tabla.round(2).to_string())
    return curva


if __name__ == "__main__":
    main()
