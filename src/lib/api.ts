export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch('/api/v1' + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const body = (await response.json().catch(() => null)) as {
    error?: { message?: string; code?: string };
  } | null;
  if (!response.ok)
    throw new ApiError(
      body?.error?.message ??
        'No se pudo conectar con Folio. Comprueba tu conexión y vuelve a intentar.',
      body?.error?.code ?? 'NETWORK_ERROR',
      response.status,
    );
  return body as T;
}
export const dateLabel = (value: string) =>
  new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(value),
  );
export const percent = (correct: number, total: number) =>
  total ? Math.round((correct / total) * 100) : 0;
