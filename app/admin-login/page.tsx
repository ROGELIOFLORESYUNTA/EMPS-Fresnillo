import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";
import { isAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { adminLoginAction } from "./actions";

export const metadata = { title: "Acceso de investigador" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  if (await isAdmin()) redirect("/investigacion/admin-datos");

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Acceso de investigador
          </CardTitle>
          <CardDescription>
            Esta zona es para el autor de la investigación. Captura el código de acceso configurado en el archivo .env (variable ADMIN_SECRET).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={adminLoginAction} className="grid gap-3">
            <div className="grid gap-1">
              <Label htmlFor="token">Código de acceso</Label>
              <Input id="token" name="token" type="password" autoComplete="off" required minLength={6} />
            </div>
            {sp.error && (
              <p className="text-sm text-destructive">
                {sp.error === "invalid"
                  ? "Código incorrecto."
                  : sp.error === "no_secret"
                    ? "El servidor no tiene ADMIN_SECRET configurado. Pídele al administrador del sistema que lo defina en .env."
                    : "Error desconocido."}
              </p>
            )}
            <Button type="submit">Entrar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
