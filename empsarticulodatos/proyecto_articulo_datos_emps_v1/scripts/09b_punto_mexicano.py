"""Punto de calibracion mexicano: Valdes-Souto y Valeriano-Assem (2024).

El articulo "Merging Distinct Sources Databases to Improve Software Estimation Models"
(Programming and Computer Software, 50(8), 786-795; DOI 10.1134/S0361768824700762) publica, en
su Tabla 5 (Anexo 1), el tamano en puntos de funcion COSMIC (CFP) y el esfuerzo en horas-hombre
(HH) de 57 proyectos: 8 de una empresa internacional con oficina en Mexico (COMPANY, datos de
2020), 34 de la Asociacion Mexicana de Metricas de Software (AMMS) y 15 de ISBSG. Los autores
rechazan los de ISBSG con la prueba de Kruskal-Wallis y trabajan con los 42 mexicanos
(COMPANY + AMMS).

Este script:
  1. descarga el PDF (si no esta) y verifica su hash;
  2. transcribe la Tabla 5 desde el texto del PDF con pypdf y la VERIFICA: 57 filas, PDR publicado
     igual a esfuerzo/CFP (con el redondeo a 2 decimales) y sumas de CFP por base iguales a la Tabla 1b;
  3. guarda data/processed/mexico_valdes_2024.csv (con nota de procedencia);
  4. ajusta esfuerzo = a * CFP^b por minimos cuadrados sobre logaritmos con los 42 proyectos y lo
     compara con el modelo que publican los autores (b = 0.9326, constante 2.8916, R2 = 0.8339);
  5. calcula las horas por CFP (mediana y cuartiles) y las compara con el rango de 13.60 a 21.68
     horas por CFP de Valdes-Souto (2019);
  6. repite con los 42 proyectos la comparacion de 07 (mediana, log-lineal, proporcional y bosque
     aleatorio solo con el tamano), con la misma validacion cruzada repetida.

Salidas:
  data/processed/mexico_valdes_2024.csv      los 57 proyectos de la Tabla 5 (con la columna en_modelo_42)
  data/raw/mexico_valdes_2024/PROCEDENCIA.md origen y hash del PDF
  outputs/mexico_valdes_2024_ajuste.csv      ajuste log-lineal y horas por CFP (una fila por grupo)
  outputs/mexico_valdes_2024_modelos.csv     comparacion de modelos con los 42 proyectos

Uso: .venv/Scripts/python scripts/09b_punto_mexicano.py   (desde la raiz del subproyecto)
"""
import hashlib
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import numpy as np
import pandas as pd

from common_promise import OUTPUTS, PROCESSED, RAW, Datos, resumir, validacion_cruzada

PDF_URL = ("https://cosmic-sizing.org/wp-content/uploads/2025/01/"
           "Merging-Distinct-Sources-Databases-to-Improve-Software-Estimation-Models.pdf")
CARPETA = RAW / "mexico_valdes_2024"
PDF = CARPETA / "Merging-Distinct-Sources-Databases-to-Improve-Software-Estimation-Models.pdf"
SHA256_PDF = "b88b2ab00a8004825107431d5ae86eb68d4087789d893225a1998de3b9a672b0"
FECHA_DESCARGA = "14 de octubre de 2026"
CITA = ("Valdés-Souto, F. y Valeriano-Assem, J. (2024). Merging Distinct Sources Databases to Improve "
        "Software Estimation Models. Programming and Computer Software, 50(8), 786-795. "
        "DOI 10.1134/S0361768824700762.")

# Cifras que publican los autores (para comparar con lo que se recalcula)
PUBLICADO_42 = {"b": 0.9326, "constante": 2.8916, "R2": 0.8339}
SUMAS_TABLA_1B = {"COMPANY": 2418.7, "ISBSG": 3873.0, "AMMS": 15674.6}
RANGO_2019 = (13.60, 21.68)          # horas por CFP, Valdes-Souto (2019)

ORIGEN = {"COMPANY": "empresa internacional, oficina en México (institución financiera)",
          "AMMS": "Asociación Mexicana de Métricas de Software (proyectos mexicanos concluidos)",
          "ISBSG": "ISBSG (base internacional; rechazada por la prueba de Kruskal-Wallis)"}


def sha256(ruta):
    return hashlib.sha256(Path(ruta).read_bytes()).hexdigest()


