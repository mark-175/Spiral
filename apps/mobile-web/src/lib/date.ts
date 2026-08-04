export function formatTodayLabel(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatWeekRangeLabel(date: Date = new Date()): string {
  const dayOfWeek = date.getDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;

  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - daysSinceMonday);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const startLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    weekStart,
  );
  const endLabel = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(weekEnd);

  return `Week of ${startLabel} – ${endLabel}`;
}
