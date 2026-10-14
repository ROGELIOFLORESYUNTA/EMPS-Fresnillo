"""Utilidades compartidas por los scripts 07 a 10 (datasets publicos de esfuerzo).

Contiene, en un solo lugar para que 07 y 08 usen exactamente lo mismo:
  - un lector de archivos ARFF (el formato de la familia PROMISE);
  - la ficha de cada dataset: columna de esfuerzo, columna de tamano, variables
    extra permitidas y las excluidas con su motivo (fuga de informacion);
  - los cuatro modelos (mediana, log-lineal, lineal con transformaciones, bosque
    aleatorio) y las metricas (MdMRE, PRED(25), MAE y exactitud estandarizada SA).

Se ejecuta siempre desde la raiz del subproyecto (igual que common.py), por ejemplo:
    .venv\\Scripts\\python scripts\\07_modelos_simples_vs_ml.py

Decision de diseno: todos los modelos que aprenden (log-lineal, lineal con
transformaciones y bosque) se ajustan sobre log(esfuerzo) y se devuelven en la
escala original con exp(); la mediana trabaja directo en la escala original.
"""
from dataclasses import dataclass, field
from pathlib import Path
import csv
import re
import sys

import numpy as np
import pandas as pd

# Permite importar common.py aunque el script corra con `python -I` (modo aislado).
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import RAW, PROCESSED, FIGURES, GENERATED  # noqa: E402

SEMILLA = 2026
PROMISE = RAW / "promise"
OUTPUTS = Path("outputs")
OUTPUTS.mkdir(parents=True, exist_ok=True)

# ----------------------------------------------------------------------
# Nombres de modelo (clave interna -> etiqueta en espanol para tablas y figuras)
# ----------------------------------------------------------------------
MODELOS = ["mediana", "loglineal", "lineal_transf", "bosque"]      # los cuatro del articulo
MODELOS_EXTRA = ["proporcional"]                                    # complementario (exponente fijo en 1)
ETIQUETAS = {
    "mediana": "Mediana",
    "loglineal": "Log-lineal (a·tamaño^b)",
    "lineal_transf": "Lineal con transformaciones",
    "bosque": "Bosque aleatorio",
    "proporcional": "Proporcional (a·tamaño)",
}

# ----------------------------------------------------------------------
# Lector ARFF (sin dependencias: el formato es simple y asi controlamos los
# casos raros de PROMISE, como el tipo `text` de COCOMO81 o los '?' de faltantes)
# ----------------------------------------------------------------------
@dataclass
class Arff:
    relacion: str
    atributos: list          # [(nombre, tipo, niveles|None)]
    datos: pd.DataFrame
    comentarios: list = field(default_factory=list)


