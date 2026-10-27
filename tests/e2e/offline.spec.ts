import { expect, test } from '@playwright/test';
import { guess, openGame, stubPuzzle } from './helpers';

test('says so when there is no connection and nothing cached', async ({ page }) => {
  await page.route('**/api/puzzle/*', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'No connection' })).toBeVisible();
});

test('recovers when the network comes back', async ({ page }) => {
  let online = false;
  await page.route('**/api/puzzle/*', async (route) => {
    if (!online) return route.abort();
    const { TEST_PUZZLE } = await import('./helpers');
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ number: 1, puzzle: TEST_PUZZLE }) });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Start playing' }).click();
  await expect(page.getByRole('heading', { name: 'No connection' })).toBeVisible();
  online = true;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('Try 1 of 6')).toBeVisible();
});

test('a game started online keeps playing offline', async ({ page }) => {
  await stubPuzzle(page);
  await openGame(page);
  await guess(page, 'fox');

  // The Puzzle is cached; nothing may reach the network from here on.
  await page.unroute('**/api/puzzle/*');
  await page.route('**/api/puzzle/*', (route) => route.abort());
  await page.reload();

  await expect(page.getByText('Try 2 of 6')).toBeVisible();
  await guess(page, 'raccoon');
  await expect(page.getByRole('heading', { name: 'A raccoon!' })).toBeVisible();
});

test('says "back tomorrow" when there is no Puzzle for today', async ({ page }) => {
  await page.route('**/api/puzzle/*', (route) => route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Back tomorrow' })).toBeVisible();
});
