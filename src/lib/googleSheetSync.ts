"use client";

import { getSession } from "./auth";
import { toLocalDateString } from "@/services/sheets/mappers";
import { getWeekKey } from "./week";
import type { AuthSession } from "@/types/auth";
import type { SumbiRecord } from "@/types/sumbi";

/** Apps Script Web App URL이 설정되면 Google Sheets 저장을 사용합니다. */
export const GOOGLE_SHEET_SYNC_ENABLED = true;

export type GoogleSheetSyncType = "user" | "weekly_plan" | "daily_record";

export type GoogleSheetUserPayload = {
  created_at: string;
  user_id: string;
  name: string;
  nickname: string;
  email: string;
  /** salt:sha256 — signup/reset 시 필수, list 응답에는 없음 */
  password_hash?: string;
};

export type GoogleSheetWeeklyPlanPayload = {
  created_at: string;
  user_id: string;
  name: string;
  nickname: string;
  email: string;
  week_start_date: string;
  ritual_1: string;
  ritual_2: string;
  ritual_3: string;
  ritual_4: string;
  ritual_5: string;
};

export type GoogleSheetDailyRecordPayload = {
  timestamp: string;
  userId: string;
  nickname: string;
  date: string;
  completedRituals: string;
  memo: string;
  /** Apps Script fallback — 배열이 전달될 경우 서버에서 문자열로 변환 */
  checkedItems?: string[];
};

export type GoogleSheetPayload =
  | GoogleSheetUserPayload
  | GoogleSheetWeeklyPlanPayload
  | GoogleSheetDailyRecordPayload;

export type GoogleSheetSyncResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  status?: number;
  statusText?: string;
  text?: string;
  error?: string;
};

export function getAppsScriptUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL?.trim();
  if (!url) {
    return null;
  }

  try {
    new URL(url);
    return url;
  } catch {
    console.warn("[Google Sheets] NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL이 올바르지 않습니다.");
    return null;
  }
}

export function isGoogleSheetSyncEnabled(): boolean {
  return GOOGLE_SHEET_SYNC_ENABLED && getAppsScriptUrl() !== null;
}

export type AppsScriptAuthUser = {
  created_at?: string;
  user_id: string;
  name: string;
  nickname: string;
  email: string;
  status?: string;
};

export type AppsScriptAuthResult =
  | { ok: true; data: AppsScriptAuthUser }
  | { ok: false; error: string };

/** 회원가입/로그인/비밀번호 재설정용 Apps Script POST */
export async function postAppsScriptAuth(
  type: "signup" | "login" | "reset_password",
  payload: Record<string, unknown>,
): Promise<AppsScriptAuthResult> {
  const url = getAppsScriptUrl();
  if (!url) {
    return {
      ok: false,
      error: "NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL이 설정되지 않았습니다.",
    };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ type, payload }),
    });

    const responseText = await response.text();
    const trimmed = responseText.trim();
    const looksHtml =
      trimmed.startsWith("<!") ||
      trimmed.toLowerCase().startsWith("<html");

    if (!response.ok || looksHtml || !trimmed) {
      return {
        ok: false,
        error: looksHtml
          ? "서버 응답이 올바르지 않습니다. Apps Script를 새 버전으로 재배포해 주세요."
          : "서버 응답이 올바르지 않습니다. Apps Script 배포를 확인해 주세요.",
      };
    }

    const parsed = JSON.parse(trimmed) as {
      success?: boolean;
      data?: AppsScriptAuthUser;
      error?: string;
    };

    if (!parsed.success || !parsed.data) {
      return {
        ok: false,
        error: parsed.error || "요청에 실패했습니다.",
      };
    }

    return { ok: true, data: parsed.data };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message || "네트워크 오류가 발생했습니다." };
  }
}

const SYNC_SEND_LABELS: Record<GoogleSheetSyncType, string> = {
  user: "USER 전송",
  weekly_plan: "WEEKLY_PLAN 전송",
  daily_record: "DAILY_RECORD 전송",
};

