# Addendum 19. Base de datos, datasets y aprendizaje del sistema

## 1. Respuesta directa: con que base de datos se trabaja

El sistema trabajara con una base de datos propia llamada `emps_fresnillo`, implementada preferentemente en PostgreSQL. Esta base no es un dataset publico unico, sino una base operativa y de investigacion que integra tres capas:

1. **Datos del proyecto municipal capturado en el sistema.** Incluye modulos, historias de usuario, integraciones, pantallas, reportes, seguridad, equipo, nomina, impuestos, flujo de efectivo, cambios y mantenimiento.
2. **Datasets publicos de investigacion.** Sirven para calibrar y comparar el comportamiento del sistema antes de tener muchos datos locales.
3. **Dataset local acumulativo.** Cada estimacion hecha en el sistema se guarda como caso. Cuando el proyecto avanza o termina, se registra el resultado real. Con eso el sistema puede aprender y recalibrarse.

La respuesta defendible ante una revision academica es: no se depende de una sola base externa; se usa una base propia de captura y validacion, alimentada por datasets publicos y por casos locales.

## 2. Datasets publicos que se usaran

| ID | Dataset | Uso dentro del sistema |
|---|---|---|
| D1 | Public Jira Dataset | Analizar ciclos de issues, cambios, estados, comentarios, vinculos y trazabilidad. Sirve para estimar riesgo de cambios, retrabajo y duracion relativa. |
| D2 | JOSSE | Comparar estimaciones expertas contra esfuerzo real en tareas de desarrollo y mantenimiento. Sirve para entrenar o probar modelos de esfuerzo por tarea. |
| D3 | SEERA | Estudiar proyectos completos en contextos con restricciones tecnicas y economicas. Sirve para variables de costo y esfuerzo a nivel proyecto. |
| D4 | Matriz de articulos revisados | Relacionar hallazgos de literatura con variables del sistema. No entrena el modelo, pero justifica la seleccion de variables. |
| D5 | Datos abiertos de contratacion publica mexicana | Revisar estructura de montos, proveedores y procedimientos. No estima horas de software, pero contextualiza contratacion publica. |
| D6 | Parametros fiscales, laborales y tecnicos 2026 | Alimentan calculos deterministicos: ISR, IVA, UMA, salario minimo, ISN, cuotas, herramientas y mantenimiento. |
| D7 | Casos locales capturados en EMPS-Fresnillo | Base principal para mejorar el modelo con experiencia real del contexto municipal. |

## 3. Que aprende el sistema

El sistema no debe aprender solamente horas de programacion. Debe aprender o ajustar cuatro resultados:

1. **Esfuerzo tecnico esperado.** Horas por requerimientos, historias, modulos, pantallas, integraciones, reportes y datos sensibles.
2. **Riesgo de cambio.** Probabilidad de retrabajo por ambiguedad, baja disponibilidad del usuario, cambios normativos o cambios politicos/administrativos.
3. **Factor de modo de desarrollo.** Diferencia entre desarrollo tradicional, asistencia generativa, bytecoding/codificacion con prompts e hibrido.
4. **Riesgo financiero-operativo.** Si la cotizacion, calendario de pagos, nomina, impuestos y mantenimiento permiten terminar el proyecto sin romper flujo de efectivo.

## 4. Fases de implementacion del aprendizaje

### Fase 0. Formulas y reglas base

Se implementa el calculo con reglas explicitas: puntos de complejidad, multiplicadores, costos de nomina, impuestos, flujo de efectivo y margen. Esta fase ya permite comparar escenarios sin entrenar ML.

### Fase 1. Importacion de datasets publicos

Se importan subconjuntos de Public Jira, JOSSE y SEERA. El objetivo es tener datos para pruebas, exploracion y calibracion inicial.

### Fase 2. Dataset local del sistema

Cada estimacion creada se guarda. Despues se registra si el proyecto se completo, cuanto tardo, cuanto costo, cuantos cambios tuvo y si el mantenimiento fue mayor al esperado.

### Fase 3. Modelo ML experimental

Cuando exista suficiente informacion, el sistema entrena modelos para predecir rangos de esfuerzo, riesgo de cambios y desviacion de costo. Al inicio se puede entrenar con datasets publicos y despues recalibrar con datos locales.

### Fase 4. Reentrenamiento controlado

El sistema no debe actualizar modelos de forma silenciosa. Cada modelo tendra version, fecha, dataset usado, metrica de error y estado de aprobacion.

## 5. Que se puede decir en la investigacion

El enfoque propuesto combina una base de datos propia con datasets publicos y captura progresiva de casos locales. En la etapa de avance, el resultado esperado no es demostrar todavia que el modelo es superior, sino dejar preparado el metodo para compararlo contra estimaciones simples. La validacion posterior se hara con metricas de error, rangos de costo, desviacion de tiempo, cambios registrados y viabilidad financiera.
