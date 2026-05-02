# Addendum 23. Fuentes vivas y actualizacion de parametros

## Problema

Los parametros usados para estimar proyectos cambian con el tiempo. Una cotizacion de 2026 no debe quedarse congelada si cambian salarios, UMA, impuestos, cuotas, reglas estatales, costos de herramientas o evidencia sobre productividad.

## Solucion propuesta

Agregar una capa de fuentes vivas. Esta capa no debe aplicar cambios legales de forma ciega. Debe detectar cambios, guardar evidencia, compararlos contra el valor vigente y pedir revision antes de activar el nuevo parametro.

## Flujo de actualizacion

```text
1. Registrar fuente oficial o confiable
2. Ejecutar revision programada
3. Guardar snapshot de la fuente
4. Calcular hash o fecha de actualizacion
5. Detectar si cambio
6. Extraer posible parametro
7. Crear revision pendiente
8. Aprobar o rechazar
9. Activar parametro con fecha de vigencia
10. Recalcular estimaciones afectadas si aplica
```

## Fuentes minimas

| Categoria | Fuente | Uso |
|---|---|---|
| Fiscal federal | SAT / Ley ISR | Tasa ISR y reglas de utilidad fiscal. |
| Fiscal federal | SAT / Ley IVA | IVA trasladado, IVA acreditable y tasa general. |
| Laboral-economica | INEGI UMA | Calculos relacionados con UMA y topes. |
| Laboral | CONASAMI / DOF | Salario minimo y minimos profesionales. |
| Estatal | SEFIN Zacatecas / Ley de Hacienda | Impuesto sobre nominas y estimulos estatales. |
| Contratacion publica | datos.gob.mx | Contexto de montos, procedimientos y proveedores. |
| Investigacion | Zenodo | Versiones de datasets tecnicos. |
| Tecnologia | Matriz de literatura | Evidencia sobre productividad, herramientas y practicas de desarrollo. |

## Reglas de seguridad

- Los parametros fiscales y laborales requieren aprobacion humana antes de quedar activos.
- El sistema debe conservar el valor anterior, el valor nuevo, la fuente, fecha de consulta y fecha de vigencia.
- Las estimaciones pasadas no se deben modificar sin crear una nueva version.
- Si una fuente cambia pero el sistema no puede extraer el valor con confianza, debe crear alerta para revision manual.
- Cada reporte debe indicar la version de parametros usada.

## Pantallas necesarias

1. Fuentes configuradas.
2. Ultima revision de cada fuente.
3. Cambios detectados.
4. Parametros pendientes de aprobacion.
5. Historial de parametros por ano.
6. Recalcular proyecto con parametros actualizados.

## Endpoints sugeridos

```text
GET    /api/live-sources
POST   /api/live-sources
POST   /api/live-sources/{id}/check
GET    /api/live-sources/{id}/snapshots
GET    /api/parameter-reviews?status=pending
POST   /api/parameter-reviews/{id}/approve
POST   /api/parameter-reviews/{id}/reject
GET    /api/fiscal-parameters?year=2026&state=Zacatecas
POST   /api/projects/{id}/recalculate-with-current-parameters
```

## Importante para el articulo

Esta capa fortalece la metodologia porque evita que el sistema sea una calculadora fija. El prototipo se plantea como un instrumento actualizable, con trazabilidad de fuentes y control de versiones de parametros.
