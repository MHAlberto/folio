import { StudyRepository } from '../repositories/study';

const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

// The cookie is an opaque bearer credential. Database IDs cannot be used as cookies.
export async function visitorIdentity(cookie?: string) {
  const existing = cookie && /^[a-f0-9]{64}$/.test(cookie) ? cookie : undefined;
  const token = existing ?? hex(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return { token, studentId: 'visitor-' + hex(new Uint8Array(digest)), fresh: !existing };
}

export async function ensureVisitor(db: D1Database, studentId: string) {
  await new StudyRepository(db, studentId).ensureProfile();
}
