import { Router } from 'express';

import { asyncHandler } from '../lib/asyncHandler';
import { findOwnedArea, serializeGoal } from '../lib/areas';
import { getCurrentUserId } from '../lib/currentUser';
import { prisma } from '../lib/prisma';
import { optionalDateOnly, optionalString, requireNonEmptyString } from '../lib/validation';

export const goalsRouter = Router();

goalsRouter.put(
  '/areas/:id/goal',
  asyncHandler(async (req, res) => {
    const userId = await getCurrentUserId();
    const area = await findOwnedArea(req.params.id!, userId);
    if (!area) {
      res.status(404).json({ error: 'Area not found' });
      return;
    }

    const name = requireNonEmptyString(req.body.name, 'name');
    const description = optionalString(req.body.description, 'description');
    const targetDate = optionalDateOnly(req.body.targetDate, 'targetDate');

    const existingActiveGoal = await prisma.goal.findFirst({
      where: { areaId: area.id, status: 'active' },
    });

    const goal = existingActiveGoal
      ? await prisma.goal.update({
          where: { id: existingActiveGoal.id },
          data: { name, description: description ?? null, targetDate: targetDate ?? null },
        })
      : await prisma.goal.create({
          data: {
            areaId: area.id,
            name,
            description: description ?? null,
            targetDate: targetDate ?? null,
          },
        });

    res.json(serializeGoal(goal));
  }),
);
