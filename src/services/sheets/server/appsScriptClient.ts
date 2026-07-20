import "server-only";

import type {
  AdminDailyRecord,
  AdminNote,
  AdminRecentUser,
  AdminRitualRank,
  AdminStats,
  AdminSummary,
  AdminWeeklyTrend,
  MemberDailyRecord,
  MemberDetail,
  MemberSheetRow,
  LetterReply,
  MemberWeeklyPlan,
  SumbiLetter,
} from "@/types/sheets";

type AppsScriptResponse = {
  success?: boolean;
  data?: unknown;
  error?: string;
};

/**
 * 서버 전용 Apps Script URL.
 * GOOGLE_APPS_SCRIPT_URL(서버 전용)을 우선하고,
 * 없으면 기존 NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL을 사용합니다.
 * 클라이언트 코드에서는 이 모듈을 import하지 마세요.
 */
function getAppsScriptUrl(): string | null {
  const serverUrl = process.env.GOOGLE_APPS_SCRIPT_URL?.trim();
  const publicUrl = process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL?.trim();
  const url = serverUrl || publicUrl;

  if (!url) {
    return null;
  }

  try {
    new URL(url);
    return url;
  } catch {
    console.warn("[Apps Script] URL이 올바르지 않습니다.");
    return null;
  }
}

function asString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return String(value).trim();
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Asia/Seoul 기준 YYYY-MM-DD.
 * ISO 문자열을 slice(0,10) 하면 UTC 날짜가 되어 KST 자정이 하루 밀립니다.
 */
function normalizeKoreaDateKey(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return "";
    }
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(value);
  }

  const raw = asString(value);
  if (!raw) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(parsed);
  }

  const match = raw.match(
    /(\d{4})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/,
  );
  if (match) {
    return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  }

  return "";
}

function parseMemberRow(raw: unknown): MemberSheetRow | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const row = raw as Record<string, unknown>;
  const user_id = asString(row.user_id ?? row.userId ?? row.id);
  const name = asString(row.name);
  const nickname = asString(row.nickname);
  const email = asString(row.email);
  const created_at = asString(row.created_at ?? row.createdAt);
  const status = row.status === "inactive" ? "inactive" : "active";

  if (!user_id && !name && !nickname && !email) {
    return null;
  }

  return {
    user_id,
    name,
    nickname,
    email: normalizeEmail(email),
    created_at,
    status,
  };
}

function parseWeeklyPlan(raw: unknown): MemberWeeklyPlan | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const row = raw as Record<string, unknown>;
  const ritualsRaw = row.rituals;
  const rituals = Array.isArray(ritualsRaw)
    ? ritualsRaw.map(asString).filter(Boolean)
    : [
        asString(row.ritual_1),
        asString(row.ritual_2),
        asString(row.ritual_3),
        asString(row.ritual_4),
        asString(row.ritual_5),
      ].filter(Boolean);

  return {
    created_at: asString(row.created_at ?? row.createdAt),
    user_id: asString(row.user_id ?? row.userId),
    name: asString(row.name),
    nickname: asString(row.nickname),
    email: asString(row.email),
    week_start_date: asString(row.week_start_date ?? row.weekStartDate),
    rituals,
  };
}

function parseDailyRecord(raw: unknown): MemberDailyRecord | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const row = raw as Record<string, unknown>;
  const timestamp = asString(row.timestamp ?? row.created_at);
  const date =
    normalizeKoreaDateKey(row.date) ||
    normalizeKoreaDateKey(row.timestamp ?? row.created_at);
  const completed_rituals = asString(
    row.completed_rituals ?? row.completedRituals,
  );
  const memo = asString(row.memo ?? row.content ?? row.note);

  if (!timestamp && !date && !completed_rituals && !memo) {
    return null;
  }

  return {
    timestamp,
    user_id: asString(row.user_id ?? row.userId),
    nickname: asString(row.nickname),
    date,
    completed_rituals,
    memo,
  };
}

