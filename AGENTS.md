# Trabajo en Folio

Lee README.md y docs/PROGRESS.md antes de cambiar el proyecto.

- Stack: Astro estático, React en islas, Tailwind 4, Hono, Workers y D1. No introducir otro framework backend ni Astro Actions.
- Toda operación HTTP de negocio vive en server/routes; la lógica va en services y el SQL parametrizado en repositories.
- El banco de preguntas con claves es exclusivo del servidor. Durante un simulacro no devolver claves ni explicaciones hasta finalizar.
- Los servicios resuelven el perfil internamente. No aceptar un studentId del navegador.
- El usuario autorizó acceso directo sin Cloudflare Access. Producción usa ACCESS_MODE=public con progreso aislado por cookie de navegador; ACCESS_MODE=access conserva la opción privada y falla cerrado sin configuración. No desplegar el entorno local ni compartir local-student entre visitantes públicos.
- Usar D1 batch para operaciones atómicas. Las respuestas tardías y las modificaciones de intentos finalizados deben fallar.
- Añadir libros mediante el catálogo, MDX, preguntas y tarjetas; el motor no depende de títulos o materias específicos.
- El MDX solo proviene de contenido de confianza revisado en Git. El validador no lo convierte en contenido seguro.
- Respetar la paleta, tipografía y sobriedad documentadas en docs/DESIGN_SYSTEM.md.
- Ejecutar tipos, check, validación de contenido, pruebas, lint y build. Ejecutar Playwright al cambiar un flujo de estudio.
- Las pruebas E2E usan .wrangler/e2e; nunca producción. No versionar secretos, estados de Wrangler, capturas ni artefactos.
- Mantener docs/PROGRESS.md actualizado con resultados observados. No afirmar publicaciones ni pruebas que no se hayan realizado.
- En PowerShell usar npm.cmd y npx.cmd. No cambiar la política global de ejecución.

No se requiere delegación a otros agentes para trabajar en este repositorio.
