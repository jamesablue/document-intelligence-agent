import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import type { Message, ContentBlock } from '@aws-sdk/client-bedrock-runtime';
import { getToolSpecs, executeTool } from './tools/index.js';
import type { ToolContext } from './tools/types.js';

const bedrock = new BedrockRuntimeClient({ region: process.env['AWS_REGION'] ?? 'us-east-1' });
const MODEL_ID = 'us.anthropic.claude-sonnet-4-6';

const SYSTEM_PROMPT =
  'You are a helpful document intelligence assistant. You have access to tools that let you search and analyze the user\'s documents. Use them when needed to answer questions accurately. If no tools are needed, respond directly.';

export interface AgentResult {
  answer: string;
  toolCalls: Array<{ tool: string; input: Record<string, unknown> }>;
}

export async function runAgent(query: string, ctx: ToolContext): Promise<AgentResult> {
  const messages: Message[] = [{ role: 'user', content: [{ text: query }] }];
  const toolCalls: AgentResult['toolCalls'] = [];

  while (true) {
    const response = await bedrock.send(
      new ConverseCommand({
        modelId: MODEL_ID,
        system: [{ text: SYSTEM_PROMPT }],
        messages,
        toolConfig: { tools: getToolSpecs() },
        inferenceConfig: { maxTokens: 2048 },
      })
    );

    const assistantMessage = response.output!.message!;
    messages.push(assistantMessage);

    if (response.stopReason !== 'tool_use') {
      const textBlock = assistantMessage.content!.find((b: ContentBlock) => b.text);
      return { answer: textBlock?.text ?? '', toolCalls };
    }

    const toolResultBlocks: ContentBlock[] = [];

    for (const block of assistantMessage.content!) {
      if (!block.toolUse) continue;

      const { toolUseId, name, input } = block.toolUse;
      toolCalls.push({ tool: name!, input: input as Record<string, unknown> });

      try {
        const resultContent = await executeTool(name!, input as Record<string, unknown>, ctx);
        toolResultBlocks.push({
          toolResult: { toolUseId, content: resultContent, status: 'success' },
        });
      } catch (err) {
        toolResultBlocks.push({
          toolResult: {
            toolUseId,
            content: [{ text: `Error: ${(err as Error).message}` }],
            status: 'error',
          },
        });
      }
    }

    messages.push({ role: 'user', content: toolResultBlocks });
  }
}
