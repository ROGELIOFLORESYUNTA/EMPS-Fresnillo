"""Descarga los datasets publicos de esfuerzo (familia PROMISE) y escribe PROCEDENCIA.md.

Datasets: Desharnais (81), China (499), Kitchenham (145), Maxwell (62), COCOMO81 (63),
NASA93 (93) y Albrecht (24). Cada archivo se baja de su fuente, se verifica contra el sha256
registrado aqui (y contra el md5 que publica la fuente, cuando existe) y se guarda en
data/raw/promise/<dataset>/. Para Desharnais, China, Kitchenham y NASA93 ademas se baja una
segunda copia de un espejo independiente (repositorio DASE de Daniel Rodriguez, fijado a un
commit) y se comparan: iguales byte a byte o iguales columna por columna.

Si el archivo ya esta y su hash coincide, no se vuelve a descargar.

Salida: data/raw/promise/PROCEDENCIA.md (fuente, URL exacta, fecha, sha256, filas y columnas,
columna de esfuerzo y de tamano, cita de la fuente, comprobaciones).

Uso: .venv/Scripts/python scripts/07a_descargar_promise.py   (desde la raiz del subproyecto)
"""
import hashlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import numpy as np
import requests

from common_promise import CONJUNTOS, ORDEN_CONJUNTOS, PROMISE, leer_arff

FECHA = "14 de octubre de 2026"
ZEN = "https://zenodo.org/api/records/%d/files/%s/content"
ESEUR = "https://raw.githubusercontent.com/Derek-Jones/ESEUR-code-data/bc1d9e99da2a956cdecba9d9d7f6f9b61a371c5f/"
DASE = "https://raw.githubusercontent.com/danrodgar/DASE/bf018ab169be6b4a49458a7e932b16a7b238ce1f/datasets/effortEstimation/"

# --------------------------------------------------------------------------------------
# Fuentes. sha256 = hash fijado al bajar los archivos el 14 de octubre de 2026.
# md5 = hash que publica la fuente (Zenodo y OpenML lo dan; GitHub no).
# --------------------------------------------------------------------------------------
FUENTES = {
    "Albrecht": {
        "carpeta": "albrecht",
        "archivos": [("albrecht.arff", ZEN % (268467, "albrecht.arff"),
                      "cfd9713c6a0a45e318fd5345d3f45ac1cfbbf59191d91a645eabd6541890fd18", "22fd6b6d9e63c0454b2e710ba945067a")],
        "fuente": "Zenodo, registro 268467 \"Effort Estimation: Albrecht\" (repositorio PROMISE, comunidad SEACRAFT)",
        "pagina": "https://zenodo.org/records/268467", "doi": "10.5281/zenodo.268467",
        "licencia": "CC BY 4.0 (según el registro)",
        "quien": "Donantes: Yanfu Li y Jacky W. Keung (según el registro); datos originales de Albrecht y Gaffney",
        "cita": ("Registro Zenodo: \"Reference: Albrecht, A.J. and Gaffney, J.E., Jr. (1983) Software Function, Source Lines of "
                 "Code, and Development Effort Prediction: A Software Engineering, IEEE Transactions on Software Engineering, "
                 "9(6):639-648\". El encabezado del archivo agrega: donante Yanfu Li, fecha 14 de octubre de 2009, y cita a "
                 "Shepperd y Schofield (1997) y a Li, Xie y Goh (2009) como usos previos."),
        "comprobacion": ("Esfuerzo mínimo, máximo, media y mediana (0.5, 105.2, 21.88, 11.45) coinciden con lo publicado "
                         "por otros trabajos que usan el dataset (1 a 105, media 22, mediana 12)."),
        "cruzada": [],
    },
    "China": {
        "carpeta": "china",
        "archivos": [("china.arff", ZEN % (268446, "china.arff"),
                      "ae9df9c52c5bc5ba03b9732ecc159093f0c500ffa0f3d8260ddd7350f0a22c58", "e3782d76345c9fd863efa3eafedf7f3e")],
        "fuente": "Zenodo, registro 268446 \"China: Effort Estimation Dataset\" (repositorio PROMISE, comunidad SEACRAFT)",
        "pagina": "https://zenodo.org/records/268446", "doi": "10.5281/zenodo.268446",
        "licencia": "CC BY 4.0 (según el registro)",
        "quien": "Donante: Fang Hon Yun (según el registro)",
        "cita": ("Registro Zenodo: \"The dataset contains the FunctionPoints metrics and is an effort estimation dataset.\" "
                 "No trae referencia a un artículo. Bosu y MacDonell (2019) confirman que Tim Menzies recibió estos datos en "
                 "abril de 2010 sin más información sobre su origen."),
        "comprobacion": "Esfuerzo mínimo, máximo, media y mediana (26, 54,620, 3,921, 1,829) coinciden con lo publicado por otros trabajos.",
        "cruzada": [("chinaOriginal.arff", DASE + "chinaOriginal.arff", "ae9df9c52c5bc5ba03b9732ecc159093f0c500ffa0f3d8260ddd7350f0a22c58", "hash")],
    },
    "COCOMO81": {
        "carpeta": "cocomo81",
        "archivos": [("coc81.arff", ESEUR + "regression/cocomo81/coc81.arff",
                      "571cf246824365de865a483a0af2e10e4aade8db33e2510cf55932c33a881091", None)],
        "fuente": "GitHub, repositorio ESEUR-code-data de Derek M. Jones (copia del repositorio PROMISE), fijado al commit bc1d9e9",
        "pagina": "https://github.com/Derek-Jones/ESEUR-code-data/blob/bc1d9e99da2a956cdecba9d9d7f6f9b61a371c5f/regression/cocomo81/coc81.arff",
        "doi": None,
        "licencia": "el repositorio no declara licencia; los datos son los de Boehm (1981) vía PROMISE",
        "quien": "Datos originales de Barry W. Boehm; copia vía PROMISE mantenida por Derek M. Jones",
        "cita": ("El encabezado del archivo dice \"From the Promise repo\" y \"The following data is transcribed from boehm81 "
                 "p.496-497 Table 29-1\". El script cocomo81.R del mismo repositorio dice: \"Data from: Software Engineering "
                 "Economics, Barry W. Boehm, by way of the PROMISE repository\". Referencia: Boehm, B. W. (1981). Software "
                 "Engineering Economics. Prentice-Hall."),
        "comprobacion": ("63 proyectos; esfuerzo real mínimo 5.9, máximo 11,400, media 683.5 y mediana 98, que coinciden con lo "
                         "publicado por otros trabajos (mínimo 6, máximo 11,400, media 683, mediana 98). OpenML y Zenodo no tienen "
                         "una copia de 63 proyectos; la copia \"cocomonasa_v1\" de DASE tiene solo 60 y no se usó."),
        "cruzada": [],
    },
}

