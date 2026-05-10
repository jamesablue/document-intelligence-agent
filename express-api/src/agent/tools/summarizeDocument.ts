import type { AgentTool } from './types.js';
import { prisma } from '../../services/prisma.js';

export const summarizeDocumentTool: AgentTool = {
  spec: {
    toolSpec: {
      name: 'summarize_document',
      description:
        "Get the full text content of a specific document by its ID. Use this when you need to read or summarize an entire document rather than searching for specific information across all documents. You can get document IDs by calling search_documents first.",
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            documentId: {
              type: 'string',
              description: 'The ID of the document to retrieve',
            },
          },
          required: ['documentId'],
        },
      },
    },
  },
  execute: async (input, ctx) => {
    const docId = input.documentId as string;

    const document = await prisma.document.findFirst({
      where: { id: docId, userId: ctx.userId },
      select: {
        filename: true,
        chunks: { select: { content: true }, orderBy: { chunkIndex: 'asc' } },
      },
    });

    if (!document) {
      return [{ text: 'Document not found or you do not have access to it.' }];
    }

    const fullText = document.chunks.map((c) => c.content).join('\n\n');
    const truncated =
      fullText.length > 8000 ? fullText.slice(0, 8000) + '\n\n[...truncated]' : fullText;

    return [{ text: `Document: ${document.filename}\n\n${truncated}` }];
  },
};
