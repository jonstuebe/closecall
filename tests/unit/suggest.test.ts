import { describe, expect, it } from 'vitest';
import { ANIMALS } from '../../src/lib/animals';
import { MAX_SUGGESTIONS, suggest } from '../../src/lib/suggest';

const VOCAB = ['otter', 'sea otter', 'ostrich', 'owl', 'ox', 'octopus', 'orca', 'fox'];

describe('suggest', () => {
  it('says nothing for an empty query', () => {
    expect(suggest('')).toEqual([]);
    expect(suggest('   ')).toEqual([]);
  });

  it('puts names that start with the query first', () => {
    expect(suggest('ot', [], VOCAB)).toEqual(['otter', 'sea otter']);
  });

  it('caps the list', () => {
    expect(suggest('o', [], VOCAB)).toHaveLength(MAX_SUGGESTIONS);
  });

  it('drops the exact query: it is already typed', () => {
    expect(suggest('otter', [], VOCAB)).not.toContain('otter');
  });

  it('drops animals already guessed, however they were typed', () => {
    expect(suggest('ot', ['An Otter'], VOCAB)).toEqual(['sea otter']);
  });

  it('ignores zoom-outs in the tried list', () => {
    expect(suggest('ot', [null], VOCAB)).toContain('otter');
  });

  it('works off the shipped vocabulary by default', () => {
    expect(suggest('racc')).toEqual(['raccoon']);
  });
});

describe('the shipped vocabulary', () => {
  it('is sorted, unique, and already normalized', () => {
    expect([...ANIMALS]).toEqual([...ANIMALS].sort());
    expect(new Set(ANIMALS).size).toBe(ANIMALS.length);
    expect(ANIMALS.every((a) => a === a.toLowerCase().trim())).toBe(true);
  });
});
