/**
 * Aviso de privacidad.
 *
 * El sistema le exige al proveedor, en el reporte municipal, cumplir con la
 * ley de datos personales. Lo mínimo es cumplirla también aquí, y decirle al
 * visitante en lenguaje claro qué se guarda y para qué.
 */
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Lock } from "lucide-react";

export const metadata = {
  title: "Aviso de privacidad",
  description: "Qué datos guarda el sistema, para qué los usa y cómo pedir que se borren.",
};

export default function PrivacidadPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Breadcrumbs items={[{ label: "Aviso de privacidad" }]} />

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Lock className="w-6 h-6 text-primary" />
          Aviso de privacidad
        </h1>
        <p className="text-muted-foreground mt-1">
          En corto: no se pide registro, no se comparte nada con terceros, y puedes pedir que se borre lo tuyo
          cuando quieras.
        </p>
      </div>

      <Card>
        <CardContent className="py-5 space-y-5 text-sm leading-relaxed">
          <section>
            <h2 className="font-semibold mb-1">Quién es responsable</h2>
            <p className="text-muted-foreground">
              Este sistema es el prototipo de una investigación de Ingeniería de Software de la Universidad
              Autónoma de Zacatecas, sobre estimación de proyectos de software para gobiernos municipales. No es
              un sistema oficial del Ayuntamiento de Fresnillo.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-1">Qué se guarda</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Lo que capturas de tus proyectos: nombre del proyecto, área, módulos, equipo y las cifras que el sistema calcula.</li>
              <li>Un identificador que queda en tu navegador para reconocerte en la siguiente visita. No es tu nombre ni tu correo.</li>
              <li>Al crear tu primer proyecto: tu nombre y si trabajas en un Ayuntamiento o eres proveedor. El nombre sirve para saber de quién es cada proyecto y el segundo dato para ordenar las opciones según lo que a ti te conviene cuidar.</li>
              <li>Tu correo, únicamente si decides dejarlo. Es opcional y sirve para una sola cosa: regresarte tu llave de acceso si la pierdes. No se usa para enviarte correos de ningún otro tipo.</li>
              <li>Un registro de acciones (por ejemplo, que se corrió una estimación) sin datos personales, para medir el uso.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold mb-1">Qué NO se guarda</h2>
            <p className="text-muted-foreground">
              No se pide ni se almacena contraseña. No se guarda tu ubicación ni tu historial de navegación. No se
              usan servicios de rastreo publicitario. No se venden ni se comparten tus datos con terceros. Dejar el
              correo nunca es obligatorio para usar el sistema.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-1">Para qué se usan</h2>
            <p className="text-muted-foreground">
              Para que puedas recuperar tus proyectos al volver, y de forma agregada y anónima para la
              investigación: medir qué tanto se equivocan las estimaciones frente al costo real. En los
              resultados de la investigación no aparecen nombres ni datos que identifiquen a una persona.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-1">Tus datos son solo tuyos</h2>
            <p className="text-muted-foreground">
              Cada visitante ve únicamente lo que él capturó. Los proyectos de una persona no son visibles para
              las demás. Puedes revisar tu identificador y tu llave de acceso en{" "}
              <Link href="/mi-cuenta" className="text-primary hover:underline">Mi cuenta</Link>.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-1">Cómo borrar lo tuyo</h2>
            <p className="text-muted-foreground">
              Puedes eliminar tus proyectos desde el sistema. Si además quieres que se borre por completo tu
              registro, puedes solicitarlo al responsable de la investigación en la Unidad Académica de
              Ingeniería Eléctrica de la Universidad Autónoma de Zacatecas, indicando tu llave de acceso para
              poder identificar qué borrar.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-1">Fundamento</h2>
            <p className="text-muted-foreground">
              Este aviso se emite conforme a la Ley Federal de Protección de Datos Personales en Posesión de los
              Particulares. Si en algún momento el sistema pasa a operar dentro del Ayuntamiento, aplicará
              además la Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
