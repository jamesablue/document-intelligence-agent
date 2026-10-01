import { prisma } from '../../services/prisma.js';
import type { AgentTool } from './types.js';

const MAX_CHARS = 8000;

export const summarizeDocumentTool: AgentTool = {
  spec: {
    toolSpec: {
      name: 'summarize_document',
      description:
        "Retrieves the full text of one of the user's documents (truncated to about 8000 characters) so you can summarize it or compare it with other documents. Requires a document ID, which you can get from search_documents results. Call it once per document when comparing.",
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            documentId: { type: 'string', description: 'The ID of the document to retrieve' },
          },
          required: ['documentId'],
        },
      },
    },
  },
  execute: async (input, ctx) => {
    const documentId = input.documentId;
    if (typeof documentId !== 'string' || !documentId.trim()) {
      throw new Error('documentId must be a non-empty string');
    }

    // Same error for missing and foreign documents so IDs can't be probed across users.
    const doc = await prisma.document.findFirst({
      where: { id: documentId, userId: ctx.userId },
      select: { filename: true, status: true },
    });
    if (!doc) throw new Error(`Document not found: ${documentId}`);

    if (doc.status === 'ERROR') {
      return [{ text: `Document "${doc.filename}" failed processing and its content is unavailable.` }];
    }
    if (doc.status !== 'READY') {
      return [
        {
          text: `Document "${doc.filename}" is not ready yet (status: ${doc.status}). Ask the user to try again in a moment.`,
        },
      ];
    }

    const chunks = await prisma.documentChunk.findMany({
      where: { documentId },
      orderBy: { chunkIndex: 'asc' },
      select: { content: true },
    });
    if (chunks.length === 0) {
      return [{ text: `Document "${doc.filename}" has no content.` }];
    }

    // Chunks overlap by 64 tokens, so the rebuilt text repeats a little at each boundary.
    const fullText = chunks.map((c) => c.content).join('\n');
    const truncated = fullText.length > MAX_CHARS;
    const text = truncated ? fullText.slice(0, MAX_CHARS) : fullText;

    const header = `Document: ${doc.filename} (ID: ${documentId})`;
    const note = truncated
      ? `\n\n[Truncated: showing the first ${MAX_CHARS} of ${fullText.length} characters. Mention in your answer that the summary covers only the beginning of the document.]`
      : '';
    return [{ text: `${header}\n\n${text}${note}` }];
  },
};
