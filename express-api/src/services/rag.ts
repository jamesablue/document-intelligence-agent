import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { prisma } from './prisma.js';
import { embedText } from './embedding.js';

const bedrock = new BedrockRuntimeClient({ region: process.env['AWS_REGION'] ?? 'us-east-1' });

const MODEL_ID = 'us.anthropic.claude-sonnet-4-6';

interface ChunkResult {
  id: string;
  content: string;
  documentId: string;
  similarity: number;
}

export interface RagResult {
  answer: string;
  sources: Array<{ chunkId: string; documentId: string; content: string; similarity: number }>;
}

export async function queryDocuments(query: string, userId: string): Promise<RagResult> {
  const queryEmbedding = await embedText(query);
  const vectorStr = `[${queryEmbedding.join(',')}]`;

  const chunks = await prisma.$queryRawUnsafe<ChunkResult[]>(
    `SELECT dc.id, dc.content, dc."documentId",
       1 - (dc.embedding <=> $1::vector) AS similarity
     FROM "DocumentChunk" dc
     JOIN "Document" d ON dc."documentId" = d.id
     WHERE dc.embedding IS NOT NULL
       AND d."userId" = $2
     ORDER BY dc.embedding <=> $1::vector
     LIMIT 5`,
    vectorStr,
    userId
  );

  if (chunks.length === 0) {
    return { answer: 'No relevant document content found to answer your question.', sources: [] };
  }

  const context = chunks.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n');

  const response = await bedrock.send(
    new ConverseCommand({
      modelId: MODEL_ID,
      system: [
        {
          text: 'You are a helpful document analyst. Answer questions based only on the provided document excerpts. If the answer is not contained in the excerpts, say so.',
        },
      ],
      messages: [
        {
          role: 'user',
          content: [{ text: `Document excerpts:\n${context}\n\nQuestion: ${query}` }],
        },
      ],
      inferenceConfig: { maxTokens: 1024 },
    })
  );

  const answer = response.output?.message?.content?.[0]?.text ?? '';

  return {
    answer,
    sources: chunks.map((c) => ({
      chunkId: c.id,
      documentId: c.documentId,
      content: c.content,
      similarity: c.similarity,
    })),
  };
}
