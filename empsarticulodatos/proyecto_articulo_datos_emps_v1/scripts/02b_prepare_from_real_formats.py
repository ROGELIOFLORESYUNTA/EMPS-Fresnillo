"""Preparacion de datasets desde sus formatos REALES.

Sustituye al script 02 generico porque la inspeccion (script 01) mostro que:
  - JOSSE curado vive en SQLite (JOSSE_18092020.sqlite3, tabla `case`,
    23,186 filas), no en los CSV crudos de Jira.
  - SEERA limpio vive en el ARFF principal (120 filas x 76 columnas);
    los Excel tienen encabezados rotos por celdas combinadas.

Decisiones metodologicas documentadas:
  - JOSSE registra esfuerzo en segundos (worklogs de Jira); se convierte a
    horas (/3600) para interpretabilidad.
  - expert_estimated_effort = -1 significa "sin anotacion experta". Esas
    filas se conservan para el modelo de texto, pero la columna NO se usa
    como predictor del modelo principal (90%+ faltante). El subconjunto
    anotado se exporta aparte (josse_expert_subset.csv) para el analisis
    estimacion-experta-vs-real.
  - SEERA: solo se usan VARIABLES TEMPRANAS como predictores (conocidas
    antes de ejecutar el proyecto). Se excluyen explicitamente columnas
    post-hoc para evitar fuga de datos: actual_duration, project_gain_loss,
    actual_incurred_costs, degree_of_*_risk a posteriori, etc.
"""
from common import RAW, PROCESSED, read_any_table, normalize_columns
from pathlib import Path
import sqlite3
import pandas as pd
import numpy as np
import re

CHANGE_WORDS = re.compile(
    r"\b(change|changed|modify|modified|update|updated|fix|bug|defect|refactor|"
    r"maintenance|migrate|migration|improve|enhance|requirement|request)\b",
    re.I,
)

# ============================================================
# JOSSE — desde SQLite curado
# ============================================================
JOSSE_DB = RAW / "JOSSE_Dataset" / "josse" / "JOSSE_18092020.sqlite3"

if JOSSE_DB.exists():
    con = sqlite3.connect(JOSSE_DB)
    raw = pd.read_sql("SELECT * FROM [case]", con)
    con.close()
    print(f"JOSSE SQLite: {len(raw)} filas leidas")

    out = pd.DataFrame()
    # Esfuerzo real: segundos -> horas
    out["actual_effort"] = pd.to_numeric(raw["actual_effort"], errors="coerce") / 3600.0
    # Texto del issue (titulo + descripcion concatenados en `corpus`)
    text = raw["corpus"].fillna("").astype(str)
    out["text_length"] = text.str.len()
    out["word_count"] = text.str.split().str.len().fillna(0)
    out["is_change_like"] = text.str.contains(CHANGE_WORDS, regex=True).fillna(False).astype(int)
    out["num_comment"] = pd.to_numeric(raw["num_comment"], errors="coerce")
    out["num_activities"] = pd.to_numeric(raw["num_activities"], errors="coerce")
    # Proyecto = prefijo del issue key (ZOOKEEPER-3063 -> ZOOKEEPER)
    out["project"] = raw["id"].astype(str).str.split("-").str[0]

    out = out.dropna(subset=["actual_effort"])
    out = out[out["actual_effort"] > 0]
    out.to_csv(PROCESSED / "josse_prepared.csv", index=False)
    print(f"OK josse_prepared.csv: {len(out)} filas, proyectos={out['project'].nunique()}")

    # Subconjunto con estimacion experta (para analisis experto-vs-real)
    expert = pd.DataFrame()
    expert["actual_effort"] = pd.to_numeric(raw["actual_effort"], errors="coerce") / 3600.0
    expert["expert_estimate"] = pd.to_numeric(raw["expert_estimated_effort"], errors="coerce") / 3600.0
    expert["is_change_like"] = text.str.contains(CHANGE_WORDS, regex=True).fillna(False).astype(int)
    expert = expert[(expert["expert_estimate"] > 0) & (expert["actual_effort"] > 0)]
    expert.to_csv(PROCESSED / "josse_expert_subset.csv", index=False)
    print(f"OK josse_expert_subset.csv: {len(expert)} filas con anotacion experta")
else:
    print(f"NO ENCONTRADO: {JOSSE_DB}")

# ============================================================
# SEERA — desde ARFF principal
# ============================================================
SEERA_ARFF = (
    RAW / "SEERA_Dataset" / "The SEERA Dataset" / "Dataset Files" / "ARFF Format"
    / "ARFF_ SEERA cost estimation dataset.csv.arff"
)

# Variables TEMPRANAS (conocidas al arrancar el proyecto). Todo lo demas
# se descarta como post-hoc o identificador.
SEERA_EARLY_PREDICTORS = [
    "estimated_duration",
    "estimated_size",
    "estimated_effort",
    "object_points",
    "team_size",
    "dedicated_team_members",
    "daily_workin_hours",
    "year_of_project",
    "organization_type",
    "size_of_organization",
    "size_of_it_department",
    "customer_organization_type",
    "development_type",
    "application_domain",
    "government_policy_impact",
    "economic_instability_impact",
    "developer_training",
    "team_selection",
    "requirement_accuracy_level",
    "product_complexity",
    "methodology",
    "contract_maturity",
]
SEERA_LEAKY = {
    "actual_effort", "actual_duration", "project_gain_loss",
    "actual_incurred_costs", "contract_price", "projid",
}

if SEERA_ARFF.exists():
    seera = normalize_columns(read_any_table(SEERA_ARFF))
    print(f"SEERA ARFF: {len(seera)} filas x {len(seera.columns)} cols")

    df = pd.DataFrame()
    df["effort_target"] = pd.to_numeric(seera["actual_effort"], errors="coerce")
    kept = []
    for col in SEERA_EARLY_PREDICTORS:
        if col in seera.columns and col not in SEERA_LEAKY:
            df[col] = pd.to_numeric(seera[col], errors="coerce")
            kept.append(col)
    df = df.dropna(subset=["effort_target"])
    df = df[df["effort_target"] > 0]
    df.to_csv(PROCESSED / "seera_prepared.csv", index=False)
    print(f"OK seera_prepared.csv: {len(df)} filas, predictores tempranos={len(kept)}")
    print("   predictores:", kept)

    # Subconjunto con estimado-vs-real de SEERA (deviacion de estimaciones originales)
    dev = pd.DataFrame()
    dev["estimated_effort"] = pd.to_numeric(seera["estimated_effort"], errors="coerce")
    dev["actual_effort"] = pd.to_numeric(seera["actual_effort"], errors="coerce")
    dev = dev.dropna()
    dev = dev[(dev["estimated_effort"] > 0) & (dev["actual_effort"] > 0)]
    dev.to_csv(PROCESSED / "seera_estimate_deviation.csv", index=False)
    print(f"OK seera_estimate_deviation.csv: {len(dev)} proyectos con estimado y real")
else:
    print(f"NO ENCONTRADO: {SEERA_ARFF}")
