import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import matter from 'gray-matter';
import { compile } from '@mdx-js/mdx';
import { z } from 'zod';
import { catalogSchema, questionSchema, flashcardSchema } from '../shared/schemas/content';
import { syllabusSchema } from '../shared/syllabus';

const readJson = async (file: string) => JSON.parse(await readFile(file, 'utf8'));
async function files(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory() ? files(path.join(dir, e.name)) : Promise.resolve([path.join(dir, e.name)]),
      ),
    )
  ).flat();
}
export async function validateContent(root = process.cwd()) {
  const catalog = catalogSchema.parse(await readJson(path.join(root, 'content/catalog.json')));
  const questions = z
    .array(questionSchema)
    .parse(await readJson(path.join(root, 'content/questions.json')));
  const cards = z
    .array(flashcardSchema)
    .parse(await readJson(path.join(root, 'content/flashcards.json')));
  const syllabus = syllabusSchema.parse(await readJson(path.join(root, 'content/syllabus.json')));
  const errors: string[] = [];
  const unique = (ids: string[], label: string) => {
    if (new Set(ids).size !== ids.length) errors.push('IDs duplicados en ' + label);
  };
  unique(
    catalog.subjects.map((s) => s.id),
    'materias',
  );
  unique(
    catalog.books.map((b) => b.id),
    'libros',
  );
  unique(
    catalog.topics.map((t) => t.id),
    'tópicos',
  );
  unique(
    catalog.references.map((r) => r.id),
    'referencias',
  );
  unique(
    questions.map((q) => q.id),
    'preguntas',
  );
  unique(
    cards.map((c) => c.id),
    'tarjetas',
  );
  unique(
    catalog.topics.flatMap((t) => t.concepts.map((c) => c.id)),
    'conceptos',
  );
  const references = new Set(catalog.references.map((r) => r.id)),
    topicMap = new Map(catalog.topics.map((t) => [t.id, t]));
  for (const b of catalog.books)
    if (!catalog.subjects.some((s) => s.id === b.subjectId))
      errors.push('Materia inexistente: ' + b.id);
  for (const b of catalog.books) {
    const topics = catalog.topics.filter((t) => t.bookId === b.id);
    unique(
      topics.map((t) => String(t.number)),
      'orden del libro ' + b.id,
    );
    if (!syllabus.books.some((s) => s.bookId === b.id)) errors.push('Libro sin temario: ' + b.id);
  }
  unique(
    syllabus.books.map((b) => b.bookId),
    'libros del temario',
  );
  const linkedReadings: string[] = [];
  for (const b of syllabus.books) {
    if (!catalog.books.some((book) => book.id === b.bookId))
      errors.push('Libro inexistente en el temario: ' + b.bookId);
    unique(
      b.topics.map((t) => String(t.number)),
      'orden del temario ' + b.bookId,
    );
    for (const topic of b.topics)
      for (const id of topic.readingTopicIds) {
        if (!catalog.topics.some((t) => t.id === id && t.bookId === b.bookId))
          errors.push('Lectura ajena al libro del temario: ' + id);
        linkedReadings.push(id);
      }
  }
  unique(linkedReadings, 'asignaciones de lecturas al temario');
  for (const t of catalog.topics)
    if (!linkedReadings.includes(t.id)) errors.push('Lectura fuera del temario: ' + t.id);
  for (const t of catalog.topics) {
    if (!catalog.books.some((b) => b.id === t.bookId)) errors.push('Libro inexistente: ' + t.id);
    unique(
      t.concepts.map((c) => c.anchor),
      'anclas de ' + t.id,
    );
    for (const ref of t.references)
      if (!references.has(ref)) errors.push('Referencia inexistente: ' + ref);
  }
  for (const q of questions) {
    const topic = topicMap.get(q.topicId);
    if (!topic) errors.push('Tópico inexistente: ' + q.id);
    for (const c of q.conceptIds)
      if (!topic?.concepts.some((x) => x.id === c))
        errors.push('Concepto ajeno al tópico: ' + q.id + ' / ' + c);
    for (const ref of q.references)
      if (!references.has(ref)) errors.push('Referencia inexistente: ' + q.id + ' / ' + ref);
  }
  for (const c of cards)
    if (!topicMap.get(c.topicId)?.concepts.some((x) => x.id === c.conceptId))
      errors.push('Relación inválida de tarjeta: ' + c.id);
  const discovered = new Set<string>();
  for (const file of (await files(path.join(root, 'content/books'))).filter((f) =>
    f.endsWith('.mdx'),
  )) {
    const raw = await readFile(file, 'utf8'),
      { data, content } = matter(raw);
    if (discovered.has(data.topicId)) errors.push('Lectura duplicada: ' + data.topicId);
    discovered.add(data.topicId);
    const topic = topicMap.get(data.topicId);
    if (!topic) errors.push('MDX sin tópico: ' + file);
    else {
      if (data.title !== topic.title) errors.push('Título MDX distinto al catálogo: ' + file);
      if (path.basename(path.dirname(file)) !== topic.bookId)
        errors.push('Carpeta de libro incorrecta: ' + file);
      for (const anchor of [
        ...topic.concepts.map((c) => c.anchor),
        ...topic.subtopics.map((s) => s.anchor),
      ])
        if (!content.includes('id="' + anchor + '"'))
          errors.push('Ancla inexistente: ' + data.topicId + '#' + anchor);
    }
    // MDX is executable, trusted Git content. This validates compilation, not a sandbox.
    await compile(content, { development: false });
    for (const match of content.matchAll(/<(?:Citation)\s+id="([^"]+)"/g))
      if (!references.has(match[1]!)) errors.push('Cita inexistente: ' + match[1]);
    for (const match of content.matchAll(/(?:src|href)="(\/[^"]+)"/g)) {
      const asset = match[1]!.split('#')[0]!;
      if (asset.startsWith('/assets/')) {
        const target = path.resolve(root, 'public', '.' + asset);
        if (!target.startsWith(path.resolve(root, 'public') + path.sep))
          errors.push('Ruta fuera de public: ' + asset);
        else
          try {
            await access(target);
          } catch {
            errors.push('Asset inexistente: ' + asset);
          }
      }
    }
  }
  for (const t of catalog.topics)
    if (!discovered.has(t.id)) errors.push('Falta lectura MDX: ' + t.id);
  if (errors.length) throw new Error(errors.join('\n'));
  return {
    subjects: catalog.subjects.length,
    books: catalog.books.length,
    syllabusTopics: syllabus.books.reduce((n, b) => n + b.topics.length, 0),
    topics: catalog.topics.length,
    questions: questions.length,
    cards: cards.length,
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  validateContent()
    .then((counts) => console.log('Contenido válido:', counts))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
