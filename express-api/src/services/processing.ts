import { DocumentStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import { chunkText } from './chunking.js';
import { embedText } from './embedding.js';

export async function processDocument(documentId: string): Promise<void> {
  const document = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });

  if (!document.extractedText) {
    await prisma.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.ERROR },
    });
    return;
  }

  try {
    await prisma.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.CHUNKING },
    });

    const chunks = chunkText(document.extractedText);

    await prisma.documentChunk.createMany({
      data: chunks.map((content, chunkIndex) => ({ documentId, chunkIndex, content })),
    });

    await prisma.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.EMBEDDING },
    });

    for (const chunk of await prisma.documentChunk.findMany({ where: { documentId } })) {
      const embedding = await embedText(chunk.content);
      const vectorStr = `[${embedding.join(',')}]`;
      await prisma.$executeRawUnsafe(
        `UPDATE "DocumentChunk" SET embedding = $1::vector WHERE id = $2`,
        vectorStr,
        chunk.id
      );
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.READY },
    });
  } catch (err) {
    console.error(`Processing failed for document ${documentId}:`, err);
    await prisma.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.ERROR },
    });
  }
}
