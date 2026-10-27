import { describe, expect, it } from 'vitest';
import { handle } from '../../worker/index';
import { parseDateKey } from '../../worker/puzzles';
import { puzzle } from './fixtures';

const PUZZLES = [puzzle({ id: 1 }), puzzle({ id: 2, answer: 'otter' })];
const NOON = parseDateKey('2026-10-26')! + 12 * 3_600_000;
const get = (path: string, now = NOON, method = 'GET') => handle(new Request(`https://closecall.jonstuebe.com${path}`, { method }), now, PUZZLES);

describe('GET /api/puzzle/:date', () => {
  it('serves today’s Puzzle with its number', async () => {
    const res = get('/api/puzzle/2026-10-26');
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ number: 1, puzzle: PUZZLES[0] });
  });

  it('refuses tomorrow, so no one can read ahead', () => {
    expect(get('/api/puzzle/2026-10-28').status).toBe(404);
  });

  it('refuses a date that is over everywhere', () => {
    expect(get('/api/puzzle/2026-10-24').status).toBe(404);
  });

  it('serves tomorrow once it has begun in UTC+14', async () => {
    const res = get('/api/puzzle/2026-10-27', parseDateKey('2026-10-26')! + 11 * 3_600_000);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ number: 2 });
  });

  it('404s once the Puzzles run out', () => {
    expect(handle(new Request('https://x/api/puzzle/2026-10-26'), NOON, []).status).toBe(404);
  });

  it('400s on something that isn’t a date', () => {
    expect(get('/api/puzzle/soon').status).toBe(400);
  });

  it('405s on a write', () => {
    const res = get('/api/puzzle/2026-10-26', NOON, 'POST');
    expect(res.status).toBe(405);
    expect(res.headers.get('Allow')).toBe('GET, HEAD');
  });

  it('404s any other path', () => {
    expect(get('/api/answers').status).toBe(404);
  });

  it('lets a served Puzzle be cached, but never an error', () => {
    expect(get('/api/puzzle/2026-10-26').headers.get('Cache-Control')).toContain('max-age=3600');
    expect(get('/api/puzzle/2026-10-28').headers.get('Cache-Control')).toBe('no-store');
  });
});
