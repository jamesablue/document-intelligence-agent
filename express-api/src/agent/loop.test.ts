import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import type { ConverseCommandOutput, ToolUseBlock } from '@aws-sdk/client-bedrock-runtime';
import { runAgent, MAX_TURNS } from './loop.js';
import { getToolSpecs } from './tools/index.js';

// Mocks send() on every BedrockRuntimeClient, including the one loop.ts creates at import.
const bedrockMock = mockClient(BedrockRuntimeClient);
const ctx = { userId: 'user-1' };

function reply(text: string): Partial<ConverseCommandOutput> {
  return {
    stopReason: 'end_turn',
    output: { message: { role: 'assistant', content: [{ text }] } },
  };
}

function toolUse(...calls: Array<{ id: string; name: string; input: ToolUseBlock['input'] }>) {
  return {
    stopReason: 'tool_use',
    output: {
      message: {
        role: 'assistant',
        content: calls.map(({ id, name, input }) => ({ toolUse: { toolUseId: id, name, input } })),
      },
    },
  } satisfies Partial<ConverseCommandOutput>;
}

// runAgent keeps appending to the one messages array it sends, so the last call holds the full conversation.
function sentMessages() {
  return bedrockMock.commandCalls(ConverseCommand).at(-1)!.args[0].input.messages!;
}

function sentToolResults() {
  return sentMessages()
    .flatMap((m) => m.content ?? [])
    .flatMap((b) => (b.toolResult ? [b.toolResult] : []));
}

describe('runAgent', () => {
  beforeEach(() => {
    bedrockMock.reset();
  });

  it('returns the answer directly when the model calls no tool', async () => {
    bedrockMock.on(ConverseCommand).resolves(reply('Hello!'));

    const result = await runAgent('Hi there', ctx);

    expect(result).toEqual({ answer: 'Hello!', toolCalls: [] });
    const calls = bedrockMock.commandCalls(ConverseCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.args[0].input.messages![0]).toEqual({ role: 'user', content: [{ text: 'Hi there' }] });
    expect(calls[0]!.args[0].input.toolConfig!.tools).toEqual(getToolSpecs());
  });

  it('runs a tool, sends its result back, and returns the final answer', async () => {
    bedrockMock
      .on(ConverseCommand)
      .resolvesOnce(toolUse({ id: 't1', name: 'ping', input: { message: 'hi' } }))
      .resolves(reply('The server says hi.'));

    const result = await runAgent('Ping the server', ctx);

    expect(result).toEqual({
      answer: 'The server says hi.',
      toolCalls: [{ tool: 'ping', input: { message: 'hi' } }],
    });
    expect(bedrockMock.commandCalls(ConverseCommand)).toHaveLength(2);

    const [toolResult] = sentToolResults();
    expect(toolResult).toMatchObject({ toolUseId: 't1', status: 'success' });
    expect(toolResult!.content![0]!.text).toMatch(/Echo: hi$/);
  });

  it('reports an unknown tool back to the model as an error result', async () => {
    bedrockMock
      .on(ConverseCommand)
      .resolvesOnce(toolUse({ id: 't1', name: 'delete_everything', input: {} }))
      .resolves(reply('I cannot do that.'));

    const result = await runAgent('Delete my files', ctx);

    expect(result).toEqual({
      answer: 'I cannot do that.',
      toolCalls: [{ tool: 'delete_everything', input: {} }],
    });
    expect(sentToolResults()).toEqual([
      {
        toolUseId: 't1',
        status: 'error',
        content: [{ text: 'Error: Unknown tool: delete_everything' }],
      },
    ]);
  });

  it('reports a tool that throws back to the model as an error result', async () => {
    bedrockMock
      .on(ConverseCommand)
      .resolvesOnce(toolUse({ id: 't1', name: 'search_documents', input: { query: '   ' } }))
      .resolves(reply('Please tell me what to search for.'));

    const result = await runAgent('Search', ctx);

    expect(result.answer).toBe('Please tell me what to search for.');
    expect(sentToolResults()).toEqual([
      {
        toolUseId: 't1',
        status: 'error',
        content: [{ text: 'Error: query must be a non-empty string' }],
      },
    ]);
  });

  it(`gives up after MAX_TURNS (${MAX_TURNS}) model calls`, async () => {
    bedrockMock.on(ConverseCommand).resolves(toolUse({ id: 't1', name: 'ping', input: { message: 'again' } }));

    const result = await runAgent('Keep pinging', ctx);

    expect(bedrockMock.commandCalls(ConverseCommand)).toHaveLength(MAX_TURNS);
    expect(result.toolCalls).toHaveLength(MAX_TURNS);
    expect(result.answer).toMatch(/allowed number of steps/);
  });

  it('collects every tool call in order, across turns and within one turn', async () => {
    bedrockMock
      .on(ConverseCommand)
      .resolvesOnce(
        toolUse(
          { id: 't1', name: 'ping', input: { message: 'first' } },
          { id: 't2', name: 'ping', input: { message: 'second' } }
        )
      )
      .resolvesOnce(toolUse({ id: 't3', name: 'summarize_document', input: { documentId: '' } }))
      .resolves(reply('Done.'));

    const result = await runAgent('Do several things', ctx);

    expect(result.toolCalls).toEqual([
      { tool: 'ping', input: { message: 'first' } },
      { tool: 'ping', input: { message: 'second' } },
      { tool: 'summarize_document', input: { documentId: '' } },
    ]);

    // Both results from the first turn go back together in one user message.
    const firstResults = sentMessages()[2]!;
    expect(firstResults.role).toBe('user');
    expect(firstResults.content!.map((b) => b.toolResult!.toolUseId)).toEqual(['t1', 't2']);
    expect(sentToolResults().map((r) => r.status)).toEqual(['success', 'success', 'error']);
  });
});
