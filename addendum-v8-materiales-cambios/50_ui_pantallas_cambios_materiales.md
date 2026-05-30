# 50 - UI: pantallas para cambios, materiales y explicabilidad

## Cambios

En la pantalla de cambios, sustituir visualmente:

- "Costo sugerido" por "Rango sugerido calculado"
- "Costo" por "Precio antes de IVA" cuando sea precio al cliente
- "Total" por "Total a facturar" si incluye IVA

## Wizard de cambios v8

Agregar un paso opcional despues de artefactos afectados:

### Paso: Recursos y materiales afectados

Preguntas:
- El cambio requiere equipo, licencia, servicio en nube, API, consultoria, herramienta o prueba externa?
- Es un recurso ya existente, nuevo con factura, nuevo sin factura, rentado, financiado o suscripcion?
- Se usara solo para este proyecto o tambien para otros?
- En que mes se paga?

## Tarjetas de resultado

Mostrar tarjetas:

1. Horas probables del cambio
2. Rango de precio antes de IVA
3. IVA trasladado
4. IVA acreditable estimado por compras
5. Total a facturar
6. Impacto en bache de caja
7. Mantenimiento mensual adicional

## Explicacion para Ayuntamiento

Ejemplo:

"Este cambio parece pequeno por la descripcion, pero afecta permisos, base de datos y pruebas. Por eso no se trata como ajuste visual. Si se aprueba ahora, requiere nueva linea base y aumenta mantenimiento."

## Explicacion para proveedor/investigador

Debe mostrar:
- artefactos afectados
- factores aplicados
- parametros fiscales usados
- recursos agregados
- advertencias de CFDI/IVA
- version de parametros
- fecha de calculo

## Alertas visuales

Usar lenguaje institucional:

- "Advertencia: gasto sin CFDI. No se considera IVA acreditable en esta estimacion."
- "Advertencia: el cambio se solicita despues de pruebas. Requiere nueva validacion."
- "Advertencia: compra inicial aumenta el bache de caja del proyecto."
- "Advertencia: afecta datos, permisos o integracion externa. Requiere aprobacion formal."
