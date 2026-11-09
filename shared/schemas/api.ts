import { z } from 'zod';
import { idSchema } from './content';

export const examConfigSchema = z
  .object({
    topicIds: z
      .array(idSchema)
      .min(1)
      .max(100)
      .refine((ids) => new Set(ids).size === ids.length, 'Hay tópicos repetidos.'),
    count: z.number().int().min(1).max(100),
    mode: z.enum(['practice', 'exam']),
    selection: z.enum(['random', 'unseen', 'errors', 'cumulative']),
    timeLimitMinutes: z.number().int().min(1).max(240).nullable().default(null),
  })
  .strict();
export const answerSchema = z
  .object({ questionId: idSchema, optionId: z.enum(['A', 'B', 'C', 'D']) })
  .strict();
export const progressSchema = z
  .object({ topicId: idSchema, status: z.enum(['reading', 'completed']) })
  .strict();
export const profileSchema = z
  .object({
    displayName: z.string().trim().min(1).max(60),
    textSize: z.enum(['normal', 'large']),
    readingWidth: z.enum(['normal', 'wide']),
  })
  .strict();
export const cardReviewSchema = z.object({ rating: z.enum(['again', 'good']) }).strict();
export type ExamConfig = z.infer<typeof examConfigSchema>;
