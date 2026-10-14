import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMXN, STATUS_LABELS, labelOf } from "@/lib/utils";

/** Lo que la tarjeta necesita de cada proyecto (es lo que devuelve Prisma en el inicio). */
export interface ProyectoReciente {
  id: string;
  name: string;
  status: string;
  client: string;
  municipalArea: string;
  _count: { modules: number; estimates: number };
  /** La estimación probable más reciente, si hay; `total` llega como Decimal. */
  estimates: { total: unknown }[];
}

/** Tarjetas con los proyectos propios del visitante, las mismas en las dos caras. */
export function ProyectosRecientes({ projects }: { projects: ProyectoReciente[] }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {projects.map((p) => {
        const e = p.estimates[0];
        return (
          <Link key={p.id} href={`/projects/${p.id}`}>
            <Card className="h-full hover:bg-accent/40 hover:border-primary/30 transition-all cursor-pointer">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-medium line-clamp-1">{p.name}</h3>
                  <Badge variant="outline" className="shrink-0 text-xs">{labelOf(STATUS_LABELS, p.status)}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1 mb-3">{p.client} · {p.municipalArea}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {p._count.modules} {p._count.modules === 1 ? "módulo" : "módulos"} · {p._count.estimates} {p._count.estimates === 1 ? "estimación" : "estimaciones"}
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
  );
}
