import "server-only";

import type {
  BreathRecordSheetRow,
  LetterSheetRow,
  MemberSheetRow,
} from "@/types/sheets";

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field}은(는) 필수입니다.`);
  }
  return value.trim();
}

export function parseMemberRow(body: unknown): MemberSheetRow {
  if (!body || typeof body !== "object") {
    throw new Error("요청 본문이 올바르지 않습니다.");
  }

  const input = body as Record<string, unknown>;
  const status = input.status === "inactive" ? "inactive" : "active";

  return {
    user_id: requireString(input.user_id, "user_id"),
    name: requireString(input.name, "name"),
    nickname: requireString(input.nickname, "nickname"),
    email: requireString(input.email, "email"),
    created_at: requireString(input.created_at, "created_at"),
    status,
  };
}

export function parseBreathRecordRow(body: unknown): BreathRecordSheetRow {
  if (!body || typeof body !== "object") {
    throw new Error("요청 본문이 올바르지 않습니다.");
  }

  const input = body as Record<string, unknown>;

  return {
    record_id: requireString(input.record_id, "record_id"),
    user_id: requireString(input.user_id, "user_id"),
    name: requireString(input.name, "name"),
    nickname: requireString(input.nickname, "nickname"),
    email: requireString(input.email, "email"),
    date: requireString(input.date, "date"),
    mood: typeof input.mood === "string" ? input.mood : "",
    content: requireString(input.content, "content"),
    created_at: requireString(input.created_at, "created_at"),
  };
}

export function parseLetterRow(body: unknown): LetterSheetRow {
  if (!body || typeof body !== "object") {
    throw new Error("요청 본문이 올바르지 않습니다.");
  }

  const input = body as Record<string, unknown>;
  const sentStatus = input.sent_status === "sent" ? "sent" : "pending";

  return {
    letter_id: requireString(input.letter_id, "letter_id"),
    user_id: requireString(input.user_id, "user_id"),
    record_id: requireString(input.record_id, "record_id"),
    name: requireString(input.name, "name"),
    nickname: requireString(input.nickname, "nickname"),
    letter_content: requireString(input.letter_content, "letter_content"),
    created_at: requireString(input.created_at, "created_at"),
    sent_status: sentStatus,
  };
}
