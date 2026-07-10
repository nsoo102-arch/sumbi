import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  isValidAdminSessionToken,
} from "@/lib/adminAuth";
import {
  createLetter,
  getServerSheetStorage,
  listLetters,
} from "@/services/sheets/server/getServerSheetStorage";
import {
  isAppsScriptConfigured,
  normalizeEmail,
} from "@/services/sheets/server/appsScriptClient";
import { parseLetterRow } from "@/services/sheets/server/validate";

async function requireAdminAuth(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (await isValidAdminSessionToken(token)) return null;
  return NextResponse.json(
    { ok: false, error: "관리자 인증이 필요합니다." },
    { status: 401 },
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = normalizeEmail(searchParams.get("email") ?? "");
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw ? Number(limitRaw) : 50;

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "email 쿼리 파라미터가 필요합니다." },
        { status: 400 },
      );
    }

    const letters = await listLetters(
      email,
      Number.isFinite(limit) && limit > 0 ? limit : 50,
    );
    return NextResponse.json({ ok: true, data: letters });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "숨편지 목록을 불러오지 못했습니다.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    // 관리자 숨편지 전송 (Letters 시트) — message 필드 기준
    if (typeof body.message === "string") {
      const unauthorized = await requireAdminAuth();
      if (unauthorized) return unauthorized;

      const email = normalizeEmail(String(body.email ?? ""));
      const message = String(body.message ?? "").trim();
      const name = String(body.name ?? "").trim();
      const nickname = String(body.nickname ?? "").trim();

      if (!email) {
        return NextResponse.json(
          { ok: false, error: "email이 필요합니다." },
          { status: 400 },
        );
      }

      if (!message) {
        return NextResponse.json(
          { ok: false, error: "편지 내용이 비어 있습니다." },
          { status: 400 },
        );
      }

      if (!isAppsScriptConfigured()) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Apps Script URL이 설정되지 않아 숨편지를 저장할 수 없습니다.",
          },
          { status: 503 },
        );
      }

      const letter = await createLetter({ email, name, nickname, message });
      return NextResponse.json({ ok: true, data: letter });
    }

    // 레거시 로컬 스테이징 저장 경로 유지
    const row = parseLetterRow(body);
    await getServerSheetStorage().saveLetter(row);
    return NextResponse.json({ ok: true, data: row });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "편지 저장에 실패했습니다.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
