# Avances

Fecha: 9 de noviembre de 2026.

## Activación de preguntas y pequeñas mejoras

- Por petición explícita del usuario se activaron las veinte preguntas de Lengua y comunicación. El banco principal tiene cuarenta preguntas; no quedan preguntas pendientes de esta unidad.
- Se conservaron enunciados, opciones, claves, explicaciones, IDs y procedencia. La promoción queda registrada en content/editorial/espanol-01/activation.json. La lectura mantiene su estado de revisión académica.
- Los accesos de práctica en el lector utilizan el conteo real del banco. La disponibilidad de ejercicios ya no depende del estado editorial de la lectura.
- La biblioteca ofrece volver a la última lectura. El progreso se ordena por última actualización.
- La evaluación permite saltar a la primera pregunta sin responder y revisar pendientes antes de finalizar.
- Los resultados permiten repetir la configuración en un intento nuevo, conservando modalidad, tópicos, cantidad, selección y tiempo.
- Al probar preguntas nuevas se detectaron anclas vacías en la lectura de Español. Se trasladaron a sus encabezados para que el diagnóstico lleve a una sección visible. El validador evita reintroducir ese problema.
- El esquema del banco activo rechaza registros marcados como borrador. La validación admite que aún no exista una carpeta de borradores.
- Pasan tipos, validación de contenido, 27 pruebas de contenido/API, lint, formato y compilación de las 22 páginas. Los seis E2E de escritorio y móvil pasan y verifican las preguntas activas, las tres mejoras y los enlaces a secciones visibles.
- Cloudflare recibió esta revisión en la versión d46dca7d-523f-4d8d-8ac6-8c4db19950b0. Las cinco comprobaciones HTTP remotas devolvieron 503 con private, no-store y sin contenido privado. Access sigue pendiente; se conserva el acceso cerrado.
- El commit 987ad52 se sincronizó con origin/main junto con la revisión visual anterior. [GitHub Actions](https://github.com/MHAlberto/folio/actions/runs/42660143293) finalizó correctamente sobre ese commit, incluidos los seis E2E en Linux.

## Revisión anterior: diseño y primer tema aportado

- Se eliminaron portadas en forma de caja, fondos de color en notas, tarjetas y opciones, y separadores horizontales. El color queda en palabras y recursos didácticos.
- El sidebar empieza oculto y se controla con hamburguesa en escritorio y móvil. Se puede cerrar con botón o Escape y su preferencia se conserva en escritorio.
- Los reactivos, su reloj y el navegador de respuestas ocupan una sola columna centrada. Quiz/práctica y simulacro muestran tiempo transcurrido o cuenta regresiva según su configuración; recargar conserva la referencia temporal del servidor.
- Lengua y comunicación se incorporó en Español, apartado 1 (página 4), con ID espanol-01, once conceptos, dos diagramas Mermaid y cinco fuentes. Se conserva el estado de borrador en revisión.
- Las veinte preguntas recibidas se normalizaron y validaron en content/drafts/questions. No se agregaron al banco activo. Los originales completos están en content/editorial/espanol-01; no forman parte de los assets.
- El lector contiene las secciones de estudio. Los comentarios y claves de los siete reactivos originales se conservan en el archivo editorial; faltan sus enunciados completos y el documento base mencionado.
- Astro genera 22 páginas. Pasan tipos, lint, 26 pruebas de contenido/API y seis E2E en Chrome (escritorio y móvil), incluidos relojes, menú y el nuevo capítulo. Se revisaron las capturas actualizadas.
- Esta revisión está preparada localmente para revisar el material, sin publicarlo automáticamente. El despliegue remoto descrito más abajo conserva la versión anterior y el acceso cerrado pendiente de Access.

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

Versión final de Cloudflare: 819dcfec-e060-4110-90d3-9575910c12ba. Los commits 58bc3ed y f434b71 se subieron a origin/main. [GitHub Actions](https://github.com/MHAlberto/folio/actions/runs/42651388675) terminó correctamente sobre f434b71: instalación limpia en Linux, tipos, lint, formato, 25 pruebas, build y cuatro E2E en Chrome. La comprobación HTTP final del despliegue confirmó 503 y private, no-store para las cinco rutas probadas.

## Pendiente externo

Activar Cloudflare Access para todo el tráfico de folio y registrar el Team domain y AUD. Después desplegar de nuevo y comprobar con una sesión autorizada un intento real persistido en D1. No se considera logrado el flujo remoto completo hasta realizar esa verificación.
