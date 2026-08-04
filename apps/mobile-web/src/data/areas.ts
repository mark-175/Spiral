export interface ActionLogEntry {
  dateLabel: string;
  text: string;
}

export interface DailyReviewSummary {
  dateLabel: string;
  summary: string;
}

export interface WeeklyReflectionSummary {
  weekLabel: string;
  highlight: string;
}

export interface WeeklyAnswers {
  wentWell: string;
  couldBeBetter: string;
  prevented: string;
  differently: string;
  proudOf: string;
}

export interface Goal {
  name: string;
  targetDateISO: string;
  targetDateLabel: string;
  description: string;
}

export interface Area {
  id: string;
  name: string;
  accent: string;
  importance: number;
  description: string;
  loggedToday: boolean;
  goal: Goal;
  actionLog: ActionLogEntry[];
  reviewHistory: DailyReviewSummary[];
  weeklyHistory: WeeklyReflectionSummary[];
  dailyPrompt2: string;
  weeklyAnswers: WeeklyAnswers;
}

// Sample data matching the approved "Development OS" mockup. This app has no
// backend wiring yet (see CLAUDE.md - v1 seeds a single user, no persistence
// layer built for Areas yet), so these screens read from this in-memory set.
export const AREAS: Area[] = [
  {
    id: 'developer',
    name: 'Developer',
    accent: '#59AAF8',
    importance: 9,
    description:
      'Growing as a software craftsman: deeper systems knowledge, shipping real things end to end.',
    loggedToday: true,
    goal: {
      name: 'Ship a personal project end-to-end',
      targetDateISO: '2026-09-30',
      targetDateLabel: 'Sep 30, 2026',
      description:
        'Design, build, and launch a small tool for real users — from idea through a working v1 in production.',
    },
    actionLog: [
      { dateLabel: 'Aug 2', text: 'Refactored the auth module and fixed two session bugs.' },
      {
        dateLabel: 'Aug 1',
        text: 'Wrote the data model for the new project and sketched the API.',
      },
      { dateLabel: 'Jul 30', text: 'Paired with a friend on code review practices for an hour.' },
      {
        dateLabel: 'Jul 28',
        text: 'Read through the Postgres indexing docs, applied one to a slow query.',
      },
    ],
    reviewHistory: [
      { dateLabel: 'Aug 1', summary: 'Made real progress; spent focused time on the data model.' },
      { dateLabel: 'Jul 31', summary: 'Slower day — mostly reading, little building.' },
      { dateLabel: 'Jul 30', summary: 'Good pairing session, learned something concrete.' },
    ],
    weeklyHistory: [
      {
        weekLabel: 'Jul 20 – Jul 26',
        highlight: 'Finished the project skeleton and got the first deploy live.',
      },
      {
        weekLabel: 'Jul 13 – Jul 19',
        highlight: 'Slow week; mostly research with little to show for it.',
      },
    ],
    dailyPrompt2: 'Refactored the auth module and fixed two session bugs.',
    weeklyAnswers: {
      wentWell: 'Got the data model right on the first pass and shipped a working auth flow.',
      couldBeBetter:
        'Spent too long deliberating over the API shape instead of just building and iterating.',
      prevented: 'Two evenings were eaten by an unrelated work deadline.',
      differently: 'Timebox design decisions to 30 minutes before just building something.',
      proudOf: 'The pairing session — asking for help earlier than I usually would.',
    },
  },
  {
    id: 'athlete',
    name: 'Athlete',
    accent: '#5BBD74',
    importance: 7,
    description: 'Building real endurance and consistency, not just motivation spikes.',
    loggedToday: false,
    goal: {
      name: 'Run a sub-1:45 half marathon',
      targetDateISO: '2026-11-08',
      targetDateLabel: 'Nov 8, 2026',
      description:
        'Build a base through the fall, then a structured 10-week plan targeting race day pace.',
    },
    actionLog: [
      { dateLabel: 'Jul 31', text: '8km easy run, felt strong on the last 2km.' },
      { dateLabel: 'Jul 29', text: 'Strength session — legs and core, 40 minutes.' },
      { dateLabel: 'Jul 27', text: 'Long run, 16km, slower pace than planned.' },
    ],
    reviewHistory: [
      { dateLabel: 'Jul 31', summary: 'Good run, recovery is trending better.' },
      { dateLabel: 'Jul 29', summary: 'Progress, but tired — need more sleep this week.' },
    ],
    weeklyHistory: [
      {
        weekLabel: 'Jul 20 – Jul 26',
        highlight: 'Hit every planned run for the first time in a month.',
      },
    ],
    dailyPrompt2: '8km easy run, felt strong on the last 2km.',
    weeklyAnswers: {
      wentWell: 'Hit every planned run this week, including the long run.',
      couldBeBetter: 'Sleep was inconsistent, which showed up in recovery.',
      prevented: 'Nothing major — this was a clean week.',
      differently: 'Move the long run earlier in the weekend so recovery isn’t rushed.',
      proudOf: 'Not skipping the Tuesday strength session even when tired.',
    },
  },
  {
    id: 'writer',
    name: 'Writer',
    accent: '#AC89E8',
    importance: 6,
    description:
      'Developing a regular writing practice and finishing longer work instead of abandoning drafts.',
    loggedToday: true,
    goal: {
      name: 'Finish first draft of a novella',
      targetDateISO: '2027-01-15',
      targetDateLabel: 'Jan 15, 2027',
      description: 'Roughly 40,000 words. Consistency matters more than daily word count.',
    },
    actionLog: [
      { dateLabel: 'Aug 2', text: 'Wrote 900 words, worked through a stuck scene.' },
      { dateLabel: 'Jul 31', text: 'Outlined the next three chapters.' },
      { dateLabel: 'Jul 29', text: 'Revised the opening chapter after feedback.' },
    ],
    reviewHistory: [
      { dateLabel: 'Aug 2', summary: 'Got unstuck on a scene I’d been avoiding — good session.' },
      { dateLabel: 'Jul 31', summary: 'Planning day, no new prose but useful.' },
    ],
    weeklyHistory: [
      {
        weekLabel: 'Jul 20 – Jul 26',
        highlight: 'Crossed 15,000 words total; found a sustainable daily rhythm.',
      },
    ],
    dailyPrompt2: 'Wrote 900 words and worked through a stuck scene.',
    weeklyAnswers: {
      wentWell: 'Got unstuck on the scene I’d been avoiding for a week.',
      couldBeBetter: 'Word count was uneven — a couple of days I barely wrote anything.',
      prevented: 'Perfectionism on the opening chapter cost a full evening.',
      differently: 'Draft messy first, edit later — stop polishing on the first pass.',
      proudOf: 'Sitting down to write even on the two days I really didn’t feel like it.',
    },
  },
  {
    id: 'piano',
    name: 'Piano Player',
    accent: '#E69C3A',
    importance: 5,
    description:
      'Rebuilding technique after years away, aiming for real pieces rather than exercises.',
    loggedToday: false,
    goal: {
      name: 'Perform Clair de Lune from memory',
      targetDateISO: '2026-12-01',
      targetDateLabel: 'Dec 1, 2026',
      description:
        'Learn it section by section, memorize as I go, and play it for family at the holidays.',
    },
    actionLog: [
      { dateLabel: 'Jul 30', text: 'Practiced the opening arpeggios slowly, 30 minutes.' },
      { dateLabel: 'Jul 27', text: 'Worked through measures 9–16 hands separately.' },
    ],
    reviewHistory: [{ dateLabel: 'Jul 30', summary: 'Small but real progress on the opening.' }],
    weeklyHistory: [
      {
        weekLabel: 'Jul 20 – Jul 26',
        highlight: 'Only practiced twice — lowest-effort week in a while.',
      },
    ],
    dailyPrompt2: 'Practiced the opening arpeggios slowly for 30 minutes.',
    weeklyAnswers: {
      wentWell: 'The two sessions I did have were focused and unhurried.',
      couldBeBetter: 'Only practiced twice this week — lowest in a while.',
      prevented: 'Evenings got swallowed by other commitments.',
      differently: 'Protect one fixed 20-minute slot instead of hoping time appears.',
      proudOf: 'Slowing the arpeggios down instead of rushing them, even when frustrated.',
    },
  },
];

export const WEEKLY_QUESTIONS: { key: keyof WeeklyAnswers; label: string }[] = [
  { key: 'wentWell', label: 'What went well this week?' },
  { key: 'couldBeBetter', label: 'What could’ve gone better?' },
  { key: 'prevented', label: 'What prevented progress?' },
  { key: 'differently', label: 'What will I do differently?' },
  { key: 'proudOf', label: 'What am I most proud of?' },
];

export function getAreasByImportance(): Area[] {
  return [...AREAS].sort((a, b) => b.importance - a.importance);
}

export function getAreaById(id: string): Area | undefined {
  return AREAS.find((area) => area.id === id);
}
