import { describe, it, expect } from 'vitest';
import { executeTool, getToolSpecs } from './index.js';

const ctx = { userId: 'user-1' };

describe('tool registry', () => {
  it('exposes a spec for each registered tool', () => {
    expect(getToolSpecs().map((t) => t.toolSpec!.name)).toEqual([
      'ping',
      'search_documents',
      'summarize_document',
    ]);
  });

  it('dispatches to the tool with the given name', async () => {
    const [block] = await executeTool('ping', { message: 'hello' }, ctx);
    expect(block!.text).toMatch(/Echo: hello$/);
  });

  it('throws for an unknown tool name', async () => {
    await expect(executeTool('nope', {}, ctx)).rejects.toThrow('Unknown tool: nope');
  });
});
