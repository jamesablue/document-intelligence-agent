import { prisma } from '../../services/prisma.js';
import { embedText } from '../../services/embedding.js';
import type { AgentTool } from './types.js';

interface SearchRow {
  documentId: string;
  filename: string;
  content: string;
  similarity: number;
}

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;

export const searchDocumentsTool: AgentTool = {
  spec: {
    toolSpec: {
      name: 'search_documents',
      description:
        "Semantic search over the user's uploaded documents. Returns the most relevant text chunks with their document ID, filename, and similarity score. Use this before answering any question about the user's documents, and cite the filename in your answer.",
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'What to search for, phrased as a natural-language query' },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: MAX_LIMIT,
              description: `Maximum number of chunks to return (default ${DEFAULT_LIMIT})`,
            },
          },
          required: ['query'],
        },
      },
    },
  },
  execute: async (input, ctx) => {
    const query = input.query;
    if (typeof query !== 'string' || !query.trim()) throw new Error('query must be a non-empty string');

    const rawLimit = Number(input.limit ?? DEFAULT_LIMIT);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(MAX_LIMIT, Math.max(1, Math.trunc(rawLimit)))
      : DEFAULT_LIMIT;

    const queryEmbedding = await embedText(query);
    const vectorStr = `[${queryEmbedding.join(',')}]`;

    const rows = await prisma.$queryRawUnsafe<SearchRow[]>(
      `SELECT dc."documentId", d.filename, dc.content,
         1 - (dc.embedding <=> $1::vector) AS similarity
       FROM "DocumentChunk" dc
       JOIN "Document" d ON dc."documentId" = d.id
       WHERE dc.embedding IS NOT NULL
         AND d."userId" = $2
       ORDER BY dc.embedding <=> $1::vector
       LIMIT $3`,
      vectorStr,
      ctx.userId,
      limit
    );

    if (rows.length === 0) {
      return [{ text: 'No relevant document content found.' }];
    }

    return [{ text: JSON.stringify(rows, null, 2) }];
  },
};