def obtener_pdf():
    CARPETA.mkdir(parents=True, exist_ok=True)
    if not PDF.exists():
        import requests
        r = requests.get(PDF_URL, timeout=120)
        r.raise_for_status()
        PDF.write_bytes(r.content)
    if sha256(PDF) != SHA256_PDF:
        raise SystemExit("El PDF descargado no coincide con el hash registrado: revisar la fuente")


def transcribir_tabla_5():
    """Lee la Tabla 5 del texto del PDF. Cada linea trae hasta dos proyectos."""
    from pypdf import PdfReader
    paginas = [p.extract_text() or "" for p in PdfReader(str(PDF)).pages]
    texto = next(t for t in paginas if "Table 5" in t and "COMPANY 1" in t)
    patron = re.compile(r"(\d+)\s+(COMPANY|ISBSG|AMMS)\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)")
    filas = []
    for linea in texto.splitlines():
        for m in patron.finditer(linea):
            num, base, ident, cfp, hh, pdr = m.groups()
            filas.append({"numero": int(num), "base": base, "id_en_base": int(ident), "cfp": float(cfp),
                          "esfuerzo_horas": float(hh), "pdr_publicado": float(pdr)})
    df = pd.DataFrame(filas).sort_values("numero").reset_index(drop=True)
    # --- Verificaciones de la transcripcion
    assert len(df) == 57 and df.numero.tolist() == list(range(1, 58)), "no se leyeron las 57 filas"
    assert df.groupby("base").size().to_dict() == {"AMMS": 34, "COMPANY": 8, "ISBSG": 15}
    pdr_calc = df.esfuerzo_horas / df.cfp
    assert (np.abs(pdr_calc - df.pdr_publicado) <= 0.011).all(), "PDR publicado no cuadra con esfuerzo/CFP"
    # Las sumas publicadas (Tabla 1b) vienen de valores sin redondear; la Tabla 5 trae un decimal, asi que
    # se tolera hasta 1 CFP de diferencia acumulada (AMMS: 15675.0 contra 15674.6).
    for base, suma in SUMAS_TABLA_1B.items():
        assert abs(df.loc[df.base == base, "cfp"].sum() - suma) < 1.0, "suma de CFP de %s no cuadra con la Tabla 1b" % base
    df["origen"] = df.base.map(ORIGEN)
    df["en_modelo_42"] = df.base.isin(["COMPANY", "AMMS"])
    return df


def ajuste_loglineal(cfp, hh):
    x, z = np.log(cfp), np.log(hh)
    b, c = np.polyfit(x, z, 1)
    r2 = float(np.corrcoef(x, z)[0, 1] ** 2)
    return float(b), float(c), r2


def escribir_csv_y_procedencia(df):
    """CSV con nota de procedencia (las lineas con # se ignoran al leer con comment) y PROCEDENCIA.md."""
    nota = [
        "# Fuente: " + CITA,
        "# Tabla 5 (Anexo 1) del articulo; PDF: " + PDF_URL,
        "# Descargado el %s; sha256 del PDF %s" % (FECHA_DESCARGA, SHA256_PDF),
        "# Transcripcion automatica con pypdf y verificada: 57 filas, PDR publicado = esfuerzo/CFP, sumas de CFP = Tabla 1b.",
        "# cfp = tamano funcional COSMIC (puntos COSMIC); esfuerzo_horas = esfuerzo total en horas-hombre (HH).",
        "# en_modelo_42 = proyectos mexicanos que usan los autores (COMPANY + AMMS); ISBSG fue rechazada por Kruskal-Wallis.",
        "# Leer con pandas.read_csv(ruta, comment=" + chr(39) + chr(35) + chr(39) + ").",
    ]
    PROCESSED.mkdir(parents=True, exist_ok=True)
    destino = PROCESSED / "mexico_valdes_2024.csv"
    destino.write_text("\n".join(nota) + "\n" + df.to_csv(index=False, lineterminator="\n"), encoding="utf-8", newline="\n")
    (CARPETA / "PROCEDENCIA.md").write_text(
        "# Procedencia: punto de calibración mexicano\n\n"
        "- **Fuente:** %s\n- **URL exacta:** %s\n- **Descarga:** %s\n- **sha256:** `%s`\n"
        "- **Qué se tomó:** la Tabla 5 (Anexo 1), con tamaño COSMIC (CFP) y esfuerzo (horas-hombre) de 57 proyectos; "
        "se transcribió del texto del PDF y se verificó (ver `scripts/09b_punto_mexicano.py`). "
        "El CSV resultante es `data/processed/mexico_valdes_2024.csv`.\n"
        "- **Aviso:** los datos son de los autores; aquí solo se transcriben con atribución para reproducir el ajuste.\n"
        % (CITA, PDF_URL, FECHA_DESCARGA, SHA256_PDF), encoding="utf-8")
    return destino


