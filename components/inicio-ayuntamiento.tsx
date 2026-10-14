import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, FolderOpen, Plus, BookOpen, FileText, AlertCircle, User2, Eye, ShieldCheck, BookOpenCheck, Zap } from "lucide-react";
import { ProyectosRecientes } from "@/components/proyectos-recientes";
import { peekWorkspace } from "@/lib/workspace";
import { getLado } from "@/lib/lado-server";
import { filtroDeLado } from "@/lib/acceso-proyecto";

/**
 * Inicio de la cara del Ayuntamiento (ayuntamientos.hazlatarea.com). Es el
 * inicio de siempre, tal cual; el del desarrollador está en
 * components/inicio-desarrollador.tsx y app/page.tsx elige según el lado.
 */
export async function InicioAyuntamiento() {
  // Lectura: no crear workspace solo por abrir el inicio. Un visitante nuevo
  // (sin fila todavía) llega como `null` y se trata como anónimo.
  const workspace = await peekWorkspace();
  const lado = await getLado();
  // Un visitante nuevo arranca EN CERO: solo ve los proyectos que él mismo creó.
  // No se muestran plantillas ni proyectos sin dueño, para que el sistema no
  // aparente tener trabajo previo que no es suyo. Y solo los de su lado.
  const projectScope = { workspaceId: workspace?.id ?? "__sin_workspace__", ...filtroDeLado(lado) };
  const [projects, totalProjects, paramsCount, pendingChanges] = await Promise.all([
    prisma.project.findMany({
      where: projectScope,
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
    prisma.project.count({ where: projectScope }),
    prisma.parameter.count(),
    prisma.changeRequest.count({ where: { decision: "pendiente", project: projectScope } }),
  ]);

  // Proyecto de ejemplo que cualquiera puede abrir sin capturar nada (el de su lado).
  const ejemplo = await prisma.project.findFirst({
    where: { isTemplate: true, ...filtroDeLado(lado) },
    select: { id: true, name: true },
  });

  // `workspace` es null para un visitante nuevo (aún sin fila): también es anónimo.
  const isAnonymous = !workspace || !workspace.displayName;
  const isFirstVisit = isAnonymous && totalProjects === 0;

  return (
    <div className="space-y-8">
      {isAnonymous && !isFirstVisit && (
        <section>
          <Link
            href="/mi-cuenta"
            className="block bg-amber-50 border border-amber-200 rounded-md px-4 py-3 hover:bg-amber-100 transition-colors group"
          >
            <p className="text-sm flex items-center gap-2 text-amber-950">
              <User2 className="w-4 h-4 shrink-0" />
              <span>
                <strong>Estás navegando como anónimo.</strong> Pon tu nombre para que el sistema te identifique
                <span className="text-amber-700 group-hover:underline ml-1 inline-flex items-center gap-1">Mi cuenta <ArrowRight className="w-3 h-3" /></span>
              </span>
            </p>
          </Link>
        </section>
      )}

      {/* Qué es esto y para quién */}
      <section>
        <h1 className="text-3xl font-bold mb-1">EMPS Fresnillo</h1>
        <p className="text-muted-foreground mb-3">
          Estimador Municipal de Proyectos de Software
        </p>
        <p className="text-base text-foreground mb-2 max-w-3xl leading-relaxed">
          Calcula lo que <strong>realmente</strong> cuesta un sistema de software antes de firmar el contrato:
          además de las horas de programación, suma los impuestos y la nómina, los cambios que el cliente pide
          a medio camino, el dinero que el proveedor tiene que adelantar y el mantenimiento posterior.
        </p>
        <p className="text-sm text-muted-foreground mb-6 max-w-3xl">
          Está hecho para dos lados de la misma mesa: el área del Ayuntamiento que va a presupuestar y el
          proveedor que va a cotizar.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionCard
            href="/cotizar"
            icon={<Zap className="w-6 h-6" />}
            title="Cotizar en un minuto"
            description="Di qué sistema quieres y qué partes debe tener; te dice cuánto cuesta, cuánto tarda y con qué forma de hacerlo."
            primary
          />
          <ActionCard
            href="/projects/new"
            icon={<Plus className="w-6 h-6" />}
            title="Crear proyecto completo"
            description="Capturar módulos, equipo y condiciones con detalle, paso por paso."
          />
          {ejemplo ? (
            <ActionCard
              href={`/projects/${ejemplo.id}`}
              icon={<Eye className="w-6 h-6" />}
              title="Ver un ejemplo"
              description="Un proyecto municipal ya capturado, con sus cifras y reportes. Para ver cómo funciona sin llenar nada."
            />
          ) : (
            <ActionCard
              href="/como-funciona"
              icon={<BookOpen className="w-6 h-6" />}
              title="Cómo funciona"
              description="El recorrido completo en 6 pasos, con ejemplos."
            />
          )}
          <ActionCard
            href="/projects"
            icon={<FolderOpen className="w-6 h-6" />}
            title="Mis proyectos"
            description={totalProjects > 0 ? `Ver y editar los ${totalProjects} proyectos registrados` : "Aquí aparecerán los proyectos que tú captures"}
            badge={totalProjects > 0 ? String(totalProjects) : undefined}
          />
        </div>
      </section>

      {/* De dónde salen los números: la evidencia, no escondida en configuración */}
      <section>
        <Link
          href="/fuentes"
          className="block rounded-lg border border-primary/30 bg-primary/[0.03] px-5 py-4 hover:bg-primary/[0.06] transition-colors group"
        >
          <p className="font-semibold flex items-center gap-2 text-foreground">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
            Las cifras no son inventadas
          </p>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            El cálculo usa {paramsCount} valores oficiales vigentes: cuotas del IMSS e INFONAVIT, impuesto sobre
            nóminas de Zacatecas, IVA, ISR y prestaciones de ley. Cada uno con su fundamento legal y su fuente.
            <span className="text-primary group-hover:underline ml-1">Ver de dónde sale cada número</span>
          </p>
        </Link>
      </section>

      {/* Alertas si hay pendientes */}
      {pendingChanges > 0 && (
        <section className="border-l-4 border-orange-400 bg-orange-50/50 rounded-md p-4">
          <h2 className="font-semibold flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            Pendientes de atención
          </h2>
          <div className="text-sm space-y-1">
            <p>· <strong>{pendingChanges}</strong> cambios de proyectos sin decisión.
              <Link href="/projects" className="text-primary hover:underline ml-1">Revisar</Link>
            </p>
          </div>
        </section>
      )}

      {/* Proyectos recientes */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Proyectos recientes</h2>
          {totalProjects > 6 && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/projects">Ver todos <ArrowRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          )}
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="py-6">
              <p className="font-medium mb-1">Todavía no has capturado ningún proyecto.</p>
              <p className="text-sm text-muted-foreground mb-4 max-w-2xl">
                Toma unos 10 minutos: describes el sistema que quieres, en qué se divide, quién lo va a
                desarrollar, y el sistema te da el costo, el tiempo, el riesgo y los reportes para imprimir.
              </p>
              <div className="grid sm:grid-cols-3 gap-3 mb-5 text-sm">
                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="font-medium mb-0.5">1. Describe el proyecto</p>
                  <p className="text-muted-foreground text-xs">Qué sistema es, para qué área y qué problema resuelve.</p>
                </div>
                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="font-medium mb-0.5">2. Divídelo en partes</p>
                  <p className="text-muted-foreground text-xs">Los módulos y quién los va a desarrollar.</p>
                </div>
                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="font-medium mb-0.5">3. Recibe las cifras</p>
                  <p className="text-muted-foreground text-xs">Costo, tiempo, riesgo, flujo de efectivo y reportes.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild><Link href="/projects/new">Crear mi primer proyecto</Link></Button>
                {ejemplo && (
                  <Button variant="outline" asChild>
                    <Link href={`/projects/${ejemplo.id}`}>Antes, ver un ejemplo ya hecho</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <ProyectosRecientes projects={projects} />
        )}
      </section>

      {/* Cómo funciona la cuenta: al final, ya que sabe qué es el sitio */}
      {isFirstVisit && (
        <section>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="font-medium mb-1">No necesitas registrarte</p>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
              No se pide correo ni contraseña para entrar. El sitio te reconoce con un identificador que queda
              guardado en tu navegador, y lo que captures aquí es solo tuyo: los demás visitantes no lo ven.
              Si vas a usar el sistema desde varias computadoras, en{" "}
              <Link href="/mi-cuenta" className="underline font-medium hover:text-foreground">Mi cuenta</Link>{" "}
              puedes poner tu nombre y guardar tu llave de acceso.
            </p>
          </div>
        </section>
      )}

      {/* Ayuda */}
      <section>
        <h2 className="text-xl font-semibold mb-1">Ayuda</h2>
        <p className="text-sm text-muted-foreground mb-4">Documentación de uso del sistema.</p>
        <div className="grid md:grid-cols-2 gap-3">
          <SecondaryCard
            href="/como-funciona"
            icon={<BookOpen className="w-5 h-5" />}
            title="Tutorial"
            description="Cómo funciona el sistema en 6 pasos"
          />
          <SecondaryCard
            href="/glossary"
            icon={<FileText className="w-5 h-5" />}
            title="Glosario"
            description="Los términos del sistema explicados en lenguaje llano"
          />
          <SecondaryCard
            href="/fuentes"
            icon={<ShieldCheck className="w-5 h-5" />}
            title="De dónde salen los números"
            description="Los valores oficiales que usa el cálculo, con su fundamento legal"
          />
          <SecondaryCard
            href="/metodologia"
            icon={<BookOpenCheck className="w-5 h-5" />}
            title="Metodología"
            description="Cómo se calcula y con qué criterios se valida"
          />
        </div>
      </section>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  description,
  primary,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  primary?: boolean;
  badge?: string;
}) {
  return (
    <Link href={href}>
      <Card
        className={`h-full transition-all cursor-pointer ${
          primary
            ? "bg-primary text-primary-foreground hover:bg-primary/90 border-primary"
            : "hover:bg-accent/40 hover:border-primary/30"
        }`}
      >
        <CardContent className="py-6">
          <div className="flex items-start justify-between mb-3">
            <div className={primary ? "text-primary-foreground" : "text-primary"}>{icon}</div>
            {badge && (
              <Badge variant={primary ? "secondary" : "outline"} className="text-xs">
                {badge}
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-lg mb-1">{title}</h3>
          <p className={`text-sm ${primary ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
            {description}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function SecondaryCard({ href, icon, title, description, badge }: { href: string; icon: React.ReactNode; title: string; description: string; badge?: string }) {
  return (
    <Link href={href}>
      <Card className="h-full hover:bg-accent/40 hover:border-primary/30 transition-all cursor-pointer">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-primary">{icon}</div>
            {badge && <Badge variant="outline" className="text-xs">{badge}</Badge>}
          </div>
          <h3 className="font-medium text-sm mb-1">{title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
