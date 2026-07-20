import "server-only";

import { googleSheetsService } from "./googleSheetsService";
import { serverSheetStorage } from "./serverSheetStorage";
import {
  createLetterInAppsScript,
  createLetterReplyInAppsScript,
  getAdminNoteFromAppsScript,
  getAdminStatsFromAppsScript,
  getAdminSummaryFromAppsScript,
  getMemberDetailFromAppsScript,
  isAppsScriptConfigured,
  listDailyByDateFromAppsScript,
  listInactiveThisWeekFromAppsScript,
  listLetterRepliesFromAppsScript,
  listLettersFromAppsScript,
  listMembersFromAppsScript,
  listUnreadLetterRepliesFromAppsScript,
  listUnreadLettersFromAppsScript,
  markLetterReadInAppsScript,
  markLetterReplyReadInAppsScript,
  normalizeEmail,
  saveAdminNoteInAppsScript,
} from "./appsScriptClient";
import type { SheetStorageService } from "../sheetStorage.interface";
import type {
  AdminDailyRecord,
  AdminNote,
  AdminRecentUser,
  AdminStats,
  AdminSummary,
  LetterReply,
  MemberDetail,
  MemberSheetRow,
  SumbiLetter,
} from "@/types/sheets";

function resolveProvider(): "google" | "local" {
  const provider = process.env.SHEET_STORAGE_PROVIDER;
  return provider === "google" ? "google" : "local";
}

/**
 * 회원 목록 조회.
 * Apps Script URL이 있으면 Google Sheets Users 시트를 읽고,
 * 없으면 로컬 스테이징(.data/sheets-staging.json)을 사용합니다.
 */
export async function listMembers(): Promise<MemberSheetRow[]> {
  if (isAppsScriptConfigured()) {
    return listMembersFromAppsScript();
  }

  return serverSheetStorage.listMembers();
}

/**
 * 회원 상세 조회.
 * Apps Script가 있으면 Users + weekly_plan + daily_record를 함께 읽고,
 * 없으면 로컬 스테이징 회원 정보만 반환합니다.
 */
export async function getMemberDetail(email: string): Promise<MemberDetail> {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    throw new Error("이메일이 필요합니다.");
  }

  if (isAppsScriptConfigured()) {
    return getMemberDetailFromAppsScript(normalized);
  }

  const members = await serverSheetStorage.listMembers();
  const member = members.find(
    (row) => normalizeEmail(row.email) === normalized,
  );

  if (!member) {
    throw new Error("해당 이메일의 회원을 찾을 수 없습니다.");
  }

  return {
    member,
    weekly: null,
    records: [],
  };
}

export async function createLetter(input: {
  email: string;
  name: string;
  nickname: string;
  message: string;
}): Promise<SumbiLetter> {
  if (!isAppsScriptConfigured()) {
    throw new Error(
      "Apps Script URL이 설정되지 않아 숨편지를 저장할 수 없습니다.",
    );
  }

  return createLetterInAppsScript(input);
}

export async function listLetters(
  email: string,
  limit = 50,
): Promise<SumbiLetter[]> {
  if (!isAppsScriptConfigured()) {
    return [];
  }

  return listLettersFromAppsScript(email, limit);
}

export async function markLetterRead(input: {
  id: string;
  email: string;
}): Promise<SumbiLetter> {
  if (!isAppsScriptConfigured()) {
    throw new Error(
      "Apps Script URL이 설정되지 않아 읽음 처리할 수 없습니다.",
    );
  }

  return markLetterReadInAppsScript(input);
}

export async function listLetterReplies(input: {
  letterId: string;
  email?: string;
}): Promise<LetterReply[]> {
  if (!isAppsScriptConfigured()) {
    return [];
  }

  return listLetterRepliesFromAppsScript(input);
}

export async function createLetterReply(input: {
  letterId: string;
  email: string;
  userId?: string;
  nickname?: string;
  replyContent: string;
}): Promise<LetterReply> {
  if (!isAppsScriptConfigured()) {
    throw new Error(
      "Apps Script URL이 설정되지 않아 답장을 저장할 수 없습니다.",
    );
  }

  return createLetterReplyInAppsScript(input);
}

export async function listUnreadLetterReplies(
  limit = 100,
): Promise<LetterReply[]> {
  if (!isAppsScriptConfigured()) {
    return [];
  }

  return listUnreadLetterRepliesFromAppsScript(limit);
}

export async function markLetterReplyRead(input: {
  replyId: string;
}): Promise<LetterReply> {
  if (!isAppsScriptConfigured()) {
    throw new Error(
      "Apps Script URL이 설정되지 않아 읽음 처리할 수 없습니다.",
    );
  }

  return markLetterReplyReadInAppsScript(input);
}

export async function getAdminSummary(): Promise<AdminSummary> {
  if (!isAppsScriptConfigured()) {
    const members = await serverSheetStorage.listMembers();
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const recentUsers = [...members]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 3)
      .map((member) => ({
        user_id: member.user_id,
        name: member.name,
        nickname: member.nickname,
        email: normalizeEmail(member.email),
        created_at: member.created_at,
      }));

    return {
      total_members: members.length,
      today_breathers: 0,
      week_participants: 0,
      unread_letters: 0,
      totalUsers: members.length,
      todayWriters: 0,
      weeklyParticipants: 0,
      weeklyParticipationRate: 0,
      unreadLetters: 0,
      recentUsers,
      today,
      week_start: today,
      week_end: today,
    };
  }

  return getAdminSummaryFromAppsScript();
}

export async function getAdminStats(): Promise<AdminStats> {
  if (!isAppsScriptConfigured()) {
    const members = await serverSheetStorage.listMembers();
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    return {
      totalUsers: members.length,
      weeklyParticipants: 0,
      weeklyParticipationRate: 0,
      weeklyRecordCount: 0,
      topRituals: [],
      recentWeeks: [],
      today,
      week_start: today,
      week_end: today,
    };
  }

  return getAdminStatsFromAppsScript();
}

export async function listDailyByDate(
  date: string,
): Promise<AdminDailyRecord[]> {
  if (!isAppsScriptConfigured()) {
    return [];
  }

  return listDailyByDateFromAppsScript(date);
}

export async function listUnreadLetters(
  limit = 100,
): Promise<SumbiLetter[]> {
  if (!isAppsScriptConfigured()) {
    return [];
  }

  return listUnreadLettersFromAppsScript(limit);
}

export async function getAdminNote(email: string): Promise<AdminNote> {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    throw new Error("이메일이 필요합니다.");
  }

  if (!isAppsScriptConfigured()) {
    return {
      email: normalized,
      note: "",
      updated_at: "",
    };
  }

  return getAdminNoteFromAppsScript(normalized);
}

export async function saveAdminNote(input: {
  email: string;
  note: string;
}): Promise<AdminNote> {
  const email = normalizeEmail(input.email);
  if (!email) {
    throw new Error("이메일이 필요합니다.");
  }

  if (!isAppsScriptConfigured()) {
    throw new Error(
      "Apps Script URL이 설정되지 않아 운영 메모를 저장할 수 없습니다.",
    );
  }

  return saveAdminNoteInAppsScript({
    email,
    note: input.note,
  });
}

export async function listInactiveThisWeek(): Promise<AdminRecentUser[]> {
  if (!isAppsScriptConfigured()) {
    return [];
  }

  return listInactiveThisWeekFromAppsScript();
}

/** API route 전용 저장소 팩토리 */
export function getServerSheetStorage(): SheetStorageService {
  if (resolveProvider() === "google") {
    return googleSheetsService;
  }
  return serverSheetStorage;
}
