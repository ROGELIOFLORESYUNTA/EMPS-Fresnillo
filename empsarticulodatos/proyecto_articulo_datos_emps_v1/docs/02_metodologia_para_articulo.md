# Metodología que se debe explicar en el artículo

## Tipo de estudio

Estudio aplicado, documental, cuantitativo exploratorio y de diseño de artefacto.

## Materiales

- Dataset JOSSE para tareas de desarrollo y mantenimiento con esfuerzo real.
- Dataset SEERA para proyectos de software en entornos restringidos.
- Artículos de estimación temprana, cambios de requerimientos y productividad con herramientas generativas.
- Prototipo EMPS-Fresnillo como artefacto de aplicación posterior.

## Procedimiento

1. Descargar datasets públicos.
2. Normalizar nombres de columnas y unidades de esfuerzo.
3. Eliminar registros sin esfuerzo real.
4. Crear variables tempranas: longitud de texto, tipo de tarea, presencia de términos de cambio/mantenimiento, proyecto, estimación experta cuando exista.
5. Dividir datos en entrenamiento y prueba.
6. Entrenar modelos simples: línea base, regresión lineal y bosque aleatorio.
7. Medir MAE, RMSE, MAPE y R2.
8. Comparar resultados y discutir qué variables ayudan.
9. Relacionar hallazgos con el diseño de EMPS-Fresnillo.

## Resultados esperados

El artículo no debe prometer que el modelo queda listo para producción. Debe presentar resultados preliminares que justifiquen la necesidad de capturar datos locales y de usar el sistema como instrumento de investigación.

## Cómo se conecta con control de cambios

El análisis de JOSSE debe etiquetar tareas con palabras asociadas a mantenimiento y cambio. Eso permite comparar si esos grupos tienen mayor esfuerzo o mayor dispersión. En EMPS-Fresnillo, esa observación se traduce en un módulo que calcula cambios por artefactos afectados, fase, claridad, modo de desarrollo y costo completo.
