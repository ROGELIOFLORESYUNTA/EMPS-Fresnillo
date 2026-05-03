# Addendum v6 - Control inteligente de cambios

Este paquete agrega la parte de control de cambios al sistema existente sin rehacer la arquitectura. No reemplaza los archivos anteriores: se integra sobre lo que ya existe en proyectos, módulos, historias, equipo, estimaciones, cambios, parámetros, datasets, modelos y fuentes vivas.

Objetivo: que una solicitud vaga del cliente, como "agregar un botón" o "quiero otra pantalla", se traduzca a impacto técnico, costo, tiempo, riesgo, pruebas y decisión de alcance.

Regla central: un cambio no se acepta ni se rechaza solo por opinión. Primero se clasifica, se estima y se muestra su impacto.

Archivos incluidos:

- `26_addendum_srs_control_cambios.md`
- `27_addendum_sds_motor_control_cambios.md`
- `28_addendum_datos_prisma_control_cambios.md`
- `29_addendum_ui_control_cambios.md`
- `30_addendum_api_control_cambios.md`
- `31_seed_parametros_control_cambios_2026.json`
- `32_tests_control_cambios.md`
- `33_anexo_metodologico_articulo_cambios.md`
- `34_prompt_integracion_codigo.md`
- `examples/ejemplo_change_request_municipal.json`

Compatibilidad: se asume el sistema actual con Next.js App Router, TypeScript estricto, Prisma, SQLite en prototipo y esquema portable a PostgreSQL. La lógica debe vivir en `lib/engine` y las pantallas deben integrarse al flujo actual de proyecto y cambios.
