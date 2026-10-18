import { describe, it, expect } from 'vitest';
import { encode, decode } from 'gpt-tokenizer';
import { chunkText } from './chunking.js';

// ' word' is a single token, so ' word'.repeat(n) is exactly n tokens.
const words = (n: number) => ' word'.repeat(n);

describe('chunkText', () => {
  it('returns no chunks for empty input', () => {
    expect(chunkText('')).toEqual([]);
  });

  it('returns short text as a single chunk', () => {
    expect(chunkText('Hello, world.')).toEqual(['Hello, world.']);
  });

  it('keeps exactly 512 tokens in one chunk', () => {
    expect(chunkText(words(512))).toEqual([words(512)]);
  });

  it('starts a second chunk at 513 tokens, overlapping the first by 64', () => {
    expect(chunkText(words(513))).toEqual([words(512), words(65)]);
  });

  it('advances 448 tokens per chunk (512 size - 64 overlap)', () => {
    // Chunks start at tokens 0, 448 and 896 of 1000.
    const chunks = chunkText(words(1000));
    expect(chunks.map((c) => encode(c).length)).toEqual([512, 512, 104]);
  });

  it('repeats the last 64 tokens of a chunk at the start of the next', () => {
    const text = Array.from({ length: 300 }, (_, i) => `Sentence ${i} ends here.`).join(' ');
    const tokens = encode(text);
    const overlap = decode(tokens.slice(448, 512));

    const chunks = chunkText(text);

    expect(chunks[0]!.endsWith(overlap)).toBe(true);
    expect(chunks[1]!.startsWith(overlap)).toBe(true);
  });
});
