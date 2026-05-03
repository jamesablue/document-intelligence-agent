import { Router } from 'express';
import type { Request } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { prisma } from '../services/prisma.js';

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string };
}

const router = Router();

router.get('/documents', requireAuth, async (req, res) => {
  const { user } = req as AuthenticatedRequest;

  const documents = await prisma.document.findMany({
    where: { userId: user.userId },
    select: {
      id: true,
      filename: true,
      status: true,
      createdAt: true,
      _count: { select: { chunks: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(documents);
});

router.get('/documents/:id', requireAuth, async (req, res) => {
  const { user } = req as AuthenticatedRequest;

  const document = await prisma.document.findFirst({
    where: { id: String(req.params.id), userId: user.userId },
    select: {
      id: true,
      filename: true,
      status: true,
      createdAt: true,
      chunks: {
        select: { id: true, chunkIndex: true, content: true },
        orderBy: { chunkIndex: 'asc' },
      },
    },
  });

  if (!document) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  res.json(document);
});

export default router;
