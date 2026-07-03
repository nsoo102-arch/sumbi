export type AuthMethod = "email" | "google" | "guest";

export interface UserProfile {
  name: string;
  breathName: string;
}

export interface DailyEntry {
  activity: string;
  record: string;
  date: string;
}

export interface SumbiState {
  authMethod: AuthMethod | null;
  email: string | null;
  profile: UserProfile | null;
  todayEntry: DailyEntry | null;
}

export const STORAGE_KEY = "sumbi-state";

export const defaultState: SumbiState = {
  authMethod: null,
  email: null,
  profile: null,
  todayEntry: null,
};
