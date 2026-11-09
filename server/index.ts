import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { bodyLimit } from 'hono/body-limit';
import { ZodError } from 'zod';
import { access } from './middleware/access';
import { api } from './routes/api';
import { AppError, type AppEnv } from './types';

export const app = new Hono<AppEnv>();
app.use(
  '*',
  secureHeaders({
    referrerPolicy: 'strict-origin-when-cross-origin',
    xFrameOptions: 'DENY',
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
    },
    permissionsPolicy: { camera: [], microphone: [], geolocation: [] },
  }),
);
app.use('*', async (c, next) => {
  await next();
  c.header('Cache-Control', 'private, no-store');
});
app.use('*', access);
app.use(
  '/api/*',
  bodyLimit({
    maxSize: 32 * 1024,
    onError: (c) =>
      c.json(
        { error: { code: 'PAYLOAD_TOO_LARGE', message: 'La solicitud es demasiado grande.' } },
        413,
      ),
  }),
);
app.route('/api/v1', api);
app.all('/api/*', (c) =>
  c.json({ error: { code: 'NOT_FOUND', message: 'El endpoint no existe.' } }, 404),
);
app.all('*', async (c) => {
  const response = await c.env.ASSETS.fetch(c.req.raw);
  // Clone immutable asset headers while preserving Hono's prepared session cookie.
  return c.newResponse(response.body, response);
});
app.onError((error, c) => {
  if (error instanceof ZodError)
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Revisa los campos enviados.',
          details: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
      },
      422,
    );
  if (error instanceof AppError)
    return c.json({ error: { code: error.code, message: error.message } }, error.status);
  if (error instanceof SyntaxError)
    return c.json(
      { error: { code: 'INVALID_JSON', message: 'El contenido JSON no es válido.' } },
      400,
    );
  console.error(
    'folio_request_failed',
    c.env.APP_ENV === 'development' ? error : error instanceof Error ? error.name : 'UnknownError',
  );
  return c.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'No se pudo completar la solicitud. Inténtalo de nuevo.',
      },
    },
    500,
  );
});
export default app;
