# Folio

Biblioteca personal de estudio con lecturas MDX, evaluación y diagnóstico. Astro genera las páginas; React aporta interactividad; un único Worker de Hono sirve la API y los assets. D1 conserva el progreso.

## Estado

La aplicación funciona localmente con Wrangler. Incluye diez materias y 74 tópicos con sus páginas originales. Lengua y comunicación es la primera unidad aportada, integrada como borrador con dos diagramas y cinco referencias. Sus veinte preguntas permanecen en revisión. El banco activo conserva veinte preguntas de demostración y cuatro tarjetas; los demás apartados se identifican como pendientes.

La dirección solicitada para producción es https://folio.mayiitoo-alberto.workers.dev. El estado real de publicación y los pendientes se registran en [PROGRESS](docs/PROGRESS.md). No desactives la protección para acceder a la aplicación.

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

## Publicación privada

La cuenta Cloudflare debe tener D1, Workers y Cloudflare Access habilitados. No se necesita comprar un dominio.

1. Autentica Wrangler con npx wrangler login.
2. Crea D1 con npx wrangler d1 create folio-db y configura el ID en wrangler.jsonc. En este checkout la base ya fue creada.
3. Habilita Zero Trust / Access en Cloudflare. Crea una aplicación self-hosted que proteja folio.mayiitoo-alberto.workers.dev completo, o protege el Worker con alcance All traffic. Limita la política a tu correo.
4. Copia el Team domain (sin https://) y el Application Audience (AUD) en ACCESS_TEAM_DOMAIN y ACCESS_AUD de producción en wrangler.jsonc. Son identificadores de configuración, no secretos.
5. Ejecuta npm run db:remote, npm run deploy:check y npm run deploy.
6. Sin sesión, la dirección debe requerir Access. Con sesión, comprueba salud, lectura, intento y persistencia.

Para crear el Worker antes de habilitar Access, npm run deploy:locked publica una página de estado y bloquea con 503 todas las rutas de contenido y API. No es un despliegue funcional de la biblioteca; permite seleccionar el Worker en Cloudflare y terminar la configuración privada. Después utiliza npm run deploy.

El middleware valida criptográficamente el JWT de Access, su audiencia y su emisor. Sin configuración válida, todas las rutas permanecen cerradas. No basta enviar un correo o un ID en un encabezado. El perfil inicial se resuelve dentro del servidor.

Las URL de vista previa están deshabilitadas. La ruta gratuita workers.dev queda permitida exclusivamente con el mismo control JWT en el Worker. No despliegues el entorno local.

## Contenido y estructura

- [Guía editorial y validación](docs/CONTENT_GUIDE.md)
- [Arquitectura y API](docs/ARCHITECTURE.md)
- [Modelo de datos](docs/DATABASE.md)
- [Diseño](docs/DESIGN_SYSTEM.md)
- [Avances](docs/PROGRESS.md)
- [Trabajo futuro](docs/ROADMAP.md)

Las preguntas con sus claves solo se importan desde server. Nunca importes content/questions.json en código de frontend. El MDX es contenido ejecutable de confianza revisado en Git, no un formato para cargas arbitrarias de usuarios.
