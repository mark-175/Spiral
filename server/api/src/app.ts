import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import pinoHttp from 'pino-http';

import { env } from './config/env';
import { logger } from './lib/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFound';
import { requireAuth } from './middleware/requireAuth';
import { areasRouter } from './routes/areas';
import { authRouter } from './routes/auth';
import { dailyReviewsRouter } from './routes/dailyReviews';
import { goalsRouter } from './routes/goals';
import { healthRouter } from './routes/health';
import { weeklyReflectionsRouter } from './routes/weeklyReflections';

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  app.use(healthRouter);
  app.use(authRouter);
  app.use(requireAuth, areasRouter, goalsRouter, dailyReviewsRouter, weeklyReflectionsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
