import Link from "next/link";
import { mesesEnTexto, pesos } from "@/lib/graficas";

/**
 * Cómo funciona, cara del desarrollador: tres pasos con la captura real de
 * cada pantalla (tomadas del ejemplo, en public/como-funciona), botón arriba y
 * abajo y acceso al ejemplo. El problema que resuelve va en una frase con una
 * cifra del propio ejemplo. El recorrido largo y los términos quedan plegados.
 */

const PASOS = [
  {
    titulo: "Describes lo que te piden",
    detalle: "Tocas las partes del sistema y, si quieres, lo cuentas en una línea. Sin registro.",
    imagen: "/como-funciona/paso-1.png",
    ancho: 1440,
    alto: 1000,
    alt: "Pantalla de Cotizar, paso 1 de 3: pastillas con las partes del sistema, tres elegidas, y una línea para contarlo con tus palabras.",
    href: "/cotizar",
    enlace: "Probar el paso 1",
  },
  {
    titulo: "Comparas cinco formas de hacerlo",
    detalle: "A mano, con IA, híbrido, casi todo con IA o plataforma de armado: cada una con su precio y sus meses.",
    imagen: "/como-funciona/paso-2.png",
    ancho: 2208,
    alto: 1312,
    alt: "Gráfica con las cinco formas de hacerlo: una barra por forma, del precio más optimista al más conservador, con el monto y los meses a la derecha.",
    href: null,
    enlace: "Ver la comparación en el ejemplo",
  },
  {
    titulo: "Llevas la cotización",
    detalle: "El reporte con el total, el IVA, la utilidad y el dinero que adelantas, para imprimir o guardar en PDF.",
    imagen: "/como-funciona/paso-3.png",
    ancho: 2048,
    alto: 1258,
    alt: "Resumen financiero del reporte para llevar: costo del proyecto, utilidad, IVA, total facturable y capital de trabajo.",
    href: null,
    enlace: "Ver el reporte del ejemplo",
  },
] as const;

const FLUJO_COMPLETO = [
  { titulo: "Crear el proyecto", detalle: "Nombre, para qué sirve y para quién es. Lo demás es opcional." },
  { titulo: "Capturar las partes", detalle: "Cada parte lleva qué tan difícil es, qué tan claro está, qué tan delicado es y si maneja datos personales." },
  { titulo: "Definir quién lo hace", detalle: "Tú solo, con lo que vale tu tiempo, o personas contratadas con su sueldo y su disponibilidad." },
  { titulo: "Configurar el cálculo", detalle: "Tu utilidad, las horas a la semana y cómo cobras: anticipo, pagos parciales y pago final." },
  { titulo: "Calcular", detalle: "Cinco formas de hacerlo por tres escenarios: quince cifras al mismo tiempo, con riesgo y dinero que adelantas." },
  { titulo: "Llevar el reporte", detalle: "Se imprime o se guarda en PDF con un clic." },
];

const TERMINOS = [
  { termino: "Dinero que adelantas", def: "Lo que pones de tu bolsa en el peor mes, antes de que el cliente te alcance con sus pagos." },
  { termino: "Escenarios", def: "Optimista es si todo sale bien, probable es lo más seguro y conservador es si hay tropiezos." },
  { termino: "Casi todo con IA", def: "Las herramientas de IA arman casi todo el código y tú das instrucciones, revisas y refuerzas. Llega antes a una primera versión, pero pide más revisión." },
  { termino: "Pericia con la IA", def: "Qué tanto la usas para programar, de 1 (nunca) a 5. Con menos práctica, el ahorro que da la IA cuenta solo en parte." },
  { termino: "UMA", def: "Unidad de Medida y Actualización: la base de varias cuotas del IMSS. Es distinta del salario mínimo." },
];

function Botones({ ejemplo }: { ejemplo: { id: string; name: string } | null }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      <Link
        href="/cotizar"
        className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-marino px-7 text-base font-semibold text-white transition-colors hover:bg-marino/90 sm:w-auto"
      >
        Cotizar en un minuto
      </Link>
      {ejemplo && (
        <Link href={`/projects/${ejemplo.id}`} className="inline-flex min-h-12 items-center text-base font-semibold text-accion underline underline-offset-4">
          Ver el ejemplo ya calculado
        </Link>
      )}
    </div>
  );
}

