import "server-only";

import type { SheetStorageService } from "../sheetStorage.interface";
import {
  isAppsScriptConfigured,
  listMembersFromAppsScript,
} from "./appsScriptClient";

const NOT_READY_MESSAGE =
  "Google Sheets API 연동은 아직 준비 중입니다. SHEET_STORAGE_PROVIDER=local 을 사용하세요.";

async function notReady(): Promise<void> {
  throw new Error(NOT_READY_MESSAGE);
}

/**
 * Google Sheets 연동 서비스 (API route 전용).
 * 회원 목록 읽기는 Apps Script doGet을 사용합니다.
 * 쓰기는 기존 클라이언트 Apps Script 경로를 유지합니다.
 */
export const googleSheetsService: SheetStorageService = {
  saveMember: notReady,
  async listMembers() {
    if (!isAppsScriptConfigured()) {
      throw new Error(
        "Apps Script URL이 설정되지 않았습니다. GOOGLE_APPS_SCRIPT_URL 또는 NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL을 확인하세요.",
      );
    }
    return listMembersFromAppsScript();
  },
  saveBreathRecord: notReady,
  saveLetter: notReady,
};
