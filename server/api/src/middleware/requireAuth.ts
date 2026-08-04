import type { NextFunction, Request, Response } from 'express';

import { getSessionUser, SESSION_COOKIE_NAME } from '../lib/auth';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  getSessionUser(token)
    .then((user) => {
      if (!user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      req.userId = user.id;
      next();
    })
    .catch(next);
}
