# Sistema de diseño

Folio es una biblioteca académica personal. La preferencia vigente del usuario es una interfaz sin cajas decorativas, tarjetas de color ni separadores horizontales.

## Color y tipografía

| Token          | Valor   | Uso                                         |
| -------------- | ------- | ------------------------------------------- |
| Fondo          | #F7F7F4 | Lienzo uniforme                             |
| Texto          | #252B2D | Lectura y controles                         |
| Secundario     | #667174 | Contexto y estados                          |
| Verde de texto | #35584A | Vínculos, selección y palabras relevantes   |
| Verde pastel   | #DDE6E2 | Elementos de diagramas                      |
| Azul pastel    | #DDE9F2 | Elementos de diagramas y gráficas           |
| Lavanda pastel | #E9E5F2 | Elementos de diagramas y mapas conceptuales |
| Ámbar pastel   | #F5E9D8 | Elementos de recursos didácticos            |

El color se reserva para palabras y recursos de aprendizaje: diagramas, mapas conceptuales, gráficas y animaciones cuando se incorporen. No aplicar rellenos de color a notas, portadas, tarjetas, estados ni opciones de respuesta.

Lora, alojada localmente, aporta títulos y lectura editorial. Source Sans 3 sirve para navegación, formularios y datos. Las métricas y el reloj utilizan cifras tabulares.

## Estructura

La biblioteca presenta títulos y metadatos sobre el lienzo, con espacio en blanco. No hay portadas en forma de caja, sombras, píldoras de color ni reglas horizontales. Los ejemplos y definiciones se distinguen mediante una etiqueta de texto y jerarquía tipográfica. Las tablas tampoco tienen separadores horizontales.

El sidebar está oculto inicialmente. Un botón hamburguesa visible en todos los tamaños permite mostrarlo y quitarlo. La preferencia se conserva en el navegador para escritorio; móvil comienza cerrado. Un botón de cierre, el fondo móvil y Escape permiten ocultarlo. La navegación oculta queda fuera del recorrido de teclado mediante inert.

La vista de preguntas utiliza una única columna centrada. El enunciado ocupa el centro; las opciones quedan alineadas dentro de esa columna para comparar y leer con facilidad. La hoja de respuestas aparece debajo, sin un panel lateral ni recuadros para cada opción.

## Tiempo y accesibilidad

Práctica/quiz y simulacro siempre muestran un reloj. Sin límite se muestra el tiempo transcurrido; con límite, una cuenta regresiva. Ambos se calculan a partir de las fechas del intento y la hora del servidor, por lo que recargar no reinicia el reloj. El servidor sigue rechazando respuestas tardías y la interfaz finaliza al agotar el plazo.

Los controles conservan etiquetas, foco visible, estados textuales y áreas táctiles. El foco puede usar un contorno durante la interacción; no es un contenedor decorativo. Los colores de estado siempre se acompañan de texto.

No hay animaciones decorativas. Se respeta prefers-reduced-motion. Los recursos didácticos pueden usar color y movimiento cuando expliquen el contenido.

Los estilos viven en src/styles/global.css. Los componentes académicos conservan su estructura semántica y sus nombres, pero no utilizan fondos de caja.
