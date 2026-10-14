"""Verificacion independiente de las cifras NUEVAS del articulo (datasets publicos, SA, curvas, SEERA, Mexico).

Lo llama 05_verify_results.py al final, con su misma funcion `check`, de modo que el total que se
imprime suma las 26 comprobaciones anteriores y estas. Tambien se puede correr solo:
    .venv/Scripts/python scripts/05b_verify_nuevos.py

Cada comprobacion compara el valor que cita el articulo (una macro de cifras.tex o un valor publicado)
contra un recalculo hecho aqui con codigo propio, sin reusar las funciones del pipeline:
  A. tamanos: cuantos datasets hay y cuantos proyectos tiene cada uno (se cuentan las filas de los ARFF crudos);
  B. SA y pruebas del cuadro de modelos: medianas por modelo, y cuantos datasets gana el bosque o el log-lineal,
     a partir de los pliegues (outputs/modelos_simples_vs_ml_pliegues.csv);
  C. el nucleo de las metricas: MAE de la mediana, del log-lineal y del proporcional recalculados desde los datos
     crudos con los mismos pliegues; MAE_azar contra su valor esperado exacto; SA = 1 - MAE/MAE_azar;
  D. curvas de aprendizaje: medianas entre datasets a partir de outputs/curva_aprendizaje.csv;
  E. SEERA: duracion estimada contra real, recalculada desde el ARFF original;
  F. punto mexicano: ajuste recalculado desde data/processed/mexico_valdes_2024.csv y comparado con lo que
     publican los autores;
  G. consistencia de las tablas .tex con los CSV y de las macros anteriores.
"""
import io
import re
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import rankdata, wilcoxon
from sklearn.model_selection import RepeatedKFold

RAIZ = Path(".")
PROMISE = RAIZ / "data" / "raw" / "promise"
OUT = RAIZ / "outputs"
GEN = RAIZ / "article" / "generated"
SEMILLA = 2026

# Datasets: archivo, columna de esfuerzo, columna de tamano y proyectos que publica la literatura
CONJ = {
    "Albrecht": ("albrecht/albrecht.arff", "Effort", "AdjFP", 24),
    "China": ("china/china.arff", "Effort", "AFP", 499),
    "COCOMO81": ("cocomo81/coc81.arff", "actual", "loc", 63),
    "Desharnais": ("desharnais/desharnais.arff", "Effort", "PointsAjust", 81),
    "Kitchenham": ("kitchenham/kitchenham.arff", "Actual.effort", "Adjusted.function.points", 145),
    "Maxwell": ("maxwell/maxwell.arff", "Effort", "Size", 62),
    "NASA93": ("nasa93/nasa93.arff", "act_effort", "equivphyskloc", 93),
}


# ----------------------------------------------------------------------------------------
# Lectores propios (distintos de los del pipeline)
# ----------------------------------------------------------------------------------------
def arff_a_tabla(ruta):
    nombres, datos, en_datos = [], [], False
    for linea in Path(ruta).read_text(encoding="utf-8", errors="replace").splitlines():
        s = linea.strip()
        if not s or s.startswith("%"):
            continue
        if en_datos:
            datos.append(s)
        elif s.lower().startswith("@attribute"):
            m = re.match(r"@attribute\s+(?:'([^']*)'|\"([^\"]*)\"|(\S+))", s, re.I)
            nombres.append((m.group(1) or m.group(2) or m.group(3)).strip())
        elif s.lower().startswith("@data"):
            en_datos = True
    return pd.read_csv(io.StringIO("\n".join(datos)), header=None, names=nombres, na_values="?", skipinitialspace=True)


def macros():
    """Todas las macros de cifras.tex como {nombre: texto}."""
    texto = (GEN / "cifras.tex").read_text(encoding="utf-8")
    return dict(re.findall(r"\\newcommand\{\\(\w+)\}\{(.*)\}\s*$", texto, flags=re.M))


def valor(texto):
    """Numero que representa una macro (maneja el menos tipografico, % y comas de miles)."""
    neg = "ensuremath{-}" in texto or texto.strip().startswith("-")
    num = float(re.search(r"\d+(?:\.\d+)?", texto.replace("{,}", "")).group(0))
    return -num if neg else num


