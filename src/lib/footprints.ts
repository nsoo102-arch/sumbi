import type { SumbiRecord } from "@/types/sumbi";
import { normalizeActivities } from "./activities";
import { getWeekStart } from "./week";

export type FootprintsSummary = {
  weekCounts: [string, number][];
};

function normalizeRecord(record: SumbiRecord): SumbiRecord {
  return {
    ...record,
    userId: record.userId ?? "",
    checkedActivities: normalizeActivities(record.checkedActivities ?? []),
  };
}

function countCheckedActivities(records: SumbiRecord[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const record of records) {
    for (const activity of record.checkedActivities) {
      counts.set(activity, (counts.get(activity) ?? 0) + 1);
    }
  }

  return counts;
}

function sortCounts(counts: Map<string, number>): [string, number][] {
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b, "ko"));
}

export function getFootprintsSummary(records: SumbiRecord[]): FootprintsSummary {
  const weekStart = getWeekStart();
  const weekRecords = records
    .map(normalizeRecord)
    .filter((record) => new Date(record.savedAt) >= weekStart);

  return {
    weekCounts: sortCounts(countCheckedActivities(weekRecords)),
  };
}
