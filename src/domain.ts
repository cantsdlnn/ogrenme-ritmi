export type ReviewRating = 'again' | 'hard' | 'good';

export interface Topic {
  id: string;
  title: string;
  course: string;
  dueDate: string;
  intervalDays: number;
  streak: number;
  estimatedMinutes: number;
}

export interface ReviewEvent {
  topicId: string;
  rating: ReviewRating;
  reviewedOn: string;
  previousDueDate: string;
  nextDueDate: string;
}

export interface ReviewResult {
  topic: Topic;
  event: ReviewEvent;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function validateTopic(topic: Topic): string[] {
  const errors: string[] = [];
  if (!topic.title.trim()) errors.push('Konu adı gerekli.');
  if (!topic.course.trim()) errors.push('Ders adı gerekli.');
  if (!DATE_PATTERN.test(topic.dueDate)) errors.push('Tekrar tarihi geçersiz.');
  if (
    !Number.isInteger(topic.estimatedMinutes) ||
    topic.estimatedMinutes < 5 ||
    topic.estimatedMinutes > 180
  )
    errors.push('Süre 5–180 dakika arasında olmalı.');
  if (!Number.isInteger(topic.intervalDays) || topic.intervalDays < 1)
    errors.push('Aralık en az bir gün olmalı.');
  return errors;
}

export function applyReview(topic: Topic, rating: ReviewRating, reviewedOn: string): ReviewResult {
  if (!DATE_PATTERN.test(reviewedOn)) throw new Error('Tekrar tarihi geçersiz.');
  let intervalDays: number;
  let streak: number;
  if (rating === 'again') {
    intervalDays = 1;
    streak = 0;
  } else if (rating === 'hard') {
    intervalDays = Math.max(1, Math.ceil(topic.intervalDays * 1.25));
    streak = topic.streak;
  } else {
    streak = topic.streak + 1;
    intervalDays =
      streak === 1 ? 1 : streak === 2 ? 3 : Math.max(4, Math.round(topic.intervalDays * 2));
  }
  const nextDueDate = addDays(reviewedOn, intervalDays);
  return {
    topic: { ...topic, intervalDays, streak, dueDate: nextDueDate },
    event: { topicId: topic.id, rating, reviewedOn, previousDueDate: topic.dueDate, nextDueDate },
  };
}

export function overdueDays(dueDate: string, today: string): number {
  const due = new Date(`${dueDate}T12:00:00Z`).getTime();
  const current = new Date(`${today}T12:00:00Z`).getTime();
  return Math.max(0, Math.round((current - due) / 86_400_000));
}

export function buildDailyQueue(topics: Topic[], today: string, minuteBudget: number): Topic[] {
  if (!DATE_PATTERN.test(today) || minuteBudget < 5) return [];
  const due = topics
    .filter((topic) => topic.dueDate <= today)
    .sort(
      (left, right) =>
        left.dueDate.localeCompare(right.dueDate) ||
        left.streak - right.streak ||
        left.title.localeCompare(right.title, 'tr'),
    );
  const selected: Topic[] = [];
  let used = 0;
  for (const topic of due) {
    if (used + topic.estimatedMinutes > minuteBudget && selected.length) continue;
    selected.push(topic);
    used += topic.estimatedMinutes;
  }
  return selected;
}

export function sevenDayActivity(events: ReviewEvent[], today: string): number[] {
  const days = Array.from({ length: 7 }, (_, index) => addDays(today, index - 6));
  return days.map((day) => events.filter((event) => event.reviewedOn === day).length);
}

export function completionPercent(queue: Topic[], reviewedTopicIds: string[]): number {
  const completed = new Set(reviewedTopicIds);
  const remaining = queue.filter((topic) => !completed.has(topic.id)).length;
  const total = completed.size + remaining;
  return total ? Math.round((completed.size / total) * 100) : 100;
}
