import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const raw = await readFile('wrangler.jsonc', 'utf8');
const parsed = ts.parseConfigFileTextToJson('wrangler.jsonc', raw);
if (parsed.error) throw new Error('No se pudo leer wrangler.jsonc.');
const config = parsed.config,
  locked = process.argv.includes('--locked');
const publicMode = config.vars?.ACCESS_MODE === 'public';
const errors: string[] = [];
if (process.env.CLOUDFLARE_ENV)
  errors.push(
    'Elimina CLOUDFLARE_ENV: el despliegue debe utilizar la configuración de producción.',
  );
if (!['public', 'access'].includes(config.vars?.ACCESS_MODE))
  errors.push('ACCESS_MODE debe ser public o access.');
if (locked && publicMode) errors.push('El despliegue cerrado requiere ACCESS_MODE=access.');
if (!locked && !publicMode) {
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(config.vars?.ACCESS_TEAM_DOMAIN ?? ''))
    errors.push('Configura ACCESS_TEAM_DOMAIN.');
  if (!config.vars?.ACCESS_AUD) errors.push('Configura ACCESS_AUD de la aplicación de Access.');
} else if (locked && (config.vars?.ACCESS_TEAM_DOMAIN || config.vars?.ACCESS_AUD))
  errors.push(
    'El despliegue cerrado requiere ambos identificadores de Access vacíos. Para activar la aplicación usa deploy.',
  );
if (config.vars?.APP_ENV !== 'production') errors.push('APP_ENV debe ser production.');
if (config.preview_urls !== false)
  errors.push('Desactiva preview_urls para no crear direcciones adicionales.');
if (config.workers_dev !== true)
  errors.push('La dirección solicitada es la ruta gratuita workers.dev.');
if (
  !config.d1_databases?.[0]?.database_id ||
  config.d1_databases[0].database_id.startsWith('00000000')
)
  errors.push('Crea D1 y sustituye el ID provisional.');
if (config.assets?.run_worker_first !== true)
  errors.push('Todas las rutas deben pasar por la protección del Worker.');
if (errors.length) {
  console.error('Despliegue pendiente:\n- ' + errors.join('\n- '));
  process.exitCode = 1;
} else
  console.log(
    locked
      ? 'Despliegue cerrado: todas las rutas privadas y API devolverán 503 hasta configurar Access.'
      : publicMode
        ? 'Despliegue público: acceso directo y progreso aislado por sesión de navegador.'
        : 'Configuración lista. Comprueba que la política de Access solo permite al propietario.',
  );
