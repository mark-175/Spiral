export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message =
      body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export type GoalStatus = 'active' | 'completed' | 'abandoned';

export interface Goal {
  id: string;
  name: string;
  description: string | null;
  targetDate: string | null;
  status: GoalStatus;
}

export interface AreaSummary {
  id: string;
  name: string;
  description: string | null;
  importance: number;
  createdAt: string;
  activeGoal: Goal | null;
  loggedToday: boolean;
}

export interface DailyReviewAnswers {
  improved: string;
  couldImprove: string;
  notes: string;
}

export interface DailyReview {
  id: string;
  date: string;
  answers: DailyReviewAnswers;
}

export interface WeeklyAnswers {
  wentWell: string;
  couldBeBetter: string;
  prevented: string;
  differently: string;
  proudOf: string;
}

export interface WeeklyReflection {
  id: string;
  weekStartDate: string;
  answers: WeeklyAnswers;
}

export function getAreas(): Promise<AreaSummary[]> {
  return request('/areas');
}

export function getArea(id: string): Promise<AreaSummary> {
  return request(`/areas/${id}`);
}

export function createArea(input: {
  name: string;
  description?: string;
  importance: number;
}): Promise<AreaSummary> {
  return request('/areas', { method: 'POST', body: JSON.stringify(input) });
}

export function updateArea(
  id: string,
  input: { name?: string; description?: string; importance?: number },
): Promise<AreaSummary> {
  return request(`/areas/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function saveGoal(
  areaId: string,
  input: { name: string; description?: string; targetDate?: string },
): Promise<Goal> {
  return request(`/areas/${areaId}/goal`, { method: 'PUT', body: JSON.stringify(input) });
}

export function getDailyReviews(areaId: string): Promise<DailyReview[]> {
  return request(`/areas/${areaId}/daily-reviews`);
}

export function saveDailyReview(areaId: string, input: DailyReviewAnswers): Promise<DailyReview> {
  return request(`/areas/${areaId}/daily-reviews`, { method: 'POST', body: JSON.stringify(input) });
}

export function getWeeklyReflections(areaId: string): Promise<WeeklyReflection[]> {
  return request(`/areas/${areaId}/weekly-reflections`);
}

export function saveWeeklyReflection(
  areaId: string,
  input: WeeklyAnswers,
): Promise<WeeklyReflection> {
  return request(`/areas/${areaId}/weekly-reflections`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
