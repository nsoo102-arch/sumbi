import type { AuthSession } from "@/types/auth";
import type { SumbiRecord } from "@/types/sumbi";
import type {
  BreathRecordSheetRow,
  LetterSheetRow,
  MemberSheetRow,
} from "@/types/sheets";

export function toLocalDateString(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function buildMemberRow(session: AuthSession): MemberSheetRow {
  return {
    user_id: session.userId,
    name: session.name.trim(),
    nickname: session.nickname.trim(),
    email: session.email.trim().toLowerCase(),
    created_at: new Date().toISOString(),
    status: "active",
  };
}

export function buildBreathRecordRow(
  record: SumbiRecord,
  session: AuthSession,
): BreathRecordSheetRow {
  const mood =
    record.checkedActivities.length > 0
      ? record.checkedActivities.join(", ")
      : "";

  return {
    record_id: record.id,
    user_id: session.userId,
    name: session.name,
    nickname: session.nickname,
    email: session.email,
    date: toLocalDateString(record.savedAt),
    mood,
    content: record.reflection,
    created_at: record.savedAt,
  };
}

export function buildLetterRow(input: {
  user_id: string;
  record_id: string;
  name: string;
  nickname: string;
  letter_content: string;
  sent_status?: LetterSheetRow["sent_status"];
}): LetterSheetRow {
  return {
    letter_id: crypto.randomUUID(),
    user_id: input.user_id,
    record_id: input.record_id,
    name: input.name,
    nickname: input.nickname,
    letter_content: input.letter_content,
    created_at: new Date().toISOString(),
    sent_status: input.sent_status ?? "pending",
  };
}