export function ComoFuncionaDesarrollador({
  ejemplo,
  contraste,
}: {
  ejemplo: { id: string; name: string } | null;
  /** Lo que cuesta el mismo sistema del ejemplo a mano y casi todo con IA, para la cifra del problema. */
  contraste: { aMano: number; conIA: number; meses: number | null } | null;
}) {
  const veces = contraste && contraste.conIA > 0 ? contraste.aMano / contraste.conIA : null;
  return (
    <div className="space-y-14">
      <header>
        <h1 className="text-titulo text-tinta">Cómo funciona</h1>
        <p className="mt-2 max-w-2xl text-base text-tinta-suave">Tres pasos y tienes precio, tiempo y qué cobrar.</p>
        <div className="mt-5">
          <Botones ejemplo={ejemplo} />
        </div>
      </header>

      <ol className="grid gap-10 lg:grid-cols-3 lg:gap-8">
        {PASOS.map((paso, i) => {
          const destino = paso.href ?? (ejemplo ? `/projects/${ejemplo.id}${i === 2 ? "/reports/provider" : ""}` : null);
          return (
            <li key={paso.titulo} className="flex flex-col">
              <p className="text-seccion text-marino">{i + 1}</p>
              <h2 className="mt-1 text-seccion text-tinta">{paso.titulo}</h2>
              <p className="mt-1 text-base text-tinta-suave">{paso.detalle}</p>
              <figure className="mt-4">
                {/* Captura real de la pantalla, tomada del ejemplo */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={paso.imagen}
                  width={paso.ancho}
                  height={paso.alto}
                  alt={paso.alt}
                  loading="lazy"
                  className="h-auto w-full rounded-lg border bg-lienzo"
                />
              </figure>
              {destino && (
                <div className="mt-auto pt-3">
                  <Link href={destino} className="inline-flex min-h-11 items-center text-base font-semibold text-accion underline underline-offset-4">
                    {paso.enlace}
                  </Link>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <section aria-labelledby="problema" className="border-t pt-8">
        <h2 id="problema" className="text-seccion text-tinta">
          El problema que resuelve
        </h2>
        <p className="mt-2 max-w-3xl text-base text-tinta">
          Muchos proyectos se cotizan baratos y se quedan sin dinero a la mitad, porque nadie contó la nómina, los impuestos ni los meses sin cobrar.
        </p>
        {contraste && veces != null && (
          <div className="mt-5">
            <p className="text-cifra-movil text-marino sm:text-cifra">{veces.toFixed(1)} veces</p>
            <p className="mt-2 max-w-2xl text-base text-tinta-suave">
              Es lo que cambia el precio del ejemplo según cómo se haga: {pesos(contraste.aMano)} a mano contra {pesos(contraste.conIA)} casi todo con IA
              {contraste.meses != null ? `, en ${mesesEnTexto(contraste.meses)}` : ""}.
            </p>
          </div>
        )}
      </section>

      <Botones ejemplo={ejemplo} />

      <details className="rounded-xl border bg-lienzo">
        <summary className="cursor-pointer px-5 py-4 text-base font-semibold text-tinta">Para capturar un proyecto completo</summary>
        <div className="space-y-8 px-5 pb-6">
          <ol className="space-y-3">
            {FLUJO_COMPLETO.map((p, i) => (
              <li key={p.titulo} className="flex gap-4">
                <span className="w-5 shrink-0 text-base font-semibold text-marino">{i + 1}</span>
                <p className="text-base text-tinta">
                  <strong className="font-semibold">{p.titulo}.</strong> <span className="text-tinta-suave">{p.detalle}</span>
                </p>
              </li>
            ))}
          </ol>
          <div>
            <h2 className="text-seccion text-tinta">Palabras que salen</h2>
            <dl className="mt-3 space-y-3">
              {TERMINOS.map((t) => (
                <div key={t.termino}>
                  <dt className="text-base font-semibold text-tinta">{t.termino}</dt>
                  <dd className="text-base text-tinta-suave">{t.def}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-base text-tinta-suave">
              Todas las palabras están en el{" "}
              <Link href="/glossary" className="font-semibold text-accion underline underline-offset-4">
                glosario
              </Link>
              .
            </p>
          </div>
          <Link
            href="/projects/new"
            className="inline-flex h-12 items-center justify-center rounded-lg border border-marino px-7 text-base font-semibold text-marino transition-colors hover:bg-papel"
          >
            Crear un proyecto completo
          </Link>
        </div>
      </details>
    </div>
  );
}
