import { Router } from 'express';
import type { Request } from 'express';
import multer from 'multer';
import { DocumentStatus } from '@prisma/client';
import { uploadToS3 } from './s3.js';
import { requireAuth } from '../auth/middleware.js';
import { extractText } from '../extraction/extractText.js';
import { prisma } from '../services/prisma.js';
import { processDocument } from '../services/processing.js';

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string };
}

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  const { user, file } = req as AuthenticatedRequest & { file: Express.Multer.File };

  const s3Key = await uploadToS3(file.buffer, file.originalname);

  const document = await prisma.document.create({
    data: {
      userId: user.userId,
      filename: file.originalname,
      s3Key,
      status: DocumentStatus.PENDING,
    },
  });

  const extractedText = await extractText(file.buffer, file.originalname);

  await prisma.document.update({
    where: { id: document.id },
    data: { extractedText, status: DocumentStatus.EXTRACTED },
  });

  // Respond immediately; chunk + embed in the background
  res.json({ documentId: document.id });

  processDocument(document.id).catch((err) =>
    console.error(`Background processing error for ${document.id}:`, err)
  );
});

export default router;
