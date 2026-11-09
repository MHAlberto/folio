import questionsData from '../../content/questions.json';
import cardsData from '../../content/flashcards.json';
import { catalog, topicById, bookById, readingUrl } from '../../shared/catalog';
import { syllabus } from '../../shared/syllabus';
import { flashcardSchema, questionSchema, type PublicQuestion } from '../../shared/schemas/content';
import type { ExamConfig } from '../../shared/schemas/api';
import { AppError } from '../types';
import { StudyRepository, type AttemptRow, type QuestionRow } from '../repositories/study';
import { selectQuestions } from './selection';

const bank = questionsData.map((q) => questionSchema.parse(q));
const cards = cardsData.map((c) => flashcardSchema.parse(c));
export const catalogWithCounts = () => ({
  ...catalog,
  syllabus,
  topics: catalog.topics.map((t) => ({
    ...t,
    questionCount: bank.filter((q) => q.topicId === t.id).length,
  })),
});
const summary = (a: AttemptRow) => ({
  id: a.id,
  mode: a.mode,
  status: a.status,
  questionCount: a.question_count,
  correctCount: a.correct_count,
  score: a.correct_count === null ? null : Math.round((a.correct_count / a.question_count) * 100),
  startedAt: a.started_at,
  deadlineAt: a.deadline_at,
  finishedAt: a.finished_at,
  durationSeconds: a.duration_seconds,
});
const feedback = (q: QuestionRow) => ({
  correctOption: q.correct_option,
  explanation: q.explanation,
  correct: q.option_id === q.correct_option,
  references: JSON.parse(q.references_json) as string[],
});

