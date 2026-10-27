import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { closeStats, guess, openGame, stubPuzzle } from './helpers';

const scan = (page: Page) => new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();

test.beforeEach(async ({ page }) => stubPuzzle(page));

test('the help dialog, the board and the reveal are accessible', async ({ page }) => {
  await page.goto('/');
  expect((await scan(page)).violations).toEqual([]);

  await page.getByRole('button', { name: 'Start playing' }).click();
  expect((await scan(page)).violations).toEqual([]);

  await guess(page, 'raccoon');
  await closeStats(page);
  expect((await scan(page)).violations).toEqual([]);
});

test('statistics and settings are accessible', async ({ page }) => {
  await openGame(page);
  await page.getByRole('button', { name: 'Statistics' }).click();
  expect((await scan(page)).violations).toEqual([]);

  await page.getByRole('dialog', { name: 'Statistics' }).getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  expect((await scan(page)).violations).toEqual([]);
});

test('the game is playable by keyboard alone', async ({ page }) => {
  await openGame(page);
  const input = page.getByRole('combobox', { name: 'Your guess' });
  await input.focus();
  await input.type('racc');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('option', { name: 'raccoon' })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Enter');
  await expect(input).toHaveValue('raccoon');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'A raccoon!' })).toBeVisible();
});
