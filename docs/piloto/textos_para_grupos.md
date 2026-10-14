# Piloto con desarrolladores: textos listos para pegar y qué se mide

Versión del 14 de octubre de 2026. Para Rogelio. Pega el texto tal cual o cámbiale lo que quieras; están escritos como habla la gente, sin jerga.

## Antes de publicar

- Que `https://estimacion.hazlatarea.com` abra en el celular y que la vista previa del enlace muestre la imagen azul con "Cotizador de software" (ya está configurada).
- Abre tú el ejemplo de la clínica dental y haz una cotización de prueba de principio a fin.
- Ten a la mano la respuesta a "¿y mis datos?": no pide cuenta ni correo; lo que escribes se guarda bajo una llave anónima; la encuesta es opcional y anónima.

## Facebook (grupos de desarrolladores y de la carrera)

Pregunta para los que cotizan software por su cuenta: ¿cómo le hacen para saber cuánto cobrar?

Yo llevo un año con eso en la tesis y armé un cotizador gratis, sin cuenta: describes lo que te piden, dices si lo haces solo o contratas, y en un minuto te da precio, tiempo y qué meter en la cotización. Incluye lo que casi nadie cobra: el tiempo que no facturas, los cambios a medio camino, el mantenimiento y las cargas si contratas a alguien.

Me ayudarían mucho con esto: antes de ver el resultado, escriban cuánto pensaban cobrar, y al final contesten cuatro preguntas (30 segundos, anónimo). Con eso comparo lo que la gente cobra contra lo que sale del cálculo. Es para la Universidad Autónoma de Zacatecas.

https://estimacion.hazlatarea.com

## Instagram (historia o publicación)

¿Cuánto cobrar por un sistema? Hice un cotizador gratis para desarrolladores que trabajan por su cuenta. Sin cuenta, un minuto. Antes de ver el número, escribe cuánto pensabas cobrar y luego dime qué tan creíble te pareció. Es mi tesis en la UAZ. Enlace en la bio: estimacion.hazlatarea.com

## Discord (canal de proyectos o freelance)

Compa, si cotizas software por tu cuenta, pruébame esto 5 minutos: estimacion.hazlatarea.com. Es un cotizador gratis (tesis UAZ). Describes el sistema, dices si lo haces solo o con alguien, y te da precio, tiempo y la cotización para el cliente con cambios, mantenimiento y forma de pago. Antes de ver el número anota cuánto ibas a cobrar y al final hay cuatro preguntas anónimas. Me interesa sobre todo si el número te parece creíble o está lejos de lo que cobrarías.

## Mensaje directo a alguien que ya cotiza (WhatsApp)

Hola. Estoy probando con desarrolladores un cotizador que hice para la tesis. Te toma cinco minutos: estimacion.hazlatarea.com. Antes de que te dé el número, escribe cuánto pensabas cobrar por ese proyecto, y al final contesta las cuatro preguntas. No pide cuenta. Si después me dices en qué se parece o no a cómo cotizas tú, mejor.

## Para profesores o la maestra

El piloto mide, sin pedir datos personales: la cifra que el desarrollador pensaba cobrar contra la que calcula el sistema; la credibilidad que le asigna (1 a 5); la forma de hacerlo que elegiría; el tiempo que tarda en llegar a su primera cifra; y cuántos empiezan y no terminan. Con quince casos se calibran los factores y se compara el modelo paramétrico contra aprendizaje automático con datos locales.

## Qué se mide y dónde se ve

| Qué | Dónde se captura | Dónde se ve |
|---|---|---|
| Cifra que pensaba cobrar | Encuesta al pie del resultado, pregunta 2 | Panel del investigador, tarjeta "Encuesta del piloto" |
| Credibilidad 1 a 5 | Pregunta 1 (también en una fila de un toque en el resultado) | Mismo panel |
| Forma de hacerlo que usaría | Pregunta 3 | Mismo panel |
| Qué faltó | Pregunta 4 (texto libre) | Mismo panel |
| Tiempo a la primera cifra | Automático (segundos desde crear el proyecto) | Tarjeta "Tiempo de la primera cifra" |
| Abandono | Automático (crea y no estima) | Misma tarjeta |
| Decisión registrada | Botón "Elegir esta opción" | "Por lado de la mesa" |

El panel está en `/investigacion/admin-datos` con tu llave de administrador; el CSV completo se descarga ahí mismo.

## Reglas para que el dato sirva

- Publica el mismo texto en todos los grupos el mismo día y anota en qué grupos (para saber de dónde viene la gente).
- No cotices tú proyectos de prueba después de publicar, o bórralos; el panel no distingue.
- Espera dos semanas por ola; si hay menos de diez respuestas, vuelve a publicar con el mensaje directo.
- Para el artículo, lo que cuenta es la diferencia entre la cifra esperada y la calculada, y la credibilidad; el costo real llega después, cuando alguien cierre un proyecto y lo capture en "resultado real".