FUENTES["Desharnais"] = {
    "carpeta": "desharnais",
    "archivos": [("desharnais.arff", "https://openml.org/data/v1/download/54000/desharnais.arff",
                  "82936d64a3333c58a060c6807228f7d11f24795f22448724ad17e78eb1050e5e", "48bf1ba60fc36660b98a179924266b7f")],
    "fuente": "OpenML, conjunto de datos 1117 \"desharnais\" versión 2 (archivo 54000)",
    "pagina": "https://www.openml.org/d/1117", "doi": None,
    "licencia": "\"Public\" (según OpenML)",
    "quien": "Subido a OpenML el 7 de octubre de 2014; datos originales de Jean-Marc Desharnais",
    "cita": ("OpenML solo dice: \"Dataset from the MLRR repository: http://axon.cs.byu.edu:5000/\" (sin autor ni cita). "
             "La referencia que usan los trabajos sobre este dataset es Desharnais, J.-M. (1988), Statistical Analysis on the "
             "Productivity of Data Processing with Development Projects Using the Function Point Technique, tesis de maestría "
             "(Universidad de Quebec en Montreal), citada por Bosu y MacDonell (2019). Esa referencia no la da la fuente."),
    "comprobacion": ("81 proyectos, 4 de ellos con datos faltantes de experiencia (TeamExp o ManagerExp valen -1: filas 38, 44, "
                     "66 y 75). Esfuerzo mínimo 546, máximo 23,940, media 5,046 y mediana 3,647, que coinciden con lo publicado."),
    "cruzada": [("desharnais_1_1.arff", DASE + "desharnais_1_1.arff",
                 "6ab4d00a4c3158fbde3372a3f47336e78a8a437e1a9b8558b9074962d0d07430", "columnas")],
}
FUENTES["Kitchenham"] = {
    "carpeta": "kitchenham",
    "archivos": [("kitchenham.arff", ZEN % (268457, "kitchenham.arff"),
                  "0832342b248418cca324cebe77d86d2f90ae223c1119af9360783bdbad0b2ac0", "8945f95d3bbfc40df4687089767aae16")],
    "fuente": "Zenodo, registro 268457 \"kitchenham\" (repositorio PROMISE, comunidad SEACRAFT)",
    "pagina": "https://zenodo.org/records/268457", "doi": "10.5281/zenodo.268457",
    "licencia": "CC BY 4.0 (según el registro)",
    "quien": "Donante: Masateru Tsunoda (según el registro); datos de Computer Sciences Corporation",
    "cita": ("Registro Zenodo: \"1 Barbara Kitchenham, Shari Lawrence Pfleeger, Beth McColl and Suzanne Eagan, An empirical "
             "study of maintenance and development estimation accuracy, Journal of Systems and Software, Volume 74, pp.57-77, "
             "2005. 2 Masateru Tsunoda, Takeshi Kakimoto, Akito Monden and Ken-ichi Matsumoto, An empirical evaluation of "
             "outlier deletion methods for analogy-based cost estimation, Proceedings of PROMISE 2011, ACM, Article 17.\" "
             "(Bosu y MacDonell, 2019, citan el primer trabajo como Kitchenham et al., 2002.)"),
    "comprobacion": "145 proyectos, como en la literatura. Las columnas de duración, puntos de función, estimación inicial y esfuerzo son idénticas en la copia de DASE.",
    "cruzada": [("kitchenham_dase.arff", DASE + "kitchenham.arff",
                 "fc38449193b40c1098316fb5f23c77f83b3bebded0c0d48a8835d898ba8dbcb6", "columnas")],
}
FUENTES["Maxwell"] = {
    "carpeta": "maxwell",
    "archivos": [("maxwell.arff", ZEN % (268461, "maxwell.arff"),
                  "13ea83d5cded12ec694f3e1a72e24c55708bf6e28ea810ee88f1d7c8da910fde", "dcaffa9917b6eb7ac180e252c53f0a87"),
                 ("README.txt", ZEN % (268461, "README.txt"),
                  "fc325b1fcbb1573ead66b6bb1c72166ae4bd67f4502c823091dcffd26464b9fd", "14f00b64cd746d7a6e1d6ad304cb975a")],
    "fuente": "Zenodo, registro 268461 \"Effort Estimation: Maxwell\" (repositorio PROMISE, comunidad SEACRAFT)",
    "pagina": "https://zenodo.org/records/268461", "doi": "10.5281/zenodo.268461",
    "licencia": "CC BY 4.0 (según el registro)",
    "quien": "Donante: Yanfu Li (según el registro); datos originales de K. D. Maxwell",
    "cita": ("Registro Zenodo: \"1 K. D. Maxwell. 2002. Applied Statistics for Software Managers. Englewood Cliffs, NJ. "
             "Prentice-Hall. 2 P. Sentas, L. Angelis, I. Stamelos, G. Bleris. 2005. Software productivity and effort prediction "
             "with ordinal regression. Information and Software Technology, 47, 17-29. 3 Y.F. Li, M. Xie, T.N. Goh. 2009. A Study "
             "of Mutual Information Based Feature Selection for Case Based Reasoning in Software Cost Estimation. Expert Systems "
             "with Applications. 36(3), 5921-5931. 4 Y.F. Li, M. Xie, T.N. Goh. 2009. A Study on the Non-linear Adjustment for "
             "Analogy Based Software Cost Estimation. Empirical Software Engineering.\""),
    "comprobacion": ("62 proyectos. Esfuerzo mínimo 583, máximo 63,694, media 8,223.2 y mediana 5,189.5, idénticos a lo publicado. "
                     "La fuente no explica la variable Time; por eso no se usa como predictor."),
    "cruzada": [],
}
FUENTES["NASA93"] = {
    "carpeta": "nasa93",
    "archivos": [("nasa93.arff", ZEN % (268419, "nasa93.arff"),
                  "bcc97ecc9ab3f0f05da692075288d682478866bf8a7bb2b779b6b8de617d41d5", "6bfcb7491cb8c592a7e719a50e086167")],
    "fuente": "Zenodo, registro 268419 \"nasa93\" (repositorio PROMISE, comunidad SEACRAFT)",
    "pagina": "https://zenodo.org/records/268419", "doi": "10.5281/zenodo.268419",
    "licencia": "CC BY 4.0 (según el registro)",
    "quien": "Donante: Tim Menzies; datos recopilados por Jairus Hihn (JPL, NASA)",
    "cita": ("Encabezado del archivo: \"93 NASA projects from different centers ... Collected by Jairus Hihn, JPL, NASA, Manager "
             "SQIP Measurement & Benchmarking Element. Donor: Tim Menzies. Date: Feb 8 2006\". Uso previo citado: Menzies, Port, "
             "Chen, Hihn y Stukes, \"Validation Methods for Calibrating Software Effort Models\", ICSE 2005; y Chen, Menzies, Port "
             "y Boehm, \"Feature Subset Selection Can Improve Software Cost Estimation Accuracy\", PROMISE 2005."),
    "comprobacion": "93 proyectos de 1971 a 1987, como dice el encabezado. El archivo es idéntico byte a byte al de la copia de DASE.",
    "cruzada": [("nasa93_dase.arff", DASE + "nasa93.arff", "bcc97ecc9ab3f0f05da692075288d682478866bf8a7bb2b779b6b8de617d41d5", "hash")],
}


