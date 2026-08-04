import type { Goal, GoalStatus } from '@prisma/client';

import { prisma } from './prisma';

export interface GoalResponse {
  id: string;
  name: string;
  description: string | null;
  targetDate: string | null;
  status: GoalStatus;
}

export interface AreaResponse {
  id: string;
  name: string;
  description: string | null;
  importance: number;
  createdAt: string;
  activeGoal: GoalResponse | null;
  loggedToday: boolean;
}

export function serializeGoal(goal: Goal): GoalResponse {
  return {
    id: goal.id,
    name: goal.name,
    description: goal.description,
    targetDate: goal.targetDate ? goal.targetDate.toISOString().slice(0, 10) : null,
    status: goal.status,
  };
}

export function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export async function serializeArea(area: {
  id: string;
  name: string;
  description: string | null;
  importance: number;
  createdAt: Date;
}): Promise<AreaResponse> {
  const [activeGoal, todaysReview] = await Promise.all([
    prisma.goal.findFirst({ where: { areaId: area.id, status: 'active' } }),
    prisma.dailyReview.findUnique({
      where: { areaId_date: { areaId: area.id, date: startOfToday() } },
    }),
  ]);

  return {
    id: area.id,
    name: area.name,
    description: area.description,
    importance: area.importance,
    createdAt: area.createdAt.toISOString(),
    activeGoal: activeGoal ? serializeGoal(activeGoal) : null,
    loggedToday: Boolean(todaysReview),
  };
}

export async function findOwnedArea(areaId: string, userId: string) {
  return prisma.area.findFirst({
    where: { id: areaId, userId, archivedAt: null },
  });
}