function parseAppsScriptJson(text: string, context: string): AppsScriptResponse {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error(`Apps Script가 빈 응답을 반환했습니다. (${context})`);
  }

  if (trimmed.startsWith("<!") || trimmed.toLowerCase().startsWith("<html")) {
    throw new Error(
      `Apps Script가 HTML을 반환했습니다. Code.gs를 저장한 뒤 웹 앱을 새 버전으로 재배포해 주세요. (${context})`,
    );
  }

  try {
    return JSON.parse(trimmed) as AppsScriptResponse;
  } catch {
    throw new Error(
      `Apps Script 응답을 해석하지 못했습니다. Code.gs를 새 버전으로 재배포했는지 확인해 주세요. (${trimmed.slice(0, 120)})`,
    );
  }
}

function parseListUsersResponse(text: string): MemberSheetRow[] {
  const parsed = parseAppsScriptJson(text, "list_users");

  if (parsed.success === false) {
    throw new Error(parsed.error || "회원 목록 조회에 실패했습니다.");
  }

  if (!Array.isArray(parsed.data)) {
    throw new Error("회원 목록 응답 형식이 올바르지 않습니다.");
  }

  return parsed.data
    .map(parseMemberRow)
    .filter((row): row is MemberSheetRow => row !== null)
    .sort((a, b) => {
      const aKey = a.created_at || "";
      const bKey = b.created_at || "";
      if (aKey === bKey) {
        return a.name.localeCompare(b.name, "ko", { sensitivity: "base" });
      }
      return aKey < bKey ? 1 : -1;
    });
}

function parseMemberDetailResponse(text: string): MemberDetail {
  const parsed = parseAppsScriptJson(text, "get_member");

  if (parsed.success === false) {
    throw new Error(parsed.error || "회원 상세 조회에 실패했습니다.");
  }

  if (!parsed.data || typeof parsed.data !== "object") {
    throw new Error("회원 상세 응답 형식이 올바르지 않습니다.");
  }

  const data = parsed.data as Record<string, unknown>;
  const member = parseMemberRow(data.member);

  if (!member) {
    throw new Error("회원 기본정보가 올바르지 않습니다.");
  }

  const weekly = parseWeeklyPlan(data.weekly);
  const recordsRaw = Array.isArray(data.records) ? data.records : [];
  const records = recordsRaw
    .map(parseDailyRecord)
    .filter((row): row is MemberDailyRecord => row !== null);

  return { member, weekly, records };
}

async function fetchListUsersViaGet(baseUrl: string): Promise<MemberSheetRow[]> {
  const url = new URL(baseUrl);
  url.searchParams.set("action", "list_users");

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
    redirect: "follow",
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `회원 목록을 불러오지 못했습니다. (${response.status}) ${text.slice(0, 200)}`,
    );
  }

  return parseListUsersResponse(text);
}

async function fetchListUsersViaPost(
  baseUrl: string,
): Promise<MemberSheetRow[]> {
  const response = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ type: "list_users", payload: {} }),
    cache: "no-store",
    redirect: "follow",
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `회원 목록을 불러오지 못했습니다. (${response.status}) ${text.slice(0, 200)}`,
    );
  }

  return parseListUsersResponse(text);
}

async function fetchMemberDetailViaGet(
  baseUrl: string,
  email: string,
): Promise<MemberDetail> {
  const url = new URL(baseUrl);
  url.searchParams.set("action", "get_member");
  url.searchParams.set("email", email);

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
    redirect: "follow",
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `회원 상세를 불러오지 못했습니다. (${response.status}) ${text.slice(0, 200)}`,
    );
  }

  return parseMemberDetailResponse(text);
}

async function fetchMemberDetailViaPost(
  baseUrl: string,
  email: string,
): Promise<MemberDetail> {
  const response = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ type: "get_member", payload: { email } }),
    cache: "no-store",
    redirect: "follow",
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `회원 상세를 불러오지 못했습니다. (${response.status}) ${text.slice(0, 200)}`,
    );
  }

  return parseMemberDetailResponse(text);
}

export function isAppsScriptConfigured(): boolean {
  return getAppsScriptUrl() !== null;
}

