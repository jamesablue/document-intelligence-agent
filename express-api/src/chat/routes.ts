import { Router } from 'express';
import type { Request } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { runAgent } from '../agent/index.js';

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

  const result = await runAgent(query, { userId: user.userId });
  res.json(result);
});

export default router;
