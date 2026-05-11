import { addDays, differenceInCalendarDays, format, isAfter, parseISO, startOfWeek, subDays } from 'date-fns';

export interface AdherenceSession {
  id: string;
  name: string;
  block_id: string;
  day_offset: number;
  date: string; // YYYY-MM-DD
  status: 'completed' | 'missed' | 'today' | 'upcoming';
  block_name?: string;
}

export interface AdherenceMetrics {
  totalSessionsToDate: number;
  totalSessionsAll: number;
  completedSessions: number;
  missedSessions: number;
  upcomingSessions: number;
  adherencePercentage: number;
  currentStreak: number;
  lastCompletedDate: string | null;
  todaySession: AdherenceSession | null;
  nextSession: AdherenceSession | null;
  sessions: AdherenceSession[];
  weekCompleted: number;
  weekMissed: number;
  weekAdherence: number;
}

/**
 * Compute adherence given the programme structure (sessions) and completion logs.
 * - A session is "scheduled on" startDate + day_offset.
 * - Completed if there's a completion log with that programming_session_id.
 * - Missed if its scheduled date is in the past (before today) and not completed.
 */
export const computeAdherence = (params: {
  startDate: string | null | undefined;
  sessions: Array<{ id: string; name: string; block_id: string; day_offset: number }>;
  blocks?: Array<{ id: string; name: string }>;
  completionLogs: Array<{ programming_session_id: string | null; performed_on: string }>;
  today?: Date;
}): AdherenceMetrics => {
  const today = params.today ?? new Date();
  const start = params.startDate ? parseISO(params.startDate) : null;
  const blockMap = Object.fromEntries((params.blocks ?? []).map((b) => [b.id, b.name]));
  const completedIds = new Set(
    (params.completionLogs ?? [])
      .map((l) => l.programming_session_id)
      .filter((x): x is string => !!x)
  );

  const sessions: AdherenceSession[] = (params.sessions ?? [])
    .slice()
    .sort((a, b) => a.day_offset - b.day_offset)
    .map((s) => {
      const date = start ? addDays(start, s.day_offset) : today;
      const dateStr = format(date, 'yyyy-MM-dd');
      const diff = start ? differenceInCalendarDays(today, date) : 0;
      let status: AdherenceSession['status'];
      if (completedIds.has(s.id)) status = 'completed';
      else if (diff > 0) status = 'missed';
      else if (diff === 0) status = 'today';
      else status = 'upcoming';
      return {
        id: s.id,
        name: s.name,
        block_id: s.block_id,
        day_offset: s.day_offset,
        date: dateStr,
        status,
        block_name: blockMap[s.block_id],
      };
    });

  const totalSessionsAll = sessions.length;
  const toDate = sessions.filter((s) => s.status !== 'upcoming');
  const completedSessions = sessions.filter((s) => s.status === 'completed').length;
  const missedSessions = sessions.filter((s) => s.status === 'missed').length;
  const upcomingSessions = sessions.filter((s) => s.status === 'upcoming').length;
  const adherencePercentage = toDate.length
    ? Math.round((completedSessions / toDate.length) * 100)
    : 0;

  // Streak: consecutive completed sessions ending at most-recent past/today session
  let currentStreak = 0;
  for (let i = toDate.length - 1; i >= 0; i--) {
    if (toDate[i].status === 'completed') currentStreak++;
    else break;
  }

  const completedDates = (params.completionLogs ?? [])
    .map((l) => l.performed_on)
    .sort()
    .reverse();
  const lastCompletedDate = completedDates[0] ?? null;

  const todaySession = sessions.find((s) => s.status === 'today') ?? null;
  const nextSession =
    todaySession ?? sessions.find((s) => s.status === 'upcoming') ?? null;

  // Weekly (current week, Mon start)
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekSessions = sessions.filter((s) =>
    isAfter(parseISO(s.date), subDays(weekStart, 1))
  );
  const weekCompleted = weekSessions.filter((s) => s.status === 'completed').length;
  const weekMissed = weekSessions.filter((s) => s.status === 'missed').length;
  const weekScheduledToDate = weekSessions.filter((s) => s.status !== 'upcoming').length;
  const weekAdherence = weekScheduledToDate
    ? Math.round((weekCompleted / weekScheduledToDate) * 100)
    : 0;

  return {
    totalSessionsToDate: toDate.length,
    totalSessionsAll,
    completedSessions,
    missedSessions,
    upcomingSessions,
    adherencePercentage,
    currentStreak,
    lastCompletedDate,
    todaySession,
    nextSession,
    sessions,
    weekCompleted,
    weekMissed,
    weekAdherence,
  };
};
