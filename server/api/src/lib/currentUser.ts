import { prisma } from './prisma';

const DEV_USER_EMAIL = 'dev@spiral.local';

let cachedUserId: string | null = null;

export async function getCurrentUserId(): Promise<string> {
  if (cachedUserId) {
    return cachedUserId;
  }

  const existing = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
  if (existing) {
    cachedUserId = existing.id;
    return existing.id;
  }

  const created = await prisma.user.create({ data: { email: DEV_USER_EMAIL } });
  cachedUserId = created.id;
  return created.id;
}
