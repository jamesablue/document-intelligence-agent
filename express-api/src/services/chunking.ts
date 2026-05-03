import { encode, decode } from 'gpt-tokenizer';

const CHUNK_SIZE = 512;
const OVERLAP = 64;

export function chunkText(text: string): string[] {
  const tokens = encode(text);
  const chunks: string[] = [];
  let start = 0;

  while (start < tokens.length) {
    const end = Math.min(start + CHUNK_SIZE, tokens.length);
    chunks.push(decode(tokens.slice(start, end)));
    if (end === tokens.length) break;
    start += CHUNK_SIZE - OVERLAP;
  }

  return chunks;
}
