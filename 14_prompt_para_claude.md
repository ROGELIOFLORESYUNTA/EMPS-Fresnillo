# Prompt maestro para Claude en VS Code

Actúa como arquitecto senior de software y desarrollador full-stack. Construye el prototipo EMPS-Fresnillo siguiendo estrictamente la documentación de esta carpeta.

Objetivo: crear un sistema web local para estimar proyectos de software municipales integrando esfuerzo técnico, modo de desarrollo, bytecoding, control de cambios, costo fiscal-laboral, flujo de efectivo y mantenimiento.

Reglas:
1. No simplifiques el sistema a una calculadora de horas.
2. Implementa primero el modelo de datos.
3. Implementa el motor de fórmulas con parámetros configurables.
4. Separa frontend, backend, dominio y persistencia.
5. Cada estimación debe guardar versión y parámetros usados.
6. El modo bytecoding debe reducir prototipo, pero agregar revisión, pruebas y hardening.
7. La parte fiscal-laboral debe ser parametrizable.
8. Genera reportes para Ayuntamiento y proveedor.
9. Incluye pruebas unitarias del motor de cálculo.
10. Mantén código claro, documentado y fácil de cambiar.

Primera tarea: crear estructura del proyecto, base de datos SQLite, entidades Project, Module, UserStory, TeamProfile, Parameter, Estimate, ChangeRequest y CashFlowLine.
