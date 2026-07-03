import {
  defaultState,
  STORAGE_KEY,
  type AuthMethod,
  type DailyEntry,
  type SumbiState,
  type UserProfile,
} from "./types";

function readState(): SumbiState {
  if (typeof window === "undefined") return defaultState;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return defaultState;
  }
}

function writeState(state: SumbiState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getState(): SumbiState {
  return readState();
}

export function setAuth(method: AuthMethod, email?: string): void {
  const state = readState();
  state.authMethod = method;
  state.email = email ?? null;
  writeState(state);
}

export function setProfile(profile: UserProfile): void {
  const state = readState();
  state.profile = profile;
  writeState(state);
}

export function setTodayActivity(activity: string): void {
  const state = readState();
  const today = new Date().toISOString().split("T")[0];
  state.todayEntry = {
    activity,
    record: state.todayEntry?.record ?? "",
    date: today,
  };
  writeState(state);
}

export function setTodayRecord(record: string): void {
  const state = readState();
  const today = new Date().toISOString().split("T")[0];
  state.todayEntry = {
    activity: state.todayEntry?.activity ?? "",
    record,
    date: today,
  };
  writeState(state);
}

export function getTodayEntry(): DailyEntry | null {
  const state = readState();
  const today = new Date().toISOString().split("T")[0];
  if (state.todayEntry?.date === today) return state.todayEntry;
  return null;
}

export function clearState(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function isAuthenticated(): boolean {
  return readState().authMethod !== null;
}

export function hasProfile(): boolean {
  const profile = readState().profile;
  return Boolean(profile?.name && profile?.breathName);
}
