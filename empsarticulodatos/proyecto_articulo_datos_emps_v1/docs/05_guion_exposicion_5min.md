# Guion de exposición de cinco minutos

Versión del 14 de octubre de 2026. Una idea por renglón; léelo como si lo contaras. Entre paréntesis, lo que se muestra.

## Minuto 1. El problema (portada y problema)

Buenas tardes. Soy Rogelio Flores Rodríguez, de Ingeniería de Software.
Mi tesis es sobre cómo cotiza un desarrollador independiente o una microempresa de software en México.
En México, 84 % de las empresas de software son micro o pequeñas.
Cotizan por juicio, con hojas de cálculo, sin datos históricos, y casi nadie revisa cuánto se equivocó.
Si el precio sale alto, pierden el contrato. Si sale bajo, trabajan meses por debajo del costo.
Y dejan fuera lo que más cuesta: el tiempo que no se factura, los cambios a medio camino, el mantenimiento y las cargas de contratar a alguien.

## Minuto 2. Lo que dicen los datos públicos (gráficas de JOSSE y SEERA)

Primero revisé datos públicos.
En 4,329 tareas estimadas por expertos, el experto sí sabe cuál tarea es grande: la correlación es 0.79.
Pero solo cuatro de cada diez estimaciones quedan cerca del valor real.
En 120 proyectos completos, ocho de cada diez costaron más de lo estimado, y el proyecto de en medio se pasó 58 %.
El juicio ordena, pero no dimensiona.

## Minuto 3. Modelo simple o inteligencia artificial (gráfica de barras de exactitud y curvas)

La pregunta que me hicieron: ¿por qué no machine learning?
Lo probé con siete datasets públicos, 967 proyectos, con validación cruzada repetida.
El bosque aleatorio nunca fue el mejor modelo en ninguno.
El modelo más simple, horas por punto de tamaño, un solo parámetro, fue el más robusto.
Con ocho proyectos de entrenamiento: 0.49 de exactitud estandarizada contra 0.35 del bosque.
Y con 42 proyectos mexicanos medidos en puntos COSMIC, la mediana es 12.6 horas por punto, dentro del rango de la industria.
Conclusión: con pocos datos conviene el modelo con menos parámetros, y se agregan factores conforme hay datos. Es justo el orden en que mi cotizador los aplica.

## Minuto 4. El cotizador (pantalla de inicio y pantalla de resultado)

Construí EMPS, un cotizador en línea, sin cuenta ni instalación.
Describes lo que te piden, dices si lo haces solo o contratas, y en un minuto tienes precio, tiempo y qué incluir.
Calcula horas por pieza, las ajusta por claridad, riesgo, forma de hacerlo y pericia con la IA, las divide entre la capacidad del equipo, y las convierte a dinero con la nómina cargada, las herramientas de IA por persona, el flujo mes a mes, el precio de cada cambio y el mantenimiento.
Cada parámetro tiene fecha y fuente, y cada cuenta se puede rehacer a mano.
Tiene dos caras: el desarrollador ve costo, margen y flujo.
El cliente recibe una cotización por concepto, con las condiciones que la ley exige por escrito, y nunca ve la nómina ni la utilidad.

## Minuto 5. Lo que sigue y lo que pido (plan del piloto)

Lo que sigue es un piloto con desarrolladores reales, en grupos de la carrera y de redes.
Cotizan un proyecto real, capturan antes la cifra que pensaban cobrar y contestan cuatro preguntas.
El sistema mide el tiempo a la primera cifra, el abandono y la forma de hacerlo elegida.
Con quince casos, calibro los factores y comparo el modelo paramétrico contra aprendizaje automático con datos locales.
Sería la primera medición mexicana de cómo cotizan las microempresas.
Lo que pido al jurado es su opinión sobre el instrumento del piloto: las cuatro preguntas, las medidas sin preguntar y el umbral de quince casos.
Gracias.

## Si sobra tiempo o preguntan

- La duración en SEERA da las mismas cifras que el esfuerzo porque una se deriva de la otra; lo digo de frente.
- En Kitchenham, las estimaciones de la propia empresa le ganan a todos los modelos: el experto que mide su error sí acierta.
- La IA cambia cada mes; por eso los parámetros tienen fecha y se separan de lo que cambia una vez al año.
