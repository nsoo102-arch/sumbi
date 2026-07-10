import { NextResponse } from "next/server";
import { getAdminSummary } from "@/services/sheets/server/getServerSheetStorage";

export async function GET() {
  try {
    const summary = await getAdminSummary();
    return NextResponse.json({ ok: true, data: summary });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "관리자 요약을 불러오지 못했습니다.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
