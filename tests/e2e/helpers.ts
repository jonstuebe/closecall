import type { Page } from '@playwright/test';

/** A Puzzle the tests control, so the suite doesn't depend on today's date. */
export const TEST_PUZZLE = {
  id: 1,
  answer: 'raccoon',
  display: 'a raccoon',
  accept: ['raccoon', 'racoon', 'trash panda'],
  // A real file from public/photos, so the viewfinder has something to show.
  photo: { file: 'fc33cddafbfa396b.jpg', width: 1024, height: 768, credit: 'Raccoon face, SciPy sample data' },
  focus: { x: 0.52, y: 0.3 },
  zooms: [10, 7, 4.5, 3, 1.8, 1],
  fact: 'Raccoons are clever.',
};

/** Serves the test Puzzle for any date, so the game is the same every run. */
export async function stubPuzzle(page: Page, number = 1, puzzle = TEST_PUZZLE): Promise<void> {
  await page.route('**/api/puzzle/*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ number, puzzle }) }),
  );
}

/** Opens the game past the first-run help dialog. */
export async function openGame(page: Page): Promise<void> {
  await page.goto('/');
  const start = page.getByRole('button', { name: 'Start playing' });
  if (await start.isVisible()) await start.click();
}

export async function guess(page: Page, text: string): Promise<void> {
  await page.getByRole('combobox', { name: 'Your guess' }).fill(text);
  await page.getByRole('button', { name: 'Guess', exact: true }).click();
}

/** Dismisses the stats dialog that slides in after the reveal. */
export async function closeStats(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog', { name: 'Statistics' });
  await dialog.waitFor();
  await dialog.getByRole('button', { name: 'Close' }).click();
  await dialog.waitFor({ state: 'hidden' });
}