def tabla_de_ajustes(df):
    """Ajuste log-lineal y horas por CFP para los 42 mexicanos y por separado para cada base."""
    grupos = {"mexicanos_42": df[df.en_modelo_42], "COMPANY_8": df[df.base == "COMPANY"],
              "AMMS_34": df[df.base == "AMMS"], "ISBSG_15": df[df.base == "ISBSG"]}
    filas = []
    for nombre, g in grupos.items():
        b, c, r2 = ajuste_loglineal(g.cfp, g.esfuerzo_horas)
        pdr = g.esfuerzo_horas / g.cfp
        filas.append({"grupo": nombre, "n": len(g), "a": float(np.exp(c)), "b": b, "constante_log": c, "R2_log": r2,
                      "horas_por_cfp_mediana": float(pdr.median()), "horas_por_cfp_q1": float(pdr.quantile(0.25)),
                      "horas_por_cfp_q3": float(pdr.quantile(0.75)), "horas_por_cfp_min": float(pdr.min()),
                      "horas_por_cfp_max": float(pdr.max()),
                      "horas_por_cfp_global": float(g.esfuerzo_horas.sum() / g.cfp.sum()),
                      "cfp_mediano": float(g.cfp.median()), "horas_mediana": float(g.esfuerzo_horas.median())})
    ajuste = pd.DataFrame(filas)
    ajuste["publicado_b_42"] = PUBLICADO_42["b"]
    ajuste["publicado_constante_42"] = PUBLICADO_42["constante"]
    ajuste["publicado_R2_42"] = PUBLICADO_42["R2"]
    ajuste["rango_2019_min"], ajuste["rango_2019_max"] = RANGO_2019
    return ajuste, grupos["mexicanos_42"]


def comparar_modelos(g42):
    """Misma comparacion que 07, con los 42 proyectos mexicanos y solo el tamano (CFP) como variable."""
    g = g42.reset_index(drop=True)
    y, tam = g.esfuerzo_horas.to_numpy(float), g.cfp.to_numpy(float)
    D = Datos("Mexico (Valdes-Souto 2024)", y, tam, pd.DataFrame(index=range(len(g))), {}, np.log(tam)[:, None],
              tam[:, None], 0, {"unidad_esfuerzo": "horas", "medida_tamano": "puntos COSMIC"})
    modelos = ["mediana", "loglineal", "proporcional", "bosque"]
    pl = validacion_cruzada(D, modelos)
    return resumir(D, pl, modelos)


def main():
    obtener_pdf()
    df = transcribir_tabla_5()
    destino = escribir_csv_y_procedencia(df)
    ajuste, g42 = tabla_de_ajustes(df)
    ajuste.to_csv(OUTPUTS / "mexico_valdes_2024_ajuste.csv", index=False)
    res = comparar_modelos(g42)
    res.to_csv(OUTPUTS / "mexico_valdes_2024_modelos.csv", index=False)

    m42 = ajuste[ajuste.grupo == "mexicanos_42"].iloc[0]
    print("Tabla 5 transcrita y verificada: 57 proyectos (42 mexicanos en el modelo)")
    print("Ajuste con los 42: a=%.2f b=%.4f constante=%.4f R2=%.4f (publicado: b=%.4f constante=%.4f R2=%.4f)"
          % (m42.a, m42.b, m42.constante_log, m42.R2_log, PUBLICADO_42["b"], PUBLICADO_42["constante"], PUBLICADO_42["R2"]))
    print("Horas por CFP (42): mediana %.2f, cuartiles %.2f a %.2f; global %.2f; rango 2019: %.2f a %.2f"
          % (m42.horas_por_cfp_mediana, m42.horas_por_cfp_q1, m42.horas_por_cfp_q3, m42.horas_por_cfp_global, *RANGO_2019))
    print("SA por modelo con los 42 proyectos:", dict(zip(res.modelo, res.SA.round(3))))
    print("Escritos:", destino, "y outputs/mexico_valdes_2024_ajuste.csv, outputs/mexico_valdes_2024_modelos.csv")


if __name__ == "__main__":
    main()
