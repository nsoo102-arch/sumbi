import { NextResponse } from "next/server";
import { getMemberDetail } from "@/services/sheets/server/getServerSheetStorage";
import { normalizeEmail } from "@/services/sheets/server/appsScriptClient";

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

    const detail = await getMemberDetail(email);
    return NextResponse.json({ ok: true, data: detail });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "회원 상세를 불러오지 못했습니다.";
    const status = message.includes("찾을 수 없습니다") ? 404 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
