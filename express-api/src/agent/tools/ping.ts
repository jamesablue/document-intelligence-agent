import type { AgentTool } from './types.js';

export const pingTool: AgentTool = {
  spec: {
    toolSpec: {
      name: 'ping',
      description:
        'A test tool that echoes back the input message with a server timestamp. Use this to verify the system is working.',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'The message to echo back' },
          },
          required: ['message'],
        },
      },
    },
  },
  execute: async (input) => {
    const msg = (input.message as string) ?? 'pong';
    return [{ text: `[${new Date().toISOString()}] Echo: ${msg}` }];
  },
};
