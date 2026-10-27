import { expect, test } from '@playwright/test';
import { closeStats, guess, openGame, stubPuzzle } from './helpers';

test.beforeEach(async ({ page }) => stubPuzzle(page));

test('shows the help dialog on a first visit, once', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('dialog', { name: 'How to play' })).toBeVisible();
  await page.getByRole('button', { name: 'Start playing' }).click();

  await page.reload();
  await expect(page.getByRole('dialog', { name: 'How to play' })).toBeHidden();
});

test('a wrong guess spends a try and zooms out @mobile', async ({ page }) => {
  await openGame(page);
  await expect(page.getByText('Try 1 of 6')).toBeVisible();

  const photo = page.getByRole('img', { name: /mystery animal/ });
  const before = await photo.getAttribute('style');

  await guess(page, 'fox');
  await expect(page.getByText('Try 2 of 6')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'fox' })).toBeVisible();
  await expect.poll(() => photo.getAttribute('style')).not.toBe(before);
});

test('refuses an empty or repeated guess without spending a try', async ({ page }) => {
  await openGame(page);
  await page.getByRole('button', { name: 'Guess', exact: true }).click();
  await expect(page.getByText('Type an animal, or zoom out without guessing.')).toBeVisible();
  await expect(page.getByText('Try 1 of 6')).toBeVisible();

  await guess(page, 'fox');
  await guess(page, 'A FOX');
  await expect(page.getByText('You already tried that one.')).toBeVisible();
  await expect(page.getByText('Try 2 of 6')).toBeVisible();
});

test('zooming out without guessing still costs a try', async ({ page }) => {
  await openGame(page);
  await page.getByRole('button', { name: 'Zoom out without guessing' }).click();
  await expect(page.getByText('Try 2 of 6')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Zoomed out' })).toBeVisible();
});

test('suggests animals and fills one in', async ({ page }) => {
  await openGame(page);
  const input = page.getByRole('combobox', { name: 'Your guess' });
  await input.fill('racc');
  await page.getByRole('option', { name: 'raccoon' }).click();
  await expect(input).toHaveValue('raccoon');
});

test('a correct guess reveals the animal and shares the result', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openGame(page);

  await guess(page, 'fox');
  await guess(page, 'raccoon');

  await expect(page.getByRole('heading', { name: 'A raccoon!' })).toBeVisible();
  await expect(page.getByText('You got it on try 2 of 6.')).toBeVisible();
  await expect(page.getByText('Raccoons are clever.')).toBeVisible();
  await expect(page.getByText(/Raccoon face, SciPy/)).toBeVisible();
  await closeStats(page);

  await page.getByRole('button', { name: 'Share' }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('Close Call #1 2/6');
  expect(copied).toContain('🟥🟩⬛⬛⬛⬛');
  expect(copied).not.toContain('raccoon');
});

test('six wrong tries reveal the answer and score X', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openGame(page);

  for (const animal of ['fox', 'badger', 'otter', 'bear', 'wolf', 'lynx']) await guess(page, animal);

  await expect(page.getByRole('heading', { name: 'It was a raccoon.' })).toBeVisible();
  await closeStats(page);
  await page.getByRole('button', { name: 'Share' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Close Call #1 X/6');
});

test('keeps the game where you left it across a reload', async ({ page }) => {
  await openGame(page);
  await guess(page, 'fox');
  await page.reload();
  await expect(page.getByText('Try 2 of 6')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'fox' })).toBeVisible();
});

test('records the result in statistics', async ({ page }) => {
  await openGame(page);
  await guess(page, 'raccoon');
  const stats = page.getByRole('dialog', { name: 'Statistics' });
  await expect(stats).toBeVisible();
  await expect(stats.getByText('Played').locator('..')).toContainText('1');
  await expect(stats.getByText('Win %').locator('..')).toContainText('100');
});

test('switches theme from settings', async ({ page }) => {
  await openGame(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  // The radio itself is visually hidden behind its label; click what a player clicks.
  await page.getByRole('dialog', { name: 'Settings' }).getByText('Dark', { exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
