# 46 - SRS: cambios, materiales, gastos indirectos e IVA

## Proposito

Agregar al sistema actual una capa de estimacion de recursos materiales y gastos indirectos, y fortalecer el costo sugerido de cambios para que sea explicable, editable y auditable.

## Alcance

El sistema debe permitir:

1. Registrar recursos del proyecto: equipo de computo, mobiliario, licencias, nube, herramientas, renta, internet, energia electrica, agua, contabilidad, administracion, transporte y otros.
2. Indicar modalidad de adquisicion: ya existe, usado, nuevo con factura, nuevo sin factura, renta, financiamiento o suscripcion.
3. Calcular impacto del recurso en costo, IVA, flujo y bache de caja.
4. Asociar recursos a un proyecto completo o a una solicitud de cambio.
5. Mostrar si el recurso genera IVA acreditable estimado, deduccion/depreciacion o alerta por falta de CFDI.
6. Cambiar la salida visual de cambios de "costo sugerido" a "rango sugerido calculado" o "precio sugerido preliminar".
7. Explicar al ayuntamiento por que un cambio aparentemente simple puede afectar seguridad, base de datos, reportes, pruebas, capacitacion y mantenimiento.
8. Explicar al proveedor el costo interno y el precio al cliente por separado.

## Requerimientos funcionales

### RF-v8-01 Recursos del proyecto
Crear CRUD de recursos asociados a Project.

Campos minimos:
- categoria
- descripcion
- cantidad
- modalidad de adquisicion
- costo unitario antes de IVA
- tasa de IVA
- estado de factura
- porcentaje de IVA acreditable
- porcentaje asignado al proyecto
- meses asignados
- mes de salida de efectivo
- si es activo capitalizable
- tasa anual de depreciacion sugerida
- notas

### RF-v8-02 Recursos asociados a cambios
El wizard de cambios debe permitir agregar recursos necesarios para el cambio: nueva licencia, API externa, equipo adicional, servicio en nube, prueba especializada, consultoria, etc.

### RF-v8-03 Desglose de cambio
El cambio debe mostrar:
- horas optimistas, probables y conservadoras
- costo de mano de obra
- carga fiscal-laboral estimada
- gastos administrativos
- recursos/materiales
- subtotal antes de IVA
- IVA trasladado
- IVA acreditable estimado por compras
- total a facturar
- impacto en bache de caja
- impacto mensual en mantenimiento

### RF-v8-04 Alertas fiscales y de flujo
Mostrar alertas cuando:
- el gasto no tenga factura
- el IVA no sea acreditable
- el recurso se compre en el mes 1 y aumente bache de caja
- el recurso sea compartido y se asigne indebidamente al 100%
- el cambio toque seguridad, datos personales, integraciones o permisos
- el cambio se solicite despues de pruebas, aceptacion o produccion

### RF-v8-05 Explicabilidad dual
Cada resultado debe incluir dos explicaciones:
- Ayuntamiento: lenguaje claro, sin tecnicismos innecesarios.
- Proveedor/investigador: formula, parametros, fuente, supuestos y advertencias.

## Requerimientos no funcionales

- No cambiar stack.
- No eliminar modelos existentes.
- Compatible con SQLite y PostgreSQL.
- Parametros actualizables por año y estado.
- Debe mantener multi-tenancy por cookie.
- UI en español neutro mexicano, tono institucional.
