# Guía para entender y defender el artículo

Este documento es PARA TI, no para entregar. Explica en lenguaje sencillo qué se hizo, qué significa cada número del artículo y cómo responder las preguntas más probables de la maestra.

---

## 1. La historia completa en 5 renglones

Tu sistema EMPS-Fresnillo ya existe, pero todavía no tiene suficientes proyectos reales terminados para validar tu hipótesis con datos locales. Entonces hiciste lo que hace cualquier investigador en esa situación: buscaste **bases de datos públicas** de proyectos de software reales, les aplicaste **análisis estadístico**, y usaste los resultados como **evidencia preliminar** de que tu hipótesis va por buen camino. El artículo presenta ese análisis. La validación con datos de Fresnillo queda como "trabajo futuro" (que es exactamente lo que tu prototipo va a recolectar).

---

## 2. Las dos bases de datos (apréndete esto)

### JOSSE (la principal)
- **Qué es**: 23,186 tareas reales de programación (issues de Jira) de 371 proyectos de código abierto (Apache, JBoss, Spring).
- **Qué trae cada tarea**: el texto de la solicitud (título + descripción), y las **horas reales** que tomó hacerla (registradas en los worklogs de Jira).
- **Lo especial**: 4,329 de esas tareas también tienen la **estimación que dio un experto ANTES de hacerlas**. Eso permite comparar "lo que el experto dijo" vs "lo que realmente tomó".
- **Quién la publicó**: Alhamed y Storer (2022), Universidad de Glasgow, en Zenodo.
- **Por qué la elegiste**: es de las pocas bases públicas con esfuerzo real Y estimación experta por tarea. Tu hipótesis dice que estimar "a ojo" no basta, y esta base lo puede comprobar o refutar.

### SEERA (el contraste)
- **Qué es**: 120 proyectos completos de software de 42 organizaciones en entornos con **restricciones técnicas y económicas** (proyectos de Sudán, economías con limitaciones).
- **Qué trae**: 76 variables por proyecto, incluyendo esfuerzo **estimado al inicio** y esfuerzo **real al final**.
- **Por qué la elegiste**: el contexto de restricciones económicas se parece más al de un proveedor municipal mexicano que los datos de Google o Microsoft. Y permite ver la desviación estimado-vs-real a nivel PROYECTO (no solo tarea).

---

## 3. Los 3 resultados del artículo, explicados como para un amigo

### Resultado 1: "Los expertos ordenan bien pero le atinan mal" (H1)
- En JOSSE, la correlación entre lo que el experto estimó y lo real es alta (ρ = 0.79). O sea: el experto SÍ sabe distinguir cuál tarea es grande y cuál chica.
- PERO la magnitud falla: **solo el 39.8% de las estimaciones cayó dentro de ±15% del valor real**. Y el error mediano fue 33%.
- En español: si le pides a un experto que estime 10 tareas, en 6 de ellas se equivoca por más del 15%.

### Resultado 2: "En entornos pobres, TODOS subestiman" (H1, el dato estrella)
- En SEERA, el **80.8% de los proyectos costó MÁS esfuerzo del estimado**.
- La desviación mediana fue **+58.6%**: el proyecto típico costó casi 60% más de lo prometido.
- Solo el 16.7% de los proyectos quedó dentro de ±15%.
- En español: si un ayuntamiento acepta una cotización "a ojo", 8 de cada 10 veces el proyecto va a costar más (y típicamente 60% más). ESTE es el argumento de por qué Fresnillo necesita estimación seria.

### Resultado 3: "Las variables tempranas SÍ predicen" (H3)
- Con solo el TEXTO de la solicitud (longitud, palabras, proyecto), una regresión lineal explica el 39% de la variación del esfuerzo en JOSSE (R² = 0.39). La línea base (adivinar el promedio) explica 0%.
- Con las características del proyecto conocidas AL INICIO (tamaño estimado, equipo, tipo de organización...), un bosque aleatorio explica el 81% en SEERA (R² = 0.81).
- En español: capturar datos estructurados desde el inicio (que es exactamente lo que hace tu sistema EMPS) tiene valor real para predecir.

