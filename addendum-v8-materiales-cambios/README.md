# Addendum v8 - Cambios, materiales, gastos indirectos e IVA

Este paquete es aditivo. No cambia el stack ni reemplaza el addendum v6 o v7. Se integra sobre el sistema actual de EMPS-Fresnillo para fortalecer dos puntos:

1. Que el costo de un cambio no sea un numero escrito a mano sin estandar, sino un rango sugerido calculado y explicado.
2. Que la estimacion incluya materiales, herramientas, equipo, renta, servicios, licencias, factura/IVA y gastos indirectos.

Stack fijo: Next.js 15 App Router, TypeScript estricto, Prisma 6, SQLite local, PostgreSQL-ready via DATABASE_URL, Tailwind, Vitest y Playwright.

Archivos:
- 46_srs_cambios_materiales_overhead.md
- 47_sds_motor_precio_cambios_materiales.md
- 48_prisma_migracion_aditiva_materiales_overhead.md
- 49_api_endpoints_cambios_materiales.md
- 50_ui_pantallas_cambios_materiales.md
- 51_parametros_fuentes_fiscales_materiales_2026.md
- 52_validacion_cientifica_casos_materiales_cambios.md
- 53_tests_materiales_cambios.md
- 54_prompt_integracion_v8.md
- 55_fichas_fuentes_cambio_materiales.md
- 56_seed_parametros_materiales_overhead_2026.json
- examples/ejemplo_cambio_con_materiales.json

Regla de implementacion: no borrar modelos existentes. Todo campo nuevo debe ser opcional o estar en modelos nuevos.
