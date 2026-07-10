import { NextResponse } from "next/server";
import { listDailyByDate } from "@/services/sheets/server/getServerSheetStorage";

function getKoreaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = (searchParams.get("date") ?? "").trim();
    const date = dateParam || getKoreaToday();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { ok: false, error: "date는 YYYY-MM-DD 형식이어야 합니다." },
        { status: 400 },
      );
    }

    const records = await listDailyByDate(date);
    return NextResponse.json({ ok: true, data: records, date });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "숨 기록을 불러오지 못했습니다.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
