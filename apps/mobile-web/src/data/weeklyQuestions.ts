import type { WeeklyAnswers } from '@/lib/api';

export const WEEKLY_QUESTIONS: { key: keyof WeeklyAnswers; label: string }[] = [
  { key: 'wentWell', label: 'What went well this week?' },
  { key: 'couldBeBetter', label: 'What could’ve gone better?' },
  { key: 'prevented', label: 'What prevented progress?' },
  { key: 'differently', label: 'What will I do differently?' },
  { key: 'proudOf', label: 'What am I most proud of?' },
];
