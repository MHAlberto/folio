# Contrato editorial de Folio

ChatGPT puede preparar borradores externos. El propietario revisa exactitud, fuentes, atribuciones y permisos; Codex integra y valida. No hay CMS ni generación automática por IA.

## Archivos

| Archivo                              | Responsabilidad                                    |
| ------------------------------------ | -------------------------------------------------- |
| content/catalog.json                 | Materias, libros, tópicos, conceptos y referencias |
| content/books/[bookId]/[topicId].mdx | Una lectura por tópico                             |
| content/questions.json               | Banco privado del servidor                         |
| content/flashcards.json              | Tarjetas de repaso                                 |
| public/assets/                       | Recursos locales con atribución                    |

Los IDs usan letras minúsculas sin acentos, números y guiones. Deben ser estables. No reutilices un ID para un concepto diferente.

## Libro y tópico

Los tópicos incluyen status: demo, draft o reviewed. Un borrador aportado para revisión no se convierte en material aprobado al importarlo. pendingQuestionCount refleja cuántas preguntas permanecen fuera del banco activo.

El índice general se conserva en content/syllabus.json: diez cuadernos, 74 apartados y sus páginas de origen. Cada apartado tiene number, title, page y readingTopicIds. Una lista vacía significa material pendiente, sin crear un capítulo ficticio. Las lecturas específicas del catálogo se vinculan a estos apartados como subtópicos. Cuando se añada una lectura, registra su ID en el apartado correspondiente. El título y la edición de la guía siguen pendientes; no se deducen a partir de la paginación.

Un libro define id, subjectId, title, subtitle, description, author, edition y provisional. No debe atribuirse a un autor publicado un cuaderno original de Folio.

Un tópico define id, bookId, number, title, description, minutes, concepts, references y subtopics. Su número ordena la lectura dentro del libro. Cada concepto necesita id, title y anchor. Los subtemas llevan title y anchor. Usa un ID explícito en los encabezados para que enlaces de diagnóstico y anclas no cambien al editar el título.

```mdx
---
topicId: ejemplo-tema
title: Título que coincide con el catálogo
provisional: true
---

<h2 id="concepto-ejemplo">Un concepto</h2>

<Definition title="Definición">Una explicación revisada.</Definition>

<Formula tex="a^2+b^2=c^2" label="Con las hipótesis correspondientes." />

<Example>Un ejemplo resuelto y comprobado.</Example>

<ConceptNote kind="amber" title="Condición">
  Explicita los límites.
</ConceptNote>

<Citation id="fuente-existente" />
```

Los componentes se ofrecen desde la ruta de lectura. También están disponibles Figure, MermaidDiagram, FunctionPlot y ComparisonTable.

Las fórmulas inline usan dólares. Los bloques pueden usar doble dólar o Formula. KaTeX no permite comandos de confianza. Mermaid usa securityLevel strict y carga diferida; limita cada diagrama a lo que ayude a comprender.

```mdx
<Figure
  src="/assets/figura.svg"
  alt="Descripción informativa"
  caption="Qué muestra la figura"
  attribution="Autor y licencia"
  source="https://fuente.example/recurso"
/>

<MermaidDiagram
  code={'flowchart LR\nA["Concepto"] --> B["Consecuencia"]'}
  caption="Relación conceptual."
/>

<ComparisonTable
  headers={['Propiedad', 'Descripción']}
  rows={[['Una propiedad', 'Su explicación']]}
  caption="Comparación"
/>
```

No introduzcas scripts ni importaciones de terceros sin revisión de código. El MDX ejecuta código durante la compilación. Su compilación correcta no prueba su seguridad ni la verdad de sus afirmaciones.

## Referencias

Cada referencia define id, title, author, year y url HTTPS. Confirma la edición, la fecha y la dirección contra la fuente original. Cada tópico y pregunta debe referir a IDs existentes. SourceList se genera desde el catálogo.

## Reactivos

```json
{
  "id": "tema-001",
  "topicId": "ejemplo-tema",
  "conceptIds": ["concepto-ejemplo"],
  "prompt": "Enunciado sin ambigüedad.",
  "options": [
    { "id": "A", "text": "Una opción" },
    { "id": "B", "text": "Otra opción" },
    { "id": "C", "text": "Una tercera opción" },
    { "id": "D", "text": "La última opción" }
  ],
  "correctOption": "B",
  "explanation": "Justificación suficiente y comprobable.",
  "references": ["fuente-existente"]
}
```

Debe haber exactamente una opción correcta, cuatro IDs distintos A–D y distractores plausibles. Evita patrones involuntarios de claves y ambigüedades. Cada concepto pertenece al tópico de la pregunta. Esta primera versión presenta texto Unicode en las opciones; el renderizado matemático enriquecido de reactivos queda para una ampliación.

## Tarjetas

```json
{
  "id": "tarjeta-tema-001",
  "topicId": "ejemplo-tema",
  "conceptId": "concepto-ejemplo",
  "front": "Una pregunta de recuperación activa.",
  "back": "Una respuesta breve y precisa."
}
```

La estructura inicial es textual. Puede contener notación Unicode. Fórmulas KaTeX y diagramas en tarjetas se incorporarán con un contrato explícito.

## Validación y revisión

Los bancos pendientes viven en content/drafts/questions. Se validan con draftQuestionBankSchema: IDs, opciones, claves, conceptos, referencias, sección de origen y procedencia. El generador del servidor importa únicamente content/questions.json, por lo que los borradores no participan en simulacros. No copies preguntas pendientes al banco activo sin una revisión explícita.

Los originales recibidos para la primera unidad están en content/editorial/espanol-01 y quedan fuera de las colecciones Astro y de los assets. La lectura adaptada usa el ID canónico espanol-01. Se conserva la correspondencia con ESP-001 y con los IDs originales de sus veinte preguntas. Varios conceptos pueden compartir el ancla de una misma sección.

La unidad Lengua y comunicación conserva el estado de revisión. Los siete reactivos del libro no fueron entregados completos; sus comentarios y claves se guardan solo en el original editorial, sin inventar enunciados ni agregarlos al motor. Los dos diagramas del texto se integran como MermaidDiagram.

Ejecuta npm run content:validate y npm run build. El validador comprueba esquemas Zod, IDs únicos, relaciones, orden por libro, opciones, referencias, anclas, correspondencia MDX y archivos locales. Astro compila el MDX y verifica los componentes y las fórmulas.

El validador no hace revisión académica ni comprueba enlaces externos o licencias automáticamente. Revisa la lectura renderizada y ejecuta el flujo de preguntas antes de aceptar material definitivo.

Para solicitar material a ChatGPT, proporciona el catálogo de IDs, los esquemas de shared/schemas/content.ts, el alcance exacto y las fuentes revisadas. Pide los archivos separados, las hipótesis y las atribuciones. Marca provisional cualquier contenido pendiente de revisión.