### Resultado "bonus": el resultado NULO de H2 (esto es ORO académico)
- Probaste si las tareas con palabras tipo "change/fix/bug" tienen esfuerzo distinto. Resultado: NO (p = 0.57, no significativo).
- ¿Eso es malo? NO. Es un resultado honesto que además **justifica tu diseño**: detectar cambios por palabras clave NO funciona, por eso EMPS-Fresnillo captura los cambios de forma ESTRUCTURADA (tipo, fase, artefactos afectados) y no adivinándolos del texto.
- Si la maestra pregunta "¿y salió todo como esperabas?" → "No, la H2 no se confirmó, y eso refinó el diseño del prototipo. Reportarlo es parte de la honestidad metodológica."

---

## 4. Conceptos que pueden preguntarte (en simple)

| Concepto | Qué es en simple |
|---|---|
| **Regresión lineal** | Trazar la "mejor línea recta" que relaciona variables (ej. más palabras en la solicitud → más horas). Es explicable: puedes ver cuánto pesa cada variable. |
| **Bosque aleatorio (random forest)** | Muchos "árboles de decisión" que votan. Captura relaciones no lineales. Es la comparación "más potente pero menos explicable". |
| **Línea base (baseline)** | El modelo más tonto posible: siempre predecir el promedio. Si tu modelo no le gana, no sirve. |
| **R²** | Qué porcentaje de la variación explica el modelo. R²=0.39 → explica 39%. R²=0 → no explica nada. Negativo → peor que adivinar el promedio. |
| **MAE / RMSE** | Errores promedio de predicción. Más chico = mejor. En el artículo están en escala logarítmica. |
| **MRE / MMRE / MdMRE** | Error relativo de una estimación: \|estimado−real\|/real. MMRE es el promedio, MdMRE la mediana (más robusta a valores extremos). |
| **PRED(15)** | Porcentaje de estimaciones que cayeron dentro de ±15% del valor real. Es el estándar de "precisión aceptable" en medición funcional (IFPUG). |
| **log(1+esfuerzo)** | Transformación para que los proyectos gigantes no dominen el análisis. Práctica estándar con datos de "cola larga". |
| **Mann-Whitney** | Prueba estadística para comparar dos grupos sin asumir distribución normal. p < 0.05 = diferencia real; p = 0.57 = no hay evidencia de diferencia. |
| **Partición 75/25** | El modelo se entrena con 75% de los datos y se evalúa con el 25% que NUNCA vio. Así se evita hacer trampa. |
| **Fuga de datos (leakage)** | Usar como predictor algo que solo se conoce DESPUÉS (ej. la duración real). En SEERA excluimos esas variables a propósito; puedes presumir esto si te preguntan de rigor. |

---

## 5. Preguntas probables de la maestra + respuestas

**P: ¿Con qué bases de datos trabajaste?**
R: JOSSE como principal (23,186 tareas con esfuerzo real, 4,329 con estimación experta, de Zenodo, Alhamed y Storer 2022) y SEERA como contraste (120 proyectos en entornos restringidos, Mustafa y Osman 2020). Las dos están citadas con DOI en las referencias.

**P: ¿Dónde está el machine learning?**
R: En la sección 4.2: comparé línea base, regresión lineal y bosque aleatorio con scikit-learn, partición 75/25, métricas MAE/RMSE/R². Elegí modelos explicables a propósito: para un avance preliminar importa más entender qué variables pesan que maximizar la precisión.

**P: ¿Qué tiene que ver esto con Fresnillo?**
R: Tres cosas. Primero, demuestra que estimar "a ojo" falla (60-83% fuera del umbral), que es como se cotizan hoy los proyectos municipales. Segundo, demuestra que capturar variables estructuradas al inicio predice (R² hasta 0.81), que es lo que hace mi prototipo. Tercero, el contexto de SEERA (restricciones económicas) es el más parecido al de proveedores municipales mexicanos entre las bases públicas disponibles.

