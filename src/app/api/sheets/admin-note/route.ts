import { NextResponse } from "next/server";
import {
  getAdminNote,
  saveAdminNote,
} from "@/services/sheets/server/getServerSheetStorage";
import { normalizeEmail } from "@/services/sheets/server/appsScriptClient";

/** 관리자 전용 운영 메모 조회 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = normalizeEmail(searchParams.get("email") ?? "");

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "email 쿼리 파라미터가 필요합니다." },
        { status: 400 },
      );
    }

    const note = await getAdminNote(email);
    return NextResponse.json({ ok: true, data: note });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "운영 메모를 불러오지 못했습니다.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** 관리자 전용 운영 메모 저장 (email upsert) */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const email = normalizeEmail(String(body.email ?? ""));
    const note = String(body.note ?? "");

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "email이 필요합니다." },
        { status: 400 },
      );
    }

    const saved = await saveAdminNote({ email, note });
    return NextResponse.json({ ok: true, data: saved });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "운영 메모를 저장하지 못했습니다.";
    const status = message.includes("설정되지 않아") ? 503 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
