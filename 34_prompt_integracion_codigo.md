# 34. Instrucción de integración para desarrollo

Usar este prompt al implementar el addendum en el repositorio actual:

```text
Integra el addendum v6 de control de cambios sin rehacer la arquitectura existente.

Reglas:
1. No reemplaces el sistema actual.
2. Conserva el flujo de proyectos, módulos, historias, equipo, estimaciones y cambios.
3. Agrega lógica pura en lib/engine/change-impact.ts.
4. Agrega tipos en lib/engine/change-types.ts.
5. Agrega validación Zod en lib/validators.ts.
6. Si amplías Prisma, usa modelos portables entre SQLite y PostgreSQL.
7. No sobrescribas estimaciones anteriores; versiona o asocia impactos.
8. El lenguaje de UI debe ser entendible para ayuntamiento y proveedor.
9. El sistema debe explicar por qué un cambio aumenta tiempo o costo.
10. Agrega tests unitarios y E2E mínimos.

Prioridad:
- Primero motor y tests.
- Después API.
- Después UI de captura.
- Después reportes.
```
