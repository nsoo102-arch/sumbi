export type SumbiProfile = {
  name: string;
  breathName: string;
};

export type SumbiData = {
  email?: string;
  loginMethod?: "email" | "google" | "guest";
  profile?: SumbiProfile;
  todayNote?: string;
  recordNote?: string;
};

const STORAGE_KEY = "sumbi-data";

export function getSumbiData(): SumbiData {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SumbiData) : {};
  } catch {
    return {};
  }
}

export function saveSumbiData(data: Partial<SumbiData>): SumbiData {
  const current = getSumbiData();
  const updated = { ...current, ...data };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
