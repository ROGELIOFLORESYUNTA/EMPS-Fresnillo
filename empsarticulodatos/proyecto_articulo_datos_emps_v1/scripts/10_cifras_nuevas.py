"""Cifras nuevas del articulo: macros, tablas y figuras en LaTeX (datasets publicos, SA, duracion, Mexico).

Lee los CSV que producen los scripts 07, 08, 09 y 09b y escribe en article/generated/:
  - cifras.tex               se AGREGAN al final las macros nuevas (prefijo \\nuevo...), entre dos marcas de
                             comentario; las macros anteriores no se tocan. Se puede correr varias veces:
                             el bloque nuevo siempre se reemplaza completo.
  - tabla_modelos_sa.tex     \\label{tab:sa}: SA promedio de cuatro modelos por dataset
  - tabla_curva.tex          \\label{tab:curva}: curvas de aprendizaje (log-lineal / bosque) con n = 4, 8, 16, 32
  - figuras_nuevas.tex       las figuras 3, 4 y 5 (\\label{fig:sa}, \\label{fig:curva}, \\label{fig:seeradur})

IMPORTANTE: 04b_generate_custom_assets.py reescribe cifras.tex completo. Si se vuelve a correr 04b,
hay que correr este script otra vez para recuperar las macros nuevas.

Los valores salen formateados como los macros existentes (0.42, 80.8\\%). Las macros que llevan texto
usan acentos de LaTeX (\\'a) para no depender de la codificacion.

Uso: .venv/Scripts/python scripts/10_cifras_nuevas.py   (desde la raiz del subproyecto)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import numpy as np
import pandas as pd

from common_promise import GENERATED, MODELOS, OUTPUTS, orden_por_tamano

MARCA_INICIO = "% ==== CIFRAS NUEVAS (datasets publicos, SA, duracion SEERA, punto mexicano): generadas por scripts/10_cifras_nuevas.py, NO editar a mano ===="
MARCA_FIN = "% ==== FIN DE CIFRAS NUEVAS ===="
N_CURVA = {"Cuatro": 4, "Ocho": 8, "Dieciseis": 16}

# ----------------------------------------------------------------------------------------
# Utilidades de formato
# ----------------------------------------------------------------------------------------
ACENTOS = {"á": "\\'a", "é": "\\'e", "í": "\\'{\\i}", "ó": "\\'o", "ú": "\\'u", "ñ": "\\~n", "ü": "\\\"u",
           "Á": "\\'A", "É": "\\'E", "Í": "\\'I", "Ó": "\\'O", "Ú": "\\'U", "Ñ": "\\~N",
           "·": "$\\cdot$"}


def tex(texto):
    """Cambia las letras con acento por sus macros de LaTeX (igual que 04b_generate_custom_assets.py)."""
    for k, v in ACENTOS.items():
        texto = texto.replace(k, v)
    return texto


def num2(v):
    """Decimal con dos cifras; el menos es tipografico y sirve en texto y en modo matematico."""
    s = "%.2f" % v
    return ("\\ensuremath{-}" + s[1:]) if s.startswith("-") else s


def pct1(v):
    return "%.1f\\%%" % v


def pct_con_signo(v):
    s = "%.1f" % abs(v)
    return ("+" if v >= 0 else "\\ensuremath{-}") + s + "\\%"


def miles(n):
    return "{:,}".format(int(n)).replace(",", "{,}")


def dec2(v):
    return "%.2f" % v


# ----------------------------------------------------------------------------------------
# Lectura de resultados
# ----------------------------------------------------------------------------------------
def leer():
    r = {
        "resumen": pd.read_csv(OUTPUTS / "modelos_simples_vs_ml.csv"),
        "curva": pd.read_csv(OUTPUTS / "curva_aprendizaje.csv"),
        "seera": pd.read_csv(OUTPUTS / "seera_duracion.csv").iloc[0],
        "mex": pd.read_csv(OUTPUTS / "mexico_valdes_2024_ajuste.csv").set_index("grupo").loc["mexicanos_42"],
        "mex_modelos": pd.read_csv(OUTPUTS / "mexico_valdes_2024_modelos.csv").set_index("modelo"),
    }
    return r


def mediana_entre_datasets(df, modelo, columna="SA", **filtros):
    sub = df[df.modelo == modelo]
    for k, v in filtros.items():
        sub = sub[sub[k] == v]
    return float(np.median(sub[columna]))


# ----------------------------------------------------------------------------------------
# Macros
# ----------------------------------------------------------------------------------------
def frase_mexico(mex):
    return tex(
        "Con los %d proyectos mexicanos de Valdés-Souto y Valeriano-Assem (2024), medidos en puntos de función COSMIC "
        "(8 de una empresa con oficina en México y 34 de la Asociación Mexicana de Métricas de Software), el ajuste "
        "log-lineal da un exponente de %.2f sobre el tamaño, $R^{2}$ de %.2f y una mediana de %.1f horas por punto COSMIC "
        "(mitad central de los proyectos entre %.1f y %.1f)."
        % (mex.n, mex.b, mex.R2_log, mex.horas_por_cfp_mediana, mex.horas_por_cfp_q1, mex.horas_por_cfp_q3))


def calcular_macros(r):
    res, cur, se, mex, mexm = r["resumen"], r["curva"], r["seera"], r["mex"], r["mex_modelos"]
    por_conjunto = res.drop_duplicates("conjunto")
    sa_modelo = {m: res[res.modelo == m].set_index("conjunto").SA for m in MODELOS + ["proporcional"]}
    gana_p = res[(res.modelo == "bosque") & res.supera_a_loglineal_p05].conjunto.nunique()
    log_ge_rf = int((sa_modelo["loglineal"] >= sa_modelo["bosque"]).sum())

    m = []   # (nombre, valor, comentario)
    m.append(("nuevoNconjuntos", str(por_conjunto.conjunto.nunique()), "datasets publicos de esfuerzo obtenidos"))
    m.append(("nuevoNproyectosPublicos", miles(por_conjunto.n_proyectos.sum()), "suma de proyectos de esos datasets"))
    for clave, modelo in (("Mediana", "mediana"), ("Loglin", "loglineal"), ("ATLM", "lineal_transf"), ("RF", "bosque")):
        m.append(("nuevoSAmed" + clave, num2(float(np.median(sa_modelo[modelo]))), "mediana entre datasets de la SA promedio: " + modelo))
    m.append(("nuevoRFganaP", str(gana_p), "datasets donde el bosque supera al log-lineal (MAE, Wilcoxon p < 0.05)"))
    m.append(("nuevoLoglinGanaOEmpata", str(log_ge_rf), "datasets donde la SA del log-lineal es mayor o igual que la del bosque"))
    for etiqueta, n in N_CURVA.items():
        for clave, modelo in (("Loglin", "loglineal"), ("RF", "bosque")):
            m.append(("nuevoCurva%s%s" % (etiqueta, clave), num2(mediana_entre_datasets(cur, modelo, n_entrenamiento=n)),
                      "mediana entre datasets de la SA con n = %d proyectos de entrenamiento: %s" % (n, modelo)))
    m.append(("nuevoSeeraDurSobre", pct1(se.pct_real_mayor), "SEERA: duracion real mayor que la estimada"))
    m.append(("nuevoSeeraDurMediana", pct_con_signo(se.desviacion_mediana_pct), "SEERA: desviacion mediana de la duracion, con signo"))
    m.append(("nuevoSeeraDurMdMRE", "%.0f\\%%" % (se.MdMRE * 100), "SEERA: MdMRE de la duracion"))
    m.append(("nuevoSeeraDurPredQuince", pct1(se.PRED15 * 100), "SEERA: PRED(15) de la duracion"))
    m.append(("nuevoSeeraDurPredVeinticinco", pct1(se.PRED25 * 100), "SEERA: PRED(25) de la duracion"))
    m.append(("nuevoSeeraDurRho", dec2(se.spearman_rho), "SEERA: Spearman entre duracion estimada y real"))
    m.append(("nuevoMexTexto", frase_mexico(mex), "frase con el punto de calibracion mexicano"))

    # --- Complementarias (no las pidio el articulo; explican por que el log-lineal falla con 4 proyectos)
    comp = []
    comp.append(("nuevoSAmedPropor", num2(float(np.median(sa_modelo["proporcional"]))), "mediana entre datasets de la SA del modelo proporcional (a por tamano)"))
    for etiqueta, n in N_CURVA.items():
        comp.append(("nuevoCurva%sPropor" % etiqueta, num2(mediana_entre_datasets(cur, "proporcional", n_entrenamiento=n)),
                     "SA mediana entre datasets del modelo proporcional con n = %d" % n))
    for clave, modelo in (("Loglin", "loglineal"), ("RF", "bosque")):
        comp.append(("nuevoCurvaTipCuatro" + clave, num2(mediana_entre_datasets(cur, modelo, "SA_mediana_sorteos", n_entrenamiento=4)),
                     "con n = 4, mediana entre datasets de la SA del sorteo tipico (mediana de los 100 sorteos): " + modelo))
    comp.append(("nuevoMexN", str(int(mex.n)), "proyectos mexicanos del modelo de Valdes-Souto y Valeriano-Assem (2024)"))
    comp.append(("nuevoMexHorasCFP", "%.1f" % mex.horas_por_cfp_mediana, "mediana de horas por punto COSMIC"))
    comp.append(("nuevoMexExponente", "%.2f" % mex.b, "exponente b del ajuste log-lineal con los proyectos mexicanos"))
    comp.append(("nuevoMexRdos", "%.2f" % mex.R2_log, "R2 del ajuste log-lineal con los proyectos mexicanos"))
    comp.append(("nuevoMexSAloglin", num2(float(mexm.loc["loglineal", "SA"])), "SA del log-lineal con los 42 mexicanos (validacion cruzada repetida)"))
    comp.append(("nuevoMexSAbosque", num2(float(mexm.loc["bosque", "SA"])), "SA del bosque aleatorio con los 42 mexicanos (solo tamano)"))
    return m, comp


def escribir_macros(m, comp):
    """Agrega el bloque nuevo al final de cifras.tex sin tocar lo anterior y conservando los saltos de linea."""
    ruta = GENERATED / "cifras.tex"
    crudo = ruta.read_bytes().decode("utf-8")
    nl = "\r\n" if "\r\n" in crudo else "\n"
    previo = crudo.split(MARCA_INICIO)[0].rstrip("\r\n") + nl      # todo lo anterior, intacto
    lineas = [MARCA_INICIO, "% Las pidio el articulo (main.tex):"]
    lineas += ["\\newcommand{\\%s}{%s}" % (n, v) for n, v, _ in m]
    lineas += ["% Complementarias (agregadas por el analisis; no las exige main.tex):"]
    lineas += ["\\newcommand{\\%s}{%s}" % (n, v) for n, v, _ in comp]
    lineas += [MARCA_FIN]
    ruta.write_bytes((previo + nl.join(lineas) + nl).encode("utf-8"))
    return ruta


# ----------------------------------------------------------------------------------------
# Tablas (mismo estilo booktabs que las tablas existentes, con \caption y \label)
# ----------------------------------------------------------------------------------------
# Si la tabla es mas ancha que la columna (el articulo es de dos columnas), se encoge solo lo necesario;
# si cabe, queda a su tamano natural.
AJUSTE_ABRE = "\\resizebox{\\ifdim\\width>\\columnwidth\\columnwidth\\else\\width\\fi}{!}{%\n"
AJUSTE_CIERRA = "}\n"


def celda_sa(v, negrita=False, asterisco=False):
    t = num2(v)
    if asterisco:
        t += "$^{*}$"
    return "\\textbf{%s}" % t if negrita else t


def tabla_modelos_sa(res):
    orden = orden_por_tamano(res)
    sa = res.pivot(index="conjunto", columns="modelo", values="SA")
    gana = res[res.modelo == "bosque"].set_index("conjunto").supera_a_loglineal_p05
    n = res.drop_duplicates("conjunto").set_index("conjunto").n_proyectos
    filas = []
    for c in orden:
        valores = [float(sa.loc[c, m]) for m in MODELOS]
        mejor = int(np.argmax(valores))
        celdas = [celda_sa(v, negrita=(j == mejor), asterisco=(MODELOS[j] == "bosque" and bool(gana[c])))
                  for j, v in enumerate(valores)]
        filas.append("%s & %d & %s \\\\" % (c, n[c], " & ".join(celdas)))
    medianas = [num2(float(np.median(sa[m]))) for m in MODELOS]
    filas_med = "Mediana de los %d & & %s \\\\" % (len(orden), " & ".join(medianas))
    cuerpo = "\n".join(filas)
    return (
        "\\begin{table}[t]\n"
        "\\centering\n"
        + tex("\\caption{Exactitud estandarizada (SA, promedio de 50 pliegues) de cuatro modelos en %d datasets públicos de "
              "esfuerzo, de menos a más proyectos. Uno es sin error y cero es adivinar al azar.}\n" % len(orden)) +
        "\\label{tab:sa}\n"
        "\\scriptsize\n"
        "\\setlength{\\tabcolsep}{3pt}\n"
        + AJUSTE_ABRE +
        "\\begin{tabular}{lrrrrr}\n"
        "\\toprule\n"
        "Dataset & $n$ & Mediana & \\shortstack{Log-\\\\lineal} & \\shortstack{Lineal\\\\transf.} & \\shortstack{Bosque\\\\aleatorio} \\\\\n"
        "\\midrule\n"
        + cuerpo + "\n"
        "\\midrule\n"
        + filas_med + "\n"
        "\\bottomrule\n"
        "\\end{tabular}%\n"
        + AJUSTE_CIERRA +
        "\\par\\smallskip\n"
        + tex("{\\scriptsize\\raggedright $^{*}$ El bosque aleatorio supera al log-lineal (MAE por pliegue, prueba de "
              "Wilcoxon, $p<0.05$). En negritas, el mejor modelo de cada dataset.\\par}\n") +
        "\\end{table}\n")


def tabla_curva(cur):
    orden = orden_por_tamano(cur)
    ns = [4, 8, 16, 32]
    n_total = cur.drop_duplicates("conjunto").set_index("conjunto").n_proyectos
    filas = []
    for c in orden:
        celdas = []
        for n in ns:
            sub = cur[(cur.conjunto == c) & (cur.n_entrenamiento == n)]
            if sub.empty:
                celdas.append("")
            else:
                a = float(sub[sub.modelo == "loglineal"].SA.iloc[0])
                b = float(sub[sub.modelo == "bosque"].SA.iloc[0])
                celdas.append("%s/%s" % (num2(a), num2(b)))
        filas.append("%s & %d & %s \\\\" % (c, n_total[c], " & ".join(celdas)))
    med = []
    for n in ns:
        sub = cur[cur.n_entrenamiento == n]
        med.append("%s/%s" % (num2(float(np.median(sub[sub.modelo == "loglineal"].SA))),
                              num2(float(np.median(sub[sub.modelo == "bosque"].SA)))))
    tip = cur[(cur.n_entrenamiento == 4) & cur.modelo.isin(["loglineal", "bosque"])].pivot(
        index="conjunto", columns="modelo", values="SA_mediana_sorteos")
    k_tip = int((tip.loglineal >= tip.bosque).sum())
    return (
        "\\begin{table}[t]\n"
        "\\centering\n"
        + tex("\\caption{Exactitud estandarizada (SA promedio de 100 sorteos) con $n$ proyectos de entrenamiento, en el formato "
              "log-lineal/bosque aleatorio. La prueba usa todos los demás proyectos; la celda queda vacía cuando $n$ no es "
              "menor que la mitad de los $N$ proyectos del dataset.}\n") +
        "\\label{tab:curva}\n"
        "\\scriptsize\n"
        "\\setlength{\\tabcolsep}{2.5pt}\n"
        + AJUSTE_ABRE +
        "\\begin{tabular}{lrcccc}\n"
        "\\toprule\n"
        "Dataset & $N$ & $n=4$ & $n=8$ & $n=16$ & $n=32$ \\\\\n"
        "\\midrule\n"
        + "\n".join(filas) + "\n"
        "\\midrule\n"
        "Mediana & & " + " & ".join(med) + " \\\\\n"
        "\\bottomrule\n"
        "\\end{tabular}%\n"
        + AJUSTE_CIERRA +
        "\\par\\smallskip\n"
        + tex("{\\scriptsize\\raggedright Con $n=4$ el promedio del log-lineal lo arrastran pocos sorteos en que la recta de "
              "cuatro puntos da pendientes extremas; en el sorteo típico (la mediana de los 100) el log-lineal iguala o "
              "supera al bosque en %d de %d datasets.\\par}\n" % (k_tip, len(tip))) +
        "\\end{table}\n")


FIGURAS = [
    ("fig3_sa_modelos.png",
     "Exactitud estandarizada (SA) promedio de los cuatro modelos en cada dataset, de los que tienen menos proyectos "
     "(arriba) a los que tienen más (abajo). Cero equivale a adivinar al azar y uno a no tener error. El asterisco marca "
     "los datasets donde el bosque aleatorio supera al log-lineal ($p<0.05$).", "fig:sa"),
    ("fig4_curva_aprendizaje.png",
     "Curvas de aprendizaje: SA promedio de 100 sorteos con $n$ proyectos de entrenamiento y el resto del dataset como "
     "prueba. Gris: mediana (el piso). Azul continuo: log-lineal. Azul discontinuo: modelo proporcional, que solo "
     "calibra $a$. Naranja: bosque aleatorio. Los triángulos al pie marcan promedios fuera de escala, con su valor.",
     "fig:curva"),
    ("fig5_seera_duracion.png",
     "Duración estimada contra duración real por proyecto en SEERA. Los puntos por encima de la diagonal son proyectos "
     "que tardaron más de lo estimado; el área de cada punto indica cuántos proyectos coinciden en ese par. En SEERA el "
     "esfuerzo se calcula a partir de la duración, por eso sus desviaciones coinciden con las del esfuerzo.", "fig:seeradur"),
]


def figuras_nuevas():
    partes = []
    for archivo, pie, etiqueta in FIGURAS:
        partes.append(
            "\\begin{figure}[t]\n"
            "\\centering\n"
            "\\includegraphics[width=0.95\\linewidth]{../outputs/figures/%s}\n"
            "\\caption{%s}\n"
            "\\label{%s}\n"
            "\\end{figure}\n" % (archivo, tex(pie), etiqueta))
    return "\n".join(partes)


def main():
    r = leer()
    m, comp = calcular_macros(r)
    ruta = escribir_macros(m, comp)
    (GENERATED / "tabla_modelos_sa.tex").write_text(tabla_modelos_sa(r["resumen"]), encoding="utf-8")
    (GENERATED / "tabla_curva.tex").write_text(tabla_curva(r["curva"]), encoding="utf-8")
    (GENERATED / "figuras_nuevas.tex").write_text(figuras_nuevas(), encoding="utf-8")
    print("Macros nuevas en %s: %d pedidas + %d complementarias" % (ruta, len(m), len(comp)))
    for nombre, valor, _ in m:
        if nombre != "nuevoMexTexto":
            print("  %-30s %s" % (nombre, valor))
    print("Escritos: tabla_modelos_sa.tex, tabla_curva.tex, figuras_nuevas.tex en article/generated/")


if __name__ == "__main__":
    main()
