# Guía para entender y defender el artículo

Versión del 14 de octubre de 2026, para el enfoque del desarrollador que cotiza. Escrita para Rogelio: qué dice cada parte del artículo, qué significan los números y cómo contestar lo que te van a preguntar.

## 1. El artículo en diez renglones

1. El problema: un desarrollador independiente o una microempresa en México cotiza por juicio, con hojas de cálculo, sin datos históricos, y deja fuera el tiempo que no factura, los cambios, el mantenimiento y las cargas de contratar.
2. La pregunta: si se puede calcular desde el inicio cuánto cobrar y cuánto va a tardar, con un error útil para decidir, y con todo eso adentro.
3. La evidencia pública dice que el juicio ordena pero no dimensiona: en 4,329 tareas con estimación experta la correlación es 0.79 pero solo 39.8 % queda dentro de más o menos 15 %. En 120 proyectos, 80.8 % costó más de lo estimado, con desviación mediana de +58.6 %.
4. Las palabras del texto no sirven para detectar cambios (p = 0.57); por eso los cambios se capturan estructurados.
5. Las variables que se conocen al inicio le ganan al promedio (R2 de 0.39 en tareas y 0.81 en proyectos, con la reserva de que en SEERA entran las estimaciones del propio equipo).
6. Con pocos proyectos, el modelo más simple gana: en 7 datasets públicos (967 proyectos), el bosque aleatorio nunca fue el mejor; el modelo de un parámetro (horas por punto de tamaño) tuvo exactitud estandarizada mediana de 0.60 contra 0.56 del bosque, y con 8 proyectos de entrenamiento 0.49 contra 0.35.
7. Hay un punto de calibración mexicano: 42 proyectos con tamaño COSMIC y horas; mediana de 12.6 horas por punto, dentro del rango de 13.6 a 21.7 de la industria.
8. El instrumento, EMPS, es un cotizador paramétrico con parámetros fechados y con fuente: horas por pieza, factores de claridad, riesgo, forma de hacerlo y pericia con la IA, capacidad del equipo, nómina cargada por tipo de contrato, herramientas de IA por persona, flujo mes a mes, precio de cambios y mantenimiento.
9. Dos caras: el desarrollador ve costo, margen y flujo; el cliente recibe una cotización por concepto con las condiciones que la ley exige por escrito, y nunca la nómina ni la utilidad.
10. Lo que sigue: un piloto con desarrolladores que cotizan un proyecto real, capturan antes la cifra que pensaban cobrar y contestan cuatro preguntas; con quince casos se calibra y se compara contra aprendizaje automático.

## 2. Qué significa cada número

- Correlación de Spearman 0.79 (JOSSE): si el experto dice que una tarea es grande, de verdad es grande. Va de 0 a 1; 0.79 es alta.
- PRED(15) de 39.8 %: solo cuatro de cada diez estimaciones quedaron a menos de 15 % del valor real. PRED(30) de 46.0 %: ni relajando el umbral al doble se pasa de la mitad.
- MdMRE de 33 %: la mitad de las estimaciones se equivocó más de 33 %.
- SEERA 80.8 % y +58.6 %: ocho de cada diez proyectos costaron más de lo estimado y el proyecto de en medio se pasó 58.6 %. La duración da las mismas cifras porque en ese dataset el esfuerzo se deriva de la duración: es una sola evidencia, no dos.
- p = 0.57 (H2): la probabilidad de ver esa diferencia por puro azar es alta; no hay diferencia real entre las tareas con palabras de cambio y las demás.
- R2 de 0.39 y 0.81 (H3): qué tanto explica el modelo la variación del esfuerzo, de 0 a 1. En SEERA el 0.81 depende mucho de que el equipo ya había estimado duración y esfuerzo; lo decimos en las amenazas a la validez.
- Exactitud estandarizada, SA (H4): 1 es sin error y 0 es adivinar al azar; se calcula contra predecir con un valor tomado al azar. Es la medida que recomiendan Shepperd y MacDonell en lugar del MMRE.
- Medianas de SA entre los 7 datasets: mediana de entrenamiento 0.38, proporcional 0.60, log-lineal 0.59, lineal con transformaciones 0.51, bosque aleatorio 0.56.
- Curvas de aprendizaje: con 4 proyectos el log-lineal (dos parámetros) se dispara en algunos sorteos (promedio −0.51, sorteo típico 0.31); el proporcional da 0.45 y el bosque 0.26. Con 8: 0.42, 0.49 y 0.35. Con 16: 0.49, 0.53 y 0.42. Cuantos menos datos, menos parámetros.
- Punto mexicano: 42 proyectos, exponente 0.93, R2 0.83, mediana 12.6 horas por punto COSMIC; en validación cruzada log-lineal 0.60 y bosque 0.63, empate.
- Kitchenham: las estimaciones iniciales de la propia empresa superan a todos los modelos (SA 0.81, 62 % dentro de más o menos 25 %). El experto que mide y revisa su error sí acierta; el que falla es el juicio sin datos ni revisión.

## 3. Las preguntas que te van a hacer, con respuesta

