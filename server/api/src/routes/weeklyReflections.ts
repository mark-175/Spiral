import type { Prisma } from '@prisma/client';
import { Router } from 'express';

import { asyncHandler } from '../lib/asyncHandler';
import { findOwnedArea } from '../lib/areas';
import { getCurrentUserId } from '../lib/currentUser';
import { prisma } from '../lib/prisma';
import { ValidationError } from '../lib/validation';

export const weeklyReflectionsRouter = Router();

interface WeeklyAnswers {
  wentWell: string;
  couldBeBetter: string;
  prevented: string;
  differently: string;
  proudOf: string;
}

const WEEKLY_ANSWER_KEYS: (keyof WeeklyAnswers)[] = [
  'wentWell',
  'couldBeBetter',
  'prevented',
  'differently',
  'proudOf',
];

function parseAnswers(body: unknown): WeeklyAnswers {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Request body must be an object');
  }
  const record = body as Record<string, unknown>;
  const answers = {} as WeeklyAnswers;

  for (const key of WEEKLY_ANSWER_KEYS) {
    const value = record[key];
    if (typeof value !== 'string') {
      throw new ValidationError(`${key} must be a string`);
    }
    answers[key] = value;
  }

  return answers;
}

function startOfCurrentWeek(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday));
}

weeklyReflectionsRouter.get(
  '/areas/:id/weekly-reflections',
  asyncHandler(async (req, res) => {
    const userId = await getCurrentUserId();
    const area = await findOwnedArea(req.params.id!, userId);
    if (!area) {
      res.status(404).json({ error: 'Area not found' });
      return;
    }

    const reflections = await prisma.weeklyReflection.findMany({
      where: { areaId: area.id },
      orderBy: { weekStartDate: 'desc' },
    });

    res.json(
      reflections.map((reflection) => ({
        id: reflection.id,
        weekStartDate: reflection.weekStartDate.toISOString().slice(0, 10),
        answers: reflection.answers,
      })),
    );
  }),
);

weeklyReflectionsRouter.post(
  '/areas/:id/weekly-reflections',
  asyncHandler(async (req, res) => {
    const userId = await getCurrentUserId();
    const area = await findOwnedArea(req.params.id!, userId);
    if (!area) {
      res.status(404).json({ error: 'Area not found' });
      return;
    }

    const answers = parseAnswers(req.body);
    const weekStartDate = startOfCurrentWeek();

    const reflection = await prisma.weeklyReflection.upsert({
      where: { areaId_weekStartDate: { areaId: area.id, weekStartDate } },
      update: { answers: answers as unknown as Prisma.InputJsonValue },
      create: {
        areaId: area.id,
        weekStartDate,
        answers: answers as unknown as Prisma.InputJsonValue,
      },
    });

    res.json({
      id: reflection.id,
      weekStartDate: reflection.weekStartDate.toISOString().slice(0, 10),
      answers: reflection.answers,
    });
  }),
);
