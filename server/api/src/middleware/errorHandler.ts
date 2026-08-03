import type { NextFunction, Request, Response } from 'express';

import { logger } from '../lib/logger';

// Express only recognizes this as error-handling middleware because it has 4 parameters.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  logger.error({ err, path: req.originalUrl }, 'Unhandled request error');
  res.status(500).json({ error: 'Internal server error' });
}
