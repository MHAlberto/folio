import type { ExamConfig } from '../../shared/schemas/api';
import type { PublicQuestion, Question } from '../../shared/schemas/content';

export interface AttemptRow {
  id: string;
  student_id: string;
  config_json: string;
  mode: 'practice' | 'exam';
  status: 'in_progress' | 'finished';
  question_count: number;
  correct_count: number | null;
  started_at: string;
  deadline_at: string | null;
  finished_at: string | null;
  duration_seconds: number | null;
}
export interface QuestionRow {
  question_id: string;
  topic_id: string;
  public_json: string;
  correct_option: string;
  explanation: string;
  references_json: string;
  option_id: string | null;
  is_correct: number | null;
}
export const publicQuestion = (q: Question): PublicQuestion => ({
  id: q.id,
  topicId: q.topicId,
  conceptIds: q.conceptIds,
  prompt: q.prompt,
  options: q.options,
});

export class StudyRepository {
  constructor(
    private db: D1Database,
    private student: string,
  ) {}
  async ensureProfile() {
    if (!(await this.profile()))
      await this.db
        .prepare('INSERT OR IGNORE INTO students(id,display_name) VALUES(?,?)')
        .bind(this.student, 'Estudiante')
        .run();
  }
  async create(id: string, config: ExamConfig, questions: Question[], now: string) {
    const deadline = config.timeLimitMinutes
      ? new Date(Date.parse(now) + config.timeLimitMinutes * 60_000).toISOString()
      : null;
    await this.db.batch([
      this.db
        .prepare(
          'INSERT INTO attempts(id,student_id,config_json,mode,question_count,started_at,deadline_at) VALUES(?,?,?,?,?,?,?)',
        )
        .bind(
          id,
          this.student,
          JSON.stringify(config),
          config.mode,
          questions.length,
          now,
          deadline,
        ),
      ...questions.map((q, i) =>
        this.db
          .prepare(
            'INSERT INTO attempt_questions(attempt_id,question_id,ordinal,topic_id,public_json,correct_option,explanation,references_json) VALUES(?,?,?,?,?,?,?,?)',
          )
          .bind(
            id,
            q.id,
            i + 1,
            q.topicId,
            JSON.stringify(publicQuestion(q)),
            q.correctOption,
            q.explanation,
            JSON.stringify(q.references),
          ),
      ),
    ]);
  }
  get(id: string) {
    return this.db
      .prepare('SELECT * FROM attempts WHERE id=? AND student_id=?')
      .bind(id, this.student)
      .first<AttemptRow>();
  }
  async questions(id: string) {
    return (
      await this.db
        .prepare(
          'SELECT q.*, a.option_id, a.is_correct FROM attempt_questions q LEFT JOIN answers a ON q.attempt_id=a.attempt_id AND q.question_id=a.question_id JOIN attempts t ON t.id=q.attempt_id WHERE q.attempt_id=? AND t.student_id=? ORDER BY q.ordinal',
        )
        .bind(id, this.student)
        .all<QuestionRow>()
    ).results;
  }
  async saveAnswer(id: string, question: string, option: string, now: string) {
    // The condition is checked inside the write, so a concurrent finish cannot accept a late answer.
    const result = await this.db
      .prepare(
        `INSERT INTO answers(attempt_id,question_id,option_id,answered_at)
      SELECT q.attempt_id,q.question_id,?,? FROM attempt_questions q JOIN attempts t ON t.id=q.attempt_id
      WHERE t.id=? AND t.student_id=? AND q.question_id=? AND t.status='in_progress'
      AND (t.deadline_at IS NULL OR t.deadline_at>?)
      ON CONFLICT(attempt_id,question_id) DO UPDATE SET option_id=excluded.option_id,answered_at=excluded.answered_at
      WHERE (SELECT mode FROM attempts WHERE id=excluded.attempt_id)='exam'`,
      )
      .bind(option, now, id, this.student, question, now)
      .run();
    return result.meta.changes > 0;
  }
  async finish(id: string, now: string) {
    // D1 batch is transactional. Repeated submissions leave the original result unchanged.
    await this.db.batch([
      this.db
        .prepare(
          `UPDATE answers SET is_correct=(option_id=(SELECT correct_option FROM attempt_questions q WHERE q.attempt_id=answers.attempt_id AND q.question_id=answers.question_id))
        WHERE attempt_id=? AND EXISTS(SELECT 1 FROM attempts WHERE id=? AND student_id=? AND status='in_progress')`,
        )
        .bind(id, id, this.student),
      this.db
        .prepare(
          `UPDATE attempts SET status='finished',finished_at=CASE WHEN deadline_at IS NOT NULL AND deadline_at<? THEN deadline_at ELSE ? END,
        duration_seconds=MAX(0,CAST((julianday(CASE WHEN deadline_at IS NOT NULL AND deadline_at<? THEN deadline_at ELSE ? END)-julianday(started_at))*86400 AS INTEGER)),
        correct_count=(SELECT COUNT(*) FROM answers WHERE attempt_id=? AND is_correct=1)
        WHERE id=? AND student_id=? AND status='in_progress'`,
        )
        .bind(now, now, now, now, id, id, this.student),
    ]);
  }
  async history(all = false) {
    return (
      await this.db
        .prepare(
          'SELECT * FROM attempts WHERE student_id=? ORDER BY started_at DESC' +
            (all ? '' : ' LIMIT 100'),
        )
        .bind(this.student)
        .all<AttemptRow>()
    ).results;
  }
  async seenQuestionIds() {
    const rows = await this.db
      .prepare(
        'SELECT DISTINCT q.question_id FROM attempt_questions q JOIN attempts t ON t.id=q.attempt_id WHERE t.student_id=?',
      )
      .bind(this.student)
      .all<{ question_id: string }>();
    return rows.results.map((q) => q.question_id);
  }
  async observations() {
    return (
      await this.db
        .prepare(
          `SELECT q.*, a.option_id,COALESCE(a.is_correct,0) AS is_correct
      FROM attempt_questions q JOIN attempts t ON t.id=q.attempt_id
      LEFT JOIN answers a ON a.attempt_id=q.attempt_id AND a.question_id=q.question_id
      WHERE t.student_id=? AND t.status='finished'`,
        )
        .bind(this.student)
        .all<QuestionRow>()
    ).results;
  }
  async progress() {
    return (
      await this.db
        .prepare(
          'SELECT topic_id AS topicId,status,updated_at AS updatedAt FROM reading_progress WHERE student_id=? ORDER BY updated_at DESC,topic_id',
        )
        .bind(this.student)
        .all<{ topicId: string; status: string; updatedAt: string }>()
    ).results;
  }
  async saveProgress(topic: string, status: string, now: string) {
    await this.db
      .prepare(
        `INSERT INTO reading_progress(student_id,topic_id,status,updated_at) VALUES(?,?,?,?)
      ON CONFLICT(student_id,topic_id) DO UPDATE SET status=CASE WHEN reading_progress.status='completed' THEN 'completed' ELSE excluded.status END,updated_at=excluded.updated_at`,
      )
      .bind(this.student, topic, status, now)
      .run();
  }
  profile() {
    return this.db
      .prepare(
        'SELECT display_name AS displayName,text_size AS textSize,reading_width AS readingWidth FROM students WHERE id=?',
      )
      .bind(this.student)
      .first<{
        displayName: string;
        textSize: 'normal' | 'large';
        readingWidth: 'normal' | 'wide';
      }>();
  }
  async saveProfile(profile: { displayName: string; textSize: string; readingWidth: string }) {
    await this.db
      .prepare('UPDATE students SET display_name=?,text_size=?,reading_width=? WHERE id=?')
      .bind(profile.displayName, profile.textSize, profile.readingWidth, this.student)
      .run();
  }
  async cardReviews() {
    return (
      await this.db
        .prepare(
          'SELECT card_id AS cardId,rating,reviewed_at AS reviewedAt FROM flashcard_reviews WHERE student_id=? ORDER BY reviewed_at DESC',
        )
        .bind(this.student)
        .all<{ cardId: string; rating: string; reviewedAt: string }>()
    ).results;
  }
  async reviewCard(card: string, rating: string, now: string) {
    await this.db
      .prepare(
        'INSERT INTO flashcard_reviews(id,student_id,card_id,rating,reviewed_at) VALUES(?,?,?,?,?)',
      )
      .bind(crypto.randomUUID(), this.student, card, rating, now)
      .run();
  }
}