def sha256(ruta):
    return hashlib.sha256(Path(ruta).read_bytes()).hexdigest()


def md5(ruta):
    return hashlib.md5(Path(ruta).read_bytes()).hexdigest()


def descargar(url, destino, sha_esperado, md5_esperado=None):
    """Baja el archivo si falta o si su hash no coincide; verifica sha256 (y md5 si la fuente lo publica)."""
    destino.parent.mkdir(parents=True, exist_ok=True)
    if not (destino.exists() and sha256(destino) == sha_esperado):
        r = requests.get(url, timeout=90)
        r.raise_for_status()
        destino.write_bytes(r.content)
    if sha256(destino) != sha_esperado:
        raise SystemExit("sha256 distinto en %s: la fuente cambio o la descarga fallo" % destino.name)
    if md5_esperado and md5(destino) != md5_esperado:
        raise SystemExit("md5 distinto al que publica la fuente en %s" % destino.name)
    return destino


def comparar_columnas(principal, copia):
    """Compara columna por columna (solo las que tienen el mismo nombre y son numericas)."""
    a, b = leer_arff(principal).datos, leer_arff(copia).datos
    comunes = [c for c in b.columns if c in a.columns and a[c].dtype.kind in "fi" and b[c].dtype.kind in "fi"]
    if len(a) != len(b) or not comunes:
        return False, "número de filas distinto o sin columnas comparables"
    malas = [c for c in comunes if not np.allclose(a[c].to_numpy(float), b[c].to_numpy(float), equal_nan=True)]
    if malas:
        return False, "difieren las columnas " + ", ".join(malas)
    return True, "idénticas las %d columnas numéricas en común (%d filas): %s" % (len(comunes), len(a), ", ".join(comunes))