def datos_crudos(nombre):
    archivo, col_y, col_x, _ = CONJ[nombre]
    t = arff_a_tabla(PROMISE / archivo)
    y, x = pd.to_numeric(t[col_y], errors="coerce"), pd.to_numeric(t[col_x], errors="coerce")
    ok = (y > 0) & (x > 0)
    return len(t), y[ok].to_numpy(float), x[ok].to_numpy(float)


# ----------------------------------------------------------------------------------------
def correr(check):
    M = macros()
    fold = pd.read_csv(OUT / "modelos_simples_vs_ml_pliegues.csv")
    cur = pd.read_csv(OUT / "curva_aprendizaje.csv")

    # ---------------- A. Tamanos ----------------
    carpetas = [p for p in PROMISE.iterdir() if p.is_dir() and any(p.glob("*.arff"))]
    check("nuevoNconjuntos (macro) = carpetas PROMISE con datos", valor(M["nuevoNconjuntos"]), len(carpetas), tol=0)
    total = 0
    for nombre, (archivo, _, _, publicado) in CONJ.items():
        n_filas, _, _ = datos_crudos(nombre)
        total += n_filas
        check("n %s (literatura: %d) = filas del ARFF crudo" % (nombre, publicado), publicado, n_filas, tol=0)
    check("nuevoNproyectosPublicos (macro) = suma de filas", valor(M["nuevoNproyectosPublicos"]), total, tol=0)

    # ---------------- B. SA por modelo y conteos ----------------
    sa_ds = fold.groupby(["conjunto", "modelo"]).SA.mean().unstack()          # SA promedio por dataset
    for clave, modelo in (("Mediana", "mediana"), ("Loglin", "loglineal"), ("ATLM", "lineal_transf"), ("RF", "bosque")):
        check("SA mediana entre datasets, %s (macro nuevoSAmed%s)" % (modelo, clave), valor(M["nuevoSAmed" + clave]),
              float(np.median(sa_ds[modelo])), tol=0.0051)
    check("SA mediana entre datasets, proporcional (macro nuevoSAmedPropor)", valor(M["nuevoSAmedPropor"]),
          float(np.median(sa_ds["proporcional"])), tol=0.0051)
    gana = 0
    for c in CONJ:
        ancho = fold[fold.conjunto == c].pivot_table(index=["repeticion", "pliegue"], columns="modelo", values="MAE")
        p = wilcoxon(ancho["bosque"], ancho["loglineal"]).pvalue
        gana += int(ancho["bosque"].mean() < ancho["loglineal"].mean() and p < 0.05)
    check("datasets donde el bosque supera al log-lineal con p<0.05 (macro nuevoRFganaP)", valor(M["nuevoRFganaP"]), gana, tol=0)
    check("datasets donde el log-lineal iguala o supera al bosque en SA (macro nuevoLoglinGanaOEmpata)",
          valor(M["nuevoLoglinGanaOEmpata"]), int((sa_ds["loglineal"] >= sa_ds["bosque"]).sum()), tol=0)
    # El resumen por dataset (CSV) coincide con los pliegues
    res = pd.read_csv(OUT / "modelos_simples_vs_ml.csv").set_index(["conjunto", "modelo"]).SA
    dif = max(abs(res[(c, m)] - sa_ds.loc[c, m]) for c in CONJ for m in sa_ds.columns)
    check("resumen CSV (SA por dataset y modelo) = promedio de los pliegues (dif maxima)", 0.0, dif, tol=1e-9)

    # ---------------- C. Nucleo de las metricas, recalculado desde los datos crudos ----------------
    dif_med = dif_log = dif_pro = dif_azar = dif_sa = 0.0
    for c in CONJ:
        _, y, x = datos_crudos(c)
        f = fold[fold.conjunto == c]
        splits = list(RepeatedKFold(n_splits=5, n_repeats=10, random_state=SEMILLA).split(np.arange(len(y))))
        ref = {m: f[f.modelo == m].sort_values(["repeticion", "pliegue"]).MAE.to_numpy() for m in ("mediana", "loglineal", "proporcional")}
        azar = f[f.modelo == "mediana"].sort_values(["repeticion", "pliegue"]).MAE_azar.to_numpy()
        mae_med, mae_log, mae_pro, azar_exacto = [], [], [], []
        for tr, te in splits:
            mae_med.append(np.mean(np.abs(y[te] - np.median(y[tr]))))
            A = np.column_stack([np.ones(len(tr)), np.log(x[tr])])
            coef, *_ = np.linalg.lstsq(A, np.log(y[tr]), rcond=None)
            mae_log.append(np.mean(np.abs(y[te] - np.exp(coef[0] + coef[1] * np.log(x[te])))))
            a = np.exp(np.mean(np.log(y[tr]) - np.log(x[tr])))
            mae_pro.append(np.mean(np.abs(y[te] - a * x[te])))
            azar_exacto.append(np.abs(y[te][:, None] - y[tr][None, :]).mean())   # valor esperado exacto del sorteo al azar
        dif_med = max(dif_med, float(np.max(np.abs(np.array(mae_med) - ref["mediana"]) / ref["mediana"])))
        dif_log = max(dif_log, float(np.max(np.abs(np.array(mae_log) - ref["loglineal"]) / ref["loglineal"])))
        dif_pro = max(dif_pro, float(np.max(np.abs(np.array(mae_pro) - ref["proporcional"]) / ref["proporcional"])))
        dif_azar = max(dif_azar, abs(float(np.mean(azar)) / float(np.mean(azar_exacto)) - 1.0))
    sa_calc = 1 - fold.MAE / fold.MAE_azar
    dif_sa = float(np.max(np.abs(sa_calc - fold.SA)))
    check("MAE de la mediana por pliegue, recalculado desde el ARFF (error relativo maximo)", 0.0, dif_med, tol=1e-9)
    check("MAE del log-lineal por pliegue, recalculado con otro ajuste (error relativo maximo)", 0.0, dif_log, tol=1e-6)
    check("MAE del proporcional por pliegue, recalculado (error relativo maximo)", 0.0, dif_pro, tol=1e-9)
    check("MAE_azar de 1000 sorteos contra su valor esperado exacto (error relativo del promedio, peor dataset)", 0.0, dif_azar, tol=0.01)
    check("SA = 1 - MAE/MAE_azar en las 1750 filas de pliegues (diferencia maxima)", 0.0, dif_sa, tol=1e-9)

    # ---------------- D. Curvas de aprendizaje ----------------
    for etiqueta, n in (("Cuatro", 4), ("Ocho", 8), ("Dieciseis", 16)):
        for clave, modelo in (("Loglin", "loglineal"), ("RF", "bosque"), ("Propor", "proporcional")):
            sub = cur[(cur.n_entrenamiento == n) & (cur.modelo == modelo)]
            check("curva n=%d, %s: mediana entre datasets de la SA (macro nuevoCurva%s%s)" % (n, modelo, etiqueta, clave),
                  valor(M["nuevoCurva%s%s" % (etiqueta, clave)]), float(np.median(sub.SA)), tol=0.0051)
    for clave, modelo in (("Loglin", "loglineal"), ("RF", "bosque")):
        sub = cur[(cur.n_entrenamiento == 4) & (cur.modelo == modelo)]
        check("curva n=4, %s: SA del sorteo tipico (macro nuevoCurvaTipCuatro%s)" % (modelo, clave),
              valor(M["nuevoCurvaTipCuatro" + clave]), float(np.median(sub.SA_mediana_sorteos)), tol=0.0051)
    esperadas = sum(sum(1 for n in (4, 8, 16, 32) if n < CONJ_N / 2) for CONJ_N in [p[3] for p in CONJ.values()])
    check("curva: combinaciones dataset x n con n < N/2 (x4 modelos = filas del CSV)", esperadas * 4, len(cur), tol=0)

    # ---------------- E. SEERA: duracion estimada contra real ----------------
    raw = (RAIZ / "data" / "raw" / "SEERA_Dataset" / "The SEERA Dataset" / "Dataset Files" / "ARFF Format"
           / "ARFF_ SEERA cost estimation dataset.csv.arff")
    t = arff_a_tabla(raw)
    t.columns = [re.sub(r"[^a-z0-9]+", "_", c.strip().lower()).strip("_") for c in t.columns]
    est, real = t["estimated_duration"].to_numpy(float), t["actual_duration"].to_numpy(float)
    mre = np.abs(est - real) / real
    check("SEERA duracion: proyectos con duracion real > estimada, % (macro nuevoSeeraDurSobre)",
          valor(M["nuevoSeeraDurSobre"]), float((real > est).mean() * 100), tol=0.051)
    check("SEERA duracion: desviacion mediana, % con signo (macro nuevoSeeraDurMediana)",
          valor(M["nuevoSeeraDurMediana"]), float(np.median((real - est) / est) * 100), tol=0.051)
    check("SEERA duracion: MdMRE, % (macro nuevoSeeraDurMdMRE)", valor(M["nuevoSeeraDurMdMRE"]), float(np.median(mre) * 100), tol=0.51)
    check("SEERA duracion: PRED(15), % (macro nuevoSeeraDurPredQuince)", valor(M["nuevoSeeraDurPredQuince"]), float((mre <= 0.15).mean() * 100), tol=0.051)
    check("SEERA duracion: PRED(25), % (macro nuevoSeeraDurPredVeinticinco)", valor(M["nuevoSeeraDurPredVeinticinco"]), float((mre <= 0.25).mean() * 100), tol=0.051)
    rho = float(np.corrcoef(rankdata(est), rankdata(real))[0, 1])
    check("SEERA duracion: Spearman (macro nuevoSeeraDurRho)", valor(M["nuevoSeeraDurRho"]), rho, tol=0.0051)
    # El esfuerzo de SEERA es una formula de la duracion: sus desviaciones deben ser las mismas
    estE, realE = t["estimated_effort"].to_numpy(float), t["actual_effort"].to_numpy(float)
    check("SEERA: cociente real/estimado del esfuerzo = el de la duracion en los 120 proyectos (dif maxima)", 0.0,
          float(np.max(np.abs(realE / estE - real / est))), tol=1e-9)
    check("SEERA: desviacion mediana de esfuerzo (macro anterior desvSeera) = la de duracion",
          valor(M["desvSeera"]), float(np.median((real - est) / est) * 100), tol=0.051)

    # ---------------- F. Punto mexicano (Valdes-Souto y Valeriano-Assem, 2024) ----------------
    mx = pd.read_csv(RAIZ / "data" / "processed" / "mexico_valdes_2024.csv", comment="#")
    m42 = mx[mx.en_modelo_42]
    A = np.column_stack([np.ones(len(m42)), np.log(m42.cfp)])
    coef, *_ = np.linalg.lstsq(A, np.log(m42.esfuerzo_horas), rcond=None)
    r2 = 1 - np.sum((np.log(m42.esfuerzo_horas) - A @ coef) ** 2) / np.sum((np.log(m42.esfuerzo_horas) - np.log(m42.esfuerzo_horas).mean()) ** 2)
    check("Mexico: proyectos en el modelo (macro nuevoMexN) = filas en_modelo_42", valor(M["nuevoMexN"]), len(m42), tol=0)
    check("Mexico: 42 proyectos (COMPANY 8 + AMMS 34), como dice el articulo de Valdes-Souto", 42, len(m42), tol=0)
    check("Mexico: exponente b recalculado (macro nuevoMexExponente) contra el publicado 0.9326", valor(M["nuevoMexExponente"]), float(coef[1]), tol=0.0051)
    check("Mexico: b recalculado = 0.9326 que publican los autores", 0.9326, float(coef[1]), tol=0.0005)
    check("Mexico: constante del log-lineal = 2.8916 que publican los autores", 2.8916, float(coef[0]), tol=0.0005)
    check("Mexico: R2 recalculado (macro nuevoMexRdos) = 0.8339 que publican los autores", 0.8339, float(r2), tol=0.0005)
    check("Mexico: R2 (macro nuevoMexRdos)", valor(M["nuevoMexRdos"]), float(r2), tol=0.0051)
    check("Mexico: mediana de horas por punto COSMIC (macro nuevoMexHorasCFP)", valor(M["nuevoMexHorasCFP"]),
          float((m42.esfuerzo_horas / m42.cfp).median()), tol=0.051)
    pdr = m42.esfuerzo_horas / m42.cfp
    esperadas = [str(len(m42)), "%.2f" % coef[1], "%.2f" % r2, "%.1f" % pdr.median(), "%.1f" % pdr.quantile(0.25), "%.1f" % pdr.quantile(0.75)]
    check("Mexico: cifras de la frase nuevoMexTexto que no coinciden con el recalculo (de 6)", 0,
          sum(int(e not in M["nuevoMexTexto"]) for e in esperadas), tol=0)

    # ---------------- F2. Kitchenham: la estimacion inicial de la empresa contra lo real ----------------
    ki = pd.read_csv(OUT / "kitchenham_estimacion_inicial.csv").iloc[0]
    k = arff_a_tabla(PROMISE / "kitchenham" / "kitchenham.arff")
    yk, ek = k["Actual.effort"].to_numpy(float), k["First.estimate"].to_numpy(float)
    mre_k = np.abs(ek - yk) / yk
    azar_k = float(np.mean([np.abs(yk[i] - np.delete(yk, i)).mean() for i in range(len(yk))]))
    check("Kitchenham: correlacion en logaritmos de la estimacion inicial con el esfuerzo real", float(ki.corr_log_estimacion_inicial),
          float(np.corrcoef(np.log(ek), np.log(yk))[0, 1]), tol=1e-9)
    check("Kitchenham: MdMRE de la estimacion inicial de la empresa", float(ki.MdMRE), float(np.median(mre_k)), tol=1e-9)
    check("Kitchenham: SA de la estimacion inicial (MAE de adivinar con el valor esperado exacto)", float(ki.SA),
          1 - float(np.mean(np.abs(ek - yk))) / azar_k, tol=1e-9)

    # ---------------- G. Consistencia de las tablas .tex y de las macros anteriores ----------------
    res_df = pd.read_csv(OUT / "modelos_simples_vs_ml.csv")
    tex_sa = (GEN / "tabla_modelos_sa.tex").read_text(encoding="utf-8")
    malas = 0
    for c in CONJ:
        linea = next(l for l in tex_sa.splitlines() if l.startswith(c + " &"))
        for m in ("mediana", "loglineal", "lineal_transf", "bosque"):
            v = res_df[(res_df.conjunto == c) & (res_df.modelo == m)].SA.iloc[0]
            malas += int(("%.2f" % v).replace("-", "") not in linea)
    check("tabla_modelos_sa.tex: celdas que no coinciden con el CSV", 0, malas, tol=0)
    tex_cu = (GEN / "tabla_curva.tex").read_text(encoding="utf-8")
    malas = 0
    for c in CONJ:
        linea = next(l for l in tex_cu.splitlines() if l.startswith(c + " &"))
        for n in (4, 8, 16, 32):
            s = cur[(cur.conjunto == c) & (cur.n_entrenamiento == n)]
            if len(s):
                a = s[s.modelo == "loglineal"].SA.iloc[0]
                b = s[s.modelo == "bosque"].SA.iloc[0]
                malas += int(not (("%.2f" % abs(a)) in linea and ("%.2f" % abs(b)) in linea))
    check("tabla_curva.tex: celdas que no coinciden con el CSV", 0, malas, tol=0)
    previas = [k for k in M if not k.startswith("nuevo")]
    check("cifras.tex: macros anteriores intactas (17)", 17, len(previas), tol=0)
    for etiqueta in ("tab:sa", "tab:curva"):
        check("etiqueta %s presente en las tablas generadas" % etiqueta, 1, int(("\\label{%s}" % etiqueta) in tex_sa + tex_cu), tol=0)
    figs = (GEN / "figuras_nuevas.tex").read_text(encoding="utf-8")
    check("figuras_nuevas.tex: etiquetas fig:sa, fig:curva y fig:seeradur", 3,
          sum(int(("\\label{%s}" % e) in figs) for e in ("fig:sa", "fig:curva", "fig:seeradur")), tol=0)
    check("figuras_nuevas.tex: los 3 archivos PNG existen", 3,
          sum(int((OUT / "figures" / f).exists()) for f in ("fig3_sa_modelos.png", "fig4_curva_aprendizaje.png", "fig5_seera_duracion.png")), tol=0)


if __name__ == "__main__":
    resultados = []

    def check(nombre, esperado, recalculado, tol=0.01):
        ok = abs(esperado - recalculado) <= tol
        resultados.append((nombre, esperado, round(float(recalculado), 6), "PASS" if ok else "FAIL"))

    correr(check)
    for nombre, esp, rec, est in resultados:
        print("%-110s %10s %12s %5s" % (nombre[:110], esp, rec, est))
    malas = sum(1 for r in resultados if r[3] == "FAIL")
    print("TOTAL nuevas: %d/%d PASS" % (len(resultados) - malas, len(resultados)))
    sys.exit(1 if malas else 0)
