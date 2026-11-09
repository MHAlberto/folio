import data from '../content/catalog.json';
import { catalogSchema } from './schemas/content';
export const catalog = catalogSchema.parse(data);
export const topicById = (id: string) => catalog.topics.find((t) => t.id === id);
export const bookById = (id: string) => catalog.books.find((b) => b.id === id);
export const readingUrl = (topicId: string, conceptId?: string) => {
  const topic = topicById(topicId);
  const concept = topic?.concepts.find((c) => c.id === conceptId);
  return `/lectura/${topicId}/${concept ? `#${concept.anchor}` : ''}`;
};
