import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
test('acceso directo con progreso separado por navegador', async ({ page, browser }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Biblioteca', exact: true })).toBeVisible();
  const cookies = await page.context().cookies();
  expect(cookies.some((cookie) => cookie.name === 'folio-visitor' && cookie.httpOnly)).toBe(true);
  await page.request.put('/api/v1/progress', {
    data: { topicId: 'espanol-01', status: 'completed' },
  });
  const created = await page.request.post('/api/v1/exams', {
    data: { topicIds: ['espanol-01'], count: 1, mode: 'exam', selection: 'random' },
  });
  expect(created.status()).toBe(201);
  const attempt = await created.json();
  const other = await browser.newContext({ baseURL: 'http://127.0.0.1:8788' });
  try {
    const otherPage = await other.newPage();
    await otherPage.goto('/');
    expect(await (await other.request.get('/api/v1/progress')).json()).toEqual([]);
    expect(await (await other.request.get('/api/v1/attempts')).json()).toEqual([]);
    expect((await other.request.get('/api/v1/attempts/' + attempt.id)).status()).toBe(404);
  } finally {
    await other.close();
  }
  await page.reload();
  expect(await (await page.request.get('/api/v1/progress')).json()).toEqual([
    expect.objectContaining({ topicId: 'espanol-01', status: 'completed' }),
  ]);
  expect((await page.request.get('/api/v1/attempts/' + attempt.id)).status()).toBe(200);
});
test('biblioteca → lectura → práctica → simulacro → resultados → diagnóstico → repaso', async ({
  page,
  request,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Biblioteca', exact: true })).toBeVisible();
  await expect(page.locator('.book-entry:visible')).toHaveCount(10);
  await page.getByRole('button', { name: 'Física', exact: true }).click();
  await expect(page.locator('.book-entry:visible')).toHaveCount(1);
  await page.getByRole('button', { name: 'Todas las materias' }).click();
  await page.getByRole('searchbox', { name: 'Buscar libros' }).fill('álgebra');
  await expect(page.locator('.book-entry:visible')).toHaveCount(1);
  await page.getByRole('searchbox', { name: 'Buscar libros' }).fill('');
  await page.evaluate(() => document.fonts.ready);
  await mkdir('output/playwright', { recursive: true });
  await page.screenshot({
    path: 'output/playwright/library-' + info.project.name + '.png',
    fullPage: true,
  });
  await page.getByRole('link', { name: 'Abrir Matemáticas', exact: true }).click();
  await page.getByRole('link', { name: 'Comenzar a leer' }).click();
  await expect(page.locator('.katex').first()).toBeVisible();
  await page.locator('.mermaid-container').scrollIntoViewIfNeeded();
  await expect(page.locator('.mermaid-target svg')).toBeVisible({ timeout: 20000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: 'output/playwright/reading-' + info.project.name + '.png',
    fullPage: true,
  });
  const complete = page.getByRole('button', { name: 'Marcar como leída' });
  if (await complete.count()) await complete.click();
  await expect(page.getByRole('button', { name: 'Completada', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Completada', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Practicar este tópico', exact: true }).click();
  await page.getByLabel('Cantidad de preguntas').fill('2');
  await page.getByRole('button', { name: 'Comenzar evaluación' }).click();
  await expect(page.getByRole('heading', { name: 'Comprueba lo aprendido' })).toBeVisible();
  await expect(page.getByRole('timer', { name: 'Tiempo transcurrido' })).toBeVisible();
  const initialTime = await page.getByRole('timer').locator('time').textContent();
  await expect(page.getByRole('timer').locator('time')).not.toHaveText(initialTime!);
  await page.getByRole('radio').first().click();
  await expect(page.locator('.feedback')).toBeVisible();
  await page.getByRole('button', { name: 'Finalizar evaluación', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar y ver resultados' }).click();
  await expect(page.getByRole('heading', { name: 'Resultados de la evaluación' })).toBeVisible();
  await page.goto('/simulacros/?mode=exam');
  await page.getByLabel('Cantidad de preguntas').fill('4');
  await page.getByLabel('Límite de tiempo, en minutos').fill('5');
  const created = page.waitForResponse(
    (r) => r.url().endsWith('/api/v1/exams') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Comenzar evaluación' }).click();
  const response = await (await created).json();
  expect(JSON.stringify(response)).not.toMatch(/correctOption|explanation|correct_option/);
  expect(new Set(response.questions.map((q: { topicId: string }) => q.topicId)).size).toBe(4);
  await expect(page.getByRole('heading', { name: 'Simulacro de admisión' })).toBeVisible();
  const promptBounds = await page.locator('.question-prompt').boundingBox();
  expect(
    Math.abs(promptBounds!.x + promptBounds!.width / 2 - page.viewportSize()!.width / 2),
  ).toBeLessThan(3);
  await expect(page.getByRole('timer', { name: 'Tiempo restante' })).toBeVisible();
  await expect(page.getByRole('timer').locator('time')).toHaveText(/^0[45]:\d{2}$/);
  await page.getByRole('radio').first().click();
  await expect(page.getByText('Respuesta guardada en tu intento.')).toBeVisible();
  await expect(page.locator('.feedback')).toHaveCount(0);
  const url = page.url();
  await page.screenshot({
    path: 'output/playwright/exam-' + info.project.name + '.png',
    fullPage: true,
  });
  await page.reload();
  await expect(page.locator('.question-map .answered')).toHaveCount(1);
  await page.getByRole('button', { name: 'Finalizar evaluación', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar y ver resultados' }).click();
  await expect(page.getByRole('heading', { name: 'Resultados de la evaluación' })).toBeVisible();
  await page.screenshot({
    path: 'output/playwright/results-' + info.project.name + '.png',
    fullPage: true,
  });
  const concept = page.locator('.review-question .text-link').first(),
    href = await concept.getAttribute('href');
  expect(href).toContain('#');
  await concept.click();
  await expect(
    page.locator(page.url().split('#')[1] ? '#' + page.url().split('#')[1] : '.prose'),
  ).toBeVisible();
  await page.goto(url);
  await expect(page.getByRole('heading', { name: 'Resultados de la evaluación' })).toBeVisible();
  await page.getByRole('link', { name: 'Ver mi diagnóstico' }).click();
  await expect(page.getByRole('heading', { name: 'Conceptos para volver a leer' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Volver a la lectura' }).first()).toBeVisible();
  await page.goto('/repaso/?topic=ecuaciones-lineales');
  await page.getByRole('button', { name: 'Mostrar respuesta' }).click();
  await expect(page.locator('.card-answer')).toBeVisible();
  await page.getByRole('button', { name: 'Lo recordé' }).click();
  await expect(page.getByText(/1 revisadas en esta sesión/)).toBeVisible();
  const health = await request.get('/api/v1/health');
  expect(health.status()).toBe(200);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(
    false,
  );
});
test('preferencias y navegación ocultable en escritorio y móvil', async ({ page }) => {
  await page.goto('/configuracion/');
  await page.getByLabel('Tamaño del texto').selectOption('large');
  await page.getByRole('button', { name: 'Guardar preferencias' }).click();
  await expect(page.getByText('Preferencias guardadas.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Tamaño del texto')).toHaveValue('large');
  await page.getByLabel('Tamaño del texto').selectOption('normal');
  await page.getByRole('button', { name: 'Guardar preferencias' }).click();
  {
    await expect(page.locator('#sidebar')).toHaveAttribute('inert', '');
    await page.getByRole('button', { name: 'Abrir navegación' }).click();
    await expect(page.locator('#sidebar')).not.toHaveAttribute('inert', '');
    await expect(page.locator('#sidebar')).toBeInViewport();
    await page.keyboard.press('Escape');
    await expect(page.locator('#sidebar')).toHaveAttribute('inert', '');
    await expect(page.getByRole('button', { name: 'Abrir navegación' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await page.reload();
    await expect(page.locator('#sidebar')).toHaveAttribute('inert', '');
  }
});
test('Español: preguntas activas, continuar lectura, revisar pendientes y repetir configuración', async ({
  page,
  request,
}, info) => {
  await page.goto('/biblioteca/lengua-escrita/');
  await page.getByRole('link', { name: 'Comenzar a leer' }).click();
  await expect(page).toHaveURL(/\/lectura\/espanol-01\//);
  await expect(
    page.getByRole('heading', { name: 'Lengua y comunicación', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Borrador en revisión', { exact: true })).toBeVisible();
  await page.locator('.mermaid-container').first().scrollIntoViewIfNeeded();
  await expect(page.locator('.mermaid-target svg')).toHaveCount(2);
  await expect(page.getByText('20 preguntas disponibles', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Practicar este tópico', exact: true }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: 'output/playwright/espanol-01-' + info.project.name + '.png',
    fullPage: true,
  });
  await page.screenshot({ path: 'output/playwright/espanol-01-top-' + info.project.name + '.png' });
  expect((await request.get('/content/drafts/questions/espanol-01.json')).status()).toBe(404);
  expect((await request.get('/content/editorial/espanol-01/questions-source.json')).status()).toBe(
    404,
  );
  const response = await request.get('/api/v1/catalog');
  const data = await response.json();
  expect(data.topics.find((t: { id: string }) => t.id === 'espanol-01')).toMatchObject({
    status: 'draft',
    questionCount: 20,
    pendingQuestionCount: 0,
  });
  await page.goto('/');
  await page.getByRole('link', { name: 'Continuar con: Lengua y comunicación' }).click();
  await expect(page).toHaveURL(/\/lectura\/espanol-01\//);
  await page.getByRole('link', { name: 'Practicar este tópico', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: /Lengua y comunicación/ })).toBeChecked();
  await page.getByLabel('Cantidad de preguntas').fill('3');
  await page.getByLabel('Límite de tiempo, en minutos').fill('2');
  const created = page.waitForResponse(
    (r) => r.url().endsWith('/api/v1/exams') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Comenzar evaluación' }).click();
  const attempt = await (await created).json();
  expect(attempt.questions.every((q: { topicId: string }) => q.topicId === 'espanol-01')).toBe(
    true,
  );
  await page.getByRole('radio').first().click();
  await expect(page.locator('.feedback')).toBeVisible();
  await page.getByRole('button', { name: 'Ir al reactivo 3', exact: true }).click();
  await page.getByRole('button', { name: 'Ir a primera sin responder' }).click();
  await expect(page.locator('.question-label')).toContainText('Reactivo 2 de 3');
  await page.getByRole('button', { name: 'Finalizar evaluación', exact: true }).click();
  await page.getByRole('button', { name: 'Revisar pendientes' }).click();
  await expect(page.getByRole('region', { name: 'Confirmar finalización' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Finalizar evaluación', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar y ver resultados' }).click();
  await page.getByRole('link', { name: 'Repetir configuración' }).click();
  await expect(page.getByLabel('Cantidad de preguntas')).toHaveValue('3');
  await expect(page.getByLabel('Límite de tiempo, en minutos')).toHaveValue('2');
  await expect(page.getByRole('checkbox', { name: /Lengua y comunicación/ })).toBeChecked();
  const repeated = page.waitForResponse(
    (r) => r.url().endsWith('/api/v1/exams') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Comenzar evaluación' }).click();
  const next = await (await repeated).json();
  expect(next.id).not.toBe(attempt.id);
  expect(next.config).toEqual(attempt.config);
});
