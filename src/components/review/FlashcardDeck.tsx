import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, RotateCcw } from 'lucide-react';
import type { Flashcards } from '../../../server/routes/api';
import { catalog } from '../../../shared/catalog';
import { api } from '../../lib/api';
export default function FlashcardDeck() {
  const [cards, setCards] = useState<Flashcards>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [topic, setTopic] = useState('all');
  const [index, setIndex] = useState(0),
    [flipped, setFlipped] = useState(false),
    [busy, setBusy] = useState(false),
    [reviewed, setReviewed] = useState(0);
  useEffect(() => {
    const initial = new URLSearchParams(location.search).get('topic');
    if (initial) setTopic(initial);
    api<Flashcards>('/flashcards')
      .then(setCards)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  const deck = cards.filter((c) => topic === 'all' || c.topicId === topic),
    card = deck[index % Math.max(1, deck.length)];
  async function rate(rating: 'again' | 'good') {
    if (!card) return;
    setBusy(true);
    setError('');
    try {
      await api('/flashcards/' + card.id + '/reviews', {
        method: 'POST',
        body: JSON.stringify({ rating }),
      });
      setReviewed((n) => n + 1);
      setCards((old) =>
        old.map((c) => (c.id === card.id ? { ...c, reviewCount: c.reviewCount + 1 } : c)),
      );
      setIndex((n) => (n + 1) % deck.length);
      setFlipped(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="review-workspace">
      <label className="field" style={{ maxWidth: 370 }}>
        Filtrar tarjetas por tópico
        <select
          value={topic}
          onChange={(e) => {
            setTopic(e.target.value);
            setIndex(0);
            setFlipped(false);
          }}
        >
          <option value="all">Todos los tópicos</option>
          {catalog.topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p className="loading-state" role="status">
          Preparando las tarjetas…
        </p>
      ) : !card ? (
        <div className="empty-state">
          <h2>Aún no hay tarjetas para este tópico</h2>
          <p>Selecciona otro tópico o incorpora tarjetas siguiendo la guía editorial.</p>
        </div>
      ) : (
        <>
          <p className="card-counter">
            Tarjeta {(index % deck.length) + 1} de {deck.length} · {reviewed} revisadas en esta
            sesión
          </p>
          <article className="flashcard">
            <small>
              {catalog.topics.find((t) => t.id === card.topicId)?.title} · Muestra provisional
            </small>
            <h2>{card.front}</h2>
            {flipped ? (
              <div className="card-answer" role="status">
                {card.back}
              </div>
            ) : (
              <button className="button secondary" onClick={() => setFlipped(true)}>
                Mostrar respuesta
              </button>
            )}
          </article>
          {flipped && (
            <div className="review-controls">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => void rate('again')}
              >
                <RotateCcw size={16} />
                Volver a estudiar
              </button>
              <button className="button" disabled={busy} onClick={() => void rate('good')}>
                Lo recordé
                <ArrowRight size={16} />
              </button>
            </div>
          )}
          <div style={{ textAlign: 'center' }}>
            <a className="text-link" href={card.readingUrl}>
              <BookOpen size={15} />
              Consultar el concepto en su lectura
            </a>
            <p className="muted" style={{ fontSize: '.8rem', marginTop: 8 }}>
              Revisiones anteriores de esta tarjeta: {card.reviewCount}.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
