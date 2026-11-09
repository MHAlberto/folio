import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { getPlatformProxy, type PlatformProxy } from 'wrangler';
import { app } from '../server';
import type { Bindings } from '../server/types';
import type { Attempt, Analytics } from '../server/routes/api';
import questions from '../content/questions.json';
let platform: PlatformProxy<Bindings>, env: Bindings;
const request = (
  path: string,
  method = 'GET',
  body?: unknown,
  headers: Record<string, string> = {},
) =>
  app.request(
    'http://localhost/api/v1' + path,
    {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    },
    env,
  );
const create = async (mode = 'exam', count = 3) => {
  const r = await request('/exams', 'POST', {
    topicIds: ['ecuaciones-lineales', 'acentuacion'],
    count,
    mode,
    selection: 'random',
  });
  expect(r.status).toBe(201);
  return r.json() as Promise<Attempt>;
};
beforeAll(async () => {
  platform = await getPlatformProxy<Bindings>({
    environment: 'local',
    persist: false,
    remoteBindings: false,
  });
  env = { ...platform.env, ASSETS: { fetch: async () => new Response('asset') } as Fetcher };
  const sql = await readFile('migrations/0001_initial.sql', 'utf8');
  for (const statement of sql.split(';').filter((s) => s.trim()))
    await env.DB.prepare(statement).run();
});
afterAll(async () => {
  await platform?.dispose();
});
beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM answers'),
    env.DB.prepare('DELETE FROM attempt_questions'),
    env.DB.prepare('DELETE FROM attempts'),
    env.DB.prepare('DELETE FROM reading_progress'),
    env.DB.prepare('DELETE FROM flashcard_reviews'),
  ]);
});
describe('Hono con D1 nativo local', () => {
  it('mantiene las preguntas nuevas en revisión fuera del banco activo', async () => {
    const response = await request('/exams', 'POST', {
      topicIds: ['espanol-01'],
      count: 1,
      mode: 'exam',
      selection: 'random',
    });
    expect(response.status).toBe(422);
    const catalog = (await (await request('/catalog')).json()) as {
      topics: { id: string; questionCount: number; pendingQuestionCount: number }[];
    };
    expect(catalog.topics.find((t) => t.id === 'espanol-01')).toMatchObject({
      questionCount: 0,
      pendingQuestionCount: 20,
    });
  });
  it('responde health y catálogo sin claves', async () => {
    expect(await (await request('/health')).json()).toMatchObject({ status: 'ok' });
    const r = await request('/catalog');
    expect(r.status).toBe(200);
    const text = await r.text();
    expect(text).not.toContain('correctOption');
    expect(text).toContain('questionCount');
  });
  it('crea y persiste intentos sin respuestas correctas en simulacro', async () => {
    const a = await create();
    expect(a.questions).toHaveLength(3);
    expect(JSON.stringify(a)).not.toMatch(/correctOption|explanation|correct_option/);
    const reload = await (await request('/attempts/' + a.id)).json();
    expect(reload).toMatchObject({ id: a.id, status: 'in_progress' });
  });
  it('guarda respuestas, califica en servidor y finaliza de forma idempotente', async () => {
    const a = await create(),
      first = a.questions[0]!,
      answer = questions.find((q) => q.id === first.id)!;
    const saved = await request('/attempts/' + a.id + '/answers', 'POST', {
      questionId: first.id,
      optionId: answer.correctOption,
    });
    expect(await saved.json()).toEqual({ saved: true });
    const r = await request('/attempts/' + a.id + '/finish', 'POST', {}),
      result = (await r.json()) as Attempt;
    expect(result.correctCount).toBe(1);
    expect(result.score).toBe(33);
    expect(result.questions.every((q) => q.feedback?.explanation)).toBe(true);
    const again = (await (
      await request('/attempts/' + a.id + '/finish', 'POST', {})
    ).json()) as Attempt;
    expect(again.finishedAt).toBe(result.finishedAt);
    expect(
      (
        await request('/attempts/' + a.id + '/answers', 'POST', {
          questionId: first.id,
          optionId: 'A',
        })
      ).status,
    ).toBe(409);
  });
  it('en práctica explica solo el reactivo respondido y bloquea cambios posteriores', async () => {
    const a = await create('practice');
    expect(a.questions.some((q) => q.feedback)).toBe(false);
    const q = a.questions[0]!,
      r = await request('/attempts/' + a.id + '/answers', 'POST', {
        questionId: q.id,
        optionId: 'A',
      });
    expect(await r.json()).toHaveProperty('feedback');
    const reload = (await (await request('/attempts/' + a.id)).json()) as Attempt;
    expect(reload.questions.filter((q) => q.feedback)).toHaveLength(1);
    expect(
      (await request('/attempts/' + a.id + '/answers', 'POST', { questionId: q.id, optionId: 'B' }))
        .status,
    ).toBe(409);
  });
  it('no acepta respuestas después del tiempo y limita la duración al plazo', async () => {
    const a = await create();
    const past = new Date(Date.now() - 5000).toISOString();
    await env.DB.prepare('UPDATE attempts SET deadline_at=? WHERE id=?').bind(past, a.id).run();
    expect(
      (
        await request('/attempts/' + a.id + '/answers', 'POST', {
          questionId: a.questions[0]!.id,
          optionId: 'A',
        })
      ).status,
    ).toBe(409);
    const done = (await (
      await request('/attempts/' + a.id + '/finish', 'POST', {})
    ).json()) as Attempt;
    expect(done.finishedAt).toBe(past);
    expect(done.correctCount).toBe(0);
  });
  it('rechaza preguntas ajenas, payloads inválidos y resultados manipulados', async () => {
    const a = await create();
    expect(
      (
        await request('/attempts/' + a.id + '/answers', 'POST', {
          questionId: 'mr-01',
          optionId: 'A',
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await request('/exams', 'POST', {
          topicIds: ['missing'],
          count: 1,
          mode: 'exam',
          selection: 'random',
        })
      ).status,
    ).toBe(422);
    expect((await request('/attempts/' + a.id + '/finish', 'POST', { score: 100 })).status).toBe(
      422,
    );
    expect((await request('/attempts/missing')).status).toBe(404);
  });
  it('mantiene aislados los intentos de otros perfiles', async () => {
    const a = await create();
    await env.DB.prepare(
      "INSERT OR IGNORE INTO students(id,display_name) VALUES('other','Other')",
    ).run();
    await env.DB.prepare("UPDATE attempts SET student_id='other' WHERE id=?").bind(a.id).run();
    expect((await request('/attempts/' + a.id)).status).toBe(404);
    expect((await request('/attempts/' + a.id + '/finish', 'POST', {})).status).toBe(404);
  });
  it('persiste progreso y conserva una lectura completada al reabrirla', async () => {
    await request('/progress', 'PUT', { topicId: 'acentuacion', status: 'completed' });
    await request('/progress', 'PUT', { topicId: 'acentuacion', status: 'reading' });
    expect(await (await request('/progress')).json()).toMatchObject([
      { topicId: 'acentuacion', status: 'completed' },
    ]);
  });
  it('calcula estadísticas y asocia errores a conceptos y lecturas', async () => {
    const a = await create('exam', 2);
    const q = a.questions[0]!,
      correct = questions.find((x) => x.id === q.id)!.correctOption,
      wrong = q.options.find((o) => o.id !== correct)!.id;
    await request('/attempts/' + a.id + '/answers', 'POST', { questionId: q.id, optionId: wrong });
    await request('/attempts/' + a.id + '/finish', 'POST', {});
    const stats = (await (await request('/analytics')).json()) as Analytics;
    expect(stats.completedAttempts).toBe(1);
    expect(stats.correct).toBe(0);
    expect(stats.seenQuestions).toBe(2);
    expect(stats.weakConcepts.length).toBeGreaterThan(0);
    expect(stats.weakConcepts.every((c) => c.readingUrl.includes('#'))).toBe(true);
  });
  it('guarda preferencias y revisiones de tarjetas en D1', async () => {
    expect(
      (
        await request('/profile', 'PUT', {
          displayName: 'Mario',
          textSize: 'large',
          readingWidth: 'normal',
        })
      ).status,
    ).toBe(200);
    expect(await (await request('/profile')).json()).toMatchObject({ displayName: 'Mario' });
    const cards = (await (await request('/flashcards')).json()) as {
      id: string;
      reviewCount: number;
    }[];
    await request('/flashcards/' + cards[0]!.id + '/reviews', 'POST', { rating: 'good' });
    expect(
      ((await (await request('/flashcards')).json()) as { reviewCount: number }[])[0],
    ).toMatchObject({ reviewCount: 1 });
  });
  it('rechaza solicitudes de otro origen y cuerpos excesivos', async () => {
    expect(
      (await request('/exams', 'POST', {}, { Origin: 'https://foreign.example' })).status,
    ).toBe(403);
    expect((await request('/profile', 'PUT', { displayName: 'x'.repeat(40000) })).status).toBe(413);
  });
  it('falla cerrado en producción e ignora encabezados de identidad inventados', async () => {
    const prod = { ...env, APP_ENV: 'production' };
    const r = await app.request(
      'https://folio.example/api/v1/health',
      { headers: { 'Cf-Access-Authenticated-User-Email': 'invented@example.com' } },
      prod,
    );
    expect(r.status).toBe(503);
    expect((await app.request('https://folio.example/', {}, prod)).status).toBe(503);
  });
  it('rechaza JWT falsos cuando Access está configurado', async () => {
    const prod = {
      ...env,
      APP_ENV: 'production',
      ACCESS_TEAM_DOMAIN: 'example.cloudflareaccess.com',
      ACCESS_AUD: 'audience',
    };
    expect((await app.request('https://folio.example/api/v1/health', {}, prod)).status).toBe(401);
    expect(
      (
        await app.request(
          'https://folio.example/api/v1/health',
          { headers: { 'Cf-Access-Jwt-Assertion': 'fake' } },
          prod,
        )
      ).status,
    ).toBe(401);
  });
  it('muestra solo la página de acceso pendiente y bloquea escrituras en producción', async () => {
    const prod = { ...env, APP_ENV: 'production' };
    const response = await app.request(
      'https://folio.example/',
      { headers: { Accept: 'text/html' } },
      prod,
    );
    expect(response.status).toBe(503);
    expect(await response.text()).toContain('Falta activar el acceso privado');
    const write = await app.request(
      'https://folio.example/api/v1/exams',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
      prod,
    );
    expect(write.status).toBe(503);
  });
  it('no repite preguntas entregadas a un intento en curso al seleccionar no vistas', async () => {
    const first = await create('exam', 3);
    const response = await request('/exams', 'POST', {
      topicIds: ['ecuaciones-lineales', 'acentuacion'],
      count: 7,
      mode: 'exam',
      selection: 'unseen',
    });
    expect(response.status).toBe(201);
    const next = (await response.json()) as Attempt;
    expect(next.questions.every((q) => !first.questions.some((old) => old.id === q.id))).toBe(true);
  });
  it('mantiene el diagnóstico completo aunque el historial se limite a 100 intentos', async () => {
    await env.DB.batch(
      Array.from({ length: 101 }, (_, i) =>
        env.DB.prepare(
          "INSERT INTO attempts(id,student_id,config_json,mode,question_count,correct_count,status,started_at,finished_at) VALUES(?,'local-student','{}','exam',1,0,'finished',?,?)",
        ).bind(
          'bulk-' + i,
          new Date(2026, 0, 1 + i).toISOString(),
          new Date(2026, 0, 1 + i).toISOString(),
        ),
      ),
    );
    expect((await (await request('/attempts')).json()) as unknown[]).toHaveLength(100);
    expect(await (await request('/analytics')).json()).toMatchObject({ completedAttempts: 101 });
  });
  it('revierte por completo una creación inválida mediante batch', async () => {
    const before = await env.DB.prepare('SELECT COUNT(*) AS count FROM attempts').first<{
      count: number;
    }>();
    await expect(
      env.DB.batch([
        env.DB.prepare(
          "INSERT INTO attempts(id,student_id,config_json,mode,question_count,started_at) VALUES('rollback','local-student','{}','exam',1,'2026-01-01')",
        ),
        env.DB.prepare(
          "INSERT INTO attempt_questions(attempt_id,question_id,ordinal,topic_id,public_json,correct_option,explanation,references_json) VALUES('rollback','bad',1,'t','{}','Z','e','[]')",
        ),
      ]),
    ).rejects.toThrow();
    expect(await env.DB.prepare('SELECT COUNT(*) AS count FROM attempts').first()).toEqual(before);
  });
});
