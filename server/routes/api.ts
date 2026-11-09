import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../types';
import {
  answerSchema,
  cardReviewSchema,
  examConfigSchema,
  profileSchema,
  progressSchema,
} from '../../shared/schemas/api';
import { StudyRepository } from '../repositories/study';
import { StudyService, catalogWithCounts } from '../services/study';

const service = (c: { env: AppEnv['Bindings']; get: (key: 'studentId') => string }) =>
  new StudyService(new StudyRepository(c.env.DB, c.get('studentId')));
const json = async <T extends z.ZodType>(req: { json: () => Promise<unknown> }, schema: T) =>
  schema.parse(await req.json());
export const api = new Hono<AppEnv>()
  .get('/health', (c) => c.json({ status: 'ok', service: 'folio', version: '0.1.0' }))
  .get('/catalog', (c) => c.json(catalogWithCounts()))
  .get('/books', (c) => c.json(catalogWithCounts().books))
  .get('/topics', (c) => c.json(catalogWithCounts().topics))
  .post('/exams', async (c) =>
    c.json(await service(c).create(await json(c.req, examConfigSchema)), 201),
  )
  .get('/attempts', async (c) => c.json(await service(c).history()))
  .get('/attempts/:id', async (c) => c.json(await service(c).get(c.req.param('id'))))
  .post('/attempts/:id/answers', async (c) => {
    const body = await json(c.req, answerSchema);
    return c.json(await service(c).answer(c.req.param('id'), body.questionId, body.optionId));
  })
  .post('/attempts/:id/finish', async (c) => {
    await json(c.req, z.object({}).strict());
    return c.json(await service(c).finish(c.req.param('id')));
  })
  .get('/progress', async (c) => c.json(await service(c).getProgress()))
  .put('/progress', async (c) => {
    const body = await json(c.req, progressSchema);
    return c.json(await service(c).setProgress(body.topicId, body.status));
  })
  .get('/analytics', async (c) => c.json(await service(c).analytics()))
  .get('/profile', async (c) => c.json(await service(c).profile()))
  .put('/profile', async (c) =>
    c.json(await service(c).saveProfile(await json(c.req, profileSchema))),
  )
  .get('/flashcards', async (c) => c.json(await service(c).flashcards()))
  .post('/flashcards/:id/reviews', async (c) => {
    const body = await json(c.req, cardReviewSchema);
    return c.json(await service(c).reviewCard(c.req.param('id'), body.rating), 201);
  });
export type ApiType = typeof api;
export type Attempt = Awaited<ReturnType<StudyService['get']>>;
export type Analytics = Awaited<ReturnType<StudyService['analytics']>>;
export type History = Awaited<ReturnType<StudyService['history']>>;
export type Flashcards = Awaited<ReturnType<StudyService['flashcards']>>;
