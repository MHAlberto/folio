# Hoja de ruta

## Versión inicial

- Base Astro + React + Tailwind 4 y Worker Hono único.
- Lecturas MDX, KaTeX, Mermaid, gráfico SVG y componentes editoriales.
- Banco de preguntas, simulacros acumulativos, persistencia D1 y calificación de servidor.
- Diagnóstico determinista y enlaces a conceptos.
- Tarjetas de repaso libre, perfil y preferencias.
- Validación editorial, pruebas de integración y navegador, CI y documentación.

Por petición del usuario, la publicación actual usa acceso directo sin Cloudflare Access y progreso separado por navegador. Access queda como modo opcional para una futura publicación privada.

## Siguiente trabajo editorial

Integrar los libros reales revisados por el propietario, ampliar tópicos y revisar los bancos provisionales. Añadir metadatos de dificultad y procedencia cuando exista material que los justifique.

## Escala y diagnóstico

Paginación del historial, agregaciones SQL para grandes volúmenes y diagnóstico con umbrales de muestra más claros. Separar tendencias de práctica y simulacro cuando la historia de estudio sea suficiente. Mantener snapshots y enlaces estables.

## Recursos visuales progresivos

La lectura ya admite SVG estáticos y FunctionPlot. Para nuevos recursos, investigar la biblioteca al implementar un caso real: gráficas interactivas, esquemas físicos, química, estructuras moleculares, mapas, líneas de tiempo y biología. Preferir SVG exportado desde TikZ cuando corresponda. No instalar librerías grandes que no se usen.

## Repaso

Añadir fórmulas y diagramas en tarjetas mediante un esquema validado. Luego, estudiar una programación sencilla de revisión basada en historial. No introducir un algoritmo sofisticado antes de observar el uso.

## Identidad futura

Añadir sincronización y recuperación entre dispositivos si el usuario la solicita. El modo actual utiliza una cookie opaca por navegador; no requiere registro, contraseñas ni Access.
