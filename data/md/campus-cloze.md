[pág. 1]

# Campus Virtual: ¿Cómo crear preguntas con respuestas anidadas (Cloze)?

Secretaría Académica. Facultad de Ciencias Sociales, UBA.

[pág. 2]

## ¿Cómo crear preguntas con Respuestas anidadas (Cloze)?

Las preguntas del tipo "respuestas anidadas" nos permiten incluir muchas consignas de distinto tipo, dentro de un mismo ejercicio del cuestionario.

Dentro del cuestionario, aparecen así:

Captura: una pregunta de cuestionario numerada "Pregunta 1" (rótulo "N° de pregunta") que contiene seis consignas de distinto tipo: dos campos de texto para completar, un desplegable, dos grupos de opciones para elegir una y un grupo de casillas para elegir varias. Una llave las agrupa con el rótulo "Todas las consignas forman parte de la pregunta 1 del cuestionario".

Podemos crear preguntas de dos maneras:

a) En el cuestionario.

Esta metodología nos permite crear las preguntas directamente dentro del cuestionario.

b) En el banco de preguntas de nuestro curso.

El banco de preguntas nos permite ir cargando preguntas en un repositorio dentro de nuestro curso. Cuando construyamos un cuestionario, vamos a poder usar las preguntas que estén guardadas en nuestro banco de preguntas.

[pág. 3]

### Crear preguntas en el cuestionario:

Una vez creado el cuestionario, para añadir preguntas vamos a editarlo.

\* Recordá que para poder editar el cuestionario, tiene que estar activada la edición del curso.

Las instrucciones para crear un cuestionario las encontrás acá (enlace al instructivo "Creación y configuración de un cuestionario").

Paso a paso:

Captura (paso 1): dentro del curso, en "Tema 1", el cuestionario (ejemplo "Cuestionario de prueba") aparece recuadrado; hay que hacer clic sobre su nombre.

Captura (paso 2): página del cuestionario con el texto "Aún no se han agregado preguntas" y, debajo, el botón "Editar cuestionario" (recuadrado y señalado con una flecha) y el botón "Volver al curso".

[pág. 4]

Captura (paso 3): menú "Agregar" desplegado, con las opciones "+ una nueva pregunta" (recuadrada), "+ del banco de preguntas" y "+ una pregunta aleatoria".

### Banco de preguntas

Captura (paso 1): página del curso con el bloque "Administración" a la derecha. El rótulo "Dentro del curso donde queremos cargar preguntas" apunta al bloque, y el rótulo "Banco de preguntas" señala la opción "Banco de preguntas", al final de "Administración del curso".

[pág. 5]

Captura (paso 2): pantalla "Banco de preguntas". Arriba está el desplegable "Seleccionar una categoría" (rótulo: "Seleccionamos la categoría en la que vamos a crear una nueva pregunta"). Debajo, las opciones de filtro y el botón "Crear una nueva pregunta..." (rótulo: "Seleccionamos 'Crear...'").

Captura (paso 3): ventana "Elija un tipo de pregunta a agregar", con la lista: Opción múltiple, Verdadero/Falso, Emparejamiento, Respuesta corta, Numérica, Ensayo, Arrastrar y soltar marcadores, Arrastrar y soltar sobre texto, Arrastrar y soltar sobre una imagen, Calculada, Calculada opción múltiple, Calculada simple, Elige la palabra perdida, Emparejamiento aleatorio y "Respuestas anidadas (Cloze)", que es la que hay que elegir (señalada con el rótulo "Respuestas anidadas").

[pág. 6]

Una vez que seleccionamos "Respuestas anidadas" y le damos click a "crear pregunta", veremos la siguiente pantalla:

