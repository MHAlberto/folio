import { z } from 'zod';
import data from '../content/syllabus.json';
import { idSchema } from './schemas/content';
export const syllabusSchema = z.object({
  source: z.object({
    title: z.string().nullable(),
    edition: z.string().nullable(),
    note: z.string(),
  }),
  books: z.array(
    z.object({
      bookId: idSchema,
      topics: z
        .array(
          z.object({
            number: z.number().int().positive(),
            title: z.string().min(1),
            page: z.number().int().positive(),
            readingTopicIds: z.array(idSchema),
          }),
        )
        .min(1),
    }),
  ),
});
export const syllabus = syllabusSchema.parse(data);
export const outlineForBook = (id: string) =>
  syllabus.books.find((b) => b.bookId === id)?.topics ?? [];
export const syllabusTopicCount = syllabus.books.reduce((n, b) => n + b.topics.length, 0);
