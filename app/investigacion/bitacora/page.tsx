import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { History } from "lucide-react";

const ACTION_VARIANT: Record<string, "success" | "warning" | "destructive" | "outline" | "default"> = {
  create: "success",
  update: "default",
  delete: "destructive",
  approve: "success",
  reject: "destructive",
  recalculate: "warning",
  export: "outline",
};

export default async function AuditPage() {
  const [logs, byEntity] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: true },
    }),
    prisma.auditLog.groupBy({ by: ["entity"], _count: true }),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Investigación", href: "/investigacion" },
        { label: "Bitácora" },
      ]} />
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><History className="w-6 h-6" />Bitácora del sistema</h1>
        <p className="text-muted-foreground">
          {logs.length} eventos recientes. Cada cambio queda guardado con fecha, usuario y copia del estado antes y después, para auditoría académica y reproducibilidad.
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        {byEntity.map((g) => (
          <Card key={g.entity}>
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground uppercase">{g.entity}</p>
              <p className="text-2xl font-bold">{g._count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Eventos recientes</CardTitle>
          <CardDescription>Últimos 200 registros, ordenados de más nuevo a más antiguo.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">No hay eventos registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Contexto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {l.createdAt.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                    </TableCell>
                    <TableCell><Badge variant="outline">{l.entity}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={ACTION_VARIANT[l.action] ?? "outline"}>{l.action}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {l.user ? <>{l.user.name} <span className="text-muted-foreground">({l.user.role})</span></> : <span className="text-muted-foreground">sistema</span>}
                    </TableCell>
                    <TableCell className="text-xs max-w-md truncate" title={l.context ?? ""}>{l.context ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
