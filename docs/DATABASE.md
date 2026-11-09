# Base de datos

Cloudflare D1 mediante el binding DB. Las migraciones se guardan en migrations y se aplican con Wrangler. No se usa un driver SQLite en el Worker.

| Tabla             | Contenido y claves                                                             |
| ----------------- | ------------------------------------------------------------------------------ |
| students          | Perfil, nombre y preferencias; ID interno                                      |
| reading_progress  | Estado por estudiante y tópico; clave compuesta                                |
| attempts          | Configuración, modalidad, estado, fechas, plazo, duración y resultado          |
| attempt_questions | Orden y snapshot editorial de cada pregunta del intento                        |
| answers           | Opción seleccionada y calificación; relación compuesta con pregunta autorizada |
| flashcard_reviews | Historial append-only de revisiones                                            |

Cada navegador público utiliza un estudiante independiente: el servidor deriva el ID de un token aleatorio guardado en una cookie HttpOnly y crea el perfil bajo demanda. Los perfiles locales y privados anteriores permanecen separados. Los endpoints no reciben studentId. No hay registro ni recuperación o sincronización entre navegadores.

Los libros y conceptos viven en Git. Las relaciones editoriales se validan durante build. Los snapshots mantienen preguntas, opciones, claves y explicaciones históricas aunque se edite el banco. Las claves correctas de los snapshots nunca se serializan en un intento de simulacro en curso.

## Consistencia

La creación del intento y sus preguntas ocurre en un batch transaccional de D1. La clave compuesta impide duplicar un reactivo. La selección se valida antes de escribir.

Guardar una respuesta utiliza INSERT SELECT con comprobaciones de estudiante, estado y plazo dentro del mismo SQL. No puede insertarse una respuesta de un reactivo ajeno. Práctica conserva la primera opción; simulacro permite actualizarla.

La finalización usa un batch: compara respuestas contra las claves guardadas y actualiza el intento con los conteos calculados en SQL. La condición de estado hace la operación idempotente. Los no respondidos se cuentan en el denominador, y la duración queda limitada al plazo si el envío se realiza después.

El progreso completado no retrocede al reabrir la lectura. Las revisiones de tarjetas conservan cada evento. Todas las consultas incluyen el estudiante resuelto internamente.

Índices: intentos por estudiante y fecha, preguntas por tópico y revisiones por estudiante, tarjeta y fecha.

## Entornos y copias

Producción: folio-db. El ID de recurso está en wrangler.jsonc. La base remota no contiene los datos creados por las pruebas.

Local: .wrangler/state. E2E: .wrangler/e2e. Integración Vitest: base efímera de workerd a través de getPlatformProxy, sin persistencia.

```sh
npm run db:local
npm run db:remote
npx wrangler d1 export folio-db --remote --output=backup.sql
```

Antes de migraciones destructivas, exporta y verifica una copia. No subas exportaciones de datos personales al repositorio.

El historial HTTP muestra los 100 intentos recientes. El diagnóstico debe usar la totalidad de los intentos terminados; la paginación del historial y las agregaciones incrementales están previstas para una biblioteca de gran tamaño.
