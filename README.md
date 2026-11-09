# Folio

Biblioteca personal de estudio con lecturas MDX, evaluación y diagnóstico. Astro genera las páginas; React aporta interactividad; un único Worker de Hono sirve la API y los assets. D1 conserva el progreso.

## Estado

La aplicación funciona localmente con Wrangler. Incluye diez materias y 74 tópicos con sus páginas originales. Lengua y comunicación es la primera unidad aportada, con dos diagramas y cinco referencias. Sus veinte preguntas están activas para práctica y simulacro; el texto académico continúa en revisión. El banco reúne cuarenta preguntas y cuatro tarjetas. Desde la biblioteca puedes volver a la última lectura, revisar preguntas pendientes durante una evaluación y repetir una configuración al consultar sus resultados.

La dirección solicitada para producción es https://folio.mayiitoo-alberto.workers.dev. Por petición del usuario, funciona con acceso directo sin Cloudflare Access. El contenido es público; progreso, preferencias e intentos se separan por navegador mediante una cookie opaca HttpOnly. Borrar las cookies o cambiar de navegador inicia otro espacio. El estado de publicación se registra en [PROGRESS](docs/PROGRESS.md).

Todos los módulos ofrecen Concentrarme para ocultar la navegación y centrarse en la actividad. Los quizzes, simulacros en curso y el repaso entran en modo inmersivo automáticamente; Salir o Escape permiten recuperar la navegación. La selección de tópicos y la hoja de respuestas se despliegan bajo demanda para mantener la interfaz compacta.

## Requisitos y desarrollo

Node 24 o superior, npm y Chrome para las pruebas de navegador. En Windows PowerShell utiliza npm.cmd y npx.cmd si la política del sistema bloquea los lanzadores .ps1.

```sh
npm ci
npm run types
npm run dev
```

Abre http://127.0.0.1:8787. Este comando valida el contenido, compila Astro, aplica las migraciones locales y arranca Wrangler. Tras editar páginas o MDX, vuelve a compilar para actualizar los assets. Los cambios del Worker se recargan automáticamente.

Para trabajar solo en contenido con recarga inmediata:

```sh
npm run dev:content
```

El servidor de Astro muestra las páginas; los endpoints de negocio se ejecutan únicamente en Wrangler. Usa el servidor de Wrangler para comprobar la aplicación completa.

## Comprobaciones

```sh
npm run types
npm run check
npm run content:validate
npm test
npm run lint
npm run format:check
npm run build
npm run test:e2e
```

Las pruebas de integración usan bindings D1 reales emulados por workerd, con almacenamiento aislado. Playwright usa Chrome y una base independiente en .wrangler/e2e. No modifica producción. Las capturas quedan en output/playwright. En CI se instala Chrome mediante Playwright.

## Publicación

La cuenta Cloudflare necesita D1 y Workers. No se necesita comprar un dominio ni habilitar Zero Trust.

1. Autentica Wrangler con npx wrangler login.
2. Crea D1 con npx wrangler d1 create folio-db y configura el ID en wrangler.jsonc. En este checkout la base ya fue creada.
3. Conserva APP_ENV=production y ACCESS_MODE=public en wrangler.jsonc.
4. Ejecuta npm run db:remote, npm run deploy:check y npm run deploy.
5. Comprueba la biblioteca, una lectura, salud de la API y persistencia por navegador. Otro navegador debe recibir un espacio independiente.

El modo opcional ACCESS_MODE=access conserva la publicación privada. Requiere configurar Access para toda la dirección y completar ACCESS_TEAM_DOMAIN (sin https://) y ACCESS_AUD; entonces el middleware valida firma RS256, audiencia y emisor del JWT. Sin configuración válida permanece cerrado. npm run deploy:locked solo admite ese modo con ambos identificadores vacíos y publica una página de estado 503.

En modo público, el servidor genera un token aleatorio de 256 bits y deriva de él el ID interno del estudiante mediante SHA-256. La cookie de producción usa Secure, HttpOnly, SameSite=Lax y el prefijo __Host-. Los endpoints no aceptan studentId del cliente. El perfil local anterior no se comparte con los visitantes.

Las URL de vista previa están deshabilitadas. Todas las rutas atraviesan el Worker y mantienen los encabezados de seguridad y la validación de origen en escrituras. No despliegues el entorno local. Los E2E ejecutan el modo público con datos aislados en .wrangler/e2e.

## Contenido y estructura

- [Guía editorial y validación](docs/CONTENT_GUIDE.md)
- [Arquitectura y API](docs/ARCHITECTURE.md)
- [Modelo de datos](docs/DATABASE.md)
- [Diseño](docs/DESIGN_SYSTEM.md)
- [Avances](docs/PROGRESS.md)
- [Trabajo futuro](docs/ROADMAP.md)

Las preguntas con sus claves solo se importan desde server. Nunca importes content/questions.json en código de frontend. El MDX es contenido ejecutable de confianza revisado en Git, no un formato para cargas arbitrarias de usuarios.
