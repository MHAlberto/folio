PRAGMA foreign_keys = ON;
CREATE TABLE students (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  text_size TEXT NOT NULL DEFAULT 'normal' CHECK(text_size IN ('normal','large')),
  reading_width TEXT NOT NULL DEFAULT 'normal' CHECK(reading_width IN ('normal','wide')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT INTO students(id,display_name) VALUES('local-student','Estudiante');
CREATE TABLE reading_progress (
  student_id TEXT NOT NULL REFERENCES students(id),
  topic_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('reading','completed')),
  updated_at TEXT NOT NULL,
  PRIMARY KEY(student_id,topic_id)
);
CREATE TABLE attempts (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  config_json TEXT NOT NULL CHECK(json_valid(config_json)),
  mode TEXT NOT NULL CHECK(mode IN ('practice','exam')),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress','finished')),
  question_count INTEGER NOT NULL CHECK(question_count > 0),
  correct_count INTEGER,
  started_at TEXT NOT NULL,
  deadline_at TEXT,
  finished_at TEXT,
  duration_seconds INTEGER
);
CREATE INDEX idx_attempts_student_date ON attempts(student_id,started_at DESC);
CREATE TABLE attempt_questions (
  attempt_id TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  topic_id TEXT NOT NULL,
  public_json TEXT NOT NULL CHECK(json_valid(public_json)),
  correct_option TEXT NOT NULL CHECK(correct_option IN ('A','B','C','D')),
  explanation TEXT NOT NULL,
  references_json TEXT NOT NULL,
  PRIMARY KEY(attempt_id,question_id),
  UNIQUE(attempt_id,ordinal)
);
CREATE TABLE answers (
  attempt_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  option_id TEXT NOT NULL CHECK(option_id IN ('A','B','C','D')),
  answered_at TEXT NOT NULL,
  is_correct INTEGER CHECK(is_correct IN (0,1)),
  PRIMARY KEY(attempt_id,question_id),
  FOREIGN KEY(attempt_id,question_id) REFERENCES attempt_questions(attempt_id,question_id) ON DELETE CASCADE
);
CREATE INDEX idx_questions_topic ON attempt_questions(topic_id,question_id);
CREATE TABLE flashcard_reviews (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  card_id TEXT NOT NULL,
  rating TEXT NOT NULL CHECK(rating IN ('again','good')),
  reviewed_at TEXT NOT NULL
);
CREATE INDEX idx_reviews_student_card ON flashcard_reviews(student_id,card_id,reviewed_at DESC);
