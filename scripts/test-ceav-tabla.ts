import { loadFiscalRates } from "../lib/parameters";
import { ceavPatronRate } from "../lib/engine/cost";

(async () => {
  const rates = await loadFiscalRates(2026);
  const UMA = 117.31;

  console.log("=== Tabla CEAV cargada desde DB ===");
  console.log(JSON.stringify(rates.CEAV_PATRON_TABLE, null, 2));
  console.log();

  const perfiles = [
    { nombre: "Salario mínimo (~1 UMA)", sbc: 117.31, esperado: "3.15% (hasta 1 UMA)" },
    { nombre: "Dev mid (3 UMA)", sbc: 351.93, esperado: "6.026% (rango 2.51 a 3.00 UMA)" },
    { nombre: "Dev senior (5 UMA)", sbc: 586.55, esperado: "7.513% (rango 4.01+ UMA)" },
  ];

  for (const p of perfiles) {
    const uma = p.sbc / UMA;
    const tasa = ceavPatronRate(uma, rates.CEAV_PATRON_TABLE);
    console.log(`Perfil: ${p.nombre}`);
    console.log(`  SBC diario: $${p.sbc}   SBC en UMAs: ${uma.toFixed(2)}`);
    console.log(`  Tasa CEAV patronal: ${(tasa * 100).toFixed(3)}%`);
    console.log(`  Esperado: ${p.esperado}`);
    console.log();
  }
})();
