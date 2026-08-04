import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { ValidationError } from './validation';

export function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>,
): RequestHandler {
  return (req, res, next: NextFunction) => {
    fn(req, res).catch((err: unknown) => {
      if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    });
  };
}
