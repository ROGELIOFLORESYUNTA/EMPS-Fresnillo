# 53 - Tests para materiales y cambios v8

## Unit tests Vitest

Crear `tests/resource-cost.test.ts`:

1. Compra con factura calcula IVA acreditable.
2. Compra sin factura deja IVA acreditable en cero y genera advertencia.
3. Suscripcion distribuye costo por meses.
4. Recurso existente no genera salida inicial de efectivo.
5. Computadora nueva usa depreciacion sugerida de 30% anual.
6. Mobiliario usa depreciacion sugerida de 10% anual.
7. Cambio con materiales aumenta total a facturar.
8. Cambio con compra en mes 1 aumenta bache de caja.
9. Recurso compartido al 50% solo asigna la mitad al proyecto.
10. IVA retenido queda en modo pendiente/verificar si el regimen no esta definido.

## E2E Playwright

1. Crear proyecto.
2. Agregar recurso: laptop nueva con CFDI.
3. Ver resumen de IVA acreditable.
4. Crear cambio que requiere licencia adicional.
5. Confirmar que el wizard muestra materiales y total a facturar.
6. Verificar reporte proveedor con bache de caja actualizado.
7. Exportar CSV de investigacion.

## Criterios de aceptacion

- No rompe tests v6/v7.
- No cambia stack.
- No requiere login.
- Respeta workspace cookie.
- El total a facturar se distingue del costo interno.
