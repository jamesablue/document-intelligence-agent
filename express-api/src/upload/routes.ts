import { Router } from 'express';
import type { Request } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { uploadToS3 } from './s3.js';
import { requireAuth } from '../auth/middleware.js';

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string };
}

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] });
const prisma = new PrismaClient({ adapter });
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
      status: 'pending',
    },
  });

  res.json({ documentId: document.id });
});

export default router;
