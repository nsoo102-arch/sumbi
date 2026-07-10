"use client";

import { getSession } from "./auth";
import {
  buildBreathRecordRow,
  buildLetterRow,
  buildMemberRow,
} from "@/services/sheets/mappers";
import { localSheetStorage } from "@/services/sheets/client/localSheetStorage";
import type { AuthSession } from "@/types/auth";
import type { SumbiRecord } from "@/types/sumbi";
import type { LetterSheetRow } from "@/types/sheets";

async function postToSheetApi(path: string, body: unknown): Promise<void> {
  try {
    await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.warn("[Sheets API] 저장 실패:", error);
  }
}

async function runGoogleSheetSync(
  runner: (
    google: typeof import("./googleSheetSync"),
  ) => Promise<void>,
): Promise<void> {
  try {
    const google = await import("./googleSheetSync");
    if (!google.isGoogleSheetSyncEnabled()) {
      return;
    }
    await runner(google);
  } catch (error) {
    console.error("[Google Sheets] sync skipped:", error);
  }
}

/** 회원가입 후 localStorage/API 스테이징 저장 */
export async function syncMemberAfterSignup(
  session: AuthSession,
): Promise<void> {
  const row = buildMemberRow(session);
  await localSheetStorage.saveMember(row);
  await postToSheetApi("/api/sheets/members", row);
}

/** 오늘의 숨 기록 저장 (localStorage + Google) */
export async function syncBreathRecord(record: SumbiRecord): Promise<void> {
  const session = getSession();
  if (!session) {
    console.warn("DAILY_RECORD 전송 skipped: no session");
    return;
  }

  void runGoogleSheetSync((google) =>
    google.syncDailyRecordToGoogleSheet(record),
  );

  const row = buildBreathRecordRow(record, session);
  await localSheetStorage.saveBreathRecord(row);
}

/** 이번 주 숨비소리 저장 (localStorage + Google Apps Script) */
export async function syncWeeklyPlanAfterSave(
  activities: string[],
): Promise<void> {
  void runGoogleSheetSync((google) =>
    google.syncWeeklyPlanToGoogleSheet(activities),
  );
}

/** 관리자 숨비편지 저장 (localStorage + API) */
export async function syncLetter(input: {
  user_id: string;
  record_id: string;
  name: string;
  nickname: string;
  letter_content: string;
  sent_status?: LetterSheetRow["sent_status"];
}): Promise<LetterSheetRow> {
  const row = buildLetterRow(input);
  await localSheetStorage.saveLetter(row);
  await postToSheetApi("/api/sheets/letters", row);
  return row;
}