**"Esto es solo una sumatoria."** No. Es un modelo paramétrico de la familia de COCOMO y de la medición temprana COSMIC: tamaño por factores, dividido entre capacidad, convertido a dinero con cargas reales. Menzies y colegas (2017) probaron que a esa familia nada le ganó con datos del mismo tipo y que bastan de 4 a 8 proyectos para recalibrarla. En mis datos, el bosque aleatorio nunca fue el mejor y el modelo de un parámetro ganó con pocos proyectos.

**"Debería ser machine learning."** Cuando haya datos. Con cero casos locales terminados, entrenar sería sobreajuste por definición. Tawosi y colegas (2023) replicaron el modelo profundo que se tenía por el mejor y solo le ganó a la mediana en 8 de 42 casos. Abedu (2021) define pequeño como 43 proyectos o menos y ahí ganan los modelos simples. Mi pipeline ya compara modelos; se corre cuando haya quince casos.

**"No resuelve un problema real."** El problema está medido en la región: en Colombia 90 % estima con hojas de cálculo y 85 % sin datos históricos; en Chile 10 de 10 por juicio; en Argentina 37.5 % no estima; en México, 2 de 9 estimaciones de proveedor dentro del rango. El tercio de horas que el independiente no cobra (OIT, 2025), el 30 % de proyectos con alcance desbordado (PMI, 2024) y el mantenimiento de un cuarto del costo al año cuestan dinero y no están en una cotización por horas. Lo que no existe es un estudio mexicano de cómo cotizan las microempresas: el piloto es esa medición.

**"La IA cambia cada mes; no puedes saber."** Es cierto y lo acepto. La respuesta es diseñar para el cambio: cada parámetro tiene fecha y fuente; lo que cambia cada mes (precios y factores de productividad) está separado de lo que cambia una vez al año (salario mínimo, UMA, cuotas) y de lo que no ha cambiado en décadas (el salario diario de la LFT). Los datos viejos no se tiran: se reponderan por su acierto reciente (Minku y Yao, 2017).

**"¿Por qué cambiaste de gobiernos municipales a desarrolladores?"** No cambié el problema, cambié el lado desde el que lo miro. El estudio mexicano más cercano (Valdés-Souto, 2019) valida justamente estimaciones del proveedor para un cliente de gobierno. El ayuntamiento sigue siendo el cliente de esa cotización, y el sistema tiene las dos caras.

**"¿Por qué el R2 de 0.81 en SEERA?"** Porque entre las variables tempranas están la duración y el esfuerzo que el propio equipo estimó, y eso explica buena parte. Lo digo en las amenazas a la validez. El resultado útil es que las variables del inicio, incluida la estimación del equipo, sirven; no que un modelo público prediga a Fresnillo.

**"¿Y la duración?"** En SEERA da las mismas cifras que el esfuerzo porque una se deriva de la otra. Lo digo de frente en el artículo: es la misma evidencia leída en meses.

**"¿Por qué el log-lineal se dispara con 4 proyectos?"** Porque ajustar dos parámetros (a y b) con cuatro puntos en logaritmos puede dar exponentes absurdos cuando los cuatro proyectos son parecidos. Por eso con muy pocos datos conviene el proporcional, de un solo parámetro, y agregar factores conforme hay datos. Es el orden en que el cotizador los aplica.

**"¿Cuántos casos necesitas?"** Con 4 a 8 se recalibra un paramétrico (Menzies); puse quince para comparar con aprendizaje automático con algo de honestidad.

**"¿Qué ve el cliente?"** Solo la cotización por concepto: precio, tiempo, alcance, qué no incluye, precio por tipo de cambio, mantenimiento, forma de pago y vigencia, con tres condiciones legales (cambios por escrito con precio, artículo 2627 del Código Civil Federal; cesión de derechos por escrito, LFDA; plazo y forma de pago pactados, Código de Comercio). Nunca la nómina, el margen ni el flujo.

## 4. Lo que hay que decir con honestidad si preguntan

- Veintiuna de las 116 referencias nuevas se confirmaron de forma indirecta; en el artículo cité solo las abiertas, y tres de ellas las volví a abrir.
- Las tarifas de freelancers y el costo de mantenimiento vienen de empresas, sin método publicado; se usan como orden de magnitud.
- Los precios de herramientas llevan fecha del 13 de octubre de 2026 y caducan.
- En local el cálculo con fechas de 2027 falla hasta cargar los parámetros de 2027 en enero.

## 5. Palabras que salen, explicadas

- Forma de hacerlo: a mano, con ayuda de IA, híbrida, casi todo con IA, o plataforma de armado.
- Pericia con la IA: del 1 al 5, qué tan bien sabe el equipo usar la herramienta.
- Contrato propio: lo que vale tu tiempo; sin IMSS ni impuesto sobre nómina; 75 % de horas facturables.
- Asiento: una licencia por persona.
- Exactitud estandarizada: 1 sin error, 0 adivinar.
- Modelo proporcional: esfuerzo igual a horas por punto por tamaño; un solo parámetro.
- Log-lineal: esfuerzo igual a a por tamaño elevado a b; dos parámetros.
- Punto COSMIC: unidad de tamaño funcional del estándar ISO 19761.
- Ciencia del diseño: investigar construyendo un artefacto y evaluando si sirve.
