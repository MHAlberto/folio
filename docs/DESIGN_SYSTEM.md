# Sistema de diseño

Folio es una biblioteca académica personal. La lectura manda sobre las métricas y la ornamentación.

| Token      | Valor   | Uso                      |
| ---------- | ------- | ------------------------ |
| Fondo      | #F7F7F4 | Superficie de lectura    |
| Superficie | #FFFFFF | Papel y formularios      |
| Texto      | #252B2D | Contenido                |
| Secundario | #667174 | Contexto                 |
| Borde      | #E2E5E2 | Separación funcional     |
| Verde      | #DDE6E2 | Definiciones y selección |
| Azul       | #DDE9F2 | Ejemplos                 |
| Lavanda    | #E9E5F2 | Notas                    |
| Ámbar      | #F5E9D8 | Advertencias             |
| Acción     | #35584A | Botones y vínculos       |

Lora, alojada localmente, aporta títulos y lectura editorial. Source Sans 3 sirve para navegación, formularios y datos. No se solicitan fuentes a terceros.

Sidebar discreto de 228 px en escritorio. En móvil se convierte en navegación desplegable con fondo y cierre mediante Escape. El contenido principal está centrado. La lectura tiene una columna legible y un índice contextual lateral. Las portadas son SVG y tipografía de elaboración original, sin fotos decorativas.

Los exámenes usan una hoja blanca con reactivos numerados, opciones alineadas y un navegador de respuestas. Los colores solo comunican selección, estado o la naturaleza de una nota.

No hay gradientes, glassmorphism, puntos, rachas, insignias de juego ni animaciones de entrada. Se respeta prefers-reduced-motion.

Los controles tienen etiquetas, foco visible y estados de carga y error. Hay enlace para saltar al contenido, navegación por teclado, áreas táctiles y estructura semántica. Los diagramas incluyen texto o una representación de reserva; KaTeX emite HTML y MathML. Las preferencias permiten ampliar el cuerpo y la columna de lectura.

Componentes académicos: Definition, Example, Figure, Formula, ConceptNote, MermaidDiagram, FunctionPlot, Citation, SourceList y ComparisonTable. Los estilos y puntos de adaptación están en src/styles/global.css.
