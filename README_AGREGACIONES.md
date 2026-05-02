# Agregaciones para EMPS-Fresnillo: base de datos, datasets, ML y fuentes vivas

Este paquete no reemplaza la documentacion existente del sistema. Se integra como una ampliacion despues de los archivos ya creados, principalmente despues de `06_modelo_datos.md`, `07_motor_formulas.md`, `09_api_contract.md`, `12_plan_pruebas.md` y `16_validacion_investigacion.md`.

## Decision principal

La base de datos de trabajo debe ser PostgreSQL para la version seria del sistema. SQLite puede mantenerse solamente como prototipo local si ya se empezo asi, pero el diseno debe quedar preparado para migrar a PostgreSQL porque el sistema necesita:

- almacenar proyectos, modulos, historias de usuario, estimaciones, cambios, nomina, flujo de efectivo y mantenimiento;
- importar datasets publicos de investigacion;
- registrar casos propios para que el sistema aprenda con el tiempo;
- guardar versiones de parametros fiscales, laborales y tecnologicos;
- conservar evidencia, trazabilidad, auditoria y resultados de modelos.

## Que se agrega

1. Capa de datasets publicos y dataset local.
2. Capa de machine learning para estimacion inicial, riesgo de cambios y comparacion de modos de desarrollo.
3. Capa de comparacion entre desarrollo tradicional, asistencia generativa y bytecoding/codificacion con prompts.
4. Capa de fuentes vivas para parametros externos que cambian con el tiempo.
5. Migracion SQL aditiva, sin borrar tablas actuales.
6. Plantilla CSV para empezar a capturar casos locales y alimentar el modelo.
7. Texto metodologico listo para integrar al avance de investigacion.

## Orden recomendado de integracion

1. Mantener el avance actual del sistema.
2. Agregar las tablas del archivo `20_migracion_aditiva_postgresql_ml.sql`.
3. Implementar primero el registro manual de casos locales con `27_template_captura_casos_ml.csv`.
4. Despues implementar importaciones de datasets publicos.
5. Despues activar el modelo ML de forma experimental.
6. Al final activar fuentes vivas con revision humana antes de aplicar parametros legales o fiscales.

## Regla metodologica

El sistema no debe afirmar que ya tiene conclusiones si todavia no se han medido casos reales. Lo correcto es presentar la investigacion como un pipeline reproducible: revision de literatura, seleccion de datasets, diseno de base de datos, captura local, comparacion de escenarios y validacion posterior.
