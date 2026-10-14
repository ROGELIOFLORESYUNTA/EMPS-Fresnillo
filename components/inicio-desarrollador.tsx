import Link from "next/link";
import { prisma } from "@/lib/db";
import { peekWorkspace } from "@/lib/workspace";
import { filtroDeLado } from "@/lib/acceso-proyecto";
import { ProyectosRecientes } from "@/components/proyectos-recientes";

const SEMANAS_POR_MES = 4.33;

const PASOS = [
  { titulo: "Describes lo que te piden", detalle: "Una frase y las partes del sistema." },
  { titulo: "Comparas cinco formas de hacerlo", detalle: "Cada una con su precio y sus meses." },
  { titulo: "Llevas la cotización a tu cliente", detalle: "Por enlace o en PDF." },
] as const;

const QUE_SI_COBRAS = [
  { titulo: "El tiempo que no puedes facturar", detalle: "Juntas, propuestas y esperas." },
  { titulo: "Las cargas de nómina, si contratas", detalle: "IMSS, vivienda e impuesto sobre nómina." },
  { titulo: "Las herramientas de IA, por persona", detalle: "Una suscripción por cada quien que programa." },
  { titulo: "Los cambios a medio camino", detalle: "Lo que piden después de firmar." },
  { titulo: "El mantenimiento", detalle: "Correcciones y soporte después de entregar." },
  { titulo: "Los meses en que financias al cliente", detalle: "El dinero que adelantas antes de cobrar." },
] as const;

const pesosSinCentavos = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

/**
 * Inicio de la cara del desarrollador (estimacion.hazlatarea.com).
 *
 * Primera pantalla: una pregunta, un botón y la cifra de un ejemplo real
 * (el proyecto de ejemplo del desarrollador, con su estimación híbrida
 * probable). Debajo, tres pasos, lo que sí se cobra y, si ya hay, los
 * proyectos del visitante. Menos de 110 palabras a la vista.
 */
export async function InicioDesarrollador() {
  // Lectura: no crear workspace solo por abrir el inicio.
  const workspace = await peekWorkspace();
  const alcance = { workspaceId: workspace?.id ?? "__sin_workspace__", ...filtroDeLado("desarrollador") };

  const [projects, totalProjects, plantilla] = await Promise.all([
    prisma.project.findMany({
      where: alcance,
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: {
        _count: { select: { modules: true, estimates: true, changes: true } },
        estimates: {
          where: { scenario: "probable", mode: "hybrid" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.project.count({ where: alcance }),
    // El ejemplo del desarrollador: lo abre cualquiera sin capturar nada.
    prisma.project.findFirst({
      where: { isTemplate: true, ...filtroDeLado("desarrollador") },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    }),
  ]);

  const estimacion = plantilla
    ? await prisma.estimate.findFirst({
        where: { projectId: plantilla.id, mode: "hybrid", scenario: "probable" },
        orderBy: { version: "desc" },
        select: { total: true, weeksTotal: true },
      })
    : null;

  const total = estimacion ? Number(estimacion.total) : null;
  const meses = estimacion?.weeksTotal != null ? Number(estimacion.weeksTotal) / SEMANAS_POR_MES : null;

  return (
    <div className="space-y-14 sm:space-y-16">
      {/* Primera pantalla: ocupa lo que se ve sin bajar (en pantallas anchas),
          para que a la vista queden solo la pregunta, el botón y la cifra. */}
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_30rem] lg:gap-14 lg:items-center sm:min-h-[calc(100svh-9rem)] sm:content-center">
        <div>
          <h1 className="text-titulo text-tinta">¿Cuánto cobrar por este sistema?</h1>
          <p className="mt-4 max-w-xl text-base text-tinta-suave">
            Describe lo que te piden y en un minuto tienes precio, tiempo y qué incluir en la cotización, con las
            cargas y los cambios que casi nadie cobra.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-1">
            <Link
              href="/cotizar"
              className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-marino px-7 text-base font-semibold text-white transition-colors hover:bg-marino/90 sm:w-auto"
            >
              Cotizar en un minuto
            </Link>
            {plantilla && (
              <Link
                href={`/projects/${plantilla.id}`}
                className="inline-flex min-h-12 items-center text-base font-semibold text-accion underline-offset-4 hover:underline"
              >
                Ver el ejemplo: sistema para una clínica dental
              </Link>
            )}
          </div>
        </div>

        <aside aria-label="Resultado del ejemplo" className="rounded-2xl border bg-lienzo p-6 sm:p-7">
          {total != null ? (
            <>
              <p className="text-sm font-semibold text-tinta">Ejemplo</p>
              <p className="mt-0.5 text-sm text-tinta-suave">{plantilla?.name}</p>
              <p className="mt-6 text-sm font-semibold text-tinta-suave">Total con IVA</p>
              <p className="mt-1 text-cifra-movil text-marino sm:text-cifra">{pesosSinCentavos.format(total)}</p>
              <dl className="mt-6 space-y-2 text-base">
                {meses != null && (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-tinta-suave">Tiempo</dt>
                    <dd className="font-semibold text-tinta">{meses.toFixed(1)} meses</dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-tinta-suave">Forma de hacerlo</dt>
                  <dd className="font-semibold text-tinta">Híbrido</dd>
                </div>
              </dl>
              <p className="mt-6 text-balance text-sm text-tinta-suave">Compuesto por: equipo, herramientas de IA, utilidad e IVA</p>
            </>
          ) : (
            <p className="text-base text-tinta-suave">Ejemplo en preparación</p>
          )}
        </aside>
      </section>

      {/* Tres pasos */}
      <section aria-labelledby="pasos">
        <h2 id="pasos" className="text-seccion text-tinta">En tres pasos</h2>
        <ol className="mt-5 grid gap-6 sm:grid-cols-3">
          {PASOS.map((paso, i) => (
            <li key={paso.titulo} className="flex gap-4">
              <span className="w-5 shrink-0 text-seccion text-marino">{i + 1}</span>
              <div>
                <p className="font-semibold text-tinta">{paso.titulo}</p>
                <p className="text-tinta-suave">{paso.detalle}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Lo que sí se cobra */}
      <section aria-labelledby="que-si-cobras">
        <h2 id="que-si-cobras" className="text-seccion text-tinta">Qué sí cobras</h2>
        <ul className="mt-5 grid gap-x-12 gap-y-5 sm:grid-cols-2">
          {QUE_SI_COBRAS.map((item) => (
            <li key={item.titulo}>
              <p className="font-semibold text-tinta">{item.titulo}</p>
              <p className="text-tinta-suave">{item.detalle}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* La encuesta del piloto, dicha de frente */}
      <p className="text-base text-tinta-suave">
        Si quieres, al final te preguntamos cuatro cosas para la investigación. Es anónimo.
      </p>

      {/* Los proyectos de quien ya cotizó */}
      {projects.length > 0 && (
        <section aria-labelledby="tus-proyectos">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 id="tus-proyectos" className="text-seccion text-tinta">Tus proyectos</h2>
            {totalProjects > 6 && (
              <Link href="/projects" className="font-semibold text-accion underline-offset-4 hover:underline">
                Ver todos
              </Link>
            )}
          </div>
          <ProyectosRecientes projects={projects} />
        </section>
      )}
    </div>
  );
}
