/**
 * Etapa 3: los agregados.
 *
 * Todo lo que sale de aqui se acompaña de su advertencia: son testimonios sin
 * verificar y con sesgo de autoseleccion. Sirven para saber QUE sale mal, no
 * CUANTO. Por eso se reportan medianas y conteos, nunca promedios presentados
 * como si fueran representativos.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";
import {
  CAUSAS,
  CAUSA_ETIQUETA,
  CAUSA_FACTOR_DEL_MOTOR,
  QUIEN_HABLA,
  QUIEN_HABLA_ETIQUETA,
  DESVIACION,
  DESVIACION_ETIQUETA,
  type Causa,
} from "@/lib/observatorio/taxonomia";

export const ADVERTENCIA =
  "Testimonios públicos sin verificar. Quien comenta suele ser quien tuvo una experiencia extrema, casi siempre mala, y no hay forma de comprobar lo que dice. Sirven para saber qué sale mal, no para medir cuánto.";

function mediana(valores: number[]): number | null {
  if (valores.length === 0) return null;
  const v = [...valores].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const [total, sinAnalizar, fallidos, revisados] = await Promise.all([
    prisma.observatorioComentario.count(),
    prisma.observatorioComentario.count({ where: { analizadoEl: null, errorAnalisis: null } }),
    prisma.observatorioComentario.count({ where: { errorAnalisis: { not: null } } }),
    prisma.observatorioComentario.count({ where: { revisadoPorHumano: true } }),
  ]);

  const testimonios = await prisma.observatorioComentario.findMany({
    where: { esTestimonio: true },
    select: {
      quienHabla: true,
      desviacion: true,
      confianza: true,
      causasJson: true,
      duracionDeclaradaMeses: true,
      montoDeclarado: true,
      moneda: true,
      tamanoEquipo: true,
      coincideConHumano: true,
      revisadoPorHumano: true,
    },
  });

  // Frecuencia por causa, con el factor del motor al que toca cada una.
  const cuentaCausa = new Map<Causa, number>(CAUSAS.map((c) => [c, 0]));
  for (const t of testimonios) {
    let causas: string[] = [];
    try {
      causas = JSON.parse(t.causasJson ?? "[]");
    } catch {
      causas = [];
    }
    for (const c of causas) {
      if (cuentaCausa.has(c as Causa)) cuentaCausa.set(c as Causa, cuentaCausa.get(c as Causa)! + 1);
    }
  }

  const porCausa = CAUSAS.map((c) => ({
    causa: c,
    etiqueta: CAUSA_ETIQUETA[c],
    factorDelMotor: CAUSA_FACTOR_DEL_MOTOR[c],
    cuantos: cuentaCausa.get(c) ?? 0,
  }))
    .filter((x) => x.cuantos > 0)
    .sort((a, b) => b.cuantos - a.cuantos);

  const porQuienHabla = QUIEN_HABLA.map((q) => ({
    quienHabla: q,
    etiqueta: QUIEN_HABLA_ETIQUETA[q],
    cuantos: testimonios.filter((t) => t.quienHabla === q).length,
  })).filter((x) => x.cuantos > 0);

  const porDesviacion = DESVIACION.map((d) => ({
    desviacion: d,
    etiqueta: DESVIACION_ETIQUETA[d],
    cuantos: testimonios.filter((t) => t.desviacion === d).length,
  })).filter((x) => x.cuantos > 0);

  const duraciones = testimonios
    .map((t) => (t.duracionDeclaradaMeses ? Number(t.duracionDeclaradaMeses) : null))
    .filter((v): v is number => v !== null);
  const equipos = testimonios
    .map((t) => t.tamanoEquipo)
    .filter((v): v is number => typeof v === "number");

  // Acuerdo entre el modelo y la persona, solo sobre lo ya revisado a mano.
  const conJuicio = testimonios.filter((t) => t.revisadoPorHumano && t.coincideConHumano !== null);
  const acuerdo =
    conJuicio.length > 0
      ? conJuicio.filter((t) => t.coincideConHumano).length / conJuicio.length
      : null;

  return NextResponse.json({
    advertencia: ADVERTENCIA,
    conteos: {
      comentarios: total,
      sinAnalizar,
      fallidos,
      testimonios: testimonios.length,
      descartados: total - sinAnalizar - fallidos - testimonios.length,
      revisadosPorHumano: revisados,
    },
    porCausa,
    porQuienHabla,
    porDesviacion,
    duracionMeses: {
      cuantosLaDicen: duraciones.length,
      mediana: mediana(duraciones),
      minimo: duraciones.length ? Math.min(...duraciones) : null,
      maximo: duraciones.length ? Math.max(...duraciones) : null,
    },
    tamanoEquipo: {
      cuantosLoDicen: equipos.length,
      mediana: mediana(equipos),
    },
    validacionDelAnotador: {
      revisados: conJuicio.length,
      acuerdo: acuerdo === null ? null : Number((acuerdo * 100).toFixed(1)),
      nota:
        conJuicio.length < 50
          ? `Faltan ${50 - conJuicio.length} comentarios revisados a mano para poder reportar el acuerdo en la tesis.`
          : "Muestra suficiente para reportar el acuerdo entre el modelo y la revisión humana.",
    },
  });
}