def leer_arff(ruta) -> Arff:
    ruta = Path(ruta)
    relacion, atributos, filas, comentarios = "", [], [], []
    en_datos = False
    for n_linea, linea in enumerate(ruta.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
        s = linea.strip()
        if not s:
            continue
        if s.startswith("%"):
            comentarios.append(s.lstrip("%").strip())
            continue
        if not en_datos:
            bajo = s.lower()
            if bajo.startswith("@relation"):
                relacion = s.split(None, 1)[1].strip().strip("'\"")
            elif bajo.startswith("@attribute"):
                m = re.match(r"@attribute\s+(?:'([^']*)'|\"([^\"]*)\"|(\S+))\s+(.*)$", s, re.I)
                nombre = (m.group(1) or m.group(2) or m.group(3)).strip()
                tipo = m.group(4).strip()
                niveles = None
                if tipo.startswith("{"):
                    niveles = [x.strip().strip("'\"") for x in tipo.strip().strip("{}").split(",")]
                    tipo = "nominal"
                else:
                    tipo = tipo.split()[0].lower()
                atributos.append((nombre, tipo, niveles))
            elif bajo.startswith("@data"):
                en_datos = True
        else:
            fila = next(csv.reader([s], skipinitialspace=True))
            if len(fila) != len(atributos):
                raise ValueError(f"{ruta.name} linea {n_linea}: {len(fila)} valores, se esperaban {len(atributos)}")
            filas.append(fila)
    cols = [a[0] for a in atributos]
    bruto = pd.DataFrame(filas, columns=cols).replace("?", np.nan)
    datos = pd.DataFrame(index=bruto.index)
    for nombre, tipo, niveles in atributos:
        col = bruto[nombre]
        if tipo in ("numeric", "real", "integer"):
            datos[nombre] = pd.to_numeric(col, errors="coerce")
        elif tipo == "nominal":
            datos[nombre] = pd.Categorical(col, categories=niveles)
        elif tipo == "date":
            datos[nombre] = pd.to_datetime(col, errors="coerce")
        else:
            datos[nombre] = col
    return Arff(relacion, atributos, datos, comentarios)


# ----------------------------------------------------------------------
# Fichas de los datasets
#   esfuerzo / tamano : columnas objetivo y de tamano
#   extras            : variables tempranas numericas u ordinales permitidas
#   excluidas         : {columna: motivo}; las de fuga se marcan con "FUGA:"
#   anios             : columnas que son anios calendario (no se les aplica log)
# ----------------------------------------------------------------------
ESCALA_COCOMO = {"vl": 1, "l": 2, "n": 3, "h": 4, "vh": 5, "xh": 6}  # muy bajo ... extra alto
FACTORES_COCOMO = ["rely", "data", "cplx", "time", "stor", "virt", "turn",
                   "acap", "aexp", "pcap", "vexp", "lexp", "modp", "tool", "sced"]


def _derivar_kitchenham(df: pd.DataFrame) -> pd.DataFrame:
    """Variables conocidas al arrancar: duracion planeada (fecha de termino estimada
    menos fecha de inicio) y anio de inicio. Un valor negativo es un error de captura."""
    plan = (df["Estimated.completion.date"] - df["Actual.start.date"]).dt.days.astype(float)
    plan = plan.where(plan > 0)
    return pd.DataFrame({
        "duracion_planeada_dias": plan,
        "anio_inicio": df["Actual.start.date"].dt.year.astype(float),
    })


CONJUNTOS = {
    "Albrecht": {
        "archivo": "albrecht/albrecht.arff",
        "esfuerzo": "Effort", "tamano": "AdjFP",
        "extras": ["Input", "Output", "Inquiry", "File", "FPAdj"],
        "excluidas": {"RawFPcounts": "otra medida del mismo tamaño (puntos de función sin ajustar)"},
        "unidad_esfuerzo": "miles de horas",
        "medida_tamano": "puntos de función ajustados",
        "origen": "IBM Data Processing Services", "pais": "EE. UU.", "periodo": "décadas de 1970",
        "referencia": "Albrecht y Gaffney (1983)",
    },
    "China": {
        "archivo": "china/china.arff",
        "esfuerzo": "Effort", "tamano": "AFP",
        "extras": ["Input", "Output", "Enquiry", "File", "Interface", "Added", "Changed", "Deleted", "Resource"],
        "excluidas": {
            "ID": "identificador",
            "Duration": "FUGA: duración real del proyecto (se conoce al terminar)",
            "N_effort": "FUGA: esfuerzo normalizado (derivado del esfuerzo real)",
            "PDR_AFP": "FUGA: horas por punto de función, calculado con el esfuerzo real",
            "PDR_UFP": "FUGA: horas por punto de función, calculado con el esfuerzo real",
            "NPDR_AFP": "FUGA: horas por punto de función normalizadas, calculado con el esfuerzo real",
            "NPDU_UFP": "FUGA: horas por punto de función normalizadas, calculado con el esfuerzo real",
            "Dev.Type": "constante (vale 0 en los 499 proyectos)",
        },
        "unidad_esfuerzo": "horas",
        "medida_tamano": "puntos de función ajustados",
        "origen": "empresas de software (procedencia no documentada por la fuente)", "pais": "China (por el nombre del dataset)",
        "periodo": "no documentado (donado en 2010)",
        "referencia": "sin referencia original; registro Zenodo 268446",
    },
    "COCOMO81": {
        "archivo": "cocomo81/coc81.arff",
        "esfuerzo": "actual", "tamano": "loc",
        "extras": list(FACTORES_COCOMO),
        "excluidas": {"project_id": "identificador", "dev_mode": "categoría sin orden (orgánico, semiacoplado, embebido)"},
        "unidad_esfuerzo": "personas-mes",
        "medida_tamano": "miles de líneas de código (KDSI)",
        "origen": "proyectos reunidos por Boehm para calibrar COCOMO", "pais": "EE. UU.", "periodo": "publicado en 1981",
        "referencia": "Boehm (1981)",
    },
    "Desharnais": {
        "archivo": "desharnais/desharnais.arff",
        "esfuerzo": "Effort", "tamano": "PointsAjust",
        "extras": ["TeamExp", "ManagerExp", "YearEnd", "Transactions", "Entities", "Adjustment"],
        "excluidas": {
            "ID": "identificador", "Project": "identificador",
            "Length": "FUGA: duración real del proyecto (se conoce al terminar)",
            "PointsNonAdjust": "otra medida del mismo tamaño (puntos de función sin ajustar)",
            "Language": "categoría sin orden (lenguaje de programación)",
        },
        "centinelas": {"TeamExp": -1, "ManagerExp": -1},   # -1 significa dato faltante (4 proyectos)
        "anios": ["YearEnd"],
        "unidad_esfuerzo": "horas",
        "medida_tamano": "puntos de función ajustados",
        "origen": "10 organizaciones de software", "pais": "Canadá", "periodo": "1983 a 1988",
        "referencia": "Desharnais (1988)",
    },
    "Kitchenham": {
        "archivo": "kitchenham/kitchenham.arff",
        "esfuerzo": "Actual.effort", "tamano": "Adjusted.function.points",
        "extras": ["duracion_planeada_dias", "anio_inicio"],     # se derivan de las fechas
        "derivar": _derivar_kitchenham,
        "excluidas": {
            "Project": "identificador",
            "Actual.duration": "FUGA: duración real del proyecto (se conoce al terminar)",
            "First.estimate": "es la estimación experta de la empresa, otro tipo de predictor (no una característica del proyecto)",
            "First.estimate.method": "método con que se hizo la estimación experta",
            "Client.code": "categoría sin orden (cliente)",
            "Project.type": "categoría sin orden (tipo de proyecto)",
            "Actual.start.date": "se usa solo para derivar el año de inicio y la duración planeada",
            "Estimated.completion.date": "se usa solo para derivar la duración planeada",
        },
        "anios": ["anio_inicio"],
        "unidad_esfuerzo": "horas",
        "medida_tamano": "puntos de función ajustados",
        "origen": "Computer Sciences Corporation (CSC), desarrollo y mantenimiento", "pais": "EE. UU. (empresa multinacional)",
        "periodo": "1994 a 1999",
        "referencia": "Kitchenham et al. (2002)",
    },
    "Maxwell": {
        "archivo": "maxwell/maxwell.arff",
        "esfuerzo": "Effort", "tamano": "Size",
        "extras": ["Syear", "App", "Har", "Dba", "Ifc", "Source", "Telonuse", "Nlan"] + [f"T{i:02d}" for i in range(1, 16)],
        "excluidas": {
            "Duration": "FUGA: duración real del proyecto (se conoce al terminar)",
            "Time": "la fuente no documenta qué mide; por prudencia no se usa",
        },
        "anios": ["Syear"],
        "unidad_esfuerzo": "horas",
        "medida_tamano": "puntos de función",
        "origen": "uno de los mayores bancos comerciales de Finlandia", "pais": "Finlandia", "periodo": "1985 a 1993",
        "referencia": "Maxwell (2002)",
    },
    "NASA93": {
        "archivo": "nasa93/nasa93.arff",
        "esfuerzo": "act_effort", "tamano": "equivphyskloc",
        "extras": list(FACTORES_COCOMO) + ["year"],
        "ordinales": list(FACTORES_COCOMO),                     # vl..xh -> 1..6
        "excluidas": {
            "recordnumber": "identificador", "projectname": "identificador del sistema",
            "cat2": "categoría sin orden (categoría de aplicación)", "forg": "categoría sin orden (vuelo o tierra)",
            "center": "categoría sin orden (centro de la NASA)", "mode": "categoría sin orden (modo COCOMO)",
        },
        "anios": ["year"],
        "unidad_esfuerzo": "personas-mes",
        "medida_tamano": "miles de líneas de código físicas equivalentes (KLOC)",
        "origen": "cinco centros de desarrollo de la NASA", "pais": "EE. UU.", "periodo": "1971 a 1987",
        "referencia": "Menzies (2006), registro PROMISE",
    },
}

ORDEN_CONJUNTOS = ["Albrecht", "China", "COCOMO81", "Desharnais", "Kitchenham", "Maxwell", "NASA93"]


@dataclass
class Datos:
    nombre: str
    y: np.ndarray            # esfuerzo real
    tam: np.ndarray          # tamano
    extras: pd.DataFrame     # variables extra (numericas, pueden traer NaN)
    transf: dict             # {columna extra: 'log' | 'log1p' | None} transformacion del modelo lineal
    X_lineal: np.ndarray     # [log(tam)] + extras (con log donde corresponde); puede traer NaN
    X_bosque: np.ndarray     # [tam] + extras sin transformar; puede traer NaN
    n_descartados: int       # proyectos descartados por esfuerzo o tamano no positivo
    cfg: dict

    @property
    def n(self) -> int:
        return len(self.y)


def cargar(nombre: str) -> Datos:
    cfg = CONJUNTOS[nombre]
    df = leer_arff(PROMISE / cfg["archivo"]).datos.copy()
    # Dato faltante codificado con un valor centinela (Desharnais: -1)
    for col, valor in cfg.get("centinelas", {}).items():
        df[col] = df[col].where(df[col] != valor)
    # Variables derivadas (Kitchenham: fechas -> duracion planeada y anio de inicio)
    if "derivar" in cfg:
        df = pd.concat([df, cfg["derivar"](df)], axis=1)
    # Escalas ordinales de COCOMO (vl..xh) -> 1..6
    for col in cfg.get("ordinales", []):
        df[col] = df[col].astype(str).map(ESCALA_COCOMO).astype(float)
    y = df[cfg["esfuerzo"]].to_numpy(dtype=float)
    tam = df[cfg["tamano"]].to_numpy(dtype=float)
    bien = np.isfinite(y) & np.isfinite(tam) & (y > 0) & (tam > 0)
    n_desc = int((~bien).sum())
    df = df.loc[bien].reset_index(drop=True)
    y, tam = y[bien], tam[bien]
    extras = df[cfg["extras"]].astype(float).copy()
    anios = set(cfg.get("anios", []))
    # Transformacion por variable: log si es estrictamente positiva, log(1+x) si trae ceros,
    # sin transformar si es un anio calendario (o trae negativos).
    transf = {}
    for c in extras.columns:
        v = extras[c].dropna()
        if c in anios or (v < 0).any():
            transf[c] = None
        elif (v > 0).all():
            transf[c] = "log"
        else:
            transf[c] = "log1p"
    cols_lineal = [np.log(tam)]
    for c in extras.columns:
        v = extras[c].to_numpy(dtype=float)
        cols_lineal.append(np.log(v) if transf[c] == "log" else np.log1p(v) if transf[c] == "log1p" else v)
    X_lineal = np.column_stack(cols_lineal)
    X_bosque = np.column_stack([tam] + [extras[c].to_numpy(dtype=float) for c in extras.columns])
    return Datos(nombre, y, tam, extras, transf, X_lineal, X_bosque, n_desc, cfg)


# ----------------------------------------------------------------------
# Modelos: cada uno recibe los indices de entrenamiento y prueba y devuelve
# las predicciones de esfuerzo (escala original) para los de prueba.
# ----------------------------------------------------------------------
def _imputar(Xtr, Xte):
    """Rellena los NaN con la mediana de entrenamiento (nunca se mira la prueba)."""
    med = np.nanmedian(Xtr, axis=0)
    med = np.where(np.isnan(med), 0.0, med)
    return np.where(np.isnan(Xtr), med, Xtr), np.where(np.isnan(Xte), med, Xte)


def pred_mediana(D: Datos, tr, te):
    return np.full(len(te), np.median(D.y[tr]))


def pred_loglineal(D: Datos, tr, te):
    """esfuerzo = a * tamano^b ajustado por minimos cuadrados sobre los logaritmos."""
    x, z = np.log(D.tam[tr]), np.log(D.y[tr])
    if np.ptp(x) < 1e-12:                      # todos los tamanos iguales: no hay pendiente
        return pred_mediana(D, tr, te)
    b, a = np.polyfit(x, z, 1)
    return np.exp(a + b * np.log(D.tam[te]))


def pred_proporcional(D: Datos, tr, te):
    """esfuerzo = a * tamano con el exponente fijo en 1 (solo se calibra a): es el minimo cuadrado
    sobre logaritmos con b = 1, es decir a = media geometrica de esfuerzo/tamano. Es la idea de
    "horas por punto" y no se desestabiliza con 4 proyectos como el log-lineal de dos parametros."""
    a = np.exp(np.mean(np.log(D.y[tr]) - np.log(D.tam[tr])))
    return a * D.tam[te]


def pred_lineal_transf(D: Datos, tr, te):
    """Regresion lineal sobre todas las variables (log, o log(1+x) si traen ceros),
    ajustada sobre log(esfuerzo). Las columnas constantes en entrenamiento se descartan;
    si hay mas columnas que proyectos, lstsq da la solucion de menor norma."""
    Xtr, Xte = _imputar(D.X_lineal[tr], D.X_lineal[te])
    mu, sd = Xtr.mean(axis=0), Xtr.std(axis=0)
    ok = sd > 1e-12
    Xtr = (Xtr[:, ok] - mu[ok]) / sd[ok]
    Xte = (Xte[:, ok] - mu[ok]) / sd[ok]
    z = np.log(D.y[tr])
    A = np.column_stack([np.ones(len(tr)), Xtr])
    beta, *_ = np.linalg.lstsq(A, z, rcond=None)
    with np.errstate(over="ignore"):
        return np.exp(beta[0] + Xte @ beta[1:])


def pred_bosque(D: Datos, tr, te, semilla: int = SEMILLA, n_arboles: int = 200):
    from sklearn.ensemble import RandomForestRegressor
    Xtr, Xte = _imputar(D.X_bosque[tr], D.X_bosque[te])
    rf = RandomForestRegressor(n_estimators=n_arboles, random_state=semilla, n_jobs=1)
    rf.fit(Xtr, np.log(D.y[tr]))
    return np.exp(rf.predict(Xte))


PREDICTORES = {
    "mediana": pred_mediana,
    "loglineal": pred_loglineal,
    "proporcional": pred_proporcional,
    "lineal_transf": pred_lineal_transf,
    "bosque": pred_bosque,
}


# ----------------------------------------------------------------------
# Metricas
# ----------------------------------------------------------------------
def metricas(y, yhat) -> dict:
    """MdMRE, PRED(25) y MAE de un conjunto de prueba."""
    y, yhat = np.asarray(y, float), np.asarray(yhat, float)
    mre = np.abs(y - yhat) / y
    return {"MdMRE": float(np.median(mre)), "PRED25": float(np.mean(mre <= 0.25)),
            "MAE": float(np.mean(np.abs(y - yhat)))}


def mae_azar(y_prueba, y_entrenamiento, rng, n_sorteos: int = 1000) -> float:
    """MAE de adivinar al azar (Shepperd y MacDonell, 2012): a cada proyecto de prueba se le
    asigna el esfuerzo real de un proyecto de entrenamiento sorteado con igual probabilidad;
    se promedia el MAE de n_sorteos repeticiones."""
    y_prueba = np.asarray(y_prueba, float)
    y_entrenamiento = np.asarray(y_entrenamiento, float)
    idx = rng.integers(0, len(y_entrenamiento), size=(n_sorteos, len(y_prueba)))
    return float(np.abs(y_prueba[None, :] - y_entrenamiento[idx]).mean())


def sa(mae: float, mae_rand: float) -> float:
    return 1.0 - mae / mae_rand


# ----------------------------------------------------------------------
# Validacion cruzada repetida y resumen (la usan 07 y 09b)
# ----------------------------------------------------------------------
N_PLIEGUES = 5
N_REPETICIONES = 10
ALFA = 0.05


def validacion_cruzada(D: Datos, modelos, n_pliegues: int = N_PLIEGUES, n_repeticiones: int = N_REPETICIONES):
    """Validacion cruzada de n_pliegues repetida n_repeticiones veces (semilla fija). Devuelve una fila
    por pliegue y modelo con MdMRE, PRED(25), MAE, MAE_azar y SA."""
    from sklearn.model_selection import RepeatedKFold
    rkf = RepeatedKFold(n_splits=n_pliegues, n_repeats=n_repeticiones, random_state=SEMILLA)
    rng = np.random.default_rng(SEMILLA)
    filas = []
    for k, (tr, te) in enumerate(rkf.split(np.arange(D.n))):
        rep, pliegue = divmod(k, n_pliegues)
        y_te = D.y[te]
        m_azar = mae_azar(y_te, D.y[tr], rng)          # el mismo MAE_azar para todos los modelos
        for modelo in modelos:
            met = metricas(y_te, PREDICTORES[modelo](D, tr, te))
            filas.append({"conjunto": D.nombre, "repeticion": rep + 1, "pliegue": pliegue + 1, "modelo": modelo,
                          "n_entrenamiento": len(tr), "n_prueba": len(te), **met,
                          "MAE_azar": m_azar, "SA": sa(met["MAE"], m_azar)})
    return pd.DataFrame(filas)


def p_wilcoxon(a, b):
    """p de la prueba de rangos con signo de dos colas; NaN si no hay diferencias."""
    from scipy.stats import wilcoxon
    d = np.asarray(a) - np.asarray(b)
    if np.allclose(d, 0):
        return float("nan")
    return float(wilcoxon(a, b, alternative="two-sided").pvalue)


def resumir(D: Datos, pl: pd.DataFrame, modelos):
    """Promedia los pliegues y calcula las pruebas de Wilcoxon (contra la mediana y contra el log-lineal)."""
    ancho = pl.pivot_table(index=["repeticion", "pliegue"], columns="modelo", values="MAE")
    por_rep = ancho.groupby("repeticion").mean()          # 10 promedios: prueba mas conservadora
    filas = []
    for modelo in modelos:
        sub = pl[pl.modelo == modelo]
        filas.append({"conjunto": D.nombre, "n_proyectos": D.n, "n_variables_extra": D.extras.shape[1],
                      "modelo": modelo,
                      "MdMRE": sub.MdMRE.mean(), "PRED25": sub.PRED25.mean(), "MAE": sub.MAE.mean(),
                      "SA": sub.SA.mean(), "SA_mediana_pliegues": sub.SA.median(), "SA_desv": sub.SA.std(),
                      "p_vs_mediana": float("nan") if modelo == "mediana" else p_wilcoxon(ancho[modelo], ancho["mediana"]),
                      "p_vs_loglineal": float("nan") if modelo == "loglineal" else p_wilcoxon(ancho[modelo], ancho["loglineal"]),
                      "p_rep_vs_loglineal": float("nan") if modelo == "loglineal" else p_wilcoxon(por_rep[modelo], por_rep["loglineal"])})
    res = pd.DataFrame(filas)
    mae = res.set_index("modelo").MAE
    # "supera" = menor MAE promedio Y p < 0.05 en la prueba de Wilcoxon
    res["supera_a_mediana_p05"] = [bool(m != "mediana" and mae[m] < mae["mediana"] and p < ALFA)
                                    for m, p in zip(res.modelo, res.p_vs_mediana.fillna(1.0))]
    res["supera_a_loglineal_p05"] = [bool(m != "loglineal" and mae[m] < mae["loglineal"] and p < ALFA)
                                      for m, p in zip(res.modelo, res.p_vs_loglineal.fillna(1.0))]
    res["supera_a_loglineal_p05_rep"] = [bool(m != "loglineal" and mae[m] < mae["loglineal"] and p < ALFA)
                                          for m, p in zip(res.modelo, res.p_rep_vs_loglineal.fillna(1.0))]
    return res


# ----------------------------------------------------------------------
# Estilo comun de las figuras 3 y 4
# ----------------------------------------------------------------------
# Colores fijos por modelo (la misma paleta validada se usa en las figuras 3 y 4).
# Azul, verde azulado y naranja pasan la prueba de separacion para daltonismo; la mediana es gris
# neutro porque es el piso de referencia, no una categoria mas.
COLORES = {"mediana": "#9b9b95", "loglineal": "#2a78d6", "lineal_transf": "#1baf7a",
           "bosque": "#eb6834", "proporcional": "#2a78d6"}
TINTA, TINTA_SUAVE, REJILLA = "#1a1a19", "#52514e", "#e3e2dd"


def orden_por_tamano(resumen):
    """Datasets ordenados de menos a mas proyectos (la hipotesis es sobre pocos proyectos)."""
    u = resumen.drop_duplicates("conjunto")
    return u.sort_values(["n_proyectos", "conjunto"]).conjunto.tolist()
