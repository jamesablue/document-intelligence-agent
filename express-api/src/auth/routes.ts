import { Router } from 'express';
import passport from './passport.js';
import jwt from 'jsonwebtoken';
import type { User } from '@prisma/client';

const router = Router();

router.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get(
  '/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: 'http://localhost:4200/login?error=auth_failed' }),
  (req, res) => {
    const user = req.user as User;

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env['JWT_SECRET'] as string,
      { expiresIn: '7d' }
    );

    res.redirect(`http://localhost:4200/auth/callback?token=${token}`);
  }
);

export default router;
