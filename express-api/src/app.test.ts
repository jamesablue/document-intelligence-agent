import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import jwt from 'jsonwebtoken';
import app from './app.js';

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe('app', () => {
  it('responds to GET /health', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it.each([
    ['GET', '/documents'],
    ['GET', '/documents/some-id'],
    ['POST', '/chat'],
    ['POST', '/upload'],
  ])('rejects %s %s without a token', async (method, path) => {
    const res = await fetch(`${baseUrl}${path}`, { method });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Missing token' });
  });

  it('rejects POST /chat with an empty query', async () => {
    const token = jwt.sign({ userId: 'user-1', email: 'user1@example.com' }, process.env['JWT_SECRET']!);
    const res = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '  ' }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'query is required' });
  });
});
