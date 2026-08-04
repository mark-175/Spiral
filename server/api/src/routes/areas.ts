import { Router } from 'express';

import { asyncHandler } from '../lib/asyncHandler';
import { findOwnedArea, serializeArea } from '../lib/areas';
import { prisma } from '../lib/prisma';
import { optionalString, requireImportance, requireNonEmptyString } from '../lib/validation';

export const areasRouter = Router();

areasRouter.get(
  '/areas',
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const areas = await prisma.area.findMany({
      where: { userId, archivedAt: null },
      orderBy: { importance: 'desc' },
    });
    res.json(await Promise.all(areas.map(serializeArea)));
  }),
);

areasRouter.post(
  '/areas',
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const name = requireNonEmptyString(req.body.name, 'name');
    const description = optionalString(req.body.description, 'description');
    const importance = requireImportance(req.body.importance);

    const area = await prisma.area.create({
      data: { userId, name, description: description ?? null, importance },
    });
    res.status(201).json(await serializeArea(area));
  }),
);

areasRouter.get(
  '/areas/:id',
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const area = await findOwnedArea(req.params.id!, userId);
    if (!area) {
      res.status(404).json({ error: 'Area not found' });
      return;
    }
    res.json(await serializeArea(area));
  }),
);

areasRouter.patch(
  '/areas/:id',
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const area = await findOwnedArea(req.params.id!, userId);
    if (!area) {
      res.status(404).json({ error: 'Area not found' });
      return;
    }

    const name =
      req.body.name === undefined ? area.name : requireNonEmptyString(req.body.name, 'name');
    const description =
      req.body.description === undefined
        ? area.description
        : (optionalString(req.body.description, 'description') ?? null);
    const importance =
      req.body.importance === undefined ? area.importance : requireImportance(req.body.importance);

    const updated = await prisma.area.update({
      where: { id: area.id },
      data: { name, description, importance },
    });
    res.json(await serializeArea(updated));
  }),
);
