import { z } from 'zod';

export const idSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const subjectSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  color: z.enum(['sage', 'blue', 'lavender', 'amber']),
});
export const bookSchema = z.object({
  id: idSchema,
  subjectId: idSchema,
  title: z.string().min(1),
  subtitle: z.string(),
  description: z.string(),
  author: z.string(),
  edition: z.string(),
  provisional: z.boolean(),
});
export const conceptSchema = z.object({ id: idSchema, title: z.string(), anchor: idSchema });
export const topicSchema = z.object({
  id: idSchema,
  bookId: idSchema,
  number: z.number().positive(),
  title: z.string(),
  description: z.string(),
  minutes: z.number().int().positive(),
  concepts: z.array(conceptSchema).min(1),
  references: z.array(idSchema).min(1),
  subtopics: z.array(z.object({ title: z.string(), anchor: idSchema })),
});
export const referenceSchema = z.object({
  id: idSchema,
  title: z.string(),
  author: z.string(),
  year: z.string(),
  url: z.url(),
});
export const catalogSchema = z.object({
  subjects: z.array(subjectSchema),
  books: z.array(bookSchema),
  topics: z.array(topicSchema),
  references: z.array(referenceSchema),
});
export const optionSchema = z.object({ id: z.enum(['A', 'B', 'C', 'D']), text: z.string().min(1) });
export const questionSchema = z
  .object({
    id: idSchema,
    topicId: idSchema,
    conceptIds: z.array(idSchema).min(1),
    prompt: z.string().min(1),
    options: z.array(optionSchema).length(4),
    correctOption: z.enum(['A', 'B', 'C', 'D']),
    explanation: z.string().min(1),
    references: z.array(idSchema).min(1),
  })
  .superRefine((q, ctx) => {
    if (
      new Set(q.options.map((o) => o.id)).size !== 4 ||
      !q.options.some((o) => o.id === q.correctOption)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Las opciones deben ser A, B, C, D y contener la respuesta correcta.',
      });
  });
export const flashcardSchema = z.object({
  id: idSchema,
  topicId: idSchema,
  conceptId: idSchema,
  front: z.string(),
  back: z.string(),
});
export type Catalog = z.infer<typeof catalogSchema>;
export type Question = z.infer<typeof questionSchema>;
export type PublicQuestion = Pick<Question, 'id' | 'topicId' | 'conceptIds' | 'prompt' | 'options'>;
export type Topic = z.infer<typeof topicSchema>;