def verificar_cruzada(nombre, info):
    """Baja las copias de espejo y devuelve una frase por cada una."""
    frases = []
    principal = PROMISE / info["carpeta"] / info["archivos"][0][0]
    for archivo, url, sha, tipo in info["cruzada"]:
        copia = descargar(url, PROMISE / info["carpeta"] / "verificacion_cruzada" / archivo, sha)
        if tipo == "hash":
            ok = sha256(copia) == sha256(principal)
            frases.append("Copia independiente de DASE (`verificacion_cruzada/%s`): %s." %
                          (archivo, "idéntica byte a byte (mismo sha256)" if ok else "DIFERENTE"))
        else:
            ok, txt = comparar_columnas(principal, copia)
            frases.append("Copia independiente de DASE (`verificacion_cruzada/%s`): %s." % (archivo, txt))
        if not ok:
            raise SystemExit("La verificacion cruzada de %s fallo: %s" % (nombre, frases[-1]))
    return frases


def seccion(nombre, info, cruzadas):
    """Texto en markdown de un dataset, con los hechos calculados del archivo descargado."""
    cfg = CONJUNTOS[nombre]
    principal = PROMISE / info["carpeta"] / info["archivos"][0][0]
    arff = leer_arff(principal)
    filas, columnas = arff.datos.shape
    lineas = ["## %s" % nombre, ""]
    lineas.append("- **Fuente:** %s" % info["fuente"])
    lineas.append("- **Página del registro:** %s" % info["pagina"] + ("  (DOI %s)" % info["doi"] if info["doi"] else ""))
    for archivo, url, sha, md5_fuente in info["archivos"]:
        ruta = PROMISE / info["carpeta"] / archivo
        lineas.append("- **Archivo `%s`:** %s" % (archivo, url))
        lineas.append("  - sha256: `%s`" % sha256(ruta))
        if md5_fuente:
            lineas.append("  - md5 publicado por la fuente: `%s` (coincide)" % md5_fuente)
        else:
            lineas.append("  - la fuente no publica un hash; el sha256 es el de la descarga del %s" % FECHA)
    lineas.append("- **Descarga:** %s" % FECHA)
    lineas.append("- **Filas y columnas:** %d proyectos, %d columnas" % (filas, columnas))
    lineas.append("- **Esfuerzo (lo que se predice):** columna `%s`, en %s" % (cfg["esfuerzo"], cfg["unidad_esfuerzo"]))
    lineas.append("- **Tamaño:** columna `%s` (%s)" % (cfg["tamano"], cfg["medida_tamano"]))
    lineas.append("- **Variables extra usadas (numéricas u ordinales, conocidas al arrancar):** " +
                  ", ".join("`%s`" % c for c in cfg["extras"]))
    excl = "; ".join("`%s` (%s)" % (c, m) for c, m in cfg["excluidas"].items())
    lineas.append("- **Columnas que no se usan y por qué:** " + (excl or "ninguna"))
    lineas.append("- **Origen:** %s; %s; %s" % (cfg["origen"], cfg["pais"], cfg["periodo"]))
    lineas.append("- **Quién lo aporta:** %s" % info["quien"])
    lineas.append("- **Licencia:** %s" % info["licencia"])
    lineas.append("- **Cita que da la fuente:** %s" % info["cita"])
    lineas.append("- **Comprobaciones:** %s" % info["comprobacion"])
    for frase in cruzadas:
        lineas.append("  - " + frase)
    lineas.append("")
    return "\n".join(lineas), filas, columnas


