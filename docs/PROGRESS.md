# Avances

Fecha: 9 de noviembre de 2026.

## Implementado

Etapas 1–7 y 9: base modular Astro + React + Tailwind + Hono, catálogo y lecturas, evaluación, persistencia D1, diagnóstico, repaso básico y contrato editorial.

Etapa 8: componentes base para SVG, figuras atribuidas y gráfica matemática nativa. Las integraciones especializadas se mantienen progresivas, sin dependencias innecesarias.

Diez cuadernos con las diez materias y los 74 tópicos del temario proporcionado por el usuario, con su paginación. Las cuatro lecturas de muestra están vinculadas a los apartados correspondientes; los demás están pendientes de incorporar. Hay veinte preguntas y cuatro tarjetas provisionales. El título y la edición de la guía quedan por registrar.

## Verificación

- Node 24.13.1 y npm disponibles. Se usan npm.cmd y npx.cmd por la política de PowerShell.
- Versiones estables verificadas en npm e integraciones compatibles instaladas.
- Astro genera 21 páginas estáticas.
- Tipos de Cloudflare generados por Wrangler.
- Astro Check y TypeScript sin errores.
- 25 pruebas de contenido, selección, Hono y D1 local pasan, incluidos acceso cerrado, cobertura e historial mayor a cien intentos.
- ESLint pasa; npm audit no reporta vulnerabilidades.
- Wrangler deploy --dry-run empaqueta el Worker y sus assets.
- Los cuatro E2E pasan en escritorio y móvil. Verifican lectura, KaTeX, Mermaid, progreso persistente, práctica, simulacro acumulativo, recarga, claves ocultas, resultados, enlaces a conceptos, diagnóstico, repaso y preferencias.
- Capturas de biblioteca, lectura, examen y resultados revisadas en output/playwright. Se corrigieron el color ámbar y el ajuste de símbolos en las portadas.
- La primera verificación E2E detectó detalles de bindings y encabezados inmutables de Static Assets. Ambos corregidos y comprobados sobre Wrangler.

## Recursos externos observados

El repositorio ya existía en Git con remoto https://github.com/MHAlberto/folio.git y acceso de lectura confirmado.

La sesión de Cloudflare está disponible. Se creó folio-db con ID 355e7b20-cfe2-4dfb-9f39-b6c85ca54c20 y se aplicó 0001_initial.sql remotamente.

El usuario eligió la URL gratuita workers.dev: folio.mayiitoo-alberto.workers.dev. No utilizar nube-serena.com para Folio.

Access no está habilitado en la cuenta. El token OAuth disponible no permite administrar Access y la conexión al navegador de Cloudflare no está disponible. Falta habilitarlo y configurar el Team domain y AUD. La aplicación mantiene el acceso cerrado hasta entonces.

## Publicación

Cloudflare confirmó la publicación del Worker folio en https://folio.mayiitoo-alberto.workers.dev. Se publicó en modo cerrado: la página principal solo informa que falta Access; las lecturas, assets y API devuelven 503. Se comprobaron GET de página, lectura, asset y salud, y POST de creación de intento. Ninguna respuesta mostró contenido privado. D1 de producción conserva cero intentos.

La ruta inicialmente devolvió un 404 de Cloudflare pese a aparecer activada. Se reafirmó su activación mediante la API y después devolvió correctamente la página de acceso pendiente. Las vistas previas continúan deshabilitadas.

El código de aplicación corresponde al commit 58bc3ed. La configuración y las guías están preparadas para el despliegue privado funcional; el workflow de GitHub Actions ejecuta tipos, lint, formato, pruebas, build y E2E sin credenciales de producción.

## Pendiente externo

Activar Cloudflare Access para todo el tráfico de folio y registrar el Team domain y AUD. Después desplegar de nuevo y comprobar con una sesión autorizada un intento real persistido en D1. No se considera logrado el flujo remoto completo hasta realizar esa verificación.
