Estoy trabajando el artículo científico preliminar del proyecto EMPS-Fresnillo, Ingeniería en Software UAZ 2026.

Necesito que ejecutes y ajustes un mini-proyecto de análisis de datos con estos objetivos:

1. Usar JOSSE como dataset principal de estimación de esfuerzo.
2. Usar SEERA como dataset secundario de contraste.
3. No cambiar el stack del sistema EMPS-Fresnillo. Este análisis es un subproyecto separado en Python.
4. Generar resultados para un artículo científico preliminar: métricas, tablas, figuras y fragmentos LaTeX.
5. No inventar resultados. Si un dataset no descarga o no se reconoce, dejarlo reportado como limitación.

Tareas:

- Revisa `README_EJECUCION.md`.
- Ejecuta `python scripts/01_discover_datasets.py`.
- Si hay errores de columnas, abre `config/dataset_columns.yaml` y ajusta los nombres reales.
- Ejecuta `python scripts/02_prepare_datasets.py`.
- Ejecuta `python scripts/03_run_analysis.py`.
- Ejecuta `python scripts/04_generate_article_assets.py`.
- Verifica que existan `outputs/tables/model_metrics.csv`, `outputs/figures/actual_vs_predicted.png` y `article/generated/results_summary.tex`.
- Si LaTeX está instalado, compila `article/main.tex`.

Criterios:

- Mantener código legible.
- Usar regresión lineal como modelo explicable.
- Usar bosque aleatorio solo como contraste.
- Reportar MAE, RMSE, MAPE y R2.
- Separar resultados de JOSSE y SEERA.
- Mantener el texto académico, sin frases comerciales.