export async function syncToGoogleSheet(
  type: GoogleSheetSyncType,
  payload: GoogleSheetPayload,
): Promise<GoogleSheetSyncResult> {
  const label = SYNC_SEND_LABELS[type];

  if (!isGoogleSheetSyncEnabled()) {
    console.warn(`${label} skipped: sync disabled or URL missing`);
    return {
      ok: false,
      skipped: true,
      reason: "sync disabled or URL missing",
    };
  }

  const url = getAppsScriptUrl();
  if (!url) {
    console.warn(`${label} skipped: URL missing`);
    return { ok: false, skipped: true, reason: "URL missing" };
  }

  const body = { type, payload };

  if (type !== "user") {
    console.log(label, payload);
    console.log(`${label} request`, JSON.stringify(body));
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
      keepalive: true,
    });

    const responseText = await response.text();
    const trimmed = responseText.trim();
    const looksHtml =
      trimmed.startsWith("<!") ||
      trimmed.toLowerCase().startsWith("<html") ||
      trimmed.toLowerCase().includes("<title>moved temporarily</title>");
    const looksJson =
      trimmed.startsWith("{") || trimmed.startsWith("[");

    if (type === "user") {
      console.log("SYNC USER RESPONSE", responseText.slice(0, 300));
    } else {
      console.log(`${label} response`, {
        status: response.status,
        statusText: response.statusText,
        text: responseText.slice(0, 300),
      });
    }

    if (!response.ok || looksHtml || (trimmed && !looksJson)) {
      console.error(`${label} failed`, {
        status: response.status,
        statusText: response.statusText,
        text: responseText.slice(0, 300),
      });
      return {
        ok: false,
        status: response.status,
        statusText: response.statusText,
        text: responseText,
        error: looksHtml
          ? "Apps Script가 HTML을 반환했습니다."
          : "Apps Script 응답이 올바르지 않습니다.",
      };
    }

    // 저장 성공 판정: HTTP ok + JSON 형태. 파싱 실패해도 throw하지 않음(중복 가입 방지).
    try {
      const parsed = JSON.parse(trimmed) as {
        success?: boolean;
        ok?: boolean;
        error?: string;
      };
      const success =
        parsed.success === true ||
        parsed.ok === true ||
        (parsed.success !== false && parsed.ok !== false);

      return {
        ok: success,
        status: response.status,
        statusText: response.statusText,
        text: responseText,
        error: success ? undefined : parsed.error || "저장에 실패했습니다.",
      };
    } catch {
      return {
        ok: false,
        status: response.status,
        statusText: response.statusText,
        text: responseText,
        error: "Apps Script 응답을 해석하지 못했습니다.",
      };
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    console.error(`${label} error`, message, error);
    return { ok: false, error: message };
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function buildGoogleUserPayload(
  session: AuthSession,
): GoogleSheetUserPayload {
  return {
    created_at: new Date().toISOString(),
    user_id: session.userId,
    name: session.name.trim(),
    nickname: session.nickname.trim(),
    email: normalizeEmail(session.email),
  };
}

function toWeeklyRitualSlots(activities: string[]): [
  string,
  string,
  string,
  string,
  string,
] {
  const trimmed = activities
    .map((activity) => activity.trim())
    .filter(Boolean)
    .slice(0, 5);

  return [
    trimmed[0] ?? "",
    trimmed[1] ?? "",
    trimmed[2] ?? "",
    trimmed[3] ?? "",
    trimmed[4] ?? "",
  ];
}

export function buildGoogleWeeklyPlanPayload(
  session: AuthSession,
  activities: string[],
): GoogleSheetWeeklyPlanPayload {
  const [ritual_1, ritual_2, ritual_3, ritual_4, ritual_5] =
    toWeeklyRitualSlots(activities);

  const user_id = session.userId?.trim() || "";

  return {
    created_at: new Date().toISOString(),
    user_id,
    name: session.name,
    nickname: session.nickname,
    email: session.email,
    week_start_date: getWeekKey(),
    ritual_1,
    ritual_2,
    ritual_3,
    ritual_4,
    ritual_5,
  };
}

function formatRituals(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "";
    }

    return value
      .map((item) => {
        if (typeof item === "string") {
          return item.trim();
        }
        if (typeof item === "number") {
          return String(item);
        }
        if (typeof item === "object" && item !== null) {
          const record = item as Record<string, unknown>;
          const label =
            record.label ??
            record.name ??
            record.title ??
            record.value ??
            record.text;
          return label ? String(label).trim() : JSON.stringify(item);
        }
        return "";
      })
      .filter(Boolean)
      .join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value).trim();
}

export function buildGoogleDailyRecordPayload(
  record: SumbiRecord,
  session: AuthSession,
): GoogleSheetDailyRecordPayload {
  const completedRituals = formatRituals(record.checkedActivities);

  if (process.env.NODE_ENV === "development") {
    console.log("DAILY_RECORD checkedActivities", record.checkedActivities);
    console.log("DAILY_RECORD completedRituals", completedRituals);
  }

  return {
    timestamp: record.savedAt,
    userId: session.userId,
    nickname: session.nickname,
    date: toLocalDateString(record.savedAt),
    completedRituals,
    memo: record.reflection,
    checkedItems: record.checkedActivities,
  };
}

export async function syncUserToGoogleSheet(
  session: AuthSession,
): Promise<void> {
  if (!isGoogleSheetSyncEnabled()) {
    console.warn("SYNC USER skipped: sync disabled or URL missing");
    return;
  }

  const url = getAppsScriptUrl();
  if (!url) {
    console.warn("SYNC USER skipped: URL missing");
    return;
  }

  const payload = buildGoogleUserPayload(session);
  console.log("SYNC USER", payload);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ type: "user", payload }),
      keepalive: true,
    });

    const text = await response.text();
    console.log("SYNC USER RESPONSE", text);

    if (!response.ok) {
      console.error("SYNC USER failed", response.status, text);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("SYNC USER error", message, error);
  }
}

export async function syncWeeklyPlanToGoogleSheet(
  activities: string[],
): Promise<void> {
  try {
    if (!isGoogleSheetSyncEnabled()) {
      console.warn("WEEKLY_PLAN 전송 skipped: sync disabled");
      return;
    }

    const session = getSession();
    if (!session) {
      console.warn("WEEKLY_PLAN 전송 skipped: no session");
      return;
    }

    const payload = buildGoogleWeeklyPlanPayload(session, activities);
    console.log("WEEKLY_PLAN", payload);

    await syncToGoogleSheet("weekly_plan", payload);
  } catch (error) {
    console.error("WEEKLY_PLAN 전송 error", error);
  }
}

export async function syncDailyRecordToGoogleSheet(
  record: SumbiRecord,
): Promise<void> {
  try {
    if (!isGoogleSheetSyncEnabled()) {
      console.warn("DAILY_RECORD 전송 skipped: sync disabled");
      return;
    }

    const session = getSession();
    if (!session) {
      console.warn("DAILY_RECORD 전송 skipped: no session");
      return;
    }

    await syncToGoogleSheet(
      "daily_record",
      buildGoogleDailyRecordPayload(record, session),
    );
  } catch (error) {
    console.error("DAILY_RECORD 전송 error", error);
  }
}
