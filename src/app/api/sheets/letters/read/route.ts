import { NextResponse } from "next/server";
import { markLetterRead } from "@/services/sheets/server/getServerSheetStorage";
import { normalizeEmail } from "@/services/sheets/server/appsScriptClient";

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id ?? body.letter_id ?? "").trim();
    const email = normalizeEmail(String(body.email ?? ""));

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id가 필요합니다." },
        { status: 400 },
      );
    }

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "email이 필요합니다." },
        { status: 400 },
      );
    }

    const letter = await markLetterRead({ id, email });
    return NextResponse.json({ ok: true, data: letter });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "읽음 처리에 실패했습니다.";
    const status = message.includes("찾을 수 없습니다") ? 404 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