/**
 * Apps Script로 Users 시트 회원 목록을 조회합니다.
 * 1) GET ?action=list_users
 * 2) 실패 시 POST { type: "list_users" }
 */
export async function listMembersFromAppsScript(): Promise<MemberSheetRow[]> {
  const baseUrl = getAppsScriptUrl();
  if (!baseUrl) {
    throw new Error("Apps Script URL이 설정되지 않았습니다.");
  }

  try {
    return await fetchListUsersViaGet(baseUrl);
  } catch (getError) {
    try {
      return await fetchListUsersViaPost(baseUrl);
    } catch (postError) {
      const getMessage =
        getError instanceof Error ? getError.message : String(getError);
      const postMessage =
        postError instanceof Error ? postError.message : String(postError);
      throw new Error(
        `Google Sheets 회원 목록을 불러오지 못했습니다. GET: ${getMessage} / POST: ${postMessage}`,
      );
    }
  }
}

/**
 * Apps Script로 회원 상세(기본정보 + 최근 weekly + daily)를 조회합니다.
 * 1) GET ?action=get_member&email=...
 * 2) 실패 시 POST { type: "get_member", payload: { email } }
 */
export async function getMemberDetailFromAppsScript(
  email: string,
): Promise<MemberDetail> {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    throw new Error("이메일이 필요합니다.");
  }

  const baseUrl = getAppsScriptUrl();
  if (!baseUrl) {
    throw new Error("Apps Script URL이 설정되지 않았습니다.");
  }

  try {
    return await fetchMemberDetailViaGet(baseUrl, normalized);
  } catch (getError) {
    try {
      return await fetchMemberDetailViaPost(baseUrl, normalized);
    } catch (postError) {
      const getMessage =
        getError instanceof Error ? getError.message : String(getError);
      const postMessage =
        postError instanceof Error ? postError.message : String(postError);
      throw new Error(
        `Google Sheets 회원 상세를 불러오지 못했습니다. GET: ${getMessage} / POST: ${postMessage}`,
      );
    }
  }
}

function parseSumbiLetter(raw: unknown): SumbiLetter | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const row = raw as Record<string, unknown>;
  const id = asString(row.id ?? row.letter_id);
  const email = normalizeEmail(asString(row.email));
  const message = asString(row.message ?? row.letter_content);
  const read_at = asString(row.read_at);
  const statusRaw = asString(row.status).toLowerCase();
  const status =
    statusRaw === "read" || statusRaw === "unread"
      ? statusRaw
      : read_at
        ? "read"
        : "unread";

  if (!id && !message) {
    return null;
  }

  return {
    id,
    email,
    name: asString(row.name),
    nickname: asString(row.nickname),
    message,
    sent_at: asString(row.sent_at ?? row.created_at),
    read_at,
    status,
  };
}

function parseLettersResponse(text: string): SumbiLetter[] {
  const parsed = parseAppsScriptJson(text, "list_letters");

  if (parsed.success === false) {
    throw new Error(parsed.error || "숨편지 목록 조회에 실패했습니다.");
  }

  if (!Array.isArray(parsed.data)) {
    throw new Error("숨편지 목록 응답 형식이 올바르지 않습니다.");
  }

  return parsed.data
    .map(parseSumbiLetter)
    .filter((row): row is SumbiLetter => row !== null);
}

function parseLetterResponse(text: string, context: string): SumbiLetter {
  const parsed = parseAppsScriptJson(text, context);

  if (parsed.success === false) {
    throw new Error(parsed.error || "숨편지 처리에 실패했습니다.");
  }

  const letter = parseSumbiLetter(parsed.data);
  if (!letter) {
    throw new Error("숨편지 응답 형식이 올바르지 않습니다.");
  }

  return letter;
}

