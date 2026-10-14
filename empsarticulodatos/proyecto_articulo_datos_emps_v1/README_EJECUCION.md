# Proyecto de artículo con datasets públicos (EMPS-Fresnillo)

Este paquete sirve para producir un artículo científico con análisis de datos sin depender todavía de datos reales capturados por EMPS-Fresnillo.

El objetivo es usar datasets públicos de ingeniería de software para obtener resultados preliminares de estimación de esfuerzo y analizar factores relacionados con cambios, mantenimiento y desviación de estimaciones. Después, el sistema EMPS-Fresnillo puede usarse como artefacto para capturar casos locales.

## Datasets seleccionados

1. **JOSSE**: dataset principal para estimación de esfuerzo a nivel tarea.
   - Contiene tareas de desarrollo y mantenimiento de Jira para Apache, JBoss y Spring.
   - Incluye esfuerzo real y una parte de tareas con estimaciones expertas.
   - Sirve para regresión entre estimación temprana y esfuerzo real.

2. **SEERA**: dataset secundario para estimación de esfuerzo a nivel proyecto en entornos restringidos.
   - Contiene 120 proyectos de 42 organizaciones y 76 atributos.
   - Es relevante porque proviene de un entorno técnica y económicamente restringido.

3. **Public Jira Dataset**: opcional por tamaño.
   - Es fuerte para estudiar cambios, comentarios, links y evolución de issues.
   - No se recomienda para la primera corrida porque pesa varios GB.

## Flujo EJECUTADO (2026-06-11): pipeline real

El flujo original (scripts 00 a 04) se ajustó tras inspeccionar los formatos reales
de los datasets. Esta es la secuencia que produjo el artículo final:

```powershell
# 1. Entorno (Python 3.11)
py -3 -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m pip install jinja2 python-docx   # extras necesarios

# 2. Descarga desde Zenodo (funcionó tal cual)
.venv\Scripts\python scripts\00_download_datasets.py

# 3. Descubrimiento de formatos (script 01). Hallazgos clave:
#    - JOSSE curado vive en SQLite (josse/JOSSE_18092020.sqlite3, tabla `case`),
#      NO en los CSVs crudos de Jira de dataset_replication/.
#    - SEERA limpio vive en el ARFF principal; los Excel tienen headers rotos.
.venv\Scripts\python scripts\01_discover_datasets.py

# 4. Preparación desde los formatos REALES (sustituye al script 02)
.venv\Scripts\python scripts\02b_prepare_from_real_formats.py
#    -> josse_prepared.csv (23,186 filas), josse_expert_subset.csv (4,329)
#    -> seera_prepared.csv (120 filas, 21 predictores tempranos sin leakage)
#    -> seera_estimate_deviation.csv (120)

# 5. Análisis principal: baseline + regresión lineal + random forest
.venv\Scripts\python scripts\03_run_analysis.py

# 6. Análisis de hipótesis H1/H2 (experto-vs-real, desviación SEERA, dispersión)
.venv\Scripts\python scripts\03b_run_hypothesis_analysis.py

# 7. Fragmentos LaTeX pulidos (tablas en español + macros de cifras)
.venv\Scripts\python scripts\04b_generate_custom_assets.py

# 8. Compilar el PDF (Tectonic descargado en .tools/, no requiere instalar LaTeX)
cd article
..\.tools\tectonic.exe main.tex
```

## Resultados obtenidos (resumen)

| Hallazgo | Cifra |
|---|---|
| PRED(15) de estimaciones expertas (JOSSE, n=4,329) | 39.8 % |
| Proyectos subestimados en SEERA (n=120) | 80.8 % |
| Desviación mediana del esfuerzo en SEERA | +58.6 % |
| R² regresión lineal JOSSE (variables de texto) | 0.39 |
| R² random forest SEERA (variables tempranas) | 0.81 |
| H2 (dispersión por términos de cambio) | p=0.57, no significativo (resultado nulo reportado) |

## Qué sale

