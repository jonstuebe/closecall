import { describe, expect, it, vi } from 'vitest';
import { PUZZLE_CACHE_KEY, cachedDaily, estimatedPuzzleNumber, loadDaily, photoUrl, readCachedPuzzle } from '../../src/lib/daily';
import { blockedStorage, memoryStorage, puzzle } from './fixtures';

const PUZZLE = puzzle();
const DAILY = { date: '2026-10-26', number: 1, puzzle: PUZZLE };
const cached = (value: unknown) => memoryStorage({ [PUZZLE_CACHE_KEY]: JSON.stringify(value) });

const respond = (body: unknown, status = 200) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));

describe('loadDaily', () => {
  it('fetches the Puzzle for the date and caches it', async () => {
    const storage = memoryStorage();
    const fetcher = respond({ number: 1, puzzle: PUZZLE });
    await expect(loadDaily('2026-10-26', fetcher, storage)).resolves.toEqual({ status: 'ready', ...DAILY });
    expect(fetcher).toHaveBeenCalledWith('/api/puzzle/2026-10-26');
    expect(readCachedPuzzle(storage)).toEqual(DAILY);
  });

  it('serves the cache without a request, so a reload mid-game is free', async () => {
    const fetcher = vi.fn();
    await expect(loadDaily('2026-10-26', fetcher, cached(DAILY))).resolves.toEqual({ status: 'ready', ...DAILY });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('ignores a cache from another day', async () => {
    const fetcher = respond({ number: 2, puzzle: PUZZLE });
    await expect(loadDaily('2026-10-27', fetcher, cached(DAILY))).resolves.toMatchObject({ status: 'ready', number: 2 });
  });

  it('reports "none" on a 404: before launch, or the list ran out', async () => {
    await expect(loadDaily('2030-01-01', respond({}, 404), memoryStorage())).resolves.toEqual({ status: 'none' });
  });

  it('reports "offline" when the request throws', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('offline'));
    await expect(loadDaily('2026-10-26', fetcher, memoryStorage())).resolves.toEqual({ status: 'offline' });
  });

  it('reports "offline" on a server error, rather than claiming there is no Puzzle', async () => {
    await expect(loadDaily('2026-10-26', respond({}, 500), memoryStorage())).resolves.toEqual({ status: 'offline' });
  });

  it('stays playable when storage is blocked', async () => {
    const fetcher = respond({ number: 1, puzzle: PUZZLE });
    await expect(loadDaily('2026-10-26', fetcher, blockedStorage())).resolves.toMatchObject({ status: 'ready' });
  });
});

describe('readCachedPuzzle', () => {
  it.each([['not json'], [JSON.stringify({ date: 1 })], [JSON.stringify({ date: '2026-10-26', number: 1, puzzle: {} })]])(
    'refuses junk: %s',
    (raw) => {
      expect(readCachedPuzzle(memoryStorage({ [PUZZLE_CACHE_KEY]: raw }))).toBeNull();
    },
  );

  it('is null when nothing is cached or storage is blocked', () => {
    expect(readCachedPuzzle(memoryStorage())).toBeNull();
    expect(readCachedPuzzle(blockedStorage())).toBeNull();
  });
});

describe('cachedDaily', () => {
  it('only answers for the date it holds', () => {
    expect(cachedDaily('2026-10-26', cached(DAILY))).toMatchObject({ status: 'ready' });
    expect(cachedDaily('2026-10-27', cached(DAILY))).toBeNull();
  });
});

describe('estimatedPuzzleNumber', () => {
  it('counts on from the last Puzzle seen, so stats work offline', () => {
    expect(estimatedPuzzleNumber('2026-10-29', cached(DAILY))).toBe(4);
  });

  it('is null with nothing to count from', () => {
    expect(estimatedPuzzleNumber('2026-10-29', memoryStorage())).toBeNull();
  });
});

describe('photoUrl', () => {
  it('points at the content-hashed file', () => {
    expect(photoUrl(PUZZLE)).toBe('/photos/abc123.jpg');
  });
});
