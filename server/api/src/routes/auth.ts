import type { Response } from 'express';
import { Router } from 'express';

import { env } from '../config/env';
import { asyncHandler } from '../lib/asyncHandler';
import {
  createSession,
  deleteSession,
  DUMMY_PASSWORD_HASH,
  hashPassword,
  SESSION_COOKIE_NAME,
  verifyPassword,
} from '../lib/auth';
import { prisma } from '../lib/prisma';
import { ValidationError } from '../lib/validation';
import { requireAuth } from '../middleware/requireAuth';

export const authRouter = Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

function parseCredentials(body: unknown): { email: string; password: string } {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Request body must be an object');
  }
  const { email, password } = body as Record<string, unknown>;

  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email)) {
    throw new ValidationError('A valid email is required');
  }
  if (typeof password !== 'string' || password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters');
  }

  return { email: email.trim().toLowerCase(), password };
}

authRouter.post(
  '/auth/signup',
  asyncHandler(async (req, res) => {
    const { email, password } = parseCredentials(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'An account with that email already exists' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({ data: { email, passwordHash } });
    const { token, expiresAt } = await createSession(user.id);
    setSessionCookie(res, token, expiresAt);

    res.status(201).json({ id: user.id, email: user.email });
  }),
);

authRouter.post(
  '/auth/login',
  asyncHandler(async (req, res) => {
    const { email, password } = parseCredentials(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

    if (!user || !valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const { token, expiresAt } = await createSession(user.id);
    setSessionCookie(res, token, expiresAt);

    res.json({ id: user.id, email: user.email });
  }),
);

authRouter.post(
  '/auth/logout',
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    if (token) {
      await deleteSession(token);
    }
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    res.status(204).send();
  }),
);

authRouter.get(
  '/auth/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    res.json({ id: user.id, email: user.email });
  }),
);
