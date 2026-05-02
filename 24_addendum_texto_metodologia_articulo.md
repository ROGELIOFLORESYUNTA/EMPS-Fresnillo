# Addendum 24. Texto metodologico para integrar al avance del articulo

El siguiente texto puede integrarse en la seccion de Materiales y Metodos o Metodologia. Esta redactado en estilo academico y no como instruccion tecnica.

## Fuentes de datos y base de datos del estudio

La investigacion no se apoya en una unica base de datos externa. Se propone una estrategia de datos en tres capas. La primera corresponde a una base de datos propia del prototipo, en la cual se registraran proyectos, modulos, historias de usuario, integraciones, pantallas, reportes, riesgos, modo de desarrollo, equipo, costos laborales, flujo de efectivo, cambios y mantenimiento. La segunda capa corresponde a datasets publicos de ingenieria de software, seleccionados para analizar estimacion de esfuerzo, cambios y restricciones de proyecto. Entre ellos se consideran Public Jira Dataset, JOSSE y SEERA. La tercera capa corresponde al dataset local acumulativo, formado por los casos capturados en el propio sistema y por los resultados reales que se registren conforme los proyectos avancen.

## Pipeline de analisis

El pipeline metodologico se divide en seis etapas. Primero, se capturan variables funcionales, tecnicas, humanas, fiscales y de mantenimiento. Segundo, se normalizan estas variables para obtener medidas comparables de claridad de requerimientos, complejidad, disponibilidad del usuario, volatilidad de cambios, experiencia del equipo y riesgo fiscal-laboral. Tercero, se calcula una estimacion base mediante reglas explicitas y formulas trazables. Cuarto, se generan escenarios comparativos por modo de desarrollo: tradicional, asistido por herramientas generativas, bytecoding/codificacion con prompts e hibrido. Quinto, se registra la estimacion y sus supuestos en la base de datos. Sexto, cuando exista informacion suficiente, se utilizaran modelos de aprendizaje automatico para ajustar rangos de esfuerzo, riesgo de cambios y desviacion de costo.

## Comparacion por modo de desarrollo

La comparacion entre modos de desarrollo no se realizara mediante un unico porcentaje de reduccion. El sistema separara el esfuerzo por fases: levantamiento de requerimientos, codificacion, revision, pruebas, refactorizacion, documentacion, despliegue y mantenimiento. Este enfoque permite representar que las herramientas generativas o la codificacion con prompts pueden reducir el tiempo de escritura de codigo, pero tambien pueden aumentar el tiempo de revision, pruebas, ajustes arquitectonicos o mantenimiento si el proyecto no se controla adecuadamente.

## Aprendizaje automatico dentro del sistema

El componente de aprendizaje automatico se plantea de forma progresiva. En una primera etapa, el sistema funcionara con reglas, formulas y escenarios explicables. En una segunda etapa, se importaran datasets publicos para calibrar variables de esfuerzo, cambios y costo. En una tercera etapa, la base local del sistema permitira comparar estimaciones contra resultados reales. Con ello se podran entrenar modelos para predecir rangos de esfuerzo, riesgo de cambios y desviacion de costo. Cada modelo debera conservar version, variables usadas, dataset de entrenamiento, metricas de error y fecha de validacion.

## Actualizacion de parametros externos

Dado que las condiciones fiscales, laborales, tecnologicas y economicas cambian con el tiempo, el sistema incluira una capa de fuentes actualizables. Esta capa registrara fuentes normativas y de contexto, guardara evidencia de consulta, detectara cambios y mantendra versiones historicas de parametros como IVA, ISR, UMA, salario minimo, impuesto sobre nominas, costos de herramientas y referencias de contratacion publica. Por tratarse de informacion fiscal y laboral, los cambios detectados deberan validarse antes de aplicarse a nuevas estimaciones.

## Validacion propuesta

La validacion se realizara comparando una estimacion simple basada principalmente en horas contra la estimacion integral propuesta. Se analizaran diferencias en esfuerzo, costo total, flujo de efectivo, riesgo de cambios y mantenimiento. Los resultados esperados para la siguiente etapa del articulo consisten en determinar si la estimacion integral permite identificar riesgos que una cotizacion tradicional no muestra, especialmente cuando se consideran modo de desarrollo, obligaciones fiscales-laborales, cambios de alcance y mantenimiento posterior.