Captura: formulario de la pregunta, con estos campos y rótulos:
- "Categoría": podemos cambiar la categoría donde vamos a guardar la pregunta. La categoría tiene que haber sido creada previamente.
- "Nombre de la pregunta" (obligatorio): nombre para identificar la pregunta. No es visible para les alumnes cuando responden al cuestionario.
- "Enunciado de la pregunta" (obligatorio): es el cuerpo de la pregunta.
- "Retroalimentación general": se muestra a les estudiantes cuando terminan de responder la pregunta, independientemente de lo que hayan respondido.
- El ícono rojo con signo de exclamación indica qué campos son obligatorios para crear la pregunta.

Cuerpo de la pregunta:

Dentro del cuerpo vamos a incluir todas las consignas que van a formar parte de esta pregunta.

El orden es:

- Pregunta 1
  Configuración pregunta 1

- Pregunta 2
  Configuración pregunta 2

[pág. 7]

### Sintaxis:

El enunciado de la pregunta se escribe de manera normal:

a) ¿En qué barrio está la Facultad de Ciencias Sociales de la Universidad de Buenos Aires?

La información sobre la configuración de la pregunta va entre {llaves}, respetando una sintaxis específica.:

`{1:MULTICHOICE:Congreso~Palermo~=Constitución#Respuesta correcta}`

Para configurar de manera correcta la pregunta, es preciso respetar la sintáxis y no incluir espacios donde no correspondan.

| Elemento | Ejemplo |
|---|---|
| Llave de apertura { | `{` |
| Puntaje (opcional) 1,2,3… | `{1` |
| :Tipo de pregunta: Se colocan dos puntos al principio y al final, sin espacios | `{1:MULTICHOICE:` |
| Para múltiples opciones, las separamos con ~ (ALT 126) | `{1:MULTICHOICE:Palermo~La Boca~=Constitución` |
| Para indicar la respuesta correcta colocamos un signo igual = antes del texto de la opción correcta. | `{1:MULTICHOICE:Palermo~La Boca~=Constitución#Correcto` |
| El numeral # antecede la retroalimentación de una respuesta (opcional). | `{1:MULTICHOICE:Palermo~La Boca~=Constitución#Correcto` |
| Llave de cierre } | `{1:MULTICHOICE:Palermo~La Boca~=Constitución#Correcto}` |

[pág. 8]

Los tipos de preguntas disponibles son:

- Respuesta corta > SHORTANSWER
- Numérica > NUMERICAL
- Multiple Choice > MULTICHOICE
  - Horizontal > MULTICHOICE_H
  - Vertical > MULTICHOICE_V
- Respuestas Múltiples > MULTIRESPONSE
  - Horizontal > MULTIRESPONSE_H

Veamos un ejemplo:

El enunciado de la pregunta se vería así:

1) Cómo se llama la plataforma sobre la que funciona el campus virtual?
`{1:SHORTANSWER:=Moodle}`

2) Qué número de pregunta es esta?
`{1:NUMERICAL:=2:0#OK}`

3) Las preguntas de tipo multiple choice permiten una sola respuesta correcta dentro de varias opciones, por defecto se despliegan de manera:
`{1:MULTICHOICE:horizontal~vertical~=anidada}`

4) El tipo de pregunta MULTICHOICE_H muestra las opciones de manera:
`{1:MULTICHOICE_H:=horizontal~vertical~anidada}`

5) Si selecciono MULTICHOICE_V veré la lista de manera:
`{1:MULTICHOICE_V:horizontal~=vertical~anidada}`

[pág. 9]

6) En las preguntas multiple choice de respuesta múltiple:
`{1:MULTIRESPONSE:una sola respuesta es correcta~=más de una respuesta es correcta~=todas las opciones pueden ser correctas}`

En el campus se vería así:

Captura: campo "Enunciado de la pregunta" con las consignas del ejemplo y sus configuraciones entre llaves escritas una debajo de la otra.

### Decodificar y verificar:

El siguiente paso es hacer click en el botón "Decodificar y verificar el enunciado de la pregunta".

Luego podremos ver si Moodle interpretó correctamente nuestro enunciado.

Captura: parte inferior del formulario, debajo de "Retroalimentación general" y del campo "ID number": el botón "Decodificar y verificar el enunciado de la pregunta" (recuadrado, con el rótulo "Decodificar").

