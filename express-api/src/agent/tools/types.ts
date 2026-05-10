import type { Tool, ContentBlock } from '@aws-sdk/client-bedrock-runtime';

export interface ToolContext {
  userId: string;
}

export interface AgentTool {
  spec: Tool;
  execute: (input: Record<string, unknown>, ctx: ToolContext) => Promise<ContentBlock[]>;
}
