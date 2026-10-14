"""SEERA: duracion estimada contra duracion real (el articulo solo usaba el esfuerzo).

Con los 120 proyectos de SEERA (Sudan, 2019-2020) se calcula, para la duracion:
  - porcentaje de proyectos cuya duracion real supero a la estimada;
  - desviacion mediana (real - estimada) / estimada, en porcentaje y con signo;
  - MdMRE, PRED(15) y PRED(25);
  - correlacion de Spearman entre duracion estimada y real.

Hallazgo que este script comprueba y deja por escrito: en SEERA el esfuerzo NO es una
medicion independiente. Segun el documento oficial "SEERA dataset attribute formulas.pdf",
  esfuerzo = duracion x (miembros dedicados + 50 % x (tamano del equipo - dedicados)) x (horas diarias x 22).
Como el factor es el mismo para el valor estimado y el real, el cociente real/estimado del
esfuerzo es identico al de la duracion proyecto por proyecto. Por eso las cifras de desviacion
de esfuerzo ya publicadas en cifras.tex (80.8 %, +58.6 %, MdMRE 38 %) coinciden exactamente
con las de duracion: son la misma evidencia, no dos confirmaciones separadas.

Salidas:
  outputs/seera_duracion.csv                  una fila con todas las cifras (y el cruce con cifras.tex)
  outputs/figures/fig5_seera_duracion.png     dispersion estimada vs real con diagonal (estilo de la figura 2)

Uso: .venv/Scripts/python scripts/09_seera_duracion.py   (desde la raiz del subproyecto)
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy.stats import spearmanr

from common import FIGURES, GENERATED, RAW, normalize_columns, read_any_table

OUTPUTS = Path("outputs")
SEERA_ARFF = (RAW / "SEERA_Dataset" / "The SEERA Dataset" / "Dataset Files" / "ARFF Format"
              / "ARFF_ SEERA cost estimation dataset.csv.arff")


def metricas_desviacion(est, real):
    """Indicadores de estimado contra real (mismas definiciones que 03b_run_hypothesis_analysis.py)."""
    est, real = np.asarray(est, float), np.asarray(real, float)
    mre = np.abs(est - real) / real
    return {
        "n": len(est),
        "pct_real_mayor": float((real > est).mean()),
        "desviacion_mediana_pct": float(np.median((real - est) / est) * 100),
        "MdMRE": float(np.median(mre)),
        "PRED15": float((mre <= 0.15).mean()),
        "PRED25": float((mre <= 0.25).mean()),
        "spearman_rho": float(spearmanr(est, real)[0]),
    }


def macro_numerico(nombre):
    """Lee un macro numerico de cifras.tex (p. ej. subestSeera -> 80.8) sin tocar el archivo."""
    texto = (GENERATED / "cifras.tex").read_text(encoding="utf-8")
    m = re.search(re.escape(chr(92) + "newcommand{" + chr(92) + nombre + "}{") + "([^}]*)}", texto)
    return float(re.search(r"-?\d+(?:\.\d+)?", m.group(1)).group(0))


def main():
    s = normalize_columns(read_any_table(SEERA_ARFF))
    num = lambda c: pd.to_numeric(s[c], errors="coerce")
    est_d, real_d = num("estimated_duration"), num("actual_duration")
    est_e, real_e = num("estimated_effort"), num("actual_effort")
    ok = (est_d > 0) & (real_d > 0) & (est_e > 0) & (real_e > 0)
    est_d, real_d, est_e, real_e = est_d[ok], real_d[ok], est_e[ok], real_e[ok]
    equipo, dedicados, horas = (num(c)[ok] for c in ("team_size", "dedicated_team_members", "daily_working_hours"))

    dur = metricas_desviacion(est_d, real_d)
    esf = metricas_desviacion(est_e, real_e)

    # Comprobacion de la formula oficial: esfuerzo = duracion x factor de personal x horas
    factor = (dedicados + (equipo - dedicados) * 0.5) * (horas * 22)
    dif_formula = max(float(np.max(np.abs(est_d * factor - est_e) / est_e)),
                      float(np.max(np.abs(real_d * factor - real_e) / real_e)))
    dif_cocientes = float(np.max(np.abs(real_d / est_d - real_e / est_e)))

    # Cuanto del esfuerzo real de SEERA "se explica" solo con la aritmetica de la formula (en logaritmos):
    # el factor de personal x horas, la duracion estimada, o las dos juntas.
    def r2_log(columnas, y):
        A = np.column_stack([np.ones(len(y))] + [np.log(np.asarray(c, float)) for c in columnas])
        coef, *_ = np.linalg.lstsq(A, np.log(np.asarray(y, float)), rcond=None)
        res = np.log(np.asarray(y, float)) - A @ coef
        return float(1 - res.var() / np.log(np.asarray(y, float)).var())
    r2_factor = r2_log([factor], real_e)
    r2_dur_est = r2_log([est_d], real_e)
    r2_ambos = r2_log([factor, est_d], real_e)

    # Cruce con las cifras de esfuerzo que ya estan en cifras.tex (deben coincidir)
    cruce = {
        "subestSeera": (macro_numerico("subestSeera"), esf["pct_real_mayor"] * 100, 0.05),
        "desvSeera": (macro_numerico("desvSeera"), esf["desviacion_mediana_pct"], 0.05),
        "mdmreSeera": (macro_numerico("mdmreSeera"), esf["MdMRE"] * 100, 0.5),
        "predQuinceSeera": (macro_numerico("predQuinceSeera"), esf["PRED15"] * 100, 0.05),
    }
    coinciden = all(abs(a - b) <= tol for a, b, tol in cruce.values())

    fila = {
        "n": dur["n"],
        "n_real_mayor": int((real_d > est_d).sum()), "n_igual": int((real_d == est_d).sum()),
        "n_real_menor": int((real_d < est_d).sum()),
        "pct_real_mayor": dur["pct_real_mayor"] * 100,
        "desviacion_mediana_pct": dur["desviacion_mediana_pct"],
        "MdMRE": dur["MdMRE"], "PRED15": dur["PRED15"], "PRED25": dur["PRED25"],
        "spearman_rho": dur["spearman_rho"],
        "duracion_estimada_mediana_meses": float(est_d.median()),
        "duracion_real_mediana_meses": float(real_d.median()),
        "esfuerzo_pct_real_mayor": esf["pct_real_mayor"] * 100,
        "esfuerzo_desviacion_mediana_pct": esf["desviacion_mediana_pct"],
        "esfuerzo_MdMRE": esf["MdMRE"], "esfuerzo_PRED15": esf["PRED15"], "esfuerzo_PRED25": esf["PRED25"],
        "esfuerzo_spearman_rho": esf["spearman_rho"],
        "esfuerzo_es_formula_de_duracion_dif_max": dif_formula,
        "cocientes_esfuerzo_vs_duracion_dif_max": dif_cocientes,
        "r2_log_esfuerzo_vs_factor_personal": r2_factor,
        "r2_log_esfuerzo_vs_duracion_estimada": r2_dur_est,
        "r2_log_esfuerzo_vs_ambos": r2_ambos,
        "coincide_con_cifras_tex": coinciden,
    }
    pd.DataFrame([fila]).to_csv(OUTPUTS / "seera_duracion.csv", index=False)

    print("SEERA duracion (n=%d): real > estimada en %.1f %% (%d de %d); igual %d; menor %d"
          % (dur["n"], fila["pct_real_mayor"], fila["n_real_mayor"], dur["n"], fila["n_igual"], fila["n_real_menor"]))
    print("  desviacion mediana %+.1f %%, MdMRE %.3f, PRED(15) %.1f %%, PRED(25) %.1f %%, Spearman %.3f"
          % (fila["desviacion_mediana_pct"], dur["MdMRE"], dur["PRED15"] * 100, dur["PRED25"] * 100, dur["spearman_rho"]))
    print("  esfuerzo = formula(duracion): dif max relativa %.2e; cocientes esfuerzo vs duracion: dif max %.2e"
          % (dif_formula, dif_cocientes))
    print("  R2 (en logaritmos) del esfuerzo real con: factor personal x horas %.2f; duracion estimada %.2f; ambos %.2f"
          % (r2_factor, r2_dur_est, r2_ambos))
    for nombre, (viejo, nuevo, _) in cruce.items():
        print("  cruce con cifras.tex %s: articulo %s | recalculado %.2f" % (nombre, viejo, nuevo))
    print("  coinciden con cifras.tex:", coinciden)
    if not coinciden:
        raise SystemExit("Las cifras de esfuerzo recalculadas NO coinciden con cifras.tex")

    # ---- Figura 5: mismo estilo que la figura 2 (dispersion estimado vs real con diagonal).
    # Hay 69 pares distintos entre 120 proyectos (las duraciones son casi siempre enteras),
    # asi que el area del punto indica cuantos proyectos coinciden en ese par.
    pares = pd.DataFrame({"est": est_d.values, "real": real_d.values}).value_counts().reset_index(name="k")
    plt.figure(figsize=(7, 5))
    plt.scatter(pares["est"], pares["real"], s=18 + 22 * (pares["k"] - 1), alpha=0.6)
    lim = float(max(est_d.max(), real_d.max())) * 1.05
    plt.plot([0, lim], [0, lim], color="black", linewidth=1)
    for k in (1, 3, 5):
        etiqueta = "%d proyecto" % k + ("s" if k > 1 else "")
        plt.scatter([], [], s=18 + 22 * (k - 1), color="tab:blue", alpha=0.6, label=etiqueta)
    plt.legend(title="Coinciden", loc="lower right", frameon=False, labelspacing=1.1)
    plt.xlabel("Duración estimada (meses)")
    plt.ylabel("Duración real (meses)")
    plt.title("SEERA: duración estimada vs real por proyecto (n=%d)" % dur["n"])
    plt.tight_layout()
    plt.savefig(FIGURES / "fig5_seera_duracion.png", dpi=180)
    plt.close()
    print("Figura guardada: outputs/figures/fig5_seera_duracion.png")


if __name__ == "__main__":
    main()
