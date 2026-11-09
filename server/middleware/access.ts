import { createMiddleware } from 'hono/factory';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { AppEnv } from '../types';
import { AppError } from '../types';
import { accessPendingHtml } from '../views/access-pending';
const keysets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
export const access = createMiddleware<AppEnv>(async (c, next) => {
  const host = new URL(c.req.url).hostname;
  const local =
    c.env.APP_ENV === 'development' && ['localhost', '127.0.0.1', '[::1]'].includes(host);
  if (!local) {
    const domain = c.env.ACCESS_TEAM_DOMAIN;
    if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(domain) || !c.env.ACCESS_AUD) {
      if (!c.req.path.startsWith('/api/') && c.req.header('Accept')?.includes('text/html'))
        return c.html(accessPendingHtml, 503);
      throw new AppError(
        503,
        'El acceso privado aún no está configurado.',
        'ACCESS_NOT_CONFIGURED',
      );
    }
    const token = c.req.header('Cf-Access-Jwt-Assertion');
    if (!token)
      throw new AppError(401, 'Accede mediante el dominio protegido de Folio.', 'UNAUTHORIZED');
    try {
      let keys = keysets.get(domain);
      if (!keys) {
        keys = createRemoteJWKSet(new URL(`https://${domain}/cdn-cgi/access/certs`));
        keysets.set(domain, keys);
      }
      await jwtVerify(token, keys, {
        issuer: `https://${domain}`,
        audience: c.env.ACCESS_AUD,
        algorithms: ['RS256'],
      });
    } catch {
      throw new AppError(401, 'La sesión privada no es válida. Vuelve a entrar.', 'UNAUTHORIZED');
    }
  }
  c.set('studentId', 'local-student');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
    const origin = c.req.header('Origin');
    if (origin && origin !== new URL(c.req.url).origin)
      throw new AppError(403, 'El origen de la solicitud no está permitido.');
    if (c.req.header('Sec-Fetch-Site') === 'cross-site')
      throw new AppError(403, 'La solicitud debe proceder de Folio.');
    if (!c.req.header('Content-Type')?.startsWith('application/json'))
      throw new AppError(400, 'Se requiere contenido JSON.');
  }
  await next();
});
