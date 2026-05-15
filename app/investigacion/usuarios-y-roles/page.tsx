import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Users, Shield } from "lucide-react";

const ROLE_INFO: Record<string, { label: string; description: string; permisos: string[] }> = {
  admin: {
    label: "Administrador",
    description: "Acceso total: configura usuarios, parámetros, fuentes vivas, modelos ML.",
    permisos: ["Crear/editar/eliminar todo", "Aprobar parámetros y modelos", "Ver bitácora completa"],
  },
  estimador: {
    label: "Estimador",
    description: "Crea proyectos, captura módulos/equipo, ejecuta estimaciones.",
    permisos: ["Crear proyectos", "Ejecutar estimaciones", "Registrar cambios", "Generar reportes"],
  },
  ayuntamiento: {
    label: "Consulta Ayuntamiento",
    description: "Consulta proyectos del Ayuntamiento, sin acceso a costos internos del proveedor.",
    permisos: ["Ver proyectos asignados", "Ver reporte para Ayuntamiento", "Ver checklist"],
  },
  proveedor: {
    label: "Proveedor",
    description: "Consulta sus proyectos como proveedor, ve costos y márgenes propios.",
    permisos: ["Ver proyectos asignados", "Ver reporte para proveedor", "Capturar resultados reales"],
  },
  auditor: {
    label: "Auditor académico",
    description: "Auditoría académica de la investigación. Acceso de lectura a bitácora y datasets.",
    permisos: ["Ver bitácora", "Ver reporte académico", "Ver datasets y modelos ML"],
  },
};

export default async function UsersPage() {
  const users = await prisma.user.findMany({ orderBy: { role: "asc" } });

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Investigación", href: "/investigacion" },
        { label: "Usuarios y roles" },
      ]} />
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6" />Usuarios y roles</h1>
        <p className="text-muted-foreground">
          {users.length} usuarios registrados · 5 roles definidos en [15_seguridad_privacidad.md].
        </p>
      </div>

      {/* Roles documentados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" />Roles del sistema</CardTitle>
          <CardDescription>Cada rol determina qué puede ver y modificar dentro del sistema.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-3">
          {Object.entries(ROLE_INFO).map(([role, info]) => (
            <div key={role} className="p-3 rounded-md border bg-muted/30">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline">{role}</Badge>
                <h3 className="font-semibold">{info.label}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{info.description}</p>
              <ul className="text-xs space-y-0.5">
                {info.permisos.map((p, i) => <li key={i}>· {p}</li>)}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usuarios registrados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-xs font-mono">{u.email}</TableCell>
                  <TableCell><Badge>{u.role}</Badge></TableCell>
                  <TableCell>{u.active ? <Badge variant="success">activo</Badge> : <Badge variant="outline">inactivo</Badge>}</TableCell>
                  <TableCell className="text-xs">{u.createdAt.toISOString().split("T")[0]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Nota del prototipo:</strong> en esta versión, la autenticación está simplificada
          (sin login/password). Para producción se recomienda integrar NextAuth.js o similar con autenticación por email,
          y middleware que enforcee los permisos por rol en cada ruta API. La estructura de roles ya está sembrada.
        </CardContent>
      </Card>
    </div>
  );
}
