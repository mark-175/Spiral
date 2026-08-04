import { randomBytes } from 'node:crypto';

import bcrypt from 'bcryptjs';

import { prisma } from './prisma';

export const SESSION_COOKIE_NAME = 'spiral_session';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const BCRYPT_COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Computed once at startup and compared against on every failed login,
// whether or not the email exists — otherwise a login attempt against an
// unregistered email skips bcrypt entirely and returns measurably faster,
// letting an attacker enumerate registered emails by timing alone.
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync(randomBytes(16).toString('hex'), BCRYPT_COST);

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { token, userId, expiresAt } });
  return { token, expiresAt };
}

export async function getSessionUser(token: string) {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return session.user;
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } });
}
