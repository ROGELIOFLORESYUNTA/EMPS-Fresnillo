import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, FolderOpen, Plus, Settings, BookOpen, FileText, AlertCircle, User2 } from "lucide-react";
import { formatMXN } from "@/lib/utils";
import { getCurrentWorkspace } from "@/lib/workspace";

export default async function HomePage() {
  const workspace = await getCurrentWorkspace();
  const [projects, totalProjects, paramsCount, pendingChanges] = await Promise.all([
    prisma.project.findMany({
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
    prisma.project.count(),
    prisma.parameter.count(),
    prisma.changeRequest.count({ where: { decision: "pendiente" } }),
  ]);

  const isFirstVisit = workspace && !workspace.displayName && totalProjects === 0;

  return (
    <div className="space-y-8">
      {isFirstVisit && (
        <section>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-5">
            <p className="text-base font-semibold text-blue-950 mb-2">👋 Bienvenido al sistema</p>
            <p className="text-sm text-blue-900 leading-relaxed">
              <strong>No necesitas registrarte, ni dar tu correo, ni crear contraseña.</strong> El sitio te recuerda automáticamente con una galletita (cookie) en tu navegador. Lo que crees aquí (proyectos, parámetros editados) es <strong>solo tuyo</strong> — los demás visitantes tienen sus propios datos separados.
            </p>
            <p className="text-sm text-blue-900 mt-2 leading-relaxed">
              Si quieres que el sistema sepa tu nombre (en lugar de "anónimo"){" "}
              <Link href="/mi-cuenta" className="underline font-semibold hover:text-blue-700">identifícate aquí</Link>.
              Si vas a usar este sitio desde varias computadoras, guarda tu <strong>llave de respaldo</strong> ahí también.
            </p>
          </div>
        </section>
      )}
      {workspace && !workspace.displayName && !isFirstVisit && (
        <section>
          <Link
            href="/mi-cuenta"
            className="block bg-amber-50 border border-amber-200 rounded-md px-4 py-3 hover:bg-amber-100 transition-colors group"
          >
            <p className="text-sm flex items-center gap-2 text-amber-950">
              <User2 className="w-4 h-4 shrink-0" />
              <span>
                <strong>Estás navegando como anónimo.</strong> Pon tu nombre para que el sistema te identifique
                <span className="text-amber-700 group-hover:underline ml-1">→ Mi cuenta</span>
              </span>
            </p>
          </Link>
        </section>
      )}

      {/* Acciones principales — bien visibles, una sola fila */}
      <section>
        <h1 className="text-3xl font-bold mb-2">EMPS Fresnillo</h1>
        <p className="text-muted-foreground mb-6">Estimador municipal de proyectos de software</p>

        <div className="grid md:grid-cols-3 gap-4">
          <ActionCard
            href="/projects/new"
            icon={<Plus className="w-6 h-6" />}
            title="Crear proyecto"
            description="Empezar un proyecto nuevo desde cero"
            primary
          />
          <ActionCard
            href="/projects"
            icon={<FolderOpen className="w-6 h-6" />}
            title="Mis proyectos"
            description={`Ver y editar los ${totalProjects} proyectos registrados`}
            badge={totalProjects > 0 ? String(totalProjects) : undefined}
          />
          <ActionCard
            href="/admin/parametros"
            icon={<Settings className="w-6 h-6" />}
            title="Editar parámetros"
            description="UMA, IVA, ISR, IMSS, ISN. Modificar para 2027 u otros cambios"
            badge={`${paramsCount}`}
          />
        </div>
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
            <CardContent className="py-10 text-center text-muted-foreground">
              <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="mb-3">No hay proyectos todavía.</p>
              <Button asChild><Link href="/projects/new">Crear el primer proyecto</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {projects.map((p) => {
              const e = p.estimates[0];
              return (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <Card className="h-full hover:bg-accent/40 hover:border-primary/30 transition-all cursor-pointer">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-medium line-clamp-1">{p.name}</h3>
                        <Badge variant="outline" className="shrink-0 text-xs">{p.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-3">{p.client} · {p.municipalArea}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {p._count.modules} mód · {p._count.estimates} est
                        </span>
                        {e ? (
                          <span className="font-semibold text-primary">{formatMXN(Number(e.total))}</span>
                        ) : (
                          <Badge variant="outline" className="text-xs">sin estimar</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

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
            description="30 términos del sistema explicados"
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