export class StudyService {
  constructor(private repo: StudyRepository) {}
  async create(config: ExamConfig) {
    if (config.topicIds.some((id) => !topicById(id)))
      throw new AppError(422, 'Uno de los tópicos no existe.');
    const [observations, seenIds] = await Promise.all([
      this.repo.observations(),
      this.repo.seenQuestionIds(),
    ]);
    const seen = new Set(seenIds);
    const errors = new Map<string, number>();
    for (const q of observations)
      if (!q.is_correct) errors.set(q.question_id, (errors.get(q.question_id) ?? 0) + 1);
    const selected = selectQuestions(bank, config, seen, errors);
    const id = crypto.randomUUID();
    await this.repo.create(id, config, selected, new Date().toISOString());
    return this.get(id);
  }
  private async requireAttempt(id: string) {
    const attempt = await this.repo.get(id);
    if (!attempt) throw new AppError(404, 'No se encontró el intento.');
    return attempt;
  }
  async get(id: string) {
    const a = await this.requireAttempt(id);
    const rows = await this.repo.questions(id);
    return {
      ...summary(a),
      config: JSON.parse(a.config_json) as ExamConfig,
      serverNow: new Date().toISOString(),
      questions: rows.map((q) => ({
        ...(JSON.parse(q.public_json) as PublicQuestion),
        selectedOption: q.option_id,
        ...(a.status === 'finished' || (a.mode === 'practice' && q.option_id)
          ? { feedback: feedback(q) }
          : {}),
      })),
    };
  }
  async answer(id: string, questionId: string, optionId: string) {
    const a = await this.requireAttempt(id);
    if (a.status !== 'in_progress') throw new AppError(409, 'El intento ya está finalizado.');
    if (a.deadline_at && Date.parse(a.deadline_at) <= Date.now())
      throw new AppError(
        409,
        'El tiempo ha terminado. Finaliza para ver tus resultados.',
        'TIME_EXPIRED',
      );
    if (!(await this.repo.questions(id)).some((q) => q.question_id === questionId))
      throw new AppError(422, 'La pregunta no pertenece a este intento.');
    const saved = await this.repo.saveAnswer(id, questionId, optionId, new Date().toISOString());
    if (!saved)
      throw new AppError(
        409,
        'No se pudo cambiar la respuesta. La práctica conserva tu primera respuesta.',
      );
    if (a.mode === 'practice')
      return {
        saved: true,
        feedback: feedback(
          (await this.repo.questions(id)).find((q) => q.question_id === questionId)!,
        ),
      };
    return { saved: true };
  }
  async finish(id: string) {
    await this.requireAttempt(id);
    await this.repo.finish(id, new Date().toISOString());
    return this.get(id);
  }
  async history() {
    return (await this.repo.history()).map(summary);
  }
  async analytics() {
    const [observations, attempts, progress, seenIds] = await Promise.all([
      this.repo.observations(),
      this.repo.history(true),
      this.repo.progress(),
      this.repo.seenQuestionIds(),
    ]);
    const finished = attempts.filter((a) => a.status === 'finished');
    const totals = new Map<string, { total: number; correct: number }>();
    const conceptTotals = new Map<string, { total: number; correct: number }>();
    const failures = new Map<string, { question: PublicQuestion; errors: number }>();
    for (const q of observations) {
      const question = JSON.parse(q.public_json) as PublicQuestion;
      const old = totals.get(q.topic_id) ?? { total: 0, correct: 0 };
      old.total++;
      old.correct += q.is_correct ?? 0;
      totals.set(q.topic_id, old);
      for (const c of question.conceptIds) {
        const stat = conceptTotals.get(c) ?? { total: 0, correct: 0 };
        stat.total++;
        stat.correct += q.is_correct ?? 0;
        conceptTotals.set(c, stat);
      }
      if (!q.is_correct)
        failures.set(q.question_id, {
          question,
          errors: (failures.get(q.question_id)?.errors ?? 0) + 1,
        });
    }
    const topics = catalog.topics.map((t) => ({
      id: t.id,
      title: t.title,
      bookId: t.bookId,
      readingUrl: readingUrl(t.id),
      ...(totals.get(t.id) ?? { total: 0, correct: 0 }),
    }));
    const concepts = catalog.topics.flatMap((t) =>
      t.concepts.map((c) => ({
        id: c.id,
        title: c.title,
        topicId: t.id,
        readingUrl: readingUrl(t.id, c.id),
        ...(conceptTotals.get(c.id) ?? { total: 0, correct: 0 }),
      })),
    );
    const weakConcepts = concepts
      .filter((c) => c.total > c.correct)
      .sort((a, b) => a.correct / a.total - b.correct / b.total || b.total - a.total);
    return {
      completedAttempts: finished.length,
      correct: observations.filter((q) => q.is_correct).length,
      answered: observations.filter((q) => q.option_id).length,
      evaluated: observations.length,
      questionBank: bank.length,
      seenQuestions: seenIds.filter((id) => bank.some((q) => q.id === id)).length,
      completedReadings: progress.filter((p) => p.status === 'completed').length,
      totalReadings: catalog.topics.length,
      subjects: catalog.subjects.map((s) => {
        const rows = topics.filter((t) => bookById(t.bookId)?.subjectId === s.id);
        return {
          ...s,
          total: rows.reduce((n, t) => n + t.total, 0),
          correct: rows.reduce((n, t) => n + t.correct, 0),
        };
      }),
      topics,
      concepts,
      weakConcepts,
      frequentErrors: [...failures.values()].sort((a, b) => b.errors - a.errors).slice(0, 10),
      timeline: finished
        .slice()
        .reverse()
        .map((a) => ({
          date: a.finished_at!,
          score: Math.round((a.correct_count! / a.question_count) * 100),
          id: a.id,
        })),
    };
  }
  async getProgress() {
    return this.repo.progress();
  }
  async setProgress(topic: string, status: 'reading' | 'completed') {
    if (!topicById(topic)) throw new AppError(422, 'El tópico no existe.');
    await this.repo.saveProgress(topic, status, new Date().toISOString());
    return this.repo.progress();
  }
  async profile() {
    return this.repo.profile();
  }
  async saveProfile(profile: {
    displayName: string;
    textSize: 'normal' | 'large';
    readingWidth: 'normal' | 'wide';
  }) {
    await this.repo.saveProfile(profile);
    return this.repo.profile();
  }
  async flashcards() {
    const reviews = await this.repo.cardReviews();
    return cards.map((c) => ({
      ...c,
      readingUrl: readingUrl(c.topicId, c.conceptId),
      reviewCount: reviews.filter((r) => r.cardId === c.id).length,
      lastReview: reviews.find((r) => r.cardId === c.id) ?? null,
    }));
  }
  async reviewCard(id: string, rating: 'again' | 'good') {
    if (!cards.some((c) => c.id === id)) throw new AppError(404, 'La tarjeta no existe.');
    await this.repo.reviewCard(id, rating, new Date().toISOString());
    return { saved: true };
  }
}
