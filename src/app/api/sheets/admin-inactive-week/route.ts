import { NextResponse } from "next/server";
import { listInactiveThisWeek } from "@/services/sheets/server/getServerSheetStorage";

export async function GET() {
  try {
    const members = await listInactiveThisWeek();
    return NextResponse.json({ ok: true, data: members });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "이번 주 미참여 회원 목록을 불러오지 못했습니다.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
