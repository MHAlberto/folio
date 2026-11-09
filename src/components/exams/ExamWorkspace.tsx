import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Clock, FileText, BookOpen } from 'lucide-react';
import type { Attempt, History } from '../../../server/routes/api';
import type { ExamConfig } from '../../../shared/schemas/api';
import type { Catalog } from '../../../shared/schemas/content';
import { catalog, readingUrl, topicById } from '../../../shared/catalog';
import { api, ApiError, dateLabel } from '../../lib/api';

type CatalogCounts = Omit<Catalog, 'topics'> & {
  topics: (Catalog['topics'][number] & { questionCount: number })[];
};
export default function ExamWorkspace() {
  const [attempt, setAttempt] = useState<Attempt | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const [data, setData] = useState<CatalogCounts | null>(null),
    [historyRows, setHistoryRows] = useState<History>([]);
  const [selected, setSelected] = useState<string[]>([]),
    [mode, setMode] = useState<ExamConfig['mode']>('practice');
  const [selection, setSelection] = useState<ExamConfig['selection']>('random'),
    [count, setCount] = useState(5),
    [minutes, setMinutes] = useState('');
  const [busy, setBusy] = useState(false),
    [index, setIndex] = useState(0),
    [confirm, setConfirm] = useState(false),
    [remaining, setRemaining] = useState<number | null>(null);
  const offset = useRef(0),
    heading = useRef<HTMLHeadingElement>(null);
  const autoFinished = useRef(false);
  const adopt = useCallback((value: Attempt) => {
    offset.current = Date.parse(value.serverNow) - Date.now();
    setAttempt(value);
    setConfirm(false);
    setIndex(
      value.questions.findIndex((q) => !q.selectedOption) >= 0
        ? value.questions.findIndex((q) => !q.selectedOption)
        : 0,
    );
  }, []);
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(location.search);
    const id = params.get('intento');
    async function load() {
      try {
        if (id) {
          const value = await api<Attempt>('/attempts/' + encodeURIComponent(id));
          if (!cancelled) adopt(value);
        } else {
          const [value, rows] = await Promise.all([
            api<CatalogCounts>('/catalog'),
            api<History>('/attempts'),
          ]);
          if (cancelled) return;
          setData(value);
          setHistoryRows(rows);
          const topic = params.get('topic'),
            book = params.get('book');
          setSelected(
            value.topics
              .filter((t) => (topic ? t.id === topic : book ? t.bookId === book : true))
              .map((t) => t.id),
          );
          if (topic) setCount(5);
          setMode(params.get('mode') === 'exam' ? 'exam' : 'practice');
          const strategy = params.get('selection');
          if (strategy && ['random', 'unseen', 'errors', 'cumulative'].includes(strategy))
            setSelection(strategy as ExamConfig['selection']);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [adopt]);
  const finish = useCallback(async () => {
    if (!attempt) return;
    setBusy(true);
    setError('');
    try {
      const result = await api<Attempt>('/attempts/' + attempt.id + '/finish', {
        method: 'POST',
        body: '{}',
      });
      setAttempt(result);
      setConfirm(false);
      window.scrollTo({ top: 0 });
      heading.current?.focus();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [attempt]);
  useEffect(() => {
    if (!attempt?.deadlineAt || attempt.status !== 'in_progress') {
      setRemaining(null);
      return;
    }
    const tick = () =>
      setRemaining(
        Math.max(
          0,
          Math.ceil((Date.parse(attempt.deadlineAt!) - Date.now() - offset.current) / 1000),
        ),
      );
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [attempt?.deadlineAt, attempt?.status]);
  useEffect(() => {
    if (remaining === 0 && attempt?.status === 'in_progress' && !busy && !autoFinished.current) {
      autoFinished.current = true;
      void finish();
    }
  }, [remaining, attempt?.status, busy, finish]);
  const available =
    data?.topics.filter((t) => selected.includes(t.id)).reduce((n, t) => n + t.questionCount, 0) ??
    0;
  function toggle(ids: string[], checked: boolean) {
    setSelected((old) =>
      checked ? [...new Set([...old, ...ids])] : old.filter((id) => !ids.includes(id)),
    );
  }
  async function create(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const value = await api<Attempt>('/exams', {
        method: 'POST',
        body: JSON.stringify({
          topicIds: selected,
          count,
          mode,
          selection,
          timeLimitMinutes: minutes ? Number(minutes) : null,
        }),
      });
      adopt(value);
      history.replaceState(null, '', '/simulacros/?intento=' + value.id);
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function answer(optionId: string) {
    if (!attempt || busy) return;
    const question = attempt.questions[index]!;
    setBusy(true);
    setError('');
    try {
      const result = await api<{
        saved: boolean;
        feedback?: NonNullable<Attempt['questions'][number]['feedback']>;
      }>('/attempts/' + attempt.id + '/answers', {
        method: 'POST',
        body: JSON.stringify({ questionId: question.id, optionId }),
      });
      setAttempt((old) =>
        old
          ? {
              ...old,
              questions: old.questions.map((q) =>
                q.id === question.id
                  ? {
                      ...q,
                      selectedOption: optionId,
                      ...(result.feedback ? { feedback: result.feedback } : {}),
                    }
                  : q,
              ),
            }
          : old,
      );
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError && e.code === 'TIME_EXPIRED') setRemaining(0);
    } finally {
      setBusy(false);
    }
  }
  function navigate(to: number) {
    setIndex(to);
    heading.current?.focus();
  }
  if (loading)
    return (
      <p className="loading-state" role="status">
        Preparando tu espacio de evaluación…
      </p>
    );
  if (!attempt)
    return (
      <>
        <div className="page-heading">
          <div>
            <p className="eyebrow">Aprender también es ponerse a prueba</p>
            <h1>Simulacros y práctica</h1>
            <p>
              Elige lo que quieres repasar. Combina tópicos, libros y materias en una misma
              evaluación.
            </p>
          </div>
          <FileText size={30} strokeWidth={1} />
        </div>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        {!data ? (
          <p className="notice">
            No se pudo cargar la configuración.{' '}
            <button className="text-link" onClick={() => location.reload()}>
              Volver a intentar
            </button>
          </p>
        ) : (
          <form onSubmit={create} className="form-grid">
            <div>
              <section className="form-section">
                <h2>Modalidad</h2>
                <p className="form-description">Cada forma de estudiar tiene su momento.</p>
                <div className="radio-options">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="mode"
                      value="practice"
                      checked={mode === 'practice'}
                      onChange={() => setMode('practice')}
                    />
                    Práctica
                    <small>
                      Revisa la explicación después de responder. Se conserva tu primera respuesta.
                    </small>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="mode"
                      value="exam"
                      checked={mode === 'exam'}
                      onChange={() => setMode('exam')}
                    />
                    Simulacro
                    <small>Responde sin explicaciones. Consulta tus resultados al finalizar.</small>
                  </label>
                </div>
              </section>
              <section className="form-section">
                <h2>Contenido de la evaluación</h2>
                <p className="form-description">
                  Selecciona materias completas o tópicos específicos.
                </p>
                {data.subjects.map((subject) => {
                  const books = data.books.filter((b) => b.subjectId === subject.id),
                    ids = data.topics
                      .filter((t) => books.some((b) => b.id === t.bookId))
                      .map((t) => t.id);
                  return (
                    <div className="book-check-group" key={subject.id}>
                      <label className="check-row">
                        <input
                          type="checkbox"
                          disabled={ids.length === 0}
                          checked={ids.length > 0 && ids.every((id) => selected.includes(id))}
                          onChange={(e) => toggle(ids, e.target.checked)}
                        />
                        <strong>{subject.title}</strong>
                        {ids.length === 0 && <small>Sin preguntas todavía</small>}
                      </label>
                      {books.map((book) => {
                        const topics = data.topics.filter((t) => t.bookId === book.id),
                          bookIds = topics.map((t) => t.id);
                        return (
                          <div key={book.id}>
                            <label className="check-row topic-check">
                              <input
                                type="checkbox"
                                disabled={bookIds.length === 0}
                                checked={
                                  bookIds.length > 0 && bookIds.every((id) => selected.includes(id))
                                }
                                onChange={(e) => toggle(bookIds, e.target.checked)}
                              />
                              <span>{book.title}</span>
                            </label>
                            {topics.map((topic) => (
                              <label
                                className="check-row"
                                style={{ paddingLeft: 54 }}
                                key={topic.id}
                              >
                                <input
                                  type="checkbox"
                                  checked={selected.includes(topic.id)}
                                  onChange={(e) => toggle([topic.id], e.target.checked)}
                                />
                                <span>{topic.title}</span>
                                <small>{topic.questionCount} preguntas</small>
                              </label>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </section>
              <section className="form-section">
                <h2>Selección y tiempo</h2>
                <label className="field">
                  Cómo elegir las preguntas
                  <select
                    value={selection}
                    onChange={(e) => setSelection(e.target.value as ExamConfig['selection'])}
                  >
                    <option value="random">Aleatorio con cobertura de tópicos</option>
                    <option value="unseen">Solo preguntas no vistas</option>
                    <option value="errors">Priorizar errores anteriores</option>
                    <option value="cumulative">Simulacro acumulativo</option>
                  </select>
                </label>
                <label className="field">
                  Cantidad de preguntas
                  <input
                    type="number"
                    min="1"
                    max={Math.min(100, available) || 1}
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    required
                  />
                  <small>
                    El banco de muestra tiene {available} preguntas en los tópicos seleccionados.
                  </small>
                </label>
                <label className="field">
                  Límite de tiempo, en minutos <span className="muted">(opcional)</span>
                  <input
                    type="number"
                    min="1"
                    max="240"
                    placeholder="Sin límite de tiempo"
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                  />
                  <small>
                    El tiempo comienza al crear el intento y continúa si cierras la página.
                  </small>
                </label>
              </section>
            </div>
            <aside className="selection-summary">
              <h2>Tu evaluación</h2>
              <div className="summary-line">
                <span>Modalidad</span>
                <strong>{mode === 'practice' ? 'Práctica' : 'Simulacro'}</strong>
              </div>
              <div className="summary-line">
                <span>Tópicos</span>
                <strong>{selected.length}</strong>
              </div>
              <div className="summary-line">
                <span>Preguntas</span>
                <strong>{count}</strong>
              </div>
              <div className="summary-line">
                <span>Tiempo</span>
                <strong>{minutes ? minutes + ' min' : 'Sin límite'}</strong>
              </div>
              <button
                className="button"
                disabled={busy || selected.length === 0 || count < 1 || count > available}
              >
                {busy ? 'Creando intento…' : 'Comenzar evaluación'}
                <ArrowRight size={16} />
              </button>
              <p>
                Las respuestas se guardan conforme avanzas. Podrás retomar el intento desde tu
                historial.
              </p>
              <span className="badge provisional" style={{ marginTop: 15 }}>
                Banco provisional
              </span>
            </aside>
          </form>
        )}
        {historyRows.length > 0 && (
          <section style={{ marginTop: 35 }}>
            <h2>Intentos recientes</h2>
            <HistoryTable rows={historyRows.slice(0, 5)} />
            <a className="text-link" href="/progreso/" style={{ marginTop: 15 }}>
              Ver todo el historial <ArrowRight size={15} />
            </a>
          </section>
        )}
      </>
    );
  if (attempt.status === 'finished') return <Results attempt={attempt} error={error} />;
  const question = attempt.questions[index]!,
    answered = attempt.questions.filter((q) => q.selectedOption).length;
  return (
    <>
      <div className="exam-toolbar">
        <div>
          <small>
            {attempt.mode === 'practice' ? 'Práctica de estudio' : 'Cuadernillo de evaluación'}
          </small>
          <h1>
            {attempt.mode === 'practice' ? 'Comprueba lo aprendido' : 'Simulacro de admisión'}
          </h1>
        </div>
        {remaining !== null ? (
          <div className="timer" role="timer" aria-label="Tiempo restante">
            <Clock size={17} />
            {Math.floor(remaining / 60)
              .toString()
              .padStart(2, '0')}
            :{(remaining % 60).toString().padStart(2, '0')}
          </div>
        ) : (
          <span className="muted">Sin límite de tiempo</span>
        )}
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {confirm && (
        <section className="confirm-panel" role="region" aria-label="Confirmar finalización">
          <h2>¿Finalizar la evaluación?</h2>
          <p>
            {answered < attempt.questionCount
              ? 'Quedan ' +
                (attempt.questionCount - answered) +
                ' preguntas sin responder. Se contarán como incorrectas.'
              : 'Todas tus respuestas están guardadas.'}{' '}
            Después de finalizar podrás revisar las explicaciones.
          </p>
          <button className="button" disabled={busy} onClick={() => void finish()}>
            {busy ? 'Calificando…' : 'Confirmar y ver resultados'}
          </button>
          <button className="button secondary" onClick={() => setConfirm(false)}>
            Seguir respondiendo
          </button>
        </section>
      )}
      <div className="exam-grid">
        <div>
          <section className="question-sheet">
            <p className="question-label">
              Reactivo {index + 1} de {attempt.questionCount} ·{' '}
              {topicById(question.topicId)?.title ?? question.topicId}
            </p>
            <h2 ref={heading} tabIndex={-1} className="question-prompt">
              {question.prompt}
            </h2>
            <div className="answer-options" role="radiogroup" aria-label="Opciones de respuesta">
              {question.options.map((o) => (
                <button
                  key={o.id}
                  className="answer-option"
                  role="radio"
                  aria-checked={question.selectedOption === o.id}
                  disabled={busy || (attempt.mode === 'practice' && !!question.selectedOption)}
                  onKeyDown={(e) => {
                    if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key)) {
                      e.preventDefault();
                      const target =
                        e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                          'button',
                        );
                      const next =
                        (question.options.findIndex((x) => x.id === o.id) +
                          (['ArrowDown', 'ArrowRight'].includes(e.key) ? 1 : 3)) %
                        4;
                      target?.[next]?.focus();
                    }
                  }}
                  onClick={() => void answer(o.id)}
                >
                  <span className="option-letter">{o.id}</span>
                  <span>{o.text}</span>
                </button>
              ))}
            </div>
            <p className="save-status" role="status">
              {busy
                ? 'Guardando respuesta…'
                : question.selectedOption
                  ? 'Respuesta guardada en tu intento.'
                  : 'Selecciona una respuesta para guardarla.'}
            </p>
            {question.feedback && (
              <div
                className={'feedback' + (question.feedback.correct ? '' : ' incorrect')}
                role="status"
              >
                <strong>
                  {question.feedback.correct ? 'Respuesta correcta' : 'Respuesta por revisar'} ·
                  Opción {question.feedback.correctOption}
                </strong>
                <p>{question.feedback.explanation}</p>
                <a
                  className="text-link"
                  href={readingUrl(question.topicId, question.conceptIds[0])}
                >
                  Volver al concepto <BookOpen size={15} />
                </a>
              </div>
            )}
          </section>
          <nav className="question-navigation" aria-label="Navegación de reactivos">
            <button
              className="button secondary"
              onClick={() => navigate(index - 1)}
              disabled={index === 0 || busy}
            >
              <ArrowLeft size={16} />
              Anterior
            </button>
            <span className="muted" style={{ fontSize: '.83rem' }}>
              {index + 1} / {attempt.questionCount}
            </span>
            <button
              className="button secondary"
              onClick={() => navigate(index + 1)}
              disabled={index === attempt.questionCount - 1 || busy}
            >
              Siguiente
              <ArrowRight size={16} />
            </button>
          </nav>
        </div>
        <aside className="exam-aside">
          <h2>Hoja de respuestas</h2>
          <div className="question-map">
            {attempt.questions.map((q, i) => (
              <button
                key={q.id}
                className={(q.selectedOption ? 'answered ' : '') + (i === index ? 'current' : '')}
                onClick={() => navigate(i)}
                disabled={busy}
                aria-label={'Ir al reactivo ' + (i + 1) + (q.selectedOption ? ', respondido' : '')}
                aria-current={i === index ? 'step' : undefined}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <p>
            {answered} de {attempt.questionCount} respuestas guardadas.
          </p>
          <p>
            {attempt.mode === 'exam'
              ? 'Las explicaciones estarán disponibles al finalizar.'
              : 'Revisa cada explicación y relaciona los conceptos con su lectura.'}
          </p>
          <button
            className="button"
            onClick={() => {
              setConfirm(true);
              window.scrollTo({ top: 0 });
            }}
            disabled={busy}
          >
            Finalizar evaluación
            <Check size={16} />
          </button>
          <p>Puedes cerrar la página y retomar este intento en Progreso.</p>
        </aside>
      </div>
    </>
  );
}

export function HistoryTable({ rows }: { rows: History }) {
  return (
    <table className="history-table">
      <thead>
        <tr>
          <th scope="col">Fecha</th>
          <th scope="col">Modalidad</th>
          <th scope="col">Preguntas</th>
          <th scope="col">Resultado</th>
          <th scope="col">
            <span className="sr-only">Abrir intento</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((a) => (
          <tr key={a.id}>
            <td>{dateLabel(a.startedAt)}</td>
            <td>{a.mode === 'practice' ? 'Práctica' : 'Simulacro'}</td>
            <td>{a.questionCount}</td>
            <td>{a.status === 'finished' ? a.score + ' %' : 'En curso'}</td>
            <td>
              <a className="text-link" href={'/simulacros/?intento=' + a.id}>
                {a.status === 'finished' ? 'Revisar' : 'Retomar'}
                <ArrowRight size={14} />
              </a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function Results({ attempt, error }: { attempt: Attempt; error: string }) {
  const incorrect = attempt.questions.filter((q) => !q.feedback?.correct),
    [showAll, setShowAll] = useState(true);
  const questions = showAll ? attempt.questions : incorrect;
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Una guía para tu siguiente lectura</p>
          <h1 tabIndex={-1}>Resultados de la evaluación</h1>
          <p>
            {dateLabel(attempt.finishedAt!)} ·{' '}
            {attempt.mode === 'practice' ? 'Práctica' : 'Simulacro'} · Resultado guardado
          </p>
        </div>
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <section className="result-overview">
        <div className="score">
          {attempt.score}
          <small> %</small>
        </div>
        <div>
          <h2>
            {attempt.correctCount === attempt.questionCount
              ? 'Una base bien comprendida'
              : 'Cada error señala una lectura'}
          </h2>
          <p>
            {attempt.correctCount} correctas de {attempt.questionCount} preguntas.{' '}
            {attempt.questions.filter((q) => !q.selectedOption).length} sin responder.
          </p>
          <p>
            Duración: {Math.floor((attempt.durationSeconds ?? 0) / 60)} min{' '}
            {(attempt.durationSeconds ?? 0) % 60} s.
          </p>
        </div>
      </section>
      <div className="result-actions">
        <a href="/progreso/" className="button">
          Ver mi diagnóstico
          <ArrowRight size={16} />
        </a>
        <a href={'/simulacros/?selection=errors&mode=practice'} className="button secondary">
          Practicar mis errores
        </a>
        <a href="/repaso/" className="button secondary">
          Repasar con tarjetas
        </a>
      </div>
      <div className="section-heading" style={{ marginTop: 40 }}>
        <h2>Revisión de respuestas</h2>
        <button className="filter" aria-pressed={!showAll} onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Ver solo errores' : 'Ver todas'}
        </button>
      </div>
      {!questions.length && <p className="notice">No hay errores en esta evaluación.</p>}
      {questions.map((q) => (
        <article className="review-question" key={q.id}>
          <p
            className={q.feedback?.correct ? 'status-good' : 'status-bad'}
            style={{ fontSize: '.82rem', marginBottom: 10 }}
          >
            {q.feedback?.correct ? 'Correcta' : q.selectedOption ? 'Incorrecta' : 'Sin responder'} ·
            Reactivo {attempt.questions.indexOf(q) + 1}
          </p>
          <h3>{q.prompt}</h3>
          <p>
            Tu respuesta:{' '}
            {q.selectedOption
              ? q.selectedOption + '. ' + q.options.find((o) => o.id === q.selectedOption)?.text
              : 'Sin responder'}
          </p>
          <p>
            <strong>
              Respuesta correcta: {q.feedback?.correctOption}.{' '}
              {q.options.find((o) => o.id === q.feedback?.correctOption)?.text}
            </strong>
          </p>
          <p>{q.feedback?.explanation}</p>
          {q.conceptIds.map((id) => (
            <a
              key={id}
              className="text-link"
              style={{ marginRight: 20 }}
              href={readingUrl(q.topicId, id)}
            >
              <BookOpen size={15} />
              Leer:{' '}
              {catalog.topics.flatMap((t) => t.concepts).find((c) => c.id === id)?.title ?? id}
            </a>
          ))}
        </article>
      ))}
    </>
  );
}
