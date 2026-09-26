import type { ReviewEvent, Topic } from './domain';
export interface AppData {
  topics: Topic[];
  events: ReviewEvent[];
  minuteBudget: number;
}
const KEY = 'ogrenme-ritmi:v1';
export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { topics: [], events: [], minuteBudget: 45 };
    const value = JSON.parse(raw) as Partial<AppData>;
    return {
      topics: Array.isArray(value.topics) ? value.topics : [],
      events: Array.isArray(value.events) ? value.events : [],
      minuteBudget: Number.isFinite(value.minuteBudget) ? Number(value.minuteBudget) : 45,
    };
  } catch {
    return { topics: [], events: [], minuteBudget: 45 };
  }
}
export function saveData(data: AppData): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}
export function clearData(): void {
  localStorage.removeItem(KEY);
}