**P: ¿Por qué no usaste datos de Fresnillo directamente?**
R: Porque no existe un historial público de proyectos de software municipales con esfuerzo estimado y real. Eso es precisamente la brecha que mi prototipo ataca: es el instrumento de captura para construir ese dataset local. Este artículo es la fase preliminar con datos públicos; la validación local es la siguiente fase.

**P: ¿Qué pasó con la hipótesis de los cambios (H2)?**
R: No se confirmó con el método de palabras clave (p=0.57). Lo reporto como resultado nulo porque es informativo: la detección léxica no discrimina, lo que justifica que el prototipo capture los cambios de forma estructurada en lugar de inferirlos del texto.

**P: ¿Esto lo hiciste tú o el sistema?**
R: El pipeline es reproducible: scripts de Python que descargan los datos de Zenodo, los preparan, corren los modelos y generan las tablas y figuras del artículo automáticamente. Cualquiera puede repetir el análisis con los mismos scripts (están en la carpeta del proyecto). Los números del PDF salen de los CSVs generados, sin transcripción manual.

**P: ¿Por qué el R² de SEERA (0.81) es tan alto comparado con JOSSE (0.39)?**
R: SEERA predice a nivel PROYECTO con 21 variables ricas (tamaño estimado, equipo, organización); JOSSE predice a nivel TAREA solo con el texto de la solicitud. Más información estructurada da mejor predicción. Además SEERA es pequeño (30 casos de prueba) así que su R² se reporta con cautela; está dicho en "Amenazas a la validez".

---

## 6. Cómo se conecta con tu tesis y tu sistema

- La hipótesis del artículo ES tu hipótesis de tesis (estimación integral > estimar solo horas), bajada a lo que se puede probar con datos públicos.
- Los indicadores del artículo (MdMRE, PRED(15)) son LOS MISMOS que tu sistema EMPS calcula en su panel de validación (`/investigacion/validacion-hipotesis`). Cuando tengas ≥15 proyectos reales capturados, vas a medir lo mismo con datos locales.
- El resultado nulo de H2 explica una decisión de diseño real de tu sistema: el módulo de control de cambios v7 captura tipo/fase/artefactos en formularios estructurados, no analiza texto libre.

---

## 7. Cómo regenerar todo (si te piden demostrarlo en vivo)

```powershell
cd empsarticulodatos\proyecto_articulo_datos_emps_v1
.venv\Scripts\python scripts\00_download_datasets.py       # descarga de Zenodo
.venv\Scripts\python scripts\02b_prepare_from_real_formats.py  # SQLite + ARFF -> CSV
.venv\Scripts\python scripts\03_run_analysis.py             # modelos + métricas
.venv\Scripts\python scripts\03b_run_hypothesis_analysis.py # H1/H2
.venv\Scripts\python scripts\04b_generate_custom_assets.py  # tablas/figuras LaTeX
cd article
..\.tools\tectonic.exe main.tex                             # compila el PDF
```

El PDF queda en `article/main.pdf`. Las tablas en `outputs/tables/`, las figuras en `outputs/figures/`.

---

## 8. Los números que tienes que saberte de memoria

| Número | Qué es |
|---|---|
| **23,186** | tareas de JOSSE |
| **4,329** | tareas con estimación experta |
| **120** | proyectos de SEERA |
| **39.8%** | PRED(15) de los expertos: solo 4 de 10 le atinan a ±15% |
| **80.8%** | proyectos de SEERA subestimados |
| **+58.6%** | desviación mediana del esfuerzo en SEERA |
| **0.39** | R² de la regresión lineal en JOSSE (variables de texto) |
| **0.81** | R² del bosque aleatorio en SEERA (variables tempranas) |
| **p = 0.57** | la prueba de H2: sin diferencia significativa (resultado nulo honesto) |
