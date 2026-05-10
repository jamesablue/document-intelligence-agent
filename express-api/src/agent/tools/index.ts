import type { Tool, ContentBlock } from '@aws-sdk/client-bedrock-runtime';
import type { AgentTool, ToolContext } from './types.js';
import { pingTool } from './ping.js';

const tools: AgentTool[] = [pingTool];

export function getToolSpecs(): Tool[] {
  return tools.map((t) => t.spec);
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<ContentBlock[]> {
  const tool = tools.find((t) => t.spec.toolSpec!.name === name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  return tool.execute(input, ctx);
}
