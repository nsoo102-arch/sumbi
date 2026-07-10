import { NextResponse } from "next/server";
import { getServerSheetStorage } from "@/services/sheets/server/getServerSheetStorage";
import { parseBreathRecordRow } from "@/services/sheets/server/validate";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const row = parseBreathRecordRow(body);
    await getServerSheetStorage().saveBreathRecord(row);
    return NextResponse.json({ ok: true, data: row });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "기록 저장에 실패했습니다.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
