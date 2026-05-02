# SDS/CDS diseño

## Arquitectura

Frontend -> API -> Servicios de aplicación -> Dominio -> Persistencia -> Reportes.

## Módulos

1. Projects.
2. Requirements.
3. EstimationEngine.
4. FiscalLaborEngine.
5. CashFlowEngine.
6. ChangeControl.
7. Reports.
8. Parameters.
9. UsersRoles.

## Reglas de separación

- La interfaz no calcula impuestos.
- El motor de fórmulas no conoce detalles visuales.
- La base de datos no guarda resultados sin guardar parámetros usados.
- Cada estimación genera versión.

## Stack recomendado

- Next.js o React.
- FastAPI o Express.
- SQLite inicial.
- Prisma o SQLAlchemy.
- HTML to PDF para reportes.
