import type { ExamConfig } from '../../shared/schemas/api';
import type { Question } from '../../shared/schemas/content';
import { AppError } from '../types';

export function shuffle<T>(
  items: readonly T[],
  random = () => crypto.getRandomValues(new Uint32Array(1))[0]! / 4294967296,
): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
export function selectQuestions(
  bank: Question[],
  config: ExamConfig,
  seen = new Set<string>(),
  errors = new Map<string, number>(),
  random?: () => number,
) {
  let available = bank.filter((q) => config.topicIds.includes(q.topicId));
  if (config.selection === 'unseen') available = available.filter((q) => !seen.has(q.id));
  if (available.length < config.count)
    throw new AppError(
      422,
      `Hay ${available.length} preguntas disponibles para esta selección. Reduce la cantidad o cambia el modo.`,
      'INSUFFICIENT_QUESTIONS',
    );
  const shuffled = shuffle(available, random);
  if (config.selection === 'errors')
    return shuffled
      .sort((a, b) => (errors.get(b.id) ?? 0) - (errors.get(a.id) ?? 0))
      .slice(0, config.count);
  // Round-robin coverage across topics; shuffled queues prevent positional bias.
  const queues = shuffle(config.topicIds, random).map((id) =>
    shuffled.filter((q) => q.topicId === id),
  );
  const selected: Question[] = [];
  while (selected.length < config.count)
    for (const queue of queues) {
      const next = queue.shift();
      if (next) selected.push(next);
      if (selected.length === config.count) break;
    }
  return shuffle(selected, random);
}
