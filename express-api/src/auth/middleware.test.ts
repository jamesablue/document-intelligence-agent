import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { requireAuth } from './middleware.js';

const SECRET = process.env['JWT_SECRET']!;
const PAYLOAD = { userId: 'user-1', email: 'user1@example.com' };

function run(authorization?: string) {
  const req = { headers: authorization === undefined ? {} : { authorization } } as Request;
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const next = vi.fn();
  requireAuth(req, res as unknown as Response, next);
  return { req: req as Request & { user?: unknown }, res, next };
}

function expect401(result: ReturnType<typeof run>, error: string) {
  expect(result.next).not.toHaveBeenCalled();
  expect(result.res.status).toHaveBeenCalledWith(401);
  expect(result.res.json).toHaveBeenCalledWith({ error });
  expect(result.req.user).toBeUndefined();
}

describe('requireAuth', () => {
  it('rejects a request with no Authorization header', () => {
    expect401(run(), 'Missing token');
  });

  it('rejects a header that is not a Bearer token', () => {
    const token = jwt.sign(PAYLOAD, SECRET);
    expect401(run(`Basic ${token}`), 'Missing token');
  });

  it('rejects a malformed token', () => {
    expect401(run('Bearer not-a-jwt'), 'Invalid token');
  });

  it('rejects an expired token', () => {
    const token = jwt.sign({ ...PAYLOAD, exp: Math.floor(Date.now() / 1000) - 60 }, SECRET);
    expect401(run(`Bearer ${token}`), 'Invalid token');
  });

  it('rejects a token signed with a different secret', () => {
    const token = jwt.sign(PAYLOAD, 'some-other-secret');
    expect401(run(`Bearer ${token}`), 'Invalid token');
  });

  it('rejects an unsigned token (alg: none)', () => {
    const encode = (part: object) => Buffer.from(JSON.stringify(part)).toString('base64url');
    const token = `${encode({ alg: 'none', typ: 'JWT' })}.${encode(PAYLOAD)}.`;
    expect401(run(`Bearer ${token}`), 'Invalid token');
  });

  it('accepts a valid token and attaches its payload to req.user', () => {
    const token = jwt.sign(PAYLOAD, SECRET, { expiresIn: '7d' });
    const { req, res, next } = run(`Bearer ${token}`);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user).toMatchObject(PAYLOAD);
  });
});
