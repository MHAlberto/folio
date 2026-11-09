import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
const readings = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './content/books' }),
  schema: z.object({
    topicId: z.string(),
    title: z.string(),
    provisional: z.boolean().optional(),
  }),
});
export const collections = { readings };
