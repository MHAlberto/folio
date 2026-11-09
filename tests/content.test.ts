import { describe, expect, it } from 'vitest';
import { validateContent } from '../scripts/validate-content';
import { examConfigSchema } from '../shared/schemas/api';
import { questionSchema } from '../shared/schemas/content';
import data from '../content/questions.json';
import { selectQuestions } from '../server/services/selection';
import { readingUrl, catalog } from '../shared/catalog';
const bank = data.map((q) => questionSchema.parse(q));
const config = examConfigSchema.parse({
  topicIds: catalog.topics.map((t) => t.id),
  count: 12,
  mode: 'exam',
  selection: 'random',
});
describe('contenido y selección', () => {
  it('valida catálogo, los 74 tópicos, MDX, preguntas, conceptos, referencias y tarjetas', async () => {
    expect(await validateContent()).toEqual({
      subjects: 10,
      books: 10,
      syllabusTopics: 74,
      topics: 4,
      questions: 20,
      cards: 4,
    });
  });
  it('no repite preguntas y distribuye tópicos de varias materias', () => {
    for (let i = 0; i < 30; i++) {
      const result = selectQuestions(bank, config);
      expect(new Set(result.map((q) => q.id)).size).toBe(12);
      for (const topic of config.topicIds)
        expect(result.filter((q) => q.topicId === topic)).toHaveLength(3);
    }
  });
  it('excluye preguntas vistas', () => {
    const seen = new Set(bank.slice(0, 4).map((q) => q.id));
    const result = selectQuestions(bank, { ...config, selection: 'unseen' }, seen);
    expect(result.every((q) => !seen.has(q.id))).toBe(true);
  });
  it('prioriza preguntas falladas', () => {
    const errors = new Map([
      ['eq-01', 4],
      ['ac-03', 2],
    ]);
    const result = selectQuestions(
      bank,
      { ...config, count: 2, selection: 'errors' },
      new Set(),
      errors,
    );
    expect(result.map((q) => q.id)).toEqual(['eq-01', 'ac-03']);
  });
  it('rechaza cantidades superiores al banco disponible', () => {
    expect(() => selectQuestions(bank, { ...config, count: 21 })).toThrow('20 preguntas');
  });
  it('rechaza claves correctas ausentes y opciones repetidas', () => {
    const q = bank[0]!;
    expect(
      questionSchema.safeParse({
        ...q,
        options: [q.options[0], q.options[0], q.options[2], q.options[3]],
      }).success,
    ).toBe(false);
  });
  it('rechaza tópicos repetidos y usuario o calificación del navegador', () => {
    expect(
      examConfigSchema.safeParse({ ...config, topicIds: ['acentuacion', 'acentuacion'] }).success,
    ).toBe(false);
    expect(examConfigSchema.safeParse({ ...config, userId: 'attacker', score: 100 }).success).toBe(
      false,
    );
  });
  it('vincula conceptos a anclas de lectura estables', () => {
    expect(readingUrl('ecuaciones-lineales', 'despeje')).toBe(
      '/lectura/ecuaciones-lineales/#despeje',
    );
  });
});
