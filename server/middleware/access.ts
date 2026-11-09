import { createMiddleware } from 'hono/factory';
import { getCookie, setCookie } from 'hono/cookie';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { AppEnv } from '../types';
import { AppError } from '../types';
import { accessPendingHtml } from '../views/access-pending';
import { ensureVisitor, visitorIdentity } from '../services/visitor-session';
const keysets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
export const access = createMiddleware<AppEnv>(async (c, next) => {
  const host = new URL(c.req.url).hostname;
  const local =
    c.env.APP_ENV === 'development' && ['localhost', '127.0.0.1', '[::1]'].includes(host);
  const publicMode = c.env.ACCESS_MODE === 'public';
  if (!local && !publicMode) {
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
  if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
    const origin = c.req.header('Origin');
    if (origin && origin !== new URL(c.req.url).origin)
      throw new AppError(403, 'El origen de la solicitud no está permitido.');
    if (c.req.header('Sec-Fetch-Site') === 'cross-site')
      throw new AppError(403, 'La solicitud debe proceder de Folio.');
    if (!c.req.header('Content-Type')?.startsWith('application/json'))
      throw new AppError(400, 'Se requiere contenido JSON.');
  }
  if (publicMode) {
    // Establish the browser session on navigation, before concurrent island requests.
    // Static assets need neither a cookie nor a database profile.
    if (c.req.path.startsWith('/api/') || c.req.header('Accept')?.includes('text/html')) {
      const cookieName = local ? 'folio-visitor' : '__Host-folio-visitor';
      const identity = await visitorIdentity(getCookie(c, cookieName));
      if (identity.fresh)
        setCookie(c, cookieName, identity.token, {
          httpOnly: true,
          secure: !local,
          sameSite: 'Lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 365,
        });
      c.set('studentId', identity.studentId);
      if (
        c.req.path.startsWith('/api/v1/') &&
        !['/api/v1/health', '/api/v1/catalog', '/api/v1/books', '/api/v1/topics'].includes(
          c.req.path,
        )
      )
        await ensureVisitor(c.env.DB, identity.studentId);
    }
  } else c.set('studentId', 'local-student');
  await next();
});
