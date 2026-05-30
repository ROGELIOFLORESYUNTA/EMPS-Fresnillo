# 51 - Parametros y fuentes fiscales/materiales 2026

Todos los parametros deben cargarse en la tabla `Parameter` con `source`, `sourceUrl`, `effectiveFrom` y `notes`.

## Parametros base

| Clave | Valor sugerido | Fuente | Comentario |
|---|---:|---|---|
| IVA_GENERAL | 0.16 | LIVA Art. 1 | Tasa general. |
| ISR_PERSONA_MORAL | 0.30 | LISR Art. 9 | Tasa sobre resultado fiscal. |
| DEPRECIACION_COMPUTO_ANUAL | 0.30 | LISR Art. 34 fr. VII | Computadoras, servidores, impresoras y redes. |
| DEPRECIACION_MOBILIARIO_OFICINA_ANUAL | 0.10 | LISR Art. 34 fr. III | Mobiliario y equipo de oficina. |
| ISN_ZACATECAS | 0.035 | SEFIN Zacatecas | A partir de 2025 es 3.5%. |
| UAZ_SOBRETASA_SOBRE_ISN | 0.10 | SEFIN Zacatecas | Adicional 10% impuesto UAZ. |
| LFT_JORNADA_SEMANAL_2026 | 48 | LFT Art. 59 transitorio 2026 | Se mantiene como parametro por gradualidad. |
| LFT_JORNADA_SEMANAL_OBJETIVO_2030 | 40 | LFT transitorios | Escenario futuro gradual. |
| LFT_VACACIONES_MIN_DIAS | 12 | LFT Art. 76 | Minimo despues de un año. |
| LFT_PRIMA_VACACIONAL_MIN | 0.25 | LFT Art. 80 | Prima minima. |
| LFT_AGUINALDO_DIAS_MIN | 15 | LFT Art. 87 | Aguinaldo minimo. |

## Reglas de IVA

- IVA trasladado: impuesto que se cobra al cliente.
- IVA acreditable estimado: impuesto pagado en compras/gastos que cumplan requisitos.
- IVA retenido: aplica en supuestos especificos, por ejemplo cuando persona moral recibe servicios personales independientes de persona fisica. Parametrizar; no aplicar automaticamente sin validar regimen.

## Reglas de recursos

- Compra con CFDI: puede generar IVA acreditable estimado y soporte documental.
- Compra sin CFDI: no generar IVA acreditable; mostrar alerta.
- Activo fijo: calcular depreciacion sugerida y no tratar todo como gasto mensual sin advertencia.
- Suscripcion/renta: distribuir por meses de uso.

## Fuentes oficiales

- LIVA: https://www.diputados.gob.mx/LeyesBiblio/pdf/LIVA.pdf
- LISR: https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf
- LFT: https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf
- LSS: https://www.diputados.gob.mx/LeyesBiblio/pdf/LSS.pdf
- ISN Zacatecas: https://sefin.zacatecas.gob.mx/wp-content/uploads/2025/01/IMPUESTO-SOBRE-NOMINAS.pdf
- UMA 2026: DOF 09-01-2026, URL en seed actual.
- Salario minimo 2026: DOF 09-12-2025, URL en seed actual.
