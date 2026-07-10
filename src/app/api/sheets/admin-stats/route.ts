import { NextResponse } from "next/server";
import { getAdminStats } from "@/services/sheets/server/getServerSheetStorage";

export async function GET() {
  try {
    const stats = await getAdminStats();
    return NextResponse.json({ ok: true, data: stats });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "관리자 통계를 불러오지 못했습니다.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
