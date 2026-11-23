/** Returns local calendar day key YYYY-MM-DD */
export function localDayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(base: Date, days: number): Date {
  const copy = new Date(base.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

/**
 * Computes consecutive daily practice streak ending today or yesterday.
 */
export function computeStreak(activityDays: readonly string[], now: Date = new Date()): number {
  if (activityDays.length === 0) return 0;
  const set = new Set(activityDays);
  const today = localDayKey(now);
  const yesterday = localDayKey(addDays(now, -1));

  let cursor = set.has(today) ? now : set.has(yesterday) ? addDays(now, -1) : null;
  if (!cursor) return 0;

  let streak = 0;
  while (set.has(localDayKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/**
 * Simple spaced repetition interval in hours based on percentage score (0–100):
 * - < 60%: review in 4 hours
 * - 60–79%: review in 24 hours (1 day)
 * - 80–92%: review in 72 hours (3 days)
 * - >= 93%: review in 168 hours (7 days)
 */
export function computeNextReviewIso(percent: number, now: Date = new Date()): string {
  const hours = percent < 60 ? 4 : percent < 80 ? 24 : percent < 93 ? 72 : 168;
  return new Date(now.getTime() + hours * 3_600_000).toISOString();
}

export function formatShortDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
