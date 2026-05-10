import type { AgentTool } from './types.js';
import { prisma } from '../../services/prisma.js';
import { embedText } from '../../services/embedding.js';

interface ChunkRow {
  content: string;
  documentId: string;
  filename: string;
  similarity: number;
}

export const searchDocumentsTool: AgentTool = {
  spec: {
    toolSpec: {
      name: 'search_documents',
      description:
        "Search the user's uploaded documents using semantic similarity. Returns the most relevant text chunks. Use this when you need to find information in the user's documents.",
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query to find relevant document content',
            },
            limit: {
              type: 'number',
              description: 'Max results to return (1–10, default 5)',
            },
          },
          required: ['query'],
        },
      },
    },
  },
  execute: async (input, ctx) => {
    const query = input.query as string;
    const limit = Math.min(Math.max(((input.limit as number) ?? 5), 1), 10);

    const queryEmbedding = await embedText(query);
    const vectorStr = `[${queryEmbedding.join(',')}]`;

    const chunks = await prisma.$queryRawUnsafe<ChunkRow[]>(
      `SELECT dc.content, dc."documentId", d.filename,
         1 - (dc.embedding <=> $1::vector) AS similarity
       FROM "DocumentChunk" dc
       JOIN "Document" d ON dc."documentId" = d.id
       WHERE dc.embedding IS NOT NULL AND d."userId" = $2
       ORDER BY dc.embedding <=> $1::vector
       LIMIT $3`,
      vectorStr,
      ctx.userId,
      limit
    );

    if (chunks.length === 0) {
      return [{ text: 'No relevant documents found for this query.' }];
    }

    const formatted = chunks
      .map((c, i) => `[${i + 1}] (documentId: ${c.documentId}, file: ${c.filename}, similarity: ${c.similarity.toFixed(3)})\n${c.content}`)
      .join('\n\n');

    return [{ text: formatted }];
  },
};
