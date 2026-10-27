import { describe, expect, it, vi } from 'vitest';
import { buildShareText, resultLine, shareResults, tryResults } from '../../src/lib/share';

describe('tryResults', () => {
  it('marks the winning guess, and only it, as a hit', () => {
    expect(tryResults(['fox', null, 'raccoon'], true)).toEqual(['miss', 'skip', 'hit']);
  });

  it('has no hit in a loss', () => {
    expect(tryResults(['fox', 'badger'], false)).toEqual(['miss', 'miss']);
  });
});

describe('resultLine', () => {
  it('pads the tries never spent', () => {
    expect(resultLine(['miss', 'skip', 'hit'])).toBe('🟥⬜🟩⬛⬛⬛');
  });

  it('fills the row when every try is used', () => {
    expect(resultLine(Array(6).fill('miss'))).toBe('🟥🟥🟥🟥🟥🟥');
  });
});

describe('buildShareText', () => {
  it('scores a win by tries used', () => {
    expect(buildShareText(12, ['miss', 'hit'], true)).toBe('Close Call #12 2/6\n\n🔍 🟥🟩⬛⬛⬛⬛\n\ncloseall'.replace('closeall', 'closecall.jonstuebe.com'));
  });

  it('scores a loss as X', () => {
    expect(buildShareText(3, Array(6).fill('miss'), false)).toContain('Close Call #3 X/6');
  });

  it('never names the animal', () => {
    expect(buildShareText(1, ['hit'], true)).not.toMatch(/raccoon/i);
  });
});

describe('shareResults', () => {
  const navigatorWith = (overrides: Partial<Navigator>) => ({ ...overrides }) as Navigator;

  it('uses the share sheet when there is one', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    await expect(shareResults('x', navigatorWith({ share, canShare: () => true }))).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith({ text: 'x' });
  });

  it('reports a cancelled share rather than copying behind the player’s back', async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error('nope'), { name: 'AbortError' }));
    const writeText = vi.fn();
    await expect(shareResults('x', navigatorWith({ share, canShare: () => true, clipboard: { writeText } as never }))).resolves.toBe('aborted');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('falls back to the clipboard when the share sheet fails for another reason', async () => {
    const share = vi.fn().mockRejectedValue(new Error('boom'));
    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(shareResults('x', navigatorWith({ share, canShare: () => true, clipboard: { writeText } as never }))).resolves.toBe('copied');
  });

  it('copies when there is no share sheet', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(shareResults('x', navigatorWith({ clipboard: { writeText } as never }))).resolves.toBe('copied');
  });

  it('fails loudly when neither works, so the caller can show the text', async () => {
    await expect(shareResults('x', navigatorWith({}))).resolves.toBe('failed');
  });
});
