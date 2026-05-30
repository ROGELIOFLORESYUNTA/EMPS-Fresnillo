# Entrega de información investigada faltante — EMPS-Fresnillo v9

Esta carpeta contiene la información que faltaba exponer después de la investigación:

1. `docs/01_informacion_investigada_faltante.md`  
   Matriz de hallazgos: costo de cambios, materiales, IVA, recursos, fiscal-laboral y validación.

2. `manuals/46_parameter_manuals_2026.json`  
   JSON completo con 54 manuales contextuales para la tabla `ParameterManual`.

3. `manuals/46_parameter_manuals_2026_parte_1_de_4.json` a `parte_4_de_4.json`  
   Los mismos manuales divididos por partes para copiar/pegar si se requiere.

4. `manuals/VALIDACION_JSON.txt`  
   Verificación básica de estructura y conteo.

Uso sugerido:

- Copiar `46_parameter_manuals_2026.json` al seed correspondiente.
- Validar con `JSON.parse()` o `python -m json.tool`.
- Cargarlo en Prisma para llenar los drawers de manual contextual.
- Usar el documento de investigación como anexo o respaldo para el artículo y la documentación técnica.
