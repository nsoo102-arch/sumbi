import type { SumbiRecord } from "@/types/sumbi";
import { getWeekStart } from "./week";

export type PracticeRates = {
  hasBreathedToday: boolean;
  weekRate: number;
  monthRate: number;
};

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  if (value >= 100) {
    return 100;
  }
  return Math.round(value);
}

/** 기록한 고유 일수 기준 이번 주·이번 달 실천률 */
export function getPracticeRates(records: SumbiRecord[]): PracticeRates {
  const now = new Date();
  const todayKey = toLocalDateKey(now);
  const weekStart = getWeekStart(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();

  const weekDays = new Set<string>();
  const monthDays = new Set<string>();
  let hasBreathedToday = false;

  for (const record of records) {
    const savedAt = new Date(record.savedAt);
    if (Number.isNaN(savedAt.getTime())) {
      continue;
    }

    const key = toLocalDateKey(savedAt);
    if (key === todayKey) {
      hasBreathedToday = true;
    }
    if (savedAt >= weekStart && savedAt < weekEnd) {
      weekDays.add(key);
    }
    if (savedAt >= monthStart && savedAt < monthEnd) {
      monthDays.add(key);
    }
  }

  return {
    hasBreathedToday,
    weekRate: clampPercent((weekDays.size / 7) * 100),
    monthRate: clampPercent((monthDays.size / daysInMonth) * 100),
  };
}
