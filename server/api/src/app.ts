import cors from 'cors';
import express, { type Express } from 'express';
import pinoHttp from 'pino-http';

import { logger } from './lib/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFound';
import { areasRouter } from './routes/areas';
import { dailyReviewsRouter } from './routes/dailyReviews';
import { goalsRouter } from './routes/goals';
import { healthRouter } from './routes/health';
import { weeklyReflectionsRouter } from './routes/weeklyReflections';

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.use(healthRouter);
  app.use(areasRouter);
  app.use(goalsRouter);
  app.use(dailyReviewsRouter);
  app.use(weeklyReflectionsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
