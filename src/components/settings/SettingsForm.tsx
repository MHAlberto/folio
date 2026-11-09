import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { api } from '../../lib/api';
type Profile = {
  displayName: string;
  textSize: 'normal' | 'large';
  readingWidth: 'normal' | 'wide';
};
export default function SettingsForm() {
  const [profile, setProfile] = useState<Profile | null>(null),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    api<Profile>('/profile')
      .then(setProfile)
      .catch((e) => setError(e.message));
  }, []);
  async function save(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      await api('/profile', { method: 'PUT', body: JSON.stringify(profile) });
      document.documentElement.dataset.textSize = profile.textSize;
      document.documentElement.dataset.readingWidth = profile.readingWidth;
      const name = document.getElementById('student-name');
      if (name) name.textContent = profile.displayName;
      const avatar = document.querySelector('.avatar');
      if (avatar) avatar.textContent = profile.displayName.slice(0, 1).toUpperCase();
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!profile)
    return (
      <p className={error ? 'error-message' : 'loading-state'} role={error ? 'alert' : 'status'}>
        {error || 'Consultando tus preferencias…'}
      </p>
    );
  return (
    <form className="settings-form" onSubmit={save}>
      <h2>Tu espacio</h2>
      <label className="field">
        Nombre para mostrar
        <input
          maxLength={60}
          minLength={1}
          required
          value={profile.displayName}
          onChange={(e) => {
            setProfile({ ...profile, displayName: e.target.value });
            setSaved(false);
          }}
        />
        <small>Este nombre se guarda con el progreso de tu navegador.</small>
      </label>
      <h2>Preferencias de lectura</h2>
      <label className="field">
        Tamaño del texto
        <select
          value={profile.textSize}
          onChange={(e) =>
            setProfile({ ...profile, textSize: e.target.value as Profile['textSize'] })
          }
        >
          <option value="normal">Estándar</option>
          <option value="large">Grande</option>
        </select>
      </label>
      <label className="field">
        Ancho de lectura
        <select
          value={profile.readingWidth}
          onChange={(e) =>
            setProfile({ ...profile, readingWidth: e.target.value as Profile['readingWidth'] })
          }
        >
          <option value="normal">Estándar</option>
          <option value="wide">Amplio</option>
        </select>
        <small>En pantallas pequeñas, el texto se adapta al ancho disponible.</small>
      </label>
      <button className="button" disabled={busy}>
        {busy ? 'Guardando…' : 'Guardar preferencias'}
        <Check size={16} />
      </button>
      {saved && (
        <p className="success-message" style={{ marginTop: 18 }} role="status">
          Preferencias guardadas.
        </p>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <div className="notice" style={{ marginTop: 35 }}>
        Tus intentos, lecturas y revisiones se guardan para este navegador. Si borras las cookies o
        utilizas otro navegador, comenzarás un espacio nuevo.
      </div>
    </form>
  );
}
