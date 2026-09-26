import { describe, expect, it } from 'vitest';
import {
  applyReview,
  buildDailyQueue,
  completionPercent,
  overdueDays,
  sevenDayActivity,
  validateTopic,
  type Topic,
} from '../src/domain';
const topic: Topic = {
  id: '1',
  title: 'Bağlı listeler',
  course: 'Veri Yapıları',
  dueDate: '2026-09-20',
  intervalDays: 3,
  streak: 2,
  estimatedMinutes: 20,
};
describe('topic validation', () => {
  it('accepts a valid topic', () => expect(validateTopic(topic)).toEqual([]));
  it('rejects invalid fields', () =>
    expect(
      validateTopic({
        ...topic,
        title: '',
        course: '',
        dueDate: 'x',
        estimatedMinutes: 2,
        intervalDays: 0,
      }),
    ).toHaveLength(5));
});
describe('review scheduling', () => {
  it('resets an again rating to tomorrow', () => {
    const result = applyReview(topic, 'again', '2026-09-26');
    expect(result.topic).toMatchObject({ intervalDays: 1, streak: 0, dueDate: '2026-09-27' });
    expect(result.event.previousDueDate).toBe('2026-09-20');
  });
  it('grows hard conservatively without increasing streak', () =>
    expect(applyReview(topic, 'hard', '2026-09-26').topic).toMatchObject({
      intervalDays: 4,
      streak: 2,
      dueDate: '2026-09-30',
    }));
  it('uses one, three and doubling intervals for good ratings', () => {
    expect(applyReview({ ...topic, streak: 0 }, 'good', '2026-09-26').topic.intervalDays).toBe(1);
    expect(applyReview({ ...topic, streak: 1 }, 'good', '2026-09-26').topic.intervalDays).toBe(3);
    expect(applyReview(topic, 'good', '2026-09-26').topic.intervalDays).toBe(6);
  });
  it('rejects an invalid review date', () =>
    expect(() => applyReview(topic, 'good', 'bad')).toThrow());
});
describe('daily queue', () => {
  const topics = [
    topic,
    { ...topic, id: '2', title: 'HTTP', dueDate: '2026-09-25', estimatedMinutes: 30 },
    { ...topic, id: '3', title: 'SQL', dueDate: '2026-09-27', estimatedMinutes: 10 },
  ];
  it('selects due work in oldest-first order within budget', () =>
    expect(buildDailyQueue(topics, '2026-09-26', 45).map((item) => item.id)).toEqual(['1']));
  it('includes one oversized first item so a small budget never hides all work', () =>
    expect(buildDailyQueue([topic], '2026-09-26', 5)).toEqual([topic]));
  it('returns no queue for invalid inputs', () => {
    expect(buildDailyQueue(topics, 'bad', 45)).toEqual([]);
    expect(buildDailyQueue(topics, '2026-09-26', 4)).toEqual([]);
  });
});
describe('progress helpers', () => {
  it('calculates non-negative overdue days', () => {
    expect(overdueDays('2026-09-20', '2026-09-26')).toBe(6);
    expect(overdueDays('2026-09-30', '2026-09-26')).toBe(0);
  });
  it('builds seven calendar buckets', () => {
    const activity = sevenDayActivity(
      [
        {
          topicId: '1',
          rating: 'good',
          reviewedOn: '2026-09-26',
          previousDueDate: 'x',
          nextDueDate: 'y',
        },
      ],
      '2026-09-26',
    );
    expect(activity).toEqual([0, 0, 0, 0, 0, 0, 1]);
  });
  it('deduplicates reviewed topics and handles an empty queue', () => {
    expect(completionPercent([topic], ['1', '1'])).toBe(100);
    expect(completionPercent([], [])).toBe(100);
    expect(completionPercent([topic], [])).toBe(0);
  });
  it('keeps completed work in the denominator after it leaves the due queue', () => {
    expect(completionPercent([{ ...topic, id: '2' }], ['1'])).toBe(50);
  });
});
