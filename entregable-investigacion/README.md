# Validación externa de la hipótesis — EMPS Fresnillo

Esta carpeta contiene los recursos para reproducir en Python el análisis estadístico que el sistema EMPS Fresnillo corre internamente, como **doble verificación** para el artículo de tesis.

## Para qué sirve

El sistema corre todo el análisis dentro de Next.js (estadística descriptiva, correlación, regresión multivariable, random forest, MLP) y emite un veredicto automático sobre la hipótesis. Pero para que el artículo tenga credibilidad académica conviene **reproducir los mismos números con scikit-learn**, que es la librería estándar de referencia.

## Pasos

1. **Descargar el dataset** desde el sistema:
   - Abre `/investigacion/validacion-hipotesis` (modo investigador).
   - Click en **Descargar CSV**.
   - Guarda el archivo en `entregable-investigacion/notebooks/emps-dataset.csv`.

2. **Instalar Python 3.11+** y las dependencias:
   ```bash
   pip install pandas scikit-learn matplotlib seaborn jupyter scipy
   ```

3. **Abrir el notebook**:
   ```bash
   cd entregable-investigacion/notebooks
   jupyter notebook validar_hipotesis.ipynb
   ```

4. **Ejecutar todas las celdas** (Cell → Run All).

5. **Comparar** el R², MAPE y veredicto reportados por el notebook con los que muestra el sistema interno. Deben coincidir dentro de ±0.01. Si coinciden, ambas implementaciones son consistentes.

## Estructura

```
entregable-investigacion/
├── README.md                              ← este archivo
└── notebooks/
    ├── validar_hipotesis.ipynb            ← notebook reproducible
    └── emps-dataset.csv (descargado)      ← tu data
```

## Columnas del CSV

El dataset tiene 16 columnas:

| Columna | Tipo | Descripción |
|---|---|---|
| `project_id` | str | ID interno del proyecto |
| `project_name` | str | Nombre legible |
| `dev_mode` | str | traditional / ai_assisted / hybrid / bytecoding_prompts / low_code |
| `est_hours` | num | Horas estimadas (escenario probable) |
| `actual_hours` | num | Horas reales registradas |
| `est_cost_mxn` | num | Costo estimado |
| `actual_cost_mxn` | num | Costo real |
| `clarity_avg` | num | Promedio de claridad de los módulos (1-5) |
| `n_modules` | int | Cantidad de módulos del proyecto |
| `n_integrations` | int | Suma de integraciones declaradas |
| `criticality_avg` | num | Promedio de criticidad de módulos (1-5) |
| `changes_anticipated_ratio` | num | Anticipados / reales (1.0 = perfecto) |
| `fiscal_detailed` | 0\|1 | 1 si se usó modo "detallado" |
| `mape_hours` | num | (variable dependiente) MAPE horas en % |
| `mape_cost` | num | MAPE costo en % |
| `is_accurate_15pct` | 0\|1 | 1 si mape_hours ≤ 15 |

## Si no coinciden los números

- Verifica que el CSV tenga la última versión (regenerar desde `/validacion-hipotesis`).
- El notebook usa `LinearRegression` de scikit-learn con intercept (igual que el sistema).
- El sistema aproxima p-values con t-student; el notebook usa `scipy.stats.pearsonr` exacto. Los p-values pueden diferir ligeramente, pero los coeficientes y R² deben coincidir.
- Random Forest tiene aleatoriedad: usa `random_state=42` en ambos lados.
