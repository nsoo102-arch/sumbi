import type { SumbiData, SumbiProfile, SumbiRecord } from "@/types/sumbi";
import { normalizeActivities } from "./activities";
import { getWeekKey, isCurrentWeek } from "./week";

const STORAGE_KEY = "sumbi";

function defaultDraft(): SumbiData["draft"] {
  return { activity: "", reflection: "", checkedActivities: [] };
}

function defaultData(): SumbiData {
  return {
    profile: null,
    weeklyActivities: null,
    records: [],
    draft: defaultDraft(),
  };
}

function normalizeDraft(
  draft: Partial<SumbiData["draft"]> | undefined,
): SumbiData["draft"] {
  return {
    activity: draft?.activity ?? "",
    reflection: draft?.reflection ?? "",
    checkedActivities: normalizeActivities(draft?.checkedActivities ?? []),
  };
}

function normalizeRecord(record: SumbiRecord): SumbiRecord {
  return {
    ...record,
    checkedActivities: normalizeActivities(record.checkedActivities ?? []),
  };
}

function migrateWeeklyActivities(parsed: SumbiData & { activities?: string[] }) {
  if (parsed.weeklyActivities) {
    if (isCurrentWeek(parsed.weeklyActivities.weekKey)) {
      return {
        weekKey: parsed.weeklyActivities.weekKey,
        activities: normalizeActivities(parsed.weeklyActivities.activities),
      };
    }
    return null;
  }

  const legacyActivities = parsed.activities ?? [];
  if (legacyActivities.length > 0) {
    return {
      weekKey: getWeekKey(),
      activities: normalizeActivities(legacyActivities),
    };
  }

  return null;
}

export function loadSumbi(): SumbiData {
  if (typeof window === "undefined") {
    return defaultData();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultData();
    }

    const parsed = JSON.parse(raw) as SumbiData & { activities?: string[] };
    return {
      profile: parsed.profile ?? null,
      weeklyActivities: migrateWeeklyActivities(parsed),
      records: (parsed.records ?? []).map(normalizeRecord),
      draft: normalizeDraft(parsed.draft),
    };
  } catch {
    return defaultData();
  }
}

export function saveSumbi(data: SumbiData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getWeeklyActivities(): string[] {
  const data = loadSumbi();
  if (!data.weeklyActivities || !isCurrentWeek(data.weeklyActivities.weekKey)) {
    return [];
  }
  return data.weeklyActivities.activities;
}

export function saveWeeklyActivities(activities: string[]): void {
  const data = loadSumbi();
  data.weeklyActivities = {
    weekKey: getWeekKey(),
    activities: normalizeActivities(activities),
  };
  saveSumbi(data);
}

export function saveProfile(profile: SumbiProfile): void {
  const data = loadSumbi();
  data.profile = profile;
  saveSumbi(data);
}

export function saveDraftActivity(activity: string): void {
  const data = loadSumbi();
  data.draft.activity = activity;
  saveSumbi(data);
}

export function saveDraftReflection(reflection: string): void {
  const data = loadSumbi();
  data.draft.reflection = reflection;
  saveSumbi(data);
}

export function saveDraftCheckedActivities(checkedActivities: string[]): void {
  const data = loadSumbi();
  data.draft.checkedActivities = normalizeActivities(checkedActivities);
  saveSumbi(data);
}

export function commitRecord(): SumbiRecord {
  const data = loadSumbi();
  const record: SumbiRecord = {
    id: crypto.randomUUID(),
    activity: data.draft.activity,
    reflection: data.draft.reflection,
    checkedActivities: normalizeActivities(data.draft.checkedActivities),
    savedAt: new Date().toISOString(),
  };

  data.records = [...data.records, record];
  data.draft = defaultDraft();
  saveSumbi(data);

  return record;
}