- `outputs/tables/`: model_metrics, josse_expert_vs_actual, seera_estimate_vs_actual, josse_change_dispersion (+ change_like_stats)
- `outputs/figures/`: 6 figuras PNG (scatter experto/real, scatter SEERA, predicho/real, 2 distribuciones, boxplot)
- `article/generated/`: tabla_*.tex, figuras.tex, cifras.tex (macros)
- `article/main.pdf`: el artículo (6 páginas, 2 columnas, 16 referencias)
- `article/articulo_editable.docx`: el MISMO artículo en Word editable (4 tablas + 6 figuras embebidas + referencias), generado con pandoc desde main.tex. Para editar "cualquier puntito" sin tocar LaTeX.
- `docs/04_guia_para_entender_y_defender.md` (+ .docx): guía personal de defensa

## Verificación de resultados

`scripts/05_verify_results.py` recalcula desde cero (con código independiente
del pipeline) cada número que aparece en el artículo y lo compara contra las
tablas generadas. Última corrida: **87/87 PASS** (26 de las cifras originales + 61 de las cifras nuevas de octubre de 2026; ver la sección siguiente).

```powershell
.venv\Scripts\python scripts\05_verify_results.py
```

## Datasets públicos de esfuerzo (octubre de 2026)

Se agregó un análisis con siete datasets públicos de esfuerzo de la familia PROMISE (Albrecht, China,
COCOMO81, Desharnais, Kitchenham, Maxwell y NASA93; 967 proyectos) para probar la hipótesis sobre pocos
proyectos: ¿un modelo paramétrico calibrado con datos locales iguala o supera al aprendizaje automático?
También se aprovecha la duración de SEERA y un punto de calibración mexicano (Valdés-Souto y Valeriano-Assem, 2024).
Resultados, honestos y con límites, en `docs/07_resultados_datasets_publicos_2026-10.md`.

```powershell
.venv\Scripts\python scripts\07a_descargar_promise.py     # baja los datasets y escribe data/raw/promise/PROCEDENCIA.md
.venv\Scripts\python scripts\07_modelos_simples_vs_ml.py  # cuatro modelos, validación cruzada repetida, figura 3
.venv\Scripts\python scripts\08_curva_aprendizaje.py      # curvas con 4, 8, 16 y 32 proyectos, figura 4
.venv\Scripts\python scripts\09_seera_duracion.py         # duración estimada contra real en SEERA, figura 5
.venv\Scripts\python scripts\09b_punto_mexicano.py        # punto de calibración mexicano (baja el PDF si falta)
.venv\Scripts\python scripts\10_cifras_nuevas.py          # macros \nuevo... en cifras.tex y tablas y figuras de LaTeX
.venv\Scripts\python scripts\05_verify_results.py         # 26 comprobaciones anteriores + las nuevas (05b)
```

Notas: `common_promise.py` guarda lo compartido (lector de ARFF, fichas de los datasets, modelos y métricas).
`04b_generate_custom_assets.py` reescribe `cifras.tex` completo: si se vuelve a correr, hay que correr otra vez el
script 10. Los CSV nuevos están en `outputs/` y los fragmentos de LaTeX en `article/generated/`.

## Desviaciones respecto al plan original

1. Script 02 genérico NO se usó: elegía la "tabla más grande", que en JOSSE era un
   CSV crudo de Jira y en SEERA el Excel con headers rotos. Se creó `02b` específico.
2. `common.py` se corrigió para scikit-learn ≥1.4 (`root_mean_squared_error`).
3. Script 04 genérico se reemplazó por `04b` (las tablas de 04 dejaban `_` sin
   escapar, lo que rompía LaTeX).
4. Tectonic se descargó como binario (no está en winget); quedó en `.tools/`.
5. main.tex se reescribió: sin inputenc/fontenc (Tectonic=XeTeX nativo UTF-8),
   con los datos de portada del autor y los resultados reales insertados vía
   macros generadas (cero transcripción manual).

## Decisión metodológica

No se afirma que los resultados públicos representen directamente a Fresnillo. Se usan para construir un experimento preliminar reproducible y justificar el diseño del sistema. La validación local se realizará después con casos capturados por EMPS-Fresnillo.
