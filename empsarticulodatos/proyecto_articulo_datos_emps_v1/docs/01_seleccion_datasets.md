# Selección de datasets para el artículo preliminar

## Decisión principal

Para entregar un artículo con análisis de datos sin esperar a que EMPS-Fresnillo acumule historial local, se recomienda usar dos datasets públicos:

1. **JOSSE** como dataset principal.
2. **SEERA** como dataset secundario de contraste.

## Por qué JOSSE

JOSSE es el dataset que mejor permite demostrar una hipótesis de estimación temprana porque trabaja con tareas de desarrollo y mantenimiento extraídas de Jira. Incluye esfuerzo real y una fracción de estimaciones expertas. Eso permite hacer regresión y comparar error entre estimación temprana y esfuerzo observado.

Relación con la tesis:

- El sistema EMPS-Fresnillo también parte de solicitudes, módulos, historias y cambios.
- JOSSE permite probar que las descripciones textuales y algunos metadatos ayudan a estimar esfuerzo.
- Las tareas de mantenimiento sirven como aproximación inicial al costo de cambios.

## Por qué SEERA

SEERA sirve porque no proviene de grandes empresas estadounidenses. Es un dataset de costo de software en entornos técnica y económicamente restringidos, con 120 proyectos de 42 organizaciones y 76 atributos. Se parece más al tipo de restricción que puede existir en proveedores pequeños o contextos municipales mexicanos.

Relación con la tesis:

- Permite analizar esfuerzo de proyecto, no solo tareas.
- Sirve para justificar que la estimación debe considerar contexto y restricciones.
- Apoya la idea de que no basta copiar parámetros de economías con salarios y equipos distintos.

## Por qué Public Jira queda opcional

Public Jira Dataset es excelente para estudiar cambios, comentarios, links y evolución de issues; sin embargo, pesa varios GB. Para la materia puede ser demasiado pesado. Se recomienda mencionarlo como fuente de contraste para una etapa posterior, pero no hacerlo obligatorio para el primer análisis.

## Hipótesis operacional para el análisis de datos

H1: Las variables tempranas disponibles en tareas o proyectos de software permiten estimar esfuerzo real con menor error que una línea base simple.

H2: Las tareas asociadas con mantenimiento, corrección o cambio tienden a mostrar variabilidad de esfuerzo, por lo que un sistema de estimación debe incluir reglas explícitas de control de cambios.

H3: Un prototipo como EMPS-Fresnillo puede funcionar como instrumento de captura local para transformar estimaciones preliminares en un dataset propio con el tiempo.
