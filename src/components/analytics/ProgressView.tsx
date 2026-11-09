import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, ChartNoAxesColumn } from 'lucide-react';
import { api, percent } from '../../lib/api';
import type { Analytics, History } from '../../../server/routes/api';
import { HistoryTable } from '../exams/ExamWorkspace';

export default function ProgressView() {
  const [data, setData] = useState<Analytics | null>(null),
    [rows, setRows] = useState<History>([]),
    [error, setError] = useState('');
  useEffect(() => {
    Promise.all([api<Analytics>('/analytics'), api<History>('/attempts')])
      .then(([a, h]) => {
        setData(a);
        setRows(h);
      })
      .catch((e) => setError(e.message));
  }, []);
  if (error)
    return (
      <p className="error-message" role="alert">
        {error}{' '}
        <button className="text-link" onClick={() => location.reload()}>
          Volver a intentar
        </button>
      </p>
    );
  if (!data)
    return (
      <p className="loading-state" role="status">
        Consultando tu progreso…
      </p>
    );
  return (
    <>
      <div className="stats-grid">
        {[
          ['Evaluaciones terminadas', data.completedAttempts],
          ['Aciertos', data.evaluated ? percent(data.correct, data.evaluated) + ' %' : '—'],
          ['Cobertura del banco', data.seenQuestions + ' / ' + data.questionBank],
          ['Lecturas completadas', data.completedReadings + ' / ' + data.totalReadings],
        ].map(([label, value]) => (
          <div className="stat" key={label}>
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>
      {!data.completedAttempts ? (
        <section className="empty-state">
          <ChartNoAxesColumn size={32} strokeWidth={1} style={{ margin: 'auto' }} />
          <h2>Tu recorrido empieza con una pregunta</h2>
          <p>
            Completa una práctica o un simulacro para descubrir qué conceptos dominas y cuáles
            conviene volver a leer.
          </p>
          <a className="button" href="/simulacros/">
            Preparar una evaluación
            <ArrowRight size={16} />
          </a>
        </section>
      ) : (
        <>
          <div className="analytics-columns">
            <section>
              <div className="section-heading">
                <h2>Rendimiento por materia</h2>
              </div>
              {data.subjects.map((s) => (
                <div className="performance-row" key={s.id}>
                  <div className="performance-heading">
                    <span>{s.title}</span>
                    <small>{s.total ? percent(s.correct, s.total) + ' %' : 'Sin evaluar'}</small>
                  </div>
                  <div
                    className="progress-track"
                    role="img"
                    aria-label={s.title + ': ' + s.correct + ' correctas de ' + s.total}
                  >
                    <div
                      className="progress-fill"
                      style={{ width: percent(s.correct, s.total) + '%' }}
                    />
                  </div>
                  <small className="muted">
                    {s.correct} de {s.total} reactivos correctos
                  </small>
                </div>
              ))}
            </section>
            <section>
              <div className="section-heading">
                <h2>Conceptos para volver a leer</h2>
              </div>
              {data.weakConcepts.length ? (
                data.weakConcepts.slice(0, 4).map((c) => (
                  <article className="recommendation" key={c.id}>
                    <h3>{c.title}</h3>
                    <p>
                      {c.total - c.correct} errores en {c.total} oportunidades.{' '}
                      {c.total < 3 ? 'Muestra inicial; conviene reunir más evidencia.' : ''}
                    </p>
                    <a className="text-link" href={c.readingUrl}>
                      Volver a la lectura
                      <BookOpen size={15} />
                    </a>
                  </article>
                ))
              ) : (
                <p className="notice">
                  No hay conceptos con errores registrados. Amplía la cobertura con preguntas no
                  vistas.
                </p>
              )}
            </section>
          </div>
          <div className="analytics-columns">
            <section>
              <h2>Evolución de resultados</h2>
              {data.timeline.length < 2 ? (
                <p className="muted" style={{ marginTop: 16 }}>
                  Completa una segunda evaluación para comparar tus resultados.
                </p>
              ) : (
                <>
                  <svg
                    className="sparkline"
                    viewBox="0 0 600 160"
                    role="img"
                    aria-label="Evolución de calificaciones, de la más antigua a la más reciente"
                  >
                    <path d="M35 15V130H585" fill="none" stroke="#cdd6cd" />
                    {[0, 50, 100].map((n) => (
                      <g key={n}>
                        <text x="27" y={134 - n} textAnchor="end" fontSize="11" fill="#667174">
                          {n}
                        </text>
                        <path
                          d={'M35 ' + (130 - n) + 'H585'}
                          stroke="#e2e5e2"
                          strokeDasharray="3 5"
                        />
                      </g>
                    ))}
                    <polyline
                      points={data.timeline
                        .slice(-20)
                        .map(
                          (p, i, a) =>
                            40 + (i * 535) / Math.max(1, a.length - 1) + ',' + (130 - p.score),
                        )
                        .join(' ')}
                      fill="none"
                      stroke="#5b7d65"
                      strokeWidth="2"
                    />
                    {data.timeline.slice(-20).map((p, i, a) => (
                      <circle
                        key={p.id}
                        cx={40 + (i * 535) / Math.max(1, a.length - 1)}
                        cy={130 - p.score}
                        r="3"
                        fill="#5b7d65"
                      >
                        <title>{p.score + ' %'}</title>
                      </circle>
                    ))}
                  </svg>
                  <p className="muted" style={{ fontSize: '.82rem' }}>
                    Últimas {Math.min(20, data.timeline.length)} evaluaciones, en orden de
                    finalización. Incluye práctica y simulacro.
                  </p>
                </>
              )}
            </section>
            <section>
              <h2>Rendimiento por tópico</h2>
              {data.topics
                .filter((t) => t.total)
                .map((t) => (
                  <div className="performance-row" key={t.id}>
                    <div className="performance-heading">
                      <a href={t.readingUrl}>{t.title}</a>
                      <small>{percent(t.correct, t.total)} %</small>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: percent(t.correct, t.total) + '%' }}
                      />
                    </div>
                  </div>
                ))}
            </section>
          </div>
          <section style={{ marginBottom: 35 }}>
            <h2>Preguntas que conviene revisar</h2>
            {data.frequentErrors.length ? (
              data.frequentErrors.slice(0, 5).map((q) => (
                <article className="recommendation" key={q.question.id}>
                  <p style={{ color: 'var(--ink)' }}>{q.question.prompt}</p>
                  <small className="muted">
                    {q.errors} {q.errors === 1 ? 'error registrado' : 'errores registrados'}
                  </small>
                </article>
              ))
            ) : (
              <p className="muted" style={{ marginTop: 15 }}>
                No hay errores registrados.
              </p>
            )}
            <a
              className="text-link"
              style={{ marginTop: 18 }}
              href="/simulacros/?selection=errors&mode=practice"
            >
              Practicar priorizando errores
              <ArrowRight size={15} />
            </a>
          </section>
          <section>
            <div className="section-heading">
              <h2>Inventario de conceptos</h2>
              <small>Las preguntas pueden evaluar más de un concepto.</small>
            </div>
            <table className="history-table">
              <thead>
                <tr>
                  <th scope="col">Concepto</th>
                  <th scope="col">Aciertos</th>
                  <th scope="col">Lectura</th>
                </tr>
              </thead>
              <tbody>
                {data.concepts.map((c) => (
                  <tr key={c.id}>
                    <td>{c.title}</td>
                    <td>{c.total ? c.correct + ' / ' + c.total : 'Sin evaluar'}</td>
                    <td>
                      <a href={c.readingUrl} className="text-link">
                        Abrir concepto
                        <BookOpen size={14} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
      {rows.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <div className="section-heading">
            <h2>Historial de evaluaciones</h2>
            <small>Incluye intentos en curso</small>
          </div>
          <HistoryTable rows={rows} />
        </section>
      )}
    </>
  );
}
