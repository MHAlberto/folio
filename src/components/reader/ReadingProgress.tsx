import { useEffect, useState } from 'react';
import { Check, BookOpen } from 'lucide-react';
import { api } from '../../lib/api';
export default function ReadingProgress({ topicId }: { topicId: string }) {
  const [done, setDone] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    api<{ topicId: string; status: string }[]>('/progress', {
      method: 'PUT',
      body: JSON.stringify({ topicId, status: 'reading' }),
    })
      .then((rows) => setDone(rows.some((p) => p.topicId === topicId && p.status === 'completed')))
      .catch((e) => setError(e.message));
  }, [topicId]);
  async function complete() {
    setBusy(true);
    setError('');
    try {
      await api('/progress', {
        method: 'PUT',
        body: JSON.stringify({ topicId, status: 'completed' }),
      });
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <div className="reading-completion">
        <div>
          <strong>{done ? 'Lectura completada' : 'Una pausa para integrar lo leído'}</strong>
          <p>
            {done
              ? 'Tu progreso está guardado. Puedes volver cuando lo necesites.'
              : 'Al terminar, marca esta lectura y practica sus conceptos.'}
          </p>
        </div>
        <button className="button" onClick={complete} disabled={busy || done}>
          {done ? <Check size={17} /> : <BookOpen size={17} />}{' '}
          {done ? 'Completada' : 'Marcar como leída'}
        </button>
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
