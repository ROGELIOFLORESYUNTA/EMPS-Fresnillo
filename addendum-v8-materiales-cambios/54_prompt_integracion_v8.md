# 54 - Prompt de integracion v8

Estoy continuando EMPS-Fresnillo. Implementa el Addendum v8 de manera aditiva.

Reglas:
- No cambiar stack.
- No reemplazar `lib/engine/change-impact.ts`; crear funciones nuevas y conectarlas.
- Mantener SQLite/Postgres-ready.
- No borrar modelos existentes.
- Mantener 5 modos de desarrollo.
- Mantener multi-tenancy por cookie.
- Usar lenguaje institucional mexicano.

Tareas:

1. Leer:
   - docs/addendum-v7/*
   - codigo-clave/lib/engine/change-impact.ts
   - codigo-clave/prisma/schema.prisma
   - addendum-v8-materiales-cambios/*

2. Crear modelos Prisma aditivos:
   - ProjectResourceCost
   - ResourceCostExplanation

3. Crear motor:
   - lib/engine/resource-cost.ts
   - lib/engine/change-materials.ts

4. Agregar validadores Zod.

5. Agregar endpoints API.

6. Agregar UI:
   - recursos del proyecto
   - recursos dentro del wizard de cambios
   - desglose de IVA/materiales
   - explicacion "de donde sale"

7. Actualizar reportes:
   - municipal
   - proveedor
   - academico

8. Agregar tests unitarios y E2E.

9. No inventar fuentes. Si un parametro no tiene fuente oficial, marcar VERIFICAR.