[pág. 10]

En el caso de nuestro ejemplo, luego de hacer click, veríamos esto:

Captura: lista de las preguntas decodificadas: "Pregunta {#1} Respuesta corta", "Pregunta {#2} Numérica" (desplegada, con Definición de la pregunta `{1:NUMERICAL:=2:0#OK}`, Puntuación por defecto 1, Respuesta 2, Margen de error 0, Calificación 1 y Retroalimentación OK), y "Pregunta {#3}" a "Pregunta {#6}" como Opción múltiple.

Nos aparece cada pregunta con la información que Moodle leyó a partir de la configuración que establecimos. Podemos corroborar el tipo de pregunta, y las opciones configuradas.

### Multiple choice

Las respuestas multiple choice pueden aparecer de varias maneas, según la configuración que elijamos.

Recordemos que las opciones disponibles son:

- MULTICHOICE
- MULTICHOICE_H
- MULTICHOICE_V

[pág. 11]

Captura: cómo se ve cada variante en el cuestionario. MULTICHOICE (consigna 3) se muestra como un desplegable con las opciones horizontal, vertical y anidada; MULTICHOICE_H (consigna 4) muestra las opciones una al lado de la otra; MULTICHOICE_V (consigna 5) las muestra una debajo de la otra; MULTIRESPONSE (consigna 6) muestra casillas para tildar más de una.

### Formato

En el diseño de la pregunta, podemos elegir dónde queremos que aparezca el espacio para responder, o las opciones si es multiple choice.

Si quiero que aparezcan en el siguiente renglón, dejo un renglón entre el enunciado y la configuración:

2) ¿Qué número de pregunta es esta?
`{1:NUMERICAL:=2:0#OK}`

Captura: el campo de respuesta aparece debajo del enunciado.

Si quiero que aparezcan directamente a continuación del enunciado, no dejo ningún renglón:

2) ¿Qué número de pregunta es esta? `{1:NUMERICAL:=2:0#OK}`

Captura: el campo de respuesta aparece en el mismo renglón, a continuación del enunciado.

Un ejemplo jugando con el formato

Enunciado:

¿Cuáles son las iniciales correspondientes a cada carrera?

\* Trabajo Social: `{1:MULTICHOICE:=TS#Correcto!~CS~CP~CC~RT}`
\* Ciencia Política: `{1:MULTICHOICE:CS~TS~RT~=CP#Correcto!~CC}`
\* Sociología: `{1:MULTICHOICE:TS~=CS#Correcto!~CP~RT~CC}`

[pág. 12]

\* Ciencias de la Comunicación: `{1:MULTICHOICE:TS~CS~CP~=CC#Correcto!~RT}`
\* Relaciones del Trabajo: `{1:MULTICHOICE:CS~TS~=RT#Correcto!~CP~CC}`

La Facultad de Ciencias Sociales de la UBA está ubicada en el barrio:
`{1:SHORTANSWER:%100%Constitución#¡Felicitaciones!~%50%CABA#No, esa es la ciudad, no el barrio.~*#Respuesta incorrecta, está en el barrio Constitución}`.

En el cuestionario:

Captura: la pregunta resultante, con un desplegable al lado de cada carrera (opciones CS, TS, RT, CP, CC) y un campo de texto al final de la frase "La Facultad de Ciencias Sociales de la UBA está ubicada en el barrio:".

Eso es todo!

Este tipo de preguntas permite un diseño flexible, pero demanda una configuración particular, podés ver más información y ejemplos en la documentación oficial de Moodle.

Recordá que tenés disponible un instructivo para la creación de cuestionarios

[pág. 13]

Sede Marcelo T. de Alvear: Marcelo T. de Alvear 2230 - Ciudad Autónoma de Buenos Aires – Argentina - Tel +54 (11) 5287-1500

Sede Constitución: Santiago del Estero 1029 - Ciudad Autónoma de Buenos Aires – Argentina – Tel +54 (11) 5287-1740
