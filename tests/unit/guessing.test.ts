import { describe, expect, it } from 'vitest';
import { MAX_TRIES, alreadyTried, isCorrect, normalize, zoomForTry } from '../../src/lib/guessing';
import { puzzle } from './fixtures';

describe('normalize', () => {
  it.each([
    ['Raccoon', 'raccoon'],
    ['  TRASH   PANDA ', 'trash panda'],
    ['a cat', 'cat'],
    ['An otter', 'otter'],
    ['the dog', 'dog'],
    ['Flamingo!', 'flamingo'],
    ['Ñandú', 'nandu'],
  ])('folds %s to %s', (input, expected) => {
    expect(normalize(input)).toBe(expected);
  });

  it('keeps an article that is part of the word', () => {
    expect(normalize('anteater')).toBe('anteater');
  });
});

describe('isCorrect', () => {
  const p = puzzle();

  it.each(['raccoon', 'Raccoon', 'a RACCOON', 'trash panda', 'raccoons'])('accepts %s', (guess) => {
    expect(isCorrect(guess, p)).toBe(true);
  });

  it.each(['fox', 'rac coon', '', '   '])('rejects %s', (guess) => {
    expect(isCorrect(guess, p)).toBe(false);
  });

  it('tolerates an -es plural the author never listed', () => {
    expect(isCorrect('foxes', puzzle({ accept: ['fox'] }))).toBe(true);
  });
});

describe('alreadyTried', () => {
  const guesses = ['Fox', null, 'a badger'];

  it.each(['fox', 'FOX', 'badger', 'the badger'])('spots %s however it is typed', (guess) => {
    expect(alreadyTried(guess, guesses)).toBe(true);
  });

  it('lets a new animal through, and never matches a zoom-out', () => {
    expect(alreadyTried('otter', guesses)).toBe(false);
    expect(alreadyTried('', guesses)).toBe(false);
  });
});

describe('zoomForTry', () => {
  const p = puzzle();

  it('follows the ladder while the game is on', () => {
    expect(p.zooms.map((_, i) => zoomForTry(p, i))).toEqual(p.zooms);
  });

  it('shows the whole photo once the tries are spent', () => {
    expect(zoomForTry(p, MAX_TRIES)).toBe(1);
    expect(zoomForTry(p, 99)).toBe(1);
  });
});
