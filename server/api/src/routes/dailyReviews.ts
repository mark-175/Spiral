import type { Prisma } from '@prisma/client';
import { Router } from 'express';

import { asyncHandler } from '../lib/asyncHandler';
import { findOwnedArea, startOfToday } from '../lib/areas';
import { getCurrentUserId } from '../lib/currentUser';
import { prisma } from '../lib/prisma';
import { ValidationError } from '../lib/validation';

export const dailyReviewsRouter = Router();

interface DailyReviewAnswers {
  improved: string;
  couldImprove: string;
  notes: string;
}

function parseAnswers(body: unknown): DailyReviewAnswers {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Request body must be an object');
  }
  const { improved, couldImprove, notes } = body as Record<string, unknown>;

  if (typeof improved !== 'string' || improved.trim().length === 0) {
    throw new ValidationError('improved is required');
  }
  if (typeof couldImprove !== 'string' || couldImprove.trim().length === 0) {
    throw new ValidationError('couldImprove is required');
  }
  if (notes !== undefined && typeof notes !== 'string') {
    throw new ValidationError('notes must be a string');
  }

  return {
    improved: improved.trim(),
    couldImprove: couldImprove.trim(),
    notes: (notes as string | undefined) ?? '',
  };
}

dailyReviewsRouter.get(
  '/areas/:id/daily-reviews',
  asyncHandler(async (req, res) => {
    const userId = await getCurrentUserId();
    const area = await findOwnedArea(req.params.id!, userId);
    if (!area) {
      res.status(404).json({ error: 'Area not found' });
      return;
    }

    const reviews = await prisma.dailyReview.findMany({
      where: { areaId: area.id },
      orderBy: { date: 'desc' },
    });

    res.json(
      reviews.map((review) => ({
        id: review.id,
        date: review.date.toISOString().slice(0, 10),
        answers: review.answers,
      })),
    );
  }),
);

dailyReviewsRouter.post(
  '/areas/:id/daily-reviews',
  asyncHandler(async (req, res) => {
    const userId = await getCurrentUserId();
    const area = await findOwnedArea(req.params.id!, userId);
    if (!area) {
      res.status(404).json({ error: 'Area not found' });
      return;
    }

    const answers = parseAnswers(req.body);
    const date = startOfToday();

    const review = await prisma.dailyReview.upsert({
      where: { areaId_date: { areaId: area.id, date } },
      update: { answers: answers as unknown as Prisma.InputJsonValue },
      create: { areaId: area.id, date, answers: answers as unknown as Prisma.InputJsonValue },
    });

    res.json({
      id: review.id,
      date: review.date.toISOString().slice(0, 10),
      answers: review.answers,
    });
  }),
);