async function postAppsScriptAction(
  baseUrl: string,
  type: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const response = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ type, payload }),
    cache: "no-store",
    redirect: "follow",
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Apps Script 요청 실패 (${type}, ${response.status}) ${text.slice(0, 200)}`,
    );
  }

  return text;
}

/** Letters 시트에 숨편지를 저장합니다. */
export async function createLetterInAppsScript(input: {
  id?: string;
  email: string;
  name: string;
  nickname: string;
  message: string;
  sent_at?: string;
}): Promise<SumbiLetter> {
  const email = normalizeEmail(input.email);
  const message = input.message.trim();

  if (!email) {
    throw new Error("이메일이 필요합니다.");
  }

  if (!message) {
    throw new Error("편지 내용이 비어 있습니다.");
  }

  const baseUrl = getAppsScriptUrl();
  if (!baseUrl) {
    throw new Error("Apps Script URL이 설정되지 않았습니다.");
  }

  const text = await postAppsScriptAction(baseUrl, "create_letter", {
    id: input.id || crypto.randomUUID(),
    email,
    name: input.name.trim(),
    nickname: input.nickname.trim(),
    message,
    sent_at: input.sent_at || new Date().toISOString(),
  });

  return parseLetterResponse(text, "create_letter");
}

/** 해당 이메일의 숨편지 목록을 최신순으로 조회합니다. */
export async function listLettersFromAppsScript(
  email: string,
  limit = 50,
): Promise<SumbiLetter[]> {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    throw new Error("이메일이 필요합니다.");
  }

  const baseUrl = getAppsScriptUrl();
  if (!baseUrl) {
    throw new Error("Apps Script URL이 설정되지 않았습니다.");
  }

  const actions = ["get_letters", "list_letters"] as const;
  const errors: string[] = [];

  for (const action of actions) {
    try {
      const url = new URL(baseUrl);
      url.searchParams.set("action", action);
      url.searchParams.set("email", normalized);
      url.searchParams.set("limit", String(limit));

      const response = await fetch(url.toString(), {
        method: "GET",
        cache: "no-store",
        redirect: "follow",
      });
      const text = await response.text();

      if (!response.ok) {
        throw new Error(
          `숨편지 목록을 불러오지 못했습니다. (${response.status})`,
        );
      }

      return parseLettersResponse(text);
    } catch (getError) {
      errors.push(
        `GET ${action}: ${
          getError instanceof Error ? getError.message : String(getError)
        }`,
      );
    }
  }

  for (const action of actions) {
    try {
      const text = await postAppsScriptAction(baseUrl, action, {
        email: normalized,
        limit,
      });
      return parseLettersResponse(text);
    } catch (postError) {
      errors.push(
        `POST ${action}: ${
          postError instanceof Error ? postError.message : String(postError)
        }`,
      );
    }
  }

  throw new Error(
    `Google Sheets 숨편지 목록을 불러오지 못했습니다. ${errors.join(" / ")}`,
  );
}

function parseLetterReply(raw: unknown): LetterReply | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const row = raw as Record<string, unknown>;
  const replyId = asString(row.replyId ?? row.reply_id ?? row.id);
  const letterId = asString(row.letterId ?? row.letter_id);
  const replyContent = asString(
    row.replyContent ?? row.reply_content ?? row.message,
  );

  if (!replyId && !replyContent) {
    return null;
  }

  const isReadRaw = row.isRead ?? row.is_read;
  const isRead =
    isReadRaw === true ||
    isReadRaw === 1 ||
    String(isReadRaw).toLowerCase() === "true" ||
    String(isReadRaw).toLowerCase() === "1";

  return {
    replyId,
    letterId,
    userId: asString(row.userId ?? row.user_id),
    email: normalizeEmail(asString(row.email)),
    nickname: asString(row.nickname),
    replyContent,
    createdAt: asString(row.createdAt ?? row.created_at),
    isRead,
  };
}

function parseLetterRepliesResponse(text: string): LetterReply[] {
  const parsed = parseAppsScriptJson(text, "list_letter_replies");

  if (parsed.success === false) {
    throw new Error(parsed.error || "답장 목록 조회에 실패했습니다.");
  }

  if (!Array.isArray(parsed.data)) {
    throw new Error("답장 목록 응답 형식이 올바르지 않습니다.");
  }

  return parsed.data
    .map(parseLetterReply)
    .filter((row): row is LetterReply => row !== null);
}

function parseLetterReplyResponse(text: string, context: string): LetterReply {
  const parsed = parseAppsScriptJson(text, context);

  if (parsed.success === false) {
    throw new Error(parsed.error || "답장 처리에 실패했습니다.");
  }

  const reply = parseLetterReply(parsed.data);
  if (!reply) {
    throw new Error("답장 응답 형식이 올바르지 않습니다.");
  }

  return reply;
}

/** 편지별 답장 목록을 조회합니다. */
export async function listLetterRepliesFromAppsScript(input: {
  letterId: string;
  email?: string;
}): Promise<LetterReply[]> {
  const letterId = input.letterId.trim();
  const email = normalizeEmail(input.email ?? "");

  if (!letterId) {
    throw new Error("letterId가 필요합니다.");
  }

  const baseUrl = getAppsScriptUrl();
  if (!baseUrl) {
    throw new Error("Apps Script URL이 설정되지 않았습니다.");
  }

  try {
    const url = new URL(baseUrl);
    url.searchParams.set("action", "list_letter_replies");
    url.searchParams.set("letterId", letterId);
    if (email) {
      url.searchParams.set("email", email);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`답장 목록을 불러오지 못했습니다. (${response.status})`);
    }
    return parseLetterRepliesResponse(text);
  } catch {
    const text = await postAppsScriptAction(baseUrl, "list_letter_replies", {
      letterId,
      email,
    });
    return parseLetterRepliesResponse(text);
  }
}

/** 숨편지에 답장을 저장합니다. 편지당 1회만 가능합니다. */
export async function createLetterReplyInAppsScript(input: {
  letterId: string;
  email: string;
  userId?: string;
  nickname?: string;
  replyContent: string;
}): Promise<LetterReply> {
  const letterId = input.letterId.trim();
  const email = normalizeEmail(input.email);
  const replyContent = input.replyContent.trim();

  if (!letterId) {
    throw new Error("letterId가 필요합니다.");
  }
  if (!email) {
    throw new Error("이메일이 필요합니다.");
  }
  if (!replyContent) {
    throw new Error("답장 내용이 비어 있습니다.");
  }

  const baseUrl = getAppsScriptUrl();
  if (!baseUrl) {
    throw new Error("Apps Script URL이 설정되지 않았습니다.");
  }

  const text = await postAppsScriptAction(baseUrl, "create_letter_reply", {
    replyId: crypto.randomUUID(),
    letterId,
    email,
    userId: (input.userId ?? "").trim(),
    nickname: (input.nickname ?? "").trim(),
    replyContent,
    createdAt: new Date().toISOString(),
  });

  return parseLetterReplyResponse(text, "create_letter_reply");
}

/** 숨편지를 읽음 처리합니다. email+id로 본인 편지인지 검증합니다. */
export async function markLetterReadInAppsScript(input: {
  id: string;
  email: string;
}): Promise<SumbiLetter> {
  const id = input.id.trim();
  const email = normalizeEmail(input.email);

  if (!id) {
    throw new Error("편지 id가 필요합니다.");
  }

  if (!email) {
    throw new Error("이메일이 필요합니다.");
  }

  const baseUrl = getAppsScriptUrl();
  if (!baseUrl) {
    throw new Error("Apps Script URL이 설정되지 않았습니다.");
  }

  const payload = {
    id,
    email,
    read_at: new Date().toISOString(),
  };

  try {
    const text = await postAppsScriptAction(baseUrl, "read_letter", payload);
    return parseLetterResponse(text, "read_letter");
  } catch (readError) {
    try {
      const text = await postAppsScriptAction(
        baseUrl,
        "mark_letter_read",
        payload,
      );
      return parseLetterResponse(text, "mark_letter_read");
    } catch (markError) {
      const readMessage =
        readError instanceof Error ? readError.message : String(readError);
      const markMessage =
        markError instanceof Error ? markError.message : String(markError);
      throw new Error(
        `숨편지 읽음 처리에 실패했습니다. read_letter: ${readMessage} / mark_letter_read: ${markMessage}`,
      );
    }
  }
}

function parseAdminRecentUser(raw: unknown): AdminRecentUser | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const row = raw as Record<string, unknown>;
  const email = normalizeEmail(asString(row.email));
  const name = asString(row.name);
  const nickname = asString(row.nickname);

  if (!email && !name && !nickname) {
    return null;
  }

  return {
    user_id: asString(row.user_id ?? row.userId),
    name,
    nickname,
    email,
    created_at: asString(row.created_at ?? row.createdAt),
  };
}

function parseAdminSummary(raw: unknown): AdminSummary {
  if (!raw || typeof raw !== "object") {
    throw new Error("관리자 요약 응답 형식이 올바르지 않습니다.");
  }

  const row = raw as Record<string, unknown>;
  const toNumber = (value: unknown) => {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const totalUsers = toNumber(row.totalUsers ?? row.total_members);
  let todayWriters = toNumber(row.todayWriters ?? row.today_breathers);
  let weeklyParticipants = toNumber(
    row.weeklyParticipants ?? row.week_participants,
  );
  const unreadLetters = toNumber(row.unreadLetters ?? row.unread_letters);

  // unique user 수 / 전체 회원 수, 항상 0~100
  let weeklyParticipationRate = 0;
  if (totalUsers <= 0) {
    weeklyParticipants = 0;
    todayWriters = 0;
    weeklyParticipationRate = 0;
  } else {
    if (weeklyParticipants > totalUsers) {
      weeklyParticipants = totalUsers;
    }
    if (todayWriters > totalUsers) {
      todayWriters = totalUsers;
    }
    weeklyParticipationRate = Math.max(
      0,
      Math.min(100, Math.round((weeklyParticipants / totalUsers) * 100)),
    );
  }

  const recentRaw = Array.isArray(row.recentUsers) ? row.recentUsers : [];
  const recentUsers = recentRaw
    .map(parseAdminRecentUser)
    .filter((item): item is AdminRecentUser => item !== null);

  return {
    total_members: totalUsers,
    today_breathers: todayWriters,
    week_participants: weeklyParticipants,
    unread_letters: unreadLetters,
    totalUsers,
    todayWriters,
    weeklyParticipants,
    weeklyParticipationRate,
    unreadLetters,
    recentUsers,
    today: asString(row.today),
    week_start: asString(row.week_start ?? row.weekStart),
    week_end: asString(row.week_end ?? row.weekEnd),
  };
}

function parseAdminDailyRecord(raw: unknown): AdminDailyRecord | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const row = raw as Record<string, unknown>;
  const timestamp = asString(row.timestamp);
  const date = asString(row.date);
  const memo = asString(row.memo);
  const nickname = asString(row.nickname);
  const user_id = asString(row.user_id ?? row.userId);

  if (!timestamp && !date && !memo && !nickname && !user_id) {
    return null;
  }

  return {
    timestamp,
    user_id,
    name: asString(row.name),
    nickname,
    email: normalizeEmail(asString(row.email)),
    date:
      normalizeKoreaDateKey(row.date) ||
      normalizeKoreaDateKey(row.timestamp) ||
      date,
    completed_rituals: asString(
      row.completed_rituals ?? row.completedRituals,
    ),
    memo,
  };
}

async function fetchAppsScriptAction(
  action: string,
  params: Record<string, string> = {},
): Promise<string> {
  const baseUrl = getAppsScriptUrl();
  if (!baseUrl) {
    throw new Error("Apps Script URL이 설정되지 않았습니다.");
  }

  try {
    const url = new URL(baseUrl);
    url.searchParams.set("action", action);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
    });
    const text = await response.text();

    if (!response.ok) {
      throw new Error(`Apps Script GET 실패 (${action}, ${response.status})`);
    }

    return text;
  } catch (getError) {
    try {
      return await postAppsScriptAction(baseUrl, action, params);
    } catch (postError) {
      const getMessage =
        getError instanceof Error ? getError.message : String(getError);
      const postMessage =
        postError instanceof Error ? postError.message : String(postError);
      throw new Error(
        `Apps Script ${action} 실패. GET: ${getMessage} / POST: ${postMessage}`,
      );
    }
  }
}

/** 관리자 대시보드 요약 지표 */
export async function getAdminSummaryFromAppsScript(): Promise<AdminSummary> {
  const text = await fetchAppsScriptAction("admin_summary");
  const parsed = parseAppsScriptJson(text, "admin_summary");

  if (parsed.success === false) {
    throw new Error(parsed.error || "관리자 요약을 불러오지 못했습니다.");
  }

  return parseAdminSummary(parsed.data);
}

function parseAdminRitualRank(raw: unknown): AdminRitualRank | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const row = raw as Record<string, unknown>;
  const name = asString(row.name ?? row.ritual ?? row.label);
  const countValue = row.count ?? row.value;
  const count =
    typeof countValue === "number" ? countValue : Number(countValue);

  if (!name || !Number.isFinite(count) || count <= 0) {
    return null;
  }

  return { name, count: Math.round(count) };
}

function parseAdminWeeklyTrend(raw: unknown): AdminWeeklyTrend | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const row = raw as Record<string, unknown>;
  const week_start = asString(row.week_start ?? row.weekStart);
  const week_end = asString(row.week_end ?? row.weekEnd);
  const participantsValue = row.participants ?? row.count;
  const participants =
    typeof participantsValue === "number"
      ? participantsValue
      : Number(participantsValue);

  if (!week_start && !week_end) {
    return null;
  }

  return {
    week_start,
    week_end,
    participants: Number.isFinite(participants)
      ? Math.max(0, Math.round(participants))
      : 0,
  };
}

function parseAdminStats(raw: unknown): AdminStats {
  if (!raw || typeof raw !== "object") {
    throw new Error("관리자 통계 응답 형식이 올바르지 않습니다.");
  }

  const row = raw as Record<string, unknown>;
  const toNumber = (value: unknown) => {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  let totalUsers = toNumber(row.totalUsers ?? row.total_members);
  let weeklyParticipants = toNumber(
    row.weeklyParticipants ?? row.week_participants,
  );
  let weeklyRecordCount = toNumber(
    row.weeklyRecordCount ?? row.week_record_count,
  );

  if (totalUsers < 0) {
    totalUsers = 0;
  }
  if (weeklyParticipants < 0) {
    weeklyParticipants = 0;
  }
  if (weeklyRecordCount < 0) {
    weeklyRecordCount = 0;
  }
  if (totalUsers > 0 && weeklyParticipants > totalUsers) {
    weeklyParticipants = totalUsers;
  }
  if (totalUsers <= 0) {
    weeklyParticipants = 0;
  }

  const weeklyParticipationRate =
    totalUsers > 0
      ? Math.max(
          0,
          Math.min(100, Math.round((weeklyParticipants / totalUsers) * 100)),
        )
      : 0;

  const topRituals = (Array.isArray(row.topRituals) ? row.topRituals : [])
    .map(parseAdminRitualRank)
    .filter((item): item is AdminRitualRank => item !== null)
    .slice(0, 5);

  const recentWeeks = (Array.isArray(row.recentWeeks) ? row.recentWeeks : [])
    .map(parseAdminWeeklyTrend)
    .filter((item): item is AdminWeeklyTrend => item !== null)
    .slice(0, 4)
    .map((week) => ({
      ...week,
      participants:
        totalUsers > 0
          ? Math.min(week.participants, totalUsers)
          : 0,
    }));

  return {
    totalUsers,
    weeklyParticipants,
    weeklyParticipationRate,
    weeklyRecordCount,
    topRituals,
    recentWeeks,
    today: asString(row.today),
    week_start: asString(row.week_start ?? row.weekStart),
    week_end: asString(row.week_end ?? row.weekEnd),
  };
}

/** 관리자 통계 (/admin/stats) */
export async function getAdminStatsFromAppsScript(): Promise<AdminStats> {
  const text = await fetchAppsScriptAction("admin_stats");
  const parsed = parseAppsScriptJson(text, "admin_stats");

  if (parsed.success === false) {
    throw new Error(parsed.error || "관리자 통계를 불러오지 못했습니다.");
  }

  return parseAdminStats(parsed.data);
}

/** 특정 날짜(KST YYYY-MM-DD)의 Daily 기록 */
export async function listDailyByDateFromAppsScript(
  date: string,
): Promise<AdminDailyRecord[]> {
  const targetDate = date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    throw new Error("date는 YYYY-MM-DD 형식이어야 합니다.");
  }

  const text = await fetchAppsScriptAction("list_daily_by_date", {
    date: targetDate,
  });
  const parsed = parseAppsScriptJson(text, "list_daily_by_date");

  if (parsed.success === false) {
    throw new Error(parsed.error || "오늘 숨 기록을 불러오지 못했습니다.");
  }

  if (!Array.isArray(parsed.data)) {
    throw new Error("오늘 숨 기록 응답 형식이 올바르지 않습니다.");
  }

  return parsed.data
    .map(parseAdminDailyRecord)
    .filter((row): row is AdminDailyRecord => row !== null);
}

/** 읽지 않은 숨편지 목록 (read_at 비어 있음) */
export async function listUnreadLettersFromAppsScript(
  limit = 100,
): Promise<SumbiLetter[]> {
  const text = await fetchAppsScriptAction("list_unread_letters", {
    limit: String(limit),
  });
  return parseLettersResponse(text);
}

function parseAdminNote(raw: unknown): AdminNote {
  if (!raw || typeof raw !== "object") {
    throw new Error("운영 메모 응답 형식이 올바르지 않습니다.");
  }

  const row = raw as Record<string, unknown>;
  return {
    email: normalizeEmail(asString(row.email)),
    note: asString(row.note ?? row.memo),
    updated_at: asString(row.updated_at ?? row.updatedAt),
  };
}

/** 관리자 전용 운영 메모 조회 */
export async function getAdminNoteFromAppsScript(
  email: string,
): Promise<AdminNote> {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    throw new Error("이메일이 필요합니다.");
  }

  const text = await fetchAppsScriptAction("get_admin_note", {
    email: normalized,
  });
  const parsed = parseAppsScriptJson(text, "get_admin_note");

  if (parsed.success === false) {
    throw new Error(parsed.error || "운영 메모를 불러오지 못했습니다.");
  }

  return parseAdminNote(parsed.data);
}

/** 관리자 전용 운영 메모 저장 (email upsert) */
export async function saveAdminNoteInAppsScript(input: {
  email: string;
  note: string;
}): Promise<AdminNote> {
  const email = normalizeEmail(input.email);
  if (!email) {
    throw new Error("이메일이 필요합니다.");
  }

  const baseUrl = getAppsScriptUrl();
  if (!baseUrl) {
    throw new Error("Apps Script URL이 설정되지 않았습니다.");
  }

  const text = await postAppsScriptAction(baseUrl, "save_admin_note", {
    email,
    note: input.note,
    updated_at: new Date().toISOString(),
  });
  const parsed = parseAppsScriptJson(text, "save_admin_note");

  if (parsed.success === false) {
    throw new Error(parsed.error || "운영 메모를 저장하지 못했습니다.");
  }

  return parseAdminNote(parsed.data);
}

/** 이번 주 Daily 기록이 없는 등록 회원 */
export async function listInactiveThisWeekFromAppsScript(): Promise<
  AdminRecentUser[]
> {
  const text = await fetchAppsScriptAction("list_inactive_this_week");
  const parsed = parseAppsScriptJson(text, "list_inactive_this_week");

  if (parsed.success === false) {
    throw new Error(
      parsed.error || "이번 주 미참여 회원 목록을 불러오지 못했습니다.",
    );
  }

  if (!Array.isArray(parsed.data)) {
    throw new Error("이번 주 미참여 회원 응답 형식이 올바르지 않습니다.");
  }

  return parsed.data
    .map(parseAdminRecentUser)
    .filter((item): item is AdminRecentUser => item !== null);
}
