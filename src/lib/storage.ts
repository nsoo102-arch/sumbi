import type { SumbiData, SumbiProfile, SumbiRecord } from "@/types/sumbi";
import { getSession } from "./auth";
import { normalizeActivities } from "./activities";
import { createId } from "./id";
import { getWeekKey, isCurrentWeek } from "./week";

function getUserDataKey(userId: string): string {
  return `sumbi-user-${userId}`;
}

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
    userId: record.userId,
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

function parseUserData(raw: string): SumbiData {
  const parsed = JSON.parse(raw) as SumbiData & { activities?: string[] };
  return {
    profile: parsed.profile ?? null,
    weeklyActivities: migrateWeeklyActivities(parsed),
    records: (parsed.records ?? []).map(normalizeRecord),
    draft: normalizeDraft(parsed.draft),
  };
}

function getCurrentUserId(): string | null {
  return getSession()?.userId ?? null;
}

export function loadSumbi(): SumbiData {
  if (typeof window === "undefined") {
    return defaultData();
  }

  const userId = getCurrentUserId();
  if (!userId) {
    return defaultData();
  }

  try {
    const raw = localStorage.getItem(getUserDataKey(userId));
    if (!raw) {
      return defaultData();
    }
    return parseUserData(raw);
  } catch {
    return defaultData();
  }
}

export function saveSumbi(data: SumbiData): void {
  const userId = getCurrentUserId();
  if (!userId) {
    return;
  }
  localStorage.setItem(getUserDataKey(userId), JSON.stringify(data));
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

export function commitRecord(options?: {
  checkedActivities?: string[];
  reflection?: string;
}): SumbiRecord {
  const data = loadSumbi();
  const userId = getCurrentUserId();
  const checkedActivities = normalizeActivities(
    options?.checkedActivities ?? data.draft.checkedActivities,
  );
  const reflection = options?.reflection ?? data.draft.reflection;

  const record: SumbiRecord = {
    id: createId(),
    userId: userId ?? "",
    activity: data.draft.activity,
    reflection,
    checkedActivities,
    savedAt: new Date().toISOString(),
  };

  data.records = [...data.records, record];
  data.draft = defaultDraft();
  saveSumbi(data);

  return record;
}

export function initializeUserProfile(name: string): void {
  const data = loadSumbi();
  if (!data.profile) {
    data.profile = { name, note: "" };
    saveSumbi(data);
  }
}
