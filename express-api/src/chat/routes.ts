import { Router } from 'express';
import type { Request } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { queryDocuments } from '../services/rag.js';

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string };
}

const router = Router();

router.post('/chat', requireAuth, async (req, res) => {
  const { user } = req as AuthenticatedRequest;
  const { query } = req.body as { query?: string };

  if (!query?.trim()) {
    res.status(400).json({ error: 'query is required' });
    return;
  }

  const result = await queryDocuments(query, user.userId);
  res.json(result);
});

export default router;