def main():
    secciones, resumen = [], []
    for nombre in ORDEN_CONJUNTOS:
        info = FUENTES[nombre]
        for archivo, url, sha, md5_fuente in info["archivos"]:
            descargar(url, PROMISE / info["carpeta"] / archivo, sha, md5_fuente)
        cruzadas = verificar_cruzada(nombre, info)
        texto, filas, columnas = seccion(nombre, info, cruzadas)
        secciones.append(texto)
        cfg = CONJUNTOS[nombre]
        resumen.append("| %s | %d | %d | `%s` (%s) | `%s` (%s) | %s, %s |" % (
            nombre, filas, columnas, cfg["esfuerzo"], cfg["unidad_esfuerzo"], cfg["tamano"], cfg["medida_tamano"],
            cfg["pais"], cfg["periodo"]))
        print("%-11s %3d filas x %2d columnas  OK" % (nombre, filas, columnas))
    total = sum(int(r.split("|")[2]) for r in resumen)
    cabecera = [
        "# Procedencia de los datasets públicos de esfuerzo (familia PROMISE)",
        "",
        "Descargados el %s por `scripts/07a_descargar_promise.py`, que verifica cada archivo contra el hash registrado." % FECHA,
        "Sirven para el análisis de `scripts/07_modelos_simples_vs_ml.py` y `scripts/08_curva_aprendizaje.py` "
        "(ver `docs/07_resultados_datasets_publicos_2026-10.md`).",
        "",
        "| Dataset | Proyectos | Columnas | Esfuerzo | Tamaño | País y periodo |",
        "|---|---:|---:|---|---|---|",
    ] + resumen + [
        "",
        "Total: %d proyectos en %d datasets. OpenML solo tiene Desharnais; el resto se bajó de Zenodo (registros de "
        "PROMISE) y COCOMO81 de un espejo en GitHub fijado a un commit." % (total, len(resumen)),
        "",
        "Todos los archivos pesan menos de 40 KB, así que se guardan completos en el repositorio.",
        "",
    ]
    pie = [
        "## Notas generales",
        "",
        "- Ningún dato se modificó: los archivos son los originales. Las decisiones de limpieza (por ejemplo, tratar el -1 de "
        "Desharnais como dato faltante) se aplican al leerlos, en `scripts/common_promise.py`.",
        "- Los datasets tienen historia y límites propios: el de China no documenta su origen; los de Albrecht y COCOMO81 son de "
        "los años setenta; ninguno es mexicano. Por eso se usan para comparar tipos de modelo, no para fijar horas de Fresnillo.",
        "- No se saltó ninguna fuente: los siete datasets pedidos tienen una copia confiable.",
        "",
    ]
    (PROMISE / "PROCEDENCIA.md").write_text("\n".join(cabecera + secciones + pie), encoding="utf-8")
    print("Escrito:", PROMISE / "PROCEDENCIA.md")


if __name__ == "__main__":
    main()
